import { supabase } from '@/lib/supabase';
import { AuthResponse, Video } from '@/shared/types';

export interface VideoFilters {
	feed_type?: 'forYou' | 'following';
	user_id?: string;
	is_premium?: boolean;
	hashtags?: string[];
	search_query?: string;
	page?: number;
	limit?: number;
}

export class VideoService {
	/**
	 * Get videos feed with proper permission filtering
	 * Solo devuelve videos que el usuario puede ver
	 */
	static async getVideosFeed(filters: VideoFilters): Promise<
		AuthResponse<{
			videos: Video[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			const {
				feed_type = 'forYou',
				page = 0,
				limit = 10,
				user_id,
				search_query,
				hashtags,
			} = filters;

			// Validar que tenemos un user_id
			if (!user_id) {
				return {
					success: false,
					error: 'User ID is required to fetch videos',
				};
			}

			let result;

			// Usar las funciones de base de datos mejoradas con control de permisos
			if (feed_type === 'forYou') {
				const { data, error } = await supabase.rpc(
					'get_for_you_feed_with_permissions',
					{
						viewer_id: user_id,
						page_offset: page * limit,
						page_limit: limit,
					},
				);

				if (error) {
					return {
						success: false,
						error: error.message,
					};
				}

				result = data || [];
			} else if (feed_type === 'following') {
				const { data, error } = await supabase.rpc(
					'get_following_feed_with_permissions',
					{
						viewer_id: user_id,
						page_offset: page * limit,
						page_limit: limit,
					},
				);

				if (error) {
					return {
						success: false,
						error: error.message,
					};
				}

				result = data || [];
			}

			if (!result) {
				return {
					success: true,
					data: {
						videos: [],
						hasMore: false,
						total: 0,
					},
				};
			}

			// Obtener las interacciones del usuario para estos videos
			const videoIds = result.map((v: any) => v.id);
			let interactions: any = {};

			if (videoIds.length > 0) {
				const { data: interactionData, error: interactionError } =
					await supabase.rpc('get_video_interactions_safe', {
						video_ids: videoIds,
						viewer_id: user_id,
					});

				if (!interactionError && interactionData) {
					// Convertir array a objeto para fácil acceso
					interactions = interactionData.reduce((acc: any, item: any) => {
						acc[item.video_id] = {
							is_liked: item.is_liked,
							is_following: item.is_following,
							is_subscribed: item.is_subscribed,
							can_access: item.can_access,
						};
						return acc;
					}, {});
				}
			}

			// Procesar los videos y agregar información de interacciones
			const processedVideos: Video[] = result.map((video: any) => {
				const videoInteractions = interactions[video.id] || {
					is_liked: false,
					is_following: false,
					is_subscribed: false,
					can_access: true, // Por defecto true ya que estos videos ya pasaron el filtro de permisos
				};

				return {
					id: video.id,
					user_id: video.user_id,
					user: {
						id: video.user_id,
						username: video.username,
						display_name: video.display_name,
						avatar_url: video.avatar_url,
						subscription_price: video.subscription_price,
						subscription_currency: video.subscription_currency,
					},
					title: video.title,
					description: video.description,
					hashtags: video.hashtags,
					video_url: video.video_url,
					thumbnail_url: video.thumbnail_url,
					duration: video.duration,
					is_premium: video.is_premium,
					likes_count: video.likes_count,
					comments_count: video.comments_count,
					views_count: video.views_count,
					created_at: video.created_at,
					is_liked: videoInteractions.is_liked,
					is_following: videoInteractions.is_following,
					is_subscribed: videoInteractions.is_subscribed,
				};
			});

			// Filtrar por búsqueda si se proporciona
			let filteredVideos = processedVideos;
			if (search_query) {
				filteredVideos = processedVideos.filter(
					(video) =>
						video.title?.toLowerCase().includes(search_query.toLowerCase()) ||
						video.description
							?.toLowerCase()
							.includes(search_query.toLowerCase()) ||
						video.user?.username
							?.toLowerCase()
							.includes(search_query.toLowerCase()) ||
						video.hashtags?.some((tag) =>
							tag.toLowerCase().includes(search_query.toLowerCase()),
						),
				);
			}

			// Filtrar por hashtags si se proporciona
			if (hashtags && hashtags.length > 0) {
				filteredVideos = filteredVideos.filter((video) =>
					video.hashtags?.some((tag) => hashtags.includes(tag)),
				);
			}

			// Calcular si hay más videos
			const hasMore = result.length === limit;

			return {
				success: true,
				data: {
					videos: filteredVideos,
					hasMore,
					total: filteredVideos.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to fetch videos',
			};
		}
	}

	/**
	 * Verificar si un usuario puede acceder a un video específico
	 */
	static async canAccessVideo(
		videoId: string,
		userId: string,
	): Promise<AuthResponse<{ canAccess: boolean }>> {
		try {
			const { data, error } = await supabase.rpc(
				'can_access_premium_video_enhanced',
				{
					video_id: videoId,
					viewer_id: userId,
				},
			);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: {
					canAccess: data || false,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to check video access',
			};
		}
	}

	/**
	 * Buscar videos con filtros de permisos aplicados
	 */
	static async searchVideos(
		searchQuery: string,
		viewerId?: string,
		page = 0,
		limit = 10,
	): Promise<
		AuthResponse<{
			videos: Video[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			if (!viewerId) {
				return {
					success: false,
					error: 'Viewer ID is required for search',
				};
			}

			const { data, error } = await supabase.rpc(
				'search_videos_with_permissions',
				{
					search_query: searchQuery,
					viewer_id: viewerId,
					page_offset: page * limit,
					page_limit: limit,
				},
			);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			if (!data) {
				return {
					success: true,
					data: {
						videos: [],
						hasMore: false,
						total: 0,
					},
				};
			}

			// Obtener interacciones del usuario
			const videoIds = data.map((v: any) => v.id);
			let interactions: any = {};

			if (videoIds.length > 0) {
				const { data: interactionData, error: interactionError } =
					await supabase.rpc('get_video_interactions_safe', {
						video_ids: videoIds,
						viewer_id: viewerId,
					});

				if (!interactionError && interactionData) {
					interactions = interactionData.reduce((acc: any, item: any) => {
						acc[item.video_id] = {
							is_liked: item.is_liked,
							is_following: item.is_following,
							is_subscribed: item.is_subscribed,
							can_access: item.can_access,
						};
						return acc;
					}, {});
				}
			}

			// Procesar videos
			const processedVideos: Video[] = data.map((video: any) => {
				const videoInteractions = interactions[video.id] || {
					is_liked: false,
					is_following: false,
					is_subscribed: false,
					can_access: true, // Por defecto true ya que estos videos ya pasaron el filtro de permisos
				};

				return {
					id: video.id,
					user_id: video.user_id,
					user: {
						id: video.user_id,
						username: video.username,
						display_name: video.display_name,
						avatar_url: video.avatar_url,
						subscription_price: video.subscription_price,
						subscription_currency: video.subscription_currency,
					},
					title: video.title,
					description: video.description,
					hashtags: video.hashtags,
					video_url: video.video_url,
					thumbnail_url: video.thumbnail_url,
					duration: video.duration,
					is_premium: video.is_premium,
					likes_count: video.likes_count,
					comments_count: video.comments_count,
					views_count: video.views_count,
					created_at: video.created_at,
					is_liked: videoInteractions.is_liked,
					is_following: videoInteractions.is_following,
					is_subscribed: videoInteractions.is_subscribed,
				};
			});

			const hasMore = data.length === limit;

			return {
				success: true,
				data: {
					videos: processedVideos,
					hasMore,
					total: processedVideos.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to search videos',
			};
		}
	}

	/**
	 * Toggle like on a video (manteniendo la funcionalidad existente)
	 */
	static async toggleLike(
		videoId: string,
		userId: string,
	): Promise<AuthResponse<{ liked: boolean }>> {
		try {
			// Verificar primero si el usuario puede acceder al video
			const accessResult = await this.canAccessVideo(videoId, userId);
			if (!accessResult.success || !accessResult.data?.canAccess) {
				return {
					success: false,
					error: 'You do not have permission to interact with this video',
				};
			}

			// Check if already liked
			const { data: existingLike, error: checkError } = await supabase
				.from('likes')
				.select('id')
				.eq('video_id', videoId)
				.eq('user_id', userId)
				.single();

			if (checkError && checkError.code !== 'PGRST116') {
				return {
					success: false,
					error: checkError.message,
				};
			}

			if (existingLike) {
				// Unlike
				const { error: deleteError } = await supabase
					.from('likes')
					.delete()
					.eq('id', existingLike.id);

				if (deleteError) {
					return {
						success: false,
						error: deleteError.message,
					};
				}

				return {
					success: true,
					data: { liked: false },
				};
			} else {
				// Like
				const { error: insertError } = await supabase.from('likes').insert({
					video_id: videoId,
					user_id: userId,
				});

				if (insertError) {
					return {
						success: false,
						error: insertError.message,
					};
				}

				return {
					success: true,
					data: { liked: true },
				};
			}
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to toggle like',
			};
		}
	}

	/**
	 * Report a video (con verificación de permisos)
	 */
	static async reportVideo(
		videoId: string,
		reporterId: string,
		reason: string,
	): Promise<AuthResponse<void>> {
		try {
			// Verificar que el video existe y obtener información del creador
			const { data: video, error: videoError } = await supabase
				.from('videos')
				.select('user_id')
				.eq('id', videoId)
				.single();

			if (videoError) {
				return {
					success: false,
					error: 'Video not found',
				};
			}

			// Insert report
			const { error: reportError } = await supabase.from('reports').insert({
				reported_video_id: videoId,
				reporter_id: reporterId,
				reported_user_id: video.user_id,
				reason: reason,
				status: 'pending',
			});

			if (reportError) {
				return {
					success: false,
					error: reportError.message,
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to report video',
			};
		}
	}

	/**
	 * Increment video view count (solo si el usuario tiene acceso)
	 */
	static async incrementViewCount(
		videoId: string,
		viewerId?: string,
	): Promise<void> {
		try {
			await supabase.rpc('increment_video_views_safe', {
				video_id: videoId,
				viewer_id: viewerId,
			});
		} catch (error) {
			console.error('Failed to increment view count:', error);
			// Don't throw error as this is not critical
		}
	}

	/**
	 * Upload a new video
	 */
	static async uploadVideo(data: {
		videoUri: string;
		title: string;
		description?: string;
		hashtags?: string[];
		isPremium: boolean;
		userId: string;
	}): Promise<AuthResponse<{ videoId: string }>> {
		try {
			const { videoUri, title, description, hashtags, isPremium, userId } = data;

			// Generate unique filename
			const timestamp = Date.now();
			const fileName = `video_${userId}_${timestamp}.mp4`;
			
			// Read video file
			const response = await fetch(videoUri);
			const blob = await response.blob();
			const arrayBuffer = await blob.arrayBuffer();

			// Upload video to Supabase Storage
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('videos')
				.upload(fileName, arrayBuffer, {
					contentType: 'video/mp4',
					upsert: false
				});

			if (uploadError) {
				return {
					success: false,
					error: `Failed to upload video: ${uploadError.message}`,
				};
			}

			// Get public URL
			const { data: urlData } = supabase.storage
				.from('videos')
				.getPublicUrl(fileName);

			// Insert video record in database
			const { data: videoData, error: dbError } = await supabase
				.from('videos')
				.insert({
					user_id: userId,
					title,
					description: description || '',
					hashtags: hashtags || [],
					video_url: urlData.publicUrl,
					is_premium: isPremium,
					duration: 0, // Will be updated when we can calculate duration
				})
				.select('id')
				.single();

			if (dbError) {
				// If database insert fails, clean up uploaded file
				await supabase.storage.from('videos').remove([fileName]);
				return {
					success: false,
					error: `Failed to save video record: ${dbError.message}`,
				};
			}

			return {
				success: true,
				data: { videoId: videoData.id },
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to upload video',
			};
		}
	}
}
