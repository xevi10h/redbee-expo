import { supabase } from '@/lib/supabase';
import type {
	ReportsByReason,
	VideoAnalyticsData,
	VideoAnalyticsInteraction,
	VideoAnalyticsSummary,
	VideoDailyMetrics,
	VideoHourlyData,
	VideoShare,
	VideoView,
} from '@/shared/types';
import { ApiResponse } from '@/shared/types';

/**
 * AnalyticsService - Servicio para gestionar analíticas de videos
 * 
 * FUNCIONALIDADES:
 * - Rastreo de vistas de video con metadatos anónimos
 * - Análisis de engagement y patrones de visualización  
 * - Estadísticas geográficas y demográficas
 * - Métricas de reportes y moderación
 * - Análisis temporal (por horas, días)
 * - Respeta la privacidad del usuario (datos anónimos para vistas)
 */
export class AnalyticsService {
	/**
	 * Registra una vista de video con metadatos para analíticas
	 */
	static async trackVideoView(
		videoId: string,
		viewData: Partial<VideoView>
	): Promise<ApiResponse<VideoView>> {
		try {
			// Detectar información del dispositivo/navegador si no se proporciona
			const deviceInfo = this.getDeviceInfo();
			
			const viewPayload = {
				video_id: videoId,
				viewer_id: viewData.viewer_id || null, // Puede ser null para vistas anónimas
				viewer_country: viewData.viewer_country,
				viewer_city: viewData.viewer_city,
				device_type: viewData.device_type || deviceInfo.device_type,
				browser: viewData.browser || deviceInfo.browser,
				platform: viewData.platform || deviceInfo.platform,
				referrer_source: viewData.referrer_source || 'direct',
				watch_duration_seconds: viewData.watch_duration_seconds || 0,
				video_duration_at_view: viewData.video_duration_at_view,
				completion_percentage: viewData.completion_percentage || 0,
				is_premium_viewer: viewData.is_premium_viewer || false,
				is_follower: viewData.is_follower || false,
				session_id: viewData.session_id || this.generateSessionId(),
				viewer_ip_hash: viewData.viewer_ip_hash, // Se debe generar en el backend
				viewed_at: new Date().toISOString(),
			};

			const { data, error } = await supabase
				.from('video_views')
				.insert(viewPayload)
				.select()
				.single();

			if (error) {
				console.error('Error tracking video view:', error);
				return { success: false, error: error.message };
			}

			return { success: true, data };
		} catch (error) {
			console.error('Exception in trackVideoView:', error);
			return { success: false, error: 'Failed to track video view' };
		}
	}

