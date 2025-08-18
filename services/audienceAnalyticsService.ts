import { supabase } from '@/lib/supabase';
import type {
	AudienceAnalyticsData,
	AudienceEngagementTrends,
	AudienceGeographicData,
	AudienceHourlyPattern,
	AudienceMetricsSummary,
	AudienceVideoPerformance,
	AuthResponse,
} from '@/shared/types';
import { ApiResponse } from '@/shared/types';

/**
 * AudienceAnalyticsService - Servicio para analíticas agregadas de audiencia
 * 
 * Proporciona métricas consolidadas de todos los videos del usuario:
 * - Resumen general de rendimiento
 * - Patrones de visualización por horas
 * - Análisis geográfico de la audiencia
 * - Tendencias de engagement
 * - Performance comparativo de videos
 */
export class AudienceAnalyticsService {
	/**
	 * Obtiene analíticas completas de audiencia para un usuario
	 */
	static async getUserAudienceAnalytics(
		userId: string,
		daysBack: number = 30
	):Promise<AuthResponse<AudienceAnalyticsData>> {
		try {
			// Verificar que el usuario esté autenticado y sea el propietario
			const { data: { user } } = await supabase.auth.getUser();
			if (!user || user.id !== userId) {
				return { success: false, error: 'Unauthorized' };
			}

			// Obtener todas las métricas en paralelo
			const [
				summaryResponse,
				trendsResponse,
				geographicResponse,
				hourlyResponse,
				videoPerformanceResponse,
			] = await Promise.all([
				this.getAudienceMetricsSummary(userId, daysBack),
				this.getEngagementTrends(userId, daysBack),
				this.getGeographicAnalytics(userId, daysBack),
				this.getHourlyPatterns(userId, daysBack),
				this.getVideoPerformanceComparison(userId, daysBack),
			]);

			if (!summaryResponse.success) {
				return { 
					success: false, 
					error: summaryResponse.error || 'Failed to load audience summary'
				};
			}
	
			// ✅ Verificar que tenemos los datos necesarios
			if (!summaryResponse.data) {
				return { 
					success: false, 
					error: 'No summary data available'
				};
			}

			const audienceData: AudienceAnalyticsData = {
				summary: summaryResponse.data!,
				engagement_trends: trendsResponse.success ? trendsResponse.data! : [],
				geographic_data: geographicResponse.success ? geographicResponse.data! : [],
				hourly_patterns: hourlyResponse.success ? hourlyResponse.data! : [],
				video_performance: videoPerformanceResponse.success ? videoPerformanceResponse.data! : [],
			};

			return { success: true, data: audienceData };
		} catch (error) {
			console.error('Exception in getUserAudienceAnalytics:', error);
			return { success: false, error: 'Failed to load audience analytics' };
		}
	}