	/**
	 * Registra un compartido de video
	 */
	static async trackVideoShare(
		videoId: string,
		platform: string,
		sharerId?: string
	): Promise<ApiResponse<VideoShare>> {
		try {
			const shareData = {
				video_id: videoId,
				sharer_id: sharerId || null,
				platform,
				sharer_country: await this.getCurrentUserCountry(),
			};

			const { data, error } = await supabase
				.from('video_shares')
				.insert(shareData)
				.select()
				.single();

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true, data };
		} catch (error) {
			console.error('Exception in trackVideoShare:', error);
			return { success: false, error: 'Failed to track video share' };
		}
	}

	/**
	 * Obtiene analíticas completas para un video específico
	 */
	static async getVideoAnalytics(
		videoId: string,
		daysBack: number | null = null
	): Promise<ApiResponse<VideoAnalyticsData>> {
		try {
			// Verificar que el usuario sea el propietario del video
			const { data: video } = await supabase
				.from('videos')
				.select('user_id')
				.eq('id', videoId)
				.single();

			if (!video) {
				return { success: false, error: 'Video not found' };
			}

			const { data: { user } } = await supabase.auth.getUser();
			if (!user || video.user_id !== user.id) {
				return { success: false, error: 'Unauthorized' };
			}

			// Obtener resumen general (desde siempre si daysBack es null)
			const summaryResponse = await this.getVideoSummary(videoId, daysBack);
			if (!summaryResponse.success) {
				return { 
					success: false, 
					error: summaryResponse.error || 'Failed to load video summary'
				};
			}

			// Obtener datos por horas (desde siempre si daysBack es null)
			const hourlyResponse = await this.getVideoHourlyData(videoId, daysBack);
			
			// Obtener métricas diarias (desde siempre si daysBack es null)
			const dailyResponse = await this.getVideoDailyMetrics(videoId, daysBack);

			// Obtener interacciones recientes
			const likesResponse = await this.getRecentLikes(videoId, 50);
			const commentsResponse = await this.getRecentComments(videoId, 50);
			const sharesResponse = await this.getRecentShares(videoId, 50);
			
			// Obtener estadísticas de reportes
			const reportsResponse = await this.getReportsByReason(videoId);

			const analyticsData: VideoAnalyticsData = {
				summary: summaryResponse.data!,
				hourly_views: hourlyResponse.success ? hourlyResponse.data! : [],
				daily_metrics: dailyResponse.success ? dailyResponse.data! : [],
				recent_likes: likesResponse.success ? likesResponse.data! : [],
				recent_comments: commentsResponse.success ? commentsResponse.data! : [],
				recent_shares: sharesResponse.success ? sharesResponse.data! : [],
				reports_by_reason: reportsResponse.success ? reportsResponse.data! : [],
			};

			return { success: true, data: analyticsData };
		} catch (error) {
			console.error('Exception in getVideoAnalytics:', error);
			return { success: false, error: 'Failed to load analytics' };
		}
	}

	/**
	 * Obtiene resumen de analíticas usando consultas directas
	 */
	static async getVideoSummary(
		videoId: string,
		daysBack: number | null = null
	): Promise<ApiResponse<VideoAnalyticsSummary>> {
		try {
			// Calcular fecha de corte si se especifica
			let dateFilter = '';
			if (daysBack !== null) {
				const cutoffDate = new Date();
				cutoffDate.setDate(cutoffDate.getDate() - daysBack);
				dateFilter = cutoffDate.toISOString();
			}

			// Obtener conteos básicos con consultas paralelas
			const [
				viewsResponse,
				likesResponse,
				commentsResponse,
				sharesResponse,
				reportsResponse
			] = await Promise.all([
				// Views - usar el campo views_count de la tabla videos directamente
				supabase
					.from('videos')
					.select('views_count, created_at')
					.eq('id', videoId)
					.single(),
				
				// Likes
				daysBack 
					? supabase
						.from('likes')
						.select('id')
						.eq('video_id', videoId)
						.gte('created_at', dateFilter)
					: supabase
						.from('likes')
						.select('id')
						.eq('video_id', videoId),
				
				// Comments
				daysBack
					? supabase
						.from('comments')
						.select('id')
						.eq('video_id', videoId)
						.gte('created_at', dateFilter)
					: supabase
						.from('comments')
						.select('id')
						.eq('video_id', videoId),
				
				// Shares
				daysBack
					? supabase
						.from('video_shares')
						.select('id')
						.eq('video_id', videoId)
						.gte('created_at', dateFilter)
					: supabase
						.from('video_shares')
						.select('id')
						.eq('video_id', videoId),
				
				// Reports - try both video_id and reported_video_id fields
				daysBack
					? supabase
						.from('reports')
						.select('id')
						.or(`video_id.eq.${videoId},reported_video_id.eq.${videoId}`)
						.gte('created_at', dateFilter)
					: supabase
						.from('reports')
						.select('id')
						.or(`video_id.eq.${videoId},reported_video_id.eq.${videoId}`)
			]);

			// Obtener estadísticas de duración de video_views si hay datos
			const watchStatsResponse = await supabase
				.from('video_views')
				.select('watch_duration_seconds, completion_percentage, is_premium_viewer, is_follower, viewer_country, viewer_id, viewer_ip_hash')
				.eq('video_id', videoId)
				.gte('created_at', daysBack ? dateFilter : '1900-01-01');

			const viewsFromVideoTable = viewsResponse.data?.views_count || 0;
			const actualViews = watchStatsResponse.data?.length || 0;
			
			// Usar el mayor entre los dos para mostrar datos reales
			const totalViews = Math.max(viewsFromVideoTable, actualViews);

			// Calcular vistas únicas basadas en viewer_id y viewer_ip_hash
			const uniqueViewersSet = new Set();
			watchStatsResponse.data?.forEach(view => {
				const identifier = view.viewer_id || view.viewer_ip_hash || `anonymous-${Math.random()}`;
				uniqueViewersSet.add(identifier);
			});
			
			const uniqueViews = Math.max(uniqueViewersSet.size, totalViews > 0 ? 1 : 0);

			// Calcular estadísticas de watch duration
			const watchStats = watchStatsResponse.data || [];
			const avgWatchDuration = watchStats.length > 0 
				? watchStats.reduce((sum, view) => sum + (view.watch_duration_seconds || 0), 0) / watchStats.length
				: 0;
			
			const avgCompletionRate = watchStats.length > 0
				? watchStats.reduce((sum, view) => sum + (view.completion_percentage || 0), 0) / watchStats.length
				: 0;

			const premiumViewerPercentage = watchStats.length > 0
				? (watchStats.filter(view => view.is_premium_viewer).length / watchStats.length) * 100
				: 0;

			const followerPercentage = watchStats.length > 0
				? (watchStats.filter(view => view.is_follower).length / watchStats.length) * 100
				: 0;

			// Calcular top countries
			const countryCounts = watchStats
				.filter(view => view.viewer_country)
				.reduce((acc, view) => {
					acc[view.viewer_country] = (acc[view.viewer_country] || 0) + 1;
					return acc;
				}, {} as Record<string, number>);

			const topCountries = Object.entries(countryCounts)
				.map(([country, count]) => ({ country, count }))
				.sort((a, b) => b.count - a.count)
				.slice(0, 10);

			const summary: VideoAnalyticsSummary = {
				total_views: totalViews,
				unique_views: uniqueViews, // Unique views based on unique identifiers
				total_likes: likesResponse.data?.length || 0,
				total_comments: commentsResponse.data?.length || 0,
				total_shares: sharesResponse.data?.length || 0,
				total_reports: reportsResponse.data?.length || 0,
				avg_watch_duration: avgWatchDuration,
				avg_completion_rate: avgCompletionRate,
				premium_viewer_percentage: premiumViewerPercentage,
				follower_percentage: followerPercentage,
				top_countries: topCountries,
			};

			return { success: true, data: summary };
		} catch (error) {
			console.error('Exception in getVideoSummary:', error);
			return { success: false, error: 'Failed to load summary' };
		}
	}

	/**
	 * Obtiene datos de visualización por horas usando consultas directas
	 */
	static async getVideoHourlyData(
		videoId: string,
		daysBack: number | null = null
	): Promise<ApiResponse<VideoHourlyData[]>> {
		try {
			// Calcular fecha de corte si se especifica
			let dateFilter = '';
			if (daysBack !== null) {
				const cutoffDate = new Date();
				cutoffDate.setDate(cutoffDate.getDate() - daysBack);
				dateFilter = cutoffDate.toISOString();
			}

			// Primero intentar obtener de video_hourly_metrics
			let query = supabase
				.from('video_hourly_metrics')
				.select('hour, views_count, unique_views_count, date')
				.eq('video_id', videoId);

			if (daysBack !== null) {
				const cutoffDate = new Date();
				cutoffDate.setDate(cutoffDate.getDate() - daysBack);
				query = query.gte('date', cutoffDate.toISOString().split('T')[0]);
			}

			const metricsResponse = await query.order('hour', { ascending: true });

			if (metricsResponse.data && metricsResponse.data.length > 0) {
				// Si hay datos en metrics, usarlos
				const hourlyData: VideoHourlyData[] = metricsResponse.data.map(item => ({
					hour: item.hour,
					views: item.views_count || 0,
					unique_views: item.unique_views_count || 0,
				}));

				return { success: true, data: hourlyData };
			}

			// Si no hay datos en metrics, generar desde video_views directamente
			const viewsQuery = supabase
				.from('video_views')
				.select('viewed_at, viewer_id, viewer_ip_hash')
				.eq('video_id', videoId);

			if (daysBack !== null) {
				viewsQuery.gte('viewed_at', dateFilter);
			}

			const viewsResponse = await viewsQuery;

			if (viewsResponse.error) {
				return { success: false, error: viewsResponse.error.message };
			}

			// Agrupar por horas manualmente
			const hourlyStats: Record<number, { views: number; unique_viewers: Set<string> }> = {};

			// Inicializar todas las horas
			for (let hour = 0; hour < 24; hour++) {
				hourlyStats[hour] = { views: 0, unique_viewers: new Set() };
			}

			// Procesar las vistas
			(viewsResponse.data || []).forEach(view => {
				const hour = new Date(view.viewed_at).getHours();
				hourlyStats[hour].views += 1;
				
				// Para vistas únicas, usar viewer_id o viewer_ip_hash
				const viewerIdentifier = view.viewer_id || view.viewer_ip_hash;
				if (viewerIdentifier) {
					hourlyStats[hour].unique_viewers.add(viewerIdentifier);
				}
			});

			// Convertir a formato final
			const hourlyData: VideoHourlyData[] = Object.entries(hourlyStats).map(([hourStr, stats]) => ({
				hour: parseInt(hourStr),
				views: stats.views,
				unique_views: stats.unique_viewers.size,
			}));

			return { success: true, data: hourlyData };
		} catch (error) {
			console.error('Exception in getVideoHourlyData:', error);
			return { success: false, error: 'Failed to load hourly data' };
		}
	}

	/**
	 * Obtiene métricas diarias agregadas
	 */
	static async getVideoDailyMetrics(
		videoId: string,
		daysBack: number | null = null
	): Promise<ApiResponse<VideoDailyMetrics[]>> {
		try {
			let query = supabase
				.from('video_daily_metrics')
				.select('*')
				.eq('video_id', videoId);

			if (daysBack !== null) {
				query = query.gte('date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
			}

			const { data, error } = await query.order('date', { ascending: true });

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true, data: data || [] };
		} catch (error) {
			console.error('Exception in getVideoDailyMetrics:', error);
			return { success: false, error: 'Failed to load daily metrics' };
		}
	}

	/**
	 * Obtiene likes recientes con información del usuario
	 */
	static async getRecentLikes(
		videoId: string,
		limit: number = 50
	): Promise<ApiResponse<VideoAnalyticsInteraction[]>> {
		try {
			// 1. Obtener likes
			const { data: likes, error: likesError } = await supabase
				.from('likes')
				.select('id, user_id, created_at')
				.eq('video_id', videoId)
				.order('created_at', { ascending: false })
				.limit(limit);
	
			if (likesError) {
				return { success: false, error: likesError.message };
			}
	
			if (!likes || likes.length === 0) {
				return { success: true, data: [] };
			}
	
			// 2. Obtener información de usuarios
			const userIds = [...new Set(likes.map(like => like.user_id))];
			const { data: users, error: usersError } = await supabase
				.from('profiles')
				.select('id, username, display_name, avatar_url')
				.in('id', userIds);
	
			if (usersError) {
				return { success: false, error: usersError.message };
			}
	
			// 3. Combinar datos
			const formattedLikes = likes.map(like => {
				const user = users?.find(u => u.id === like.user_id);
				return {
					id: like.id,
					user: user as any,
					created_at: like.created_at,
				};
			}).filter(like => like.user !== null);
	
			return { success: true, data: formattedLikes };
		} catch (error) {
			console.error('Exception in getRecentLikes:', error);
			return { success: false, error: 'Failed to load recent likes' };
		}
	}

	/**
	 * Obtiene comentarios recientes con información del usuario
	 */
	static async getRecentComments(
		videoId: string,
		limit: number = 50
	): Promise<ApiResponse<VideoAnalyticsInteraction[]>> {
		try {
			// 1. Obtener comentarios
			const { data: comments, error: commentsError } = await supabase
				.from('comments')
				.select('id, user_id, text, created_at')
				.eq('video_id', videoId)
				.order('created_at', { ascending: false })
				.limit(limit);
	
			if (commentsError) {
				return { success: false, error: commentsError.message };
			}
	
			if (!comments || comments.length === 0) {
				return { success: true, data: [] };
			}
	
			// 2. Obtener información de usuarios
			const userIds = [...new Set(comments.map(comment => comment.user_id))];
			const { data: users, error: usersError } = await supabase
				.from('profiles')
				.select('id, username, display_name, avatar_url')
				.in('id', userIds);
	
			if (usersError) {
				return { success: false, error: usersError.message };
			}
	
			// 3. Combinar datos
			const formattedComments = comments.map(comment => {
				const user = users?.find(u => u.id === comment.user_id);
				return {
					id: comment.id,
					user: user as any,
					text: comment.text,
					created_at: comment.created_at,
				};
			}).filter(comment => comment.user !== null);
	
			return { success: true, data: formattedComments };
		} catch (error) {
			console.error('Exception in getRecentComments:', error);
			return { success: false, error: 'Failed to load recent comments' };
		}
	}

	/**
	 * Obtiene compartidos recientes
	 */
	static async getRecentShares(
		videoId: string,
		limit: number = 50
	): Promise<ApiResponse<VideoShare[]>> {
		try {
			const { data, error } = await supabase
				.from('video_shares')
				.select('*')
				.eq('video_id', videoId)
				.order('created_at', { ascending: false })
				.limit(limit);

			if (error) {
				return { success: false, error: error.message };
			}

			return { success: true, data: data || [] };
		} catch (error) {
			console.error('Exception in getRecentShares:', error);
			return { success: false, error: 'Failed to load recent shares' };
		}
	}

	/**
	 * Obtiene estadísticas de reportes por razón
	 */
	static async getReportsByReason(
		videoId: string
	): Promise<ApiResponse<ReportsByReason[]>> {
		try {
			const { data, error } = await supabase
				.from('reports')
				.select('reason')
				.or(`video_id.eq.${videoId},reported_video_id.eq.${videoId}`)
				.not('reason', 'is', null);

			if (error) {
				return { success: false, error: error.message };
			}

			// Agrupar por razón y calcular porcentajes
			const reasonCounts = data?.reduce((acc, report) => {
				acc[report.reason] = (acc[report.reason] || 0) + 1;
				return acc;
			}, {} as Record<string, number>) || {};

			const total = Object.values(reasonCounts).reduce((sum, count) => sum + count, 0);

			const reportStats: ReportsByReason[] = Object.entries(reasonCounts)
				.map(([reason, count]) => ({
					reason,
					count,
					percentage: total > 0 ? Math.round((count / total) * 100) : 0,
				}))
				.sort((a, b) => b.count - a.count); // Ordenar por más reportado

			return { success: true, data: reportStats };
		} catch (error) {
			console.error('Exception in getReportsByReason:', error);
			return { success: false, error: 'Failed to load reports statistics' };
		}
	}

	/**
	 * Busca en likes por nombre de usuario
	 */
	static async searchLikesByUsername(
		videoId: string,
		username: string,
		limit: number = 20
	): Promise<ApiResponse<VideoAnalyticsInteraction[]>> {
		try {
			const { data, error } = await supabase
				.from('likes')
				.select(`
					id,
					created_at,
					user_id,
					profiles:user_id(id, username, display_name, avatar_url)
				`)
				.eq('video_id', videoId)
				.not('profiles', 'is', null)
				.ilike('profiles.username', `%${username}%`)
				.order('created_at', { ascending: false })
				.limit(limit);
	
			if (error) {
				return { success: false, error: error.message };
			}
	
			const formattedLikes = data?.map(like => ({
				id: like.id,
				user: like.profiles as any,
				created_at: like.created_at,
			})).filter(like => like.user !== null) || [];
	
			return { success: true, data: formattedLikes };
		} catch (error) {
			console.error('Exception in searchLikesByUsername:', error);
			return { success: false, error: 'Failed to search likes' };
		}
	}

	/**
	 * Busca en comentarios por nombre de usuario
	 */
	static async searchCommentsByUsername(
		videoId: string,
		username: string,
		limit: number = 20
	): Promise<ApiResponse<VideoAnalyticsInteraction[]>> {
		try {
			// 1. Buscar usuarios que coincidan
			const { data: users, error: usersError } = await supabase
				.from('profiles')
				.select('id, username, display_name, avatar_url')
				.ilike('username', `%${username}%`)
				.limit(50);
	
			if (usersError || !users || users.length === 0) {
				return { success: true, data: [] };
			}
	
			const userIds = users.map(u => u.id);
	
			// 2. Buscar comentarios de esos usuarios
			const { data: comments, error: commentsError } = await supabase
				.from('comments')
				.select('id, user_id, text, created_at')
				.eq('video_id', videoId)
				.in('user_id', userIds)
				.order('created_at', { ascending: false })
				.limit(limit);
	
			if (commentsError) {
				return { success: false, error: commentsError.message };
			}
	
			// 3. Combinar datos
			const formattedComments = comments?.map(comment => {
				const user = users.find(u => u.id === comment.user_id);
				return {
					id: comment.id,
					user: user as any,
					text: comment.text,
					created_at: comment.created_at,
				};
			}).filter(comment => comment.user !== null) || [];
	
			return { success: true, data: formattedComments };
		} catch (error) {
			console.error('Exception in searchCommentsByUsername:', error);
			return { success: false, error: 'Failed to search comments' };
		}
	}

	// ========== MÉTODOS AUXILIARES ==========

	/**
	 * Detecta información básica del dispositivo/navegador
	 */
	private static getDeviceInfo() {
		// En un entorno real, esto detectaría el user agent, etc.
		// Por ahora valores por defecto
		return {
			device_type: 'mobile' as const,
			browser: 'unknown',
			platform: 'ios' as const, // Se puede detectar con Platform de React Native
		};
	}

	/**
	 * Genera un ID de sesión único
	 */
	private static generateSessionId(): string {
		return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Obtiene el país del usuario actual (placeholder)
	 */
	private static async getCurrentUserCountry(): Promise<string | undefined> {
		// En producción, esto podría usar un servicio de geolocalización
		// Por ahora retornamos undefined
		return undefined;
	}

	/**
	 * Verifica si el usuario puede acceder a las analíticas del video
	 */
	static async canAccessAnalytics(videoId: string): Promise<boolean> {
		try {
			const { data: video } = await supabase
				.from('videos')
				.select('user_id')
				.eq('id', videoId)
				.single();

			if (!video) return false;

			const { data: { user } } = await supabase.auth.getUser();
			return user?.id === video.user_id;
		} catch (error) {
			console.error('Error checking analytics access:', error);
			return false;
		}
	}

	/**
	 * Actualiza las métricas de un video específico
	 * (Útil para forzar actualización de datos)
	 */
	static async updateVideoMetrics(
		videoId: string,
		date?: string
	): Promise<ApiResponse<void>> {
		try {
			const targetDate = date || new Date().toISOString().split('T')[0];
			
			const { error } = await supabase
				.rpc('update_video_daily_metrics', {
					target_video_id: videoId,
					target_date: targetDate,
				});

			if (error) {
				return { success: false, error: error.message };
			}

			// También actualizar métricas por hora
			const { error: hourlyError } = await supabase
				.rpc('update_video_hourly_metrics', {
					target_video_id: videoId,
					target_date: targetDate,
				});

			if (hourlyError) {
				console.warn('Error updating hourly metrics:', hourlyError);
			}

			return { success: true };
		} catch (error) {
			console.error('Exception in updateVideoMetrics:', error);
			return { success: false, error: 'Failed to update metrics' };
		}
	}

	/**
	 * Genera datos de prueba para un video usando la función SQL optimizada
	 */
	static async generateTestData(videoId: string): Promise<ApiResponse<void>> {
		try {
			console.log('Generating test analytics data for video:', videoId);

			// Usar la función SQL para generar datos de prueba más realistas
			const { error } = await supabase.rpc('generate_test_analytics_for_video', {
				target_video_id: videoId
			});

			if (error) {
				console.error('Error calling SQL function:', error);
				// Fallback a método manual si la función SQL falla
				return await this.generateTestDataManual(videoId);
			}

			console.log('Test data generation completed via SQL function');
			return { success: true };
		} catch (error) {
			console.error('Error generating test data:', error);
			return { success: false, error: 'Failed to generate test data' };
		}
	}

	/**
	 * Genera datos de prueba manualmente (fallback)
	 */
	private static async generateTestDataManual(videoId: string): Promise<ApiResponse<void>> {
		try {
			console.log('Generating test data manually...');

			// Generar vistas para los últimos 3 días con patrones realistas
			const now = new Date();
			const countries = ['ES', 'US', 'FR', 'DE', 'IT', 'BR', 'AR'];
			const platforms: ('ios' | 'android' | 'web')[] = ['ios', 'android', 'web'];
			const devices = ['mobile', 'tablet', 'desktop'];
			
			for (let day = 0; day < 3; day++) {
				for (let hour = 0; hour < 24; hour++) {
					// Patrón realista de vistas por hora
					let viewsInHour = 2; // Base mínima
					if (hour >= 8 && hour <= 10) viewsInHour += 8; // Pico mañana
					if (hour >= 12 && hour <= 14) viewsInHour += 6; // Pico mediodía  
					if (hour >= 18 && hour <= 22) viewsInHour += 12; // Pico noche
					viewsInHour += Math.floor(Math.random() * 5); // Variación aleatoria

					for (let view = 0; view < viewsInHour; view++) {
						const viewDate = new Date(now);
						viewDate.setDate(viewDate.getDate() - day);
						viewDate.setHours(hour, Math.floor(Math.random() * 60));

						const watchDuration = Math.floor(Math.random() * 200) + 15; // 15-215 segundos
						const videoDuration = 180; // 3 minutos
						const completionPercentage = Math.min((watchDuration / videoDuration) * 100, 100);

						await this.trackVideoView(videoId, {
							viewer_country: countries[Math.floor(Math.random() * countries.length)],
							device_type: devices[Math.floor(Math.random() * devices.length)] as any,
							platform: platforms[Math.floor(Math.random() * platforms.length)],
							watch_duration_seconds: watchDuration,
							video_duration_at_view: videoDuration,
							completion_percentage: completionPercentage,
							is_premium_viewer: Math.random() > 0.8, // 20% premium
							is_follower: Math.random() > 0.7, // 30% followers
							viewed_at: viewDate.toISOString(),
						});

						// Pequeña pausa para no sobrecargar
						if (view % 5 === 0) {
							await new Promise(resolve => setTimeout(resolve, 50));
						}
					}
				}
			}

			// Generar shares
			for (let i = 0; i < 15; i++) {
				const platforms = ['whatsapp', 'telegram', 'twitter', 'copy_link', 'instagram'];
				const platform = platforms[Math.floor(Math.random() * platforms.length)];
				await this.trackVideoShare(videoId, platform);
			}

			console.log('Manual test data generation completed');
			return { success: true };
		} catch (error) {
			console.error('Error in manual test data generation:', error);
			return { success: false, error: 'Failed to generate test data manually' };
		}
	}
}

// Función de utilidad para formatear duraciones
export const formatDuration = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Función de utilidad para formatear números grandes
export const formatLargeNumber = (num: number): string => {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
};

// Función para obtener el nombre del país por código ISO
export const getCountryName = (countryCode: string): string => {
	const countries: Record<string, string> = {
		ES: 'España',
		US: 'Estados Unidos',
		FR: 'Francia',
		DE: 'Alemania',
		IT: 'Italia',
		GB: 'Reino Unido',
		BR: 'Brasil',
		AR: 'Argentina',
		MX: 'México',
		CO: 'Colombia',
		PE: 'Perú',
		CL: 'Chile',
		// Agregar más países según sea necesario
	};
	
	return countries[countryCode] || countryCode;
};