	/**
	 * Obtiene resumen general de métricas de audiencia
	 */
	static async getAudienceMetricsSummary(
		userId: string,
		daysBack: number = 30
	): Promise<ApiResponse<AudienceMetricsSummary>> {
		try {
			// Calcular fecha de corte
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysBack);
			const dateFilter = cutoffDate.toISOString();

			// Obtener IDs de todos los videos del usuario
			const { data: userVideos } = await supabase
				.from('videos')
				.select('id')
				.eq('user_id', userId);

			if (!userVideos || userVideos.length === 0) {
				// Usuario sin videos
				return {
					success: true,
					data: {
						total_videos: 0,
						total_views: 0,
						unique_viewers: 0,
						total_likes: 0,
						total_comments: 0,
						total_shares: 0,
						total_reports: 0,
						avg_watch_duration: 0,
						avg_completion_rate: 0,
						premium_viewer_percentage: 0,
						follower_percentage: 0,
						audience_retention_rate: 0,
						top_performing_videos: [],
						period_growth: {
							views_growth: 0,
							likes_growth: 0,
							followers_growth: 0,
						},
					},
				};
			}

			const videoIds = userVideos.map(v => v.id);

			// Consultas paralelas para métricas principales
			const [
				viewsResponse,
				likesResponse,
				commentsResponse,
				sharesResponse,
				reportsResponse,
				watchStatsResponse,
			] = await Promise.all([
				// Vistas desde video_views
				supabase
					.from('video_views')
					.select('id, video_id, viewer_id, viewer_ip_hash, watch_duration_seconds, completion_percentage, is_premium_viewer, is_follower')
					.in('video_id', videoIds)
					.gte('created_at', dateFilter),

				// Likes
				supabase
					.from('likes')
					.select('id, video_id')
					.in('video_id', videoIds)
					.gte('created_at', dateFilter),

				// Comentarios
				supabase
					.from('comments')
					.select('id, video_id')
					.in('video_id', videoIds)
					.gte('created_at', dateFilter),

				// Shares
				supabase
					.from('video_shares')
					.select('id, video_id')
					.in('video_id', videoIds)
					.gte('created_at', dateFilter),

				// Reports
				supabase
					.from('reports')
					.select('id')
					.or(videoIds.map(id => `video_id.eq.${id}`).join(','))
					.gte('created_at', dateFilter),

				// Stats de videos para obtener views totales actuales
				supabase
					.from('videos')
					.select('id, views_count, likes_count, title, created_at')
					.eq('user_id', userId)
					.order('views_count', { ascending: false }),
			]);

			// Calcular métricas agregadas
			const totalViews = viewsResponse.data?.length || 0;
			const totalLikes = likesResponse.data?.length || 0;
			const totalComments = commentsResponse.data?.length || 0;
			const totalShares = sharesResponse.data?.length || 0;
			const totalReports = reportsResponse.data?.length || 0;

			// Calcular viewers únicos
			const uniqueViewersSet = new Set();
			viewsResponse.data?.forEach(view => {
				const identifier = view.viewer_id || view.viewer_ip_hash || `anonymous-${Math.random()}`;
				uniqueViewersSet.add(identifier);
			});
			const uniqueViewers = uniqueViewersSet.size;

			// Calcular estadísticas de duración de watch
			const watchStats = viewsResponse.data || [];
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

			// Calcular tasa de retención de audiencia (viewers únicos / total views)
			const audienceRetentionRate = totalViews > 0 ? (uniqueViewers / totalViews) * 100 : 0;

			// Top 5 videos con mejor rendimiento
			const topPerformingVideos = (watchStatsResponse.data || [])
				.slice(0, 5)
				.map(video => ({
					id: video.id,
					title: video.title || 'Sin título',
					views: video.views_count,
					likes: video.likes_count,
				}));

			// Calcular crecimiento del período (comparar con período anterior)
			const previousPeriodDate = new Date();
			previousPeriodDate.setDate(previousPeriodDate.getDate() - (daysBack * 2));
			
			const [previousViewsResponse, previousLikesResponse] = await Promise.all([
				supabase
					.from('video_views')
					.select('id')
					.in('video_id', videoIds)
					.gte('created_at', previousPeriodDate.toISOString())
					.lt('created_at', dateFilter),

				supabase
					.from('likes')
					.select('id')
					.in('video_id', videoIds)
					.gte('created_at', previousPeriodDate.toISOString())
					.lt('created_at', dateFilter),
			]);

			const previousViews = previousViewsResponse.data?.length || 0;
			const previousLikes = previousLikesResponse.data?.length || 0;

			const viewsGrowth = previousViews > 0 ? ((totalViews - previousViews) / previousViews) * 100 : 0;
			const likesGrowth = previousLikes > 0 ? ((totalLikes - previousLikes) / previousLikes) * 100 : 0;

			const summary: AudienceMetricsSummary = {
				total_videos: userVideos.length,
				total_views: totalViews,
				unique_viewers: uniqueViewers,
				total_likes: totalLikes,
				total_comments: totalComments,
				total_shares: totalShares,
				total_reports: totalReports,
				avg_watch_duration: avgWatchDuration,
				avg_completion_rate: avgCompletionRate,
				premium_viewer_percentage: premiumViewerPercentage,
				follower_percentage: followerPercentage,
				audience_retention_rate: audienceRetentionRate,
				top_performing_videos: topPerformingVideos,
				period_growth: {
					views_growth: viewsGrowth,
					likes_growth: likesGrowth,
					followers_growth: 0, // TODO: implementar si se necesita
				},
			};

			return { success: true, data: summary };
		} catch (error) {
			console.error('Exception in getAudienceMetricsSummary:', error);
			return { success: false, error: 'Failed to load audience metrics summary' };
		}
	}

	/**
	 * Obtiene tendencias de engagement por día
	 */
	static async getEngagementTrends(
		userId: string,
		daysBack: number = 30
	): Promise<ApiResponse<AudienceEngagementTrends[]>> {
		try {
			// Obtener IDs de videos del usuario
			const { data: userVideos } = await supabase
				.from('videos')
				.select('id')
				.eq('user_id', userId);

			if (!userVideos || userVideos.length === 0) {
				return { success: true, data: [] };
			}

			const videoIds = userVideos.map(v => v.id);

			// Usar video_daily_metrics si está disponible, sino calcular manualmente
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysBack);

			const { data: dailyMetrics } = await supabase
				.from('video_daily_metrics')
				.select('date, views_count, likes_count, comments_count, shares_count')
				.in('video_id', videoIds)
				.gte('date', cutoffDate.toISOString().split('T')[0])
				.order('date', { ascending: true });

			if (dailyMetrics && dailyMetrics.length > 0) {
				// Agrupar por fecha
				const trendsMap = new Map<string, AudienceEngagementTrends>();

				dailyMetrics.forEach(metric => {
					const date = metric.date;
					if (!trendsMap.has(date)) {
						trendsMap.set(date, {
							date,
							views: 0,
							likes: 0,
							comments: 0,
							shares: 0,
							engagement_rate: 0,
						});
					}

					const trend = trendsMap.get(date)!;
					trend.views += metric.views_count || 0;
					trend.likes += metric.likes_count || 0;
					trend.comments += metric.comments_count || 0;
					trend.shares += metric.shares_count || 0;
				});

				// Calcular engagement rate
				const trends = Array.from(trendsMap.values()).map(trend => ({
					...trend,
					engagement_rate: trend.views > 0 
						? ((trend.likes + trend.comments + trend.shares) / trend.views) * 100 
						: 0,
				}));

				return { success: true, data: trends };
			}

			// Fallback: calcular manualmente si no hay datos en daily_metrics
			return { success: true, data: [] };
		} catch (error) {
			console.error('Exception in getEngagementTrends:', error);
			return { success: false, error: 'Failed to load engagement trends' };
		}
	}

	/**
	 * Obtiene análisis geográfico de la audiencia
	 */
	static async getGeographicAnalytics(
		userId: string,
		daysBack: number = 30
	): Promise<ApiResponse<AudienceGeographicData[]>> {
		try {
			// Obtener IDs de videos del usuario
			const { data: userVideos } = await supabase
				.from('videos')
				.select('id')
				.eq('user_id', userId);

			if (!userVideos || userVideos.length === 0) {
				return { success: true, data: [] };
			}

			const videoIds = userVideos.map(v => v.id);
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysBack);

			// Obtener datos geográficos de las vistas
			const { data: geographicData } = await supabase
				.from('video_views')
				.select('viewer_country, viewer_city')
				.in('video_id', videoIds)
				.gte('created_at', cutoffDate.toISOString())
				.not('viewer_country', 'is', null);

			if (!geographicData || geographicData.length === 0) {
				return { success: true, data: [] };
			}

			// Agrupar por país
			const countryMap = new Map<string, { views: number; cities: Set<string> }>();

			geographicData.forEach(view => {
				const country = view.viewer_country;
				if (!country) return;

				if (!countryMap.has(country)) {
					countryMap.set(country, { views: 0, cities: new Set() });
				}

				const countryData = countryMap.get(country)!;
				countryData.views += 1;
				
				if (view.viewer_city) {
					countryData.cities.add(view.viewer_city);
				}
			});

			// Calcular porcentajes y convertir a array
			const totalViews = geographicData.length;
			const geographicResult: AudienceGeographicData[] = Array.from(countryMap.entries())
				.map(([country, data]) => ({
					country,
					views: data.views,
					percentage: (data.views / totalViews) * 100,
					cities_count: data.cities.size,
				}))
				.sort((a, b) => b.views - a.views)
				.slice(0, 15); // Top 15 países

			return { success: true, data: geographicResult };
		} catch (error) {
			console.error('Exception in getGeographicAnalytics:', error);
			return { success: false, error: 'Failed to load geographic analytics' };
		}
	}

	/**
	 * Obtiene patrones de visualización por horas agregados
	 */
	static async getHourlyPatterns(
		userId: string,
		daysBack: number = 30
	): Promise<ApiResponse<AudienceHourlyPattern[]>> {
		try {
			// Obtener IDs de videos del usuario
			const { data: userVideos } = await supabase
				.from('videos')
				.select('id')
				.eq('user_id', userId);

			if (!userVideos || userVideos.length === 0) {
				return { success: true, data: [] };
			}

			const videoIds = userVideos.map(v => v.id);
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysBack);

			// Intentar obtener de video_hourly_metrics primero
			const { data: hourlyMetrics } = await supabase
				.from('video_hourly_metrics')
				.select('hour, views_count, unique_views_count')
				.in('video_id', videoIds)
				.gte('date', cutoffDate.toISOString().split('T')[0]);

			if (hourlyMetrics && hourlyMetrics.length > 0) {
				// Agrupar por hora
				const hourlyMap = new Map<number, { views: number; unique_views: number }>();

				// Inicializar todas las horas
				for (let hour = 0; hour < 24; hour++) {
					hourlyMap.set(hour, { views: 0, unique_views: 0 });
				}

				hourlyMetrics.forEach(metric => {
					const hourData = hourlyMap.get(metric.hour)!;
					hourData.views += metric.views_count || 0;
					hourData.unique_views += metric.unique_views_count || 0;
				});

				const patterns: AudienceHourlyPattern[] = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
					hour,
					views: data.views,
					unique_views: data.unique_views,
					percentage: 0, // Se calculará después
				}));

				// Calcular porcentajes
				const totalViews = patterns.reduce((sum, p) => sum + p.views, 0);
				patterns.forEach(pattern => {
					pattern.percentage = totalViews > 0 ? (pattern.views / totalViews) * 100 : 0;
				});

				return { success: true, data: patterns };
			}

			// Fallback: calcular desde video_views directamente
			const { data: viewsData } = await supabase
				.from('video_views')
				.select('viewed_at, viewer_id, viewer_ip_hash')
				.in('video_id', videoIds)
				.gte('viewed_at', cutoffDate.toISOString());

			const hourlyStats: Record<number, { views: number; unique_viewers: Set<string> }> = {};

			// Inicializar todas las horas
			for (let hour = 0; hour < 24; hour++) {
				hourlyStats[hour] = { views: 0, unique_viewers: new Set() };
			}

			// Procesar las vistas
			(viewsData || []).forEach(view => {
				const hour = new Date(view.viewed_at).getHours();
				hourlyStats[hour].views += 1;
				
				const viewerIdentifier = view.viewer_id || view.viewer_ip_hash;
				if (viewerIdentifier) {
					hourlyStats[hour].unique_viewers.add(viewerIdentifier);
				}
			});

			// Convertir a formato final
			const patterns: AudienceHourlyPattern[] = Object.entries(hourlyStats).map(([hourStr, stats]) => ({
				hour: parseInt(hourStr),
				views: stats.views,
				unique_views: stats.unique_viewers.size,
				percentage: 0, // Se calculará después
			}));

			// Calcular porcentajes
			const totalViews = patterns.reduce((sum, p) => sum + p.views, 0);
			patterns.forEach(pattern => {
				pattern.percentage = totalViews > 0 ? (pattern.views / totalViews) * 100 : 0;
			});

			return { success: true, data: patterns };
		} catch (error) {
			console.error('Exception in getHourlyPatterns:', error);
			return { success: false, error: 'Failed to load hourly patterns' };
		}
	}

	/**
	 * Obtiene comparación de rendimiento entre videos
	 */
	static async getVideoPerformanceComparison(
		userId: string,
		daysBack: number = 30
	): Promise<ApiResponse<AudienceVideoPerformance[]>> {
		try {
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysBack);

			// Obtener videos del usuario con métricas básicas
			const { data: userVideos } = await supabase
				.from('videos')
				.select('id, title, views_count, likes_count, comments_count, created_at')
				.eq('user_id', userId)
				.gte('created_at', cutoffDate.toISOString())
				.order('views_count', { ascending: false })
				.limit(10); // Top 10 videos

			if (!userVideos || userVideos.length === 0) {
				return { success: true, data: [] };
			}

			// Obtener métricas adicionales para cada video
			const videoPerformance: AudienceVideoPerformance[] = await Promise.all(
				userVideos.map(async (video) => {
					// Obtener shares y duración promedio
					const [sharesResponse, avgDurationResponse] = await Promise.all([
						supabase
							.from('video_shares')
							.select('id')
							.eq('video_id', video.id)
							.gte('created_at', cutoffDate.toISOString()),

						supabase
							.from('video_views')
							.select('watch_duration_seconds, completion_percentage')
							.eq('video_id', video.id)
							.gte('created_at', cutoffDate.toISOString()),
					]);

					const shares = sharesResponse.data?.length || 0;
					const watchData = avgDurationResponse.data || [];
					
					const avgWatchDuration = watchData.length > 0
						? watchData.reduce((sum, w) => sum + (w.watch_duration_seconds || 0), 0) / watchData.length
						: 0;

					const avgCompletionRate = watchData.length > 0
						? watchData.reduce((sum, w) => sum + (w.completion_percentage || 0), 0) / watchData.length
						: 0;

					// Calcular engagement rate
					const totalEngagement = video.likes_count + video.comments_count + shares;
					const engagementRate = video.views_count > 0 ? (totalEngagement / video.views_count) * 100 : 0;

					return {
						video_id: video.id,
						title: video.title || 'Sin título',
						views: video.views_count,
						likes: video.likes_count,
						comments: video.comments_count,
						shares,
						avg_watch_duration: avgWatchDuration,
						completion_rate: avgCompletionRate,
						engagement_rate: engagementRate,
						created_at: video.created_at,
					};
				})
			);

			return { success: true, data: videoPerformance };
		} catch (error) {
			console.error('Exception in getVideoPerformanceComparison:', error);
			return { success: false, error: 'Failed to load video performance comparison' };
		}
	}

	/**
	 * Obtiene métricas de crecimiento de audiencia
	 */
	static async getAudienceGrowthMetrics(
		userId: string,
		daysBack: number = 30
	): Promise<ApiResponse<{
		daily_new_viewers: { date: string; new_viewers: number }[];
		returning_viewers_rate: number;
		audience_growth_rate: number;
	}>> {
		try {
			// Obtener IDs de videos del usuario
			const { data: userVideos } = await supabase
				.from('videos')
				.select('id')
				.eq('user_id', userId);

			if (!userVideos || userVideos.length === 0) {
				return {
					success: true,
					data: {
						daily_new_viewers: [],
						returning_viewers_rate: 0,
						audience_growth_rate: 0,
					},
				};
			}

			const videoIds = userVideos.map(v => v.id);
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - daysBack);

			// Obtener todas las vistas del período
			const { data: allViews } = await supabase
				.from('video_views')
				.select('created_at, viewer_id, viewer_ip_hash')
				.in('video_id', videoIds)
				.gte('created_at', cutoffDate.toISOString())
				.order('created_at', { ascending: true });

			if (!allViews || allViews.length === 0) {
				return {
					success: true,
					data: {
						daily_new_viewers: [],
						returning_viewers_rate: 0,
						audience_growth_rate: 0,
					},
				};
			}

			// Rastrear viewers únicos por día
			const seenViewers = new Set<string>();
			const dailyNewViewers: { date: string; new_viewers: number }[] = [];
			const dailyViewerMap = new Map<string, Set<string>>();

			allViews.forEach(view => {
				const viewerId = view.viewer_id || view.viewer_ip_hash || `anonymous-${Math.random()}`;
				const date = view.created_at.split('T')[0];

				if (!dailyViewerMap.has(date)) {
					dailyViewerMap.set(date, new Set());
				}

				dailyViewerMap.get(date)!.add(viewerId);
			});

			// Calcular nuevos viewers por día
			Array.from(dailyViewerMap.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.forEach(([date, dayViewers]) => {
					let newViewersCount = 0;
					dayViewers.forEach(viewerId => {
						if (!seenViewers.has(viewerId)) {
							seenViewers.add(viewerId);
							newViewersCount++;
						}
					});

					dailyNewViewers.push({
						date,
						new_viewers: newViewersCount,
					});
				});

			// Calcular tasa de viewers recurrentes
			const totalUniqueViewers = seenViewers.size;
			const totalViews = allViews.length;
			const returningViewersRate = totalUniqueViewers > 0 
				? ((totalViews - totalUniqueViewers) / totalViews) * 100 
				: 0;

			// Calcular tasa de crecimiento de audiencia (nuevos viewers promedio por día)
			const avgNewViewersPerDay = dailyNewViewers.length > 0
				? dailyNewViewers.reduce((sum, day) => sum + day.new_viewers, 0) / dailyNewViewers.length
				: 0;

			const audienceGrowthRate = avgNewViewersPerDay;

			return {
				success: true,
				data: {
					daily_new_viewers: dailyNewViewers,
					returning_viewers_rate: returningViewersRate,
					audience_growth_rate: audienceGrowthRate,
				},
			};
		} catch (error) {
			console.error('Exception in getAudienceGrowthMetrics:', error);
			return { success: false, error: 'Failed to load audience growth metrics' };
		}
	}
}

// Función de utilidad para formatear países
export const getCountryDisplayName = (countryCode: string): string => {
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
		VE: 'Venezuela',
		EC: 'Ecuador',
		UY: 'Uruguay',
		PY: 'Paraguay',
		BO: 'Bolivia',
		CR: 'Costa Rica',
		PA: 'Panamá',
		GT: 'Guatemala',
		HN: 'Honduras',
		NI: 'Nicaragua',
		SV: 'El Salvador',
		DO: 'República Dominicana',
		CU: 'Cuba',
		PR: 'Puerto Rico',
		// Agregar más países según sea necesario
	};
	
	return countries[countryCode] || countryCode;
};

// Función para formatear horas para mostrar
export const formatHourDisplay = (hour: number): string => {
	if (hour === 0) return '12 AM';
	if (hour === 12) return '12 PM';
	if (hour < 12) return `${hour} AM`;
	return `${hour - 12} PM`;
};