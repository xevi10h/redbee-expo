import { supabase } from '@/lib/supabase';
import { AuthResponse, Video } from '@/shared/types';
import * as FileSystem from 'expo-file-system';
import { getThumbnailAsync } from 'expo-video-thumbnails';

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
					is_hidden: video.is_hidden || false,
					hidden_at: video.hidden_at,
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
	 * Get all videos for a specific user (including hidden ones when viewing own profile)
	 */
	static async getUserVideos(
		userId: string,
		viewerId: string,
		includeHidden: boolean = false
	): Promise<AuthResponse<{ videos: Video[] }>> {
		try {
			let query = supabase
				.from('videos')
				.select(`
					*,
					user:profiles!videos_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url,
						subscription_price,
						subscription_currency
					)
				`)
				.eq('user_id', userId)
				.order('created_at', { ascending: false });

			// If not including hidden videos, filter them out
			if (!includeHidden) {
				query = query.eq('is_hidden', false);
			}

			const { data, error } = await query;

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Debug: log raw data from database
			if (data && data.length > 0) {
				console.log(`🔍 Raw video data from DB:`, {
					id: data[0].id,
					title: data[0].title,
					thumbnail_url: data[0].thumbnail_url,
					video_url: data[0].video_url,
				});
			}

			if (!data) {
				return {
					success: true,
					data: { videos: [] },
				};
			}

			// Get interactions for these videos
			const videoIds = data.map(v => v.id);
			let interactions: any = {};

			if (videoIds.length > 0 && viewerId) {
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

			// Process videos
			const processedVideos: Video[] = data.map((video: any) => {
				const videoInteractions = interactions[video.id] || {
					is_liked: false,
					is_following: false,
					is_subscribed: false,
					can_access: true,
				};

				return {
					id: video.id,
					user_id: video.user_id,
					user: video.user || {
						id: video.user_id,
						username: 'Unknown',
						display_name: 'Unknown User',
						avatar_url: null,
						subscription_price: null,
						subscription_currency: null,
					},
					title: video.title,
					description: video.description,
					hashtags: video.hashtags || [],
					video_url: video.video_url,
					thumbnail_url: video.thumbnail_url,
					duration: video.duration,
					is_premium: video.is_premium || false,
					is_hidden: video.is_hidden || false,
					hidden_at: video.hidden_at,
					likes_count: video.likes_count || 0,
					comments_count: video.comments_count || 0,
					views_count: video.views_count || 0,
					created_at: video.created_at,
					is_liked: videoInteractions.is_liked,
					is_following: videoInteractions.is_following,
					is_subscribed: videoInteractions.is_subscribed,
				};
			});

			return {
				success: true,
				data: { videos: processedVideos },
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get user videos',
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
	 * Upload a new video with thumbnail generation and progress tracking
	 */
	static async uploadVideo(data: {
		videoUri: string;
		title: string;
		description?: string;
		hashtags?: string[];
		isPremium: boolean;
		userId: string;
		startTime?: number;
		endTime?: number;
		thumbnailTime?: number;
		onProgress?: (progress: number) => void;
	}): Promise<AuthResponse<{ videoId: string }>> {
		const { videoUri, title, description, hashtags, isPremium, userId, thumbnailTime, onProgress } = data;
		const timestamp = Date.now();
		const videoFileName = `video_${userId}_${timestamp}.mp4`;
		const thumbnailFileName = `thumbnail_${userId}_${timestamp}.jpg`;
		let thumbnailUrl: string | null = null;

		try {
			console.log('📱 Starting video upload process...');
			onProgress?.(5); // Starting
			
			// Verify authentication first
			const { data: { session }, error: sessionError } = await supabase.auth.getSession();
			if (sessionError || !session || !session.access_token) {
				console.error('❌ Authentication error:', sessionError);
				throw new Error('User not authenticated. Please log in again.');
			}
			
			console.log('✅ User authenticated, proceeding with upload...');
			console.log('🔑 User ID:', session.user.id);
			
			// Verify user ID matches
			if (session.user.id !== userId) {
				throw new Error('User ID mismatch. Please log in again.');
			}
			
			// Generate thumbnail first
			const thumbTime = thumbnailTime !== undefined && thumbnailTime >= 0 ? thumbnailTime : 1;
			try {
				const timeInMilliseconds = Math.round(Number(thumbTime) * 1000);
				const { uri: thumbnailUri } = await getThumbnailAsync(videoUri, {
					time: timeInMilliseconds,
					quality: 0.8,
				});

				if (thumbnailUri) {
					const { error: thumbnailUploadError } = await supabase.storage
						.from('thumbnails')
						.upload(thumbnailFileName, {
							uri: thumbnailUri,
							type: 'image/jpeg',
							name: thumbnailFileName,
						} as any);

					if (!thumbnailUploadError) {
						const { data: thumbUrlData } = supabase.storage
							.from('thumbnails')
							.getPublicUrl(thumbnailFileName);
						thumbnailUrl = thumbUrlData.publicUrl;
						console.log('✅ Thumbnail uploaded successfully');
						onProgress?.(15); // Thumbnail complete
					} else {
						console.warn('⚠️ Thumbnail upload failed:', thumbnailUploadError.message);
					}
				}
			} catch (thumbnailError) {
				console.warn('⚠️ Thumbnail generation failed, continuing without thumbnail:', thumbnailError);
			}
			
			// Upload video with comprehensive diagnostics and fallback strategies
			console.log('📹 Uploading video file...');
			onProgress?.(20); // Starting video upload
			
			// Get file info for debugging
			const videoFileInfo = await FileSystem.getInfoAsync(videoUri);
			
			if (!videoFileInfo.exists) {
				throw new Error('Video file not found at URI');
			}

			// Upload video directly using Supabase client
			console.log('📤 Uploading video to Supabase...');
			onProgress?.(30); // Starting upload
			
			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('videos')
				.upload(videoFileName, {
					uri: videoUri,
					type: 'video/mp4',
					name: videoFileName,
				} as any);
			
			if (uploadError) {
				console.error('❌ Video upload failed:', uploadError);
				// Clean up thumbnail if it was uploaded
				if (thumbnailUrl) {
					await supabase.storage.from('thumbnails').remove([thumbnailFileName]);
				}
				
				// Provide more specific error messages
				if (uploadError.message.includes('row-level security policy')) {
					throw new Error('Authentication error. Please log out and log in again.');
				} else if (uploadError.message.includes('file too large')) {
					throw new Error('Video file is too large. Maximum size is 100MB.');
				} else if (uploadError.message.includes('Network request failed')) {
					throw new Error('Network error. Check your internet connection and try again.');
				} else {
					throw new Error(`Upload failed: ${uploadError.message}`);
				}
			}

			console.log('✅ Video uploaded successfully');
			onProgress?.(85); // Creating database record

			// Get video public URL
			const { data: videoUrlData } = supabase.storage
				.from('videos')
				.getPublicUrl(videoFileName);

			// Insert video record in database
			const { data: videoData, error: dbError } = await supabase
				.from('videos')
				.insert({
					user_id: userId,
					title,
					description: description || '',
					hashtags: hashtags || [],
					video_url: videoUrlData.publicUrl,
					thumbnail_url: thumbnailUrl,
					is_premium: isPremium,
					duration: 0,
				})
				.select('id')
				.single();

			if (dbError) {
				console.error('❌ Database insert failed:', dbError);
				// Clean up uploaded files
				await Promise.all([
					supabase.storage.from('videos').remove([videoFileName]),
					thumbnailUrl ? supabase.storage.from('thumbnails').remove([thumbnailFileName]) : Promise.resolve()
				]);
				return {
					success: false,
					error: `Failed to save video record: ${dbError.message}`,
				};
			}

			console.log('🎉 Video upload completed successfully!');
			onProgress?.(100); // Complete
			return {
				success: true,
				data: { videoId: videoData.id },
			};

		} catch (error) {
			console.error('💥 Video upload process error:', error);
			// Clean up thumbnail if it was uploaded
			try {
				if (thumbnailUrl) {
					await supabase.storage.from('thumbnails').remove([thumbnailFileName]);
				}
			} catch (cleanupError) {
				console.warn('Failed to cleanup thumbnail:', cleanupError);
			}
			
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to upload video',
			};
		}
	}

	/**
	 * Hide a video (soft delete)
	 */
	static async hideVideo(videoId: string): Promise<AuthResponse<void>> {
		try {
			const { error } = await supabase
				.from('videos')
				.update({
					is_hidden: true,
					hidden_at: new Date().toISOString(),
				})
				.eq('id', videoId);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to hide video',
			};
		}
	}

	/**
	 * Show a hidden video
	 */
	static async showVideo(videoId: string): Promise<AuthResponse<void>> {
		try {
			const { error } = await supabase
				.from('videos')
				.update({
					is_hidden: false,
					hidden_at: null,
				})
				.eq('id', videoId);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to show video',
			};
		}
	}

	/**
	 * Get videos by specific hashtag
	 */
	static async getVideosByHashtag(
		hashtag: string,
		viewerId: string,
		limit = 10,
		offset = 0,
	): Promise<
		AuthResponse<{
			videos: Video[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			if (!hashtag || !viewerId) {
				return {
					success: true,
					data: {
						videos: [],
						hasMore: false,
						total: 0,
					},
				};
			}

			// Search for videos that contain this specific hashtag in their hashtags array
			const page = Math.floor(offset / limit);
			
			let query = supabase
				.from('videos')
				.select(`
					*,
					user:profiles!videos_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url,
						subscription_price,
						subscription_currency
					)
				`)
				.contains('hashtags', [hashtag])
				.eq('is_hidden', false)
				.order('created_at', { ascending: false });

			// Add pagination
			if (offset > 0) {
				query = query.range(offset, offset + limit - 1);
			} else {
				query = query.limit(limit);
			}

			const { data, error, count } = await query;

			if (error) {
				console.error('❌ Error searching videos by hashtag:', error);
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

			// Get interactions for these videos
			const videoIds = data.map(v => v.id);
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

			// Process videos
			const processedVideos: Video[] = data.map((video: any) => {
				const videoInteractions = interactions[video.id] || {
					is_liked: false,
					is_following: false,
					is_subscribed: false,
					can_access: true,
				};

				return {
					id: video.id,
					user_id: video.user_id,
					user: video.user || {
						id: video.user_id,
						username: 'Unknown',
						display_name: 'Unknown User',
						avatar_url: null,
						subscription_price: null,
						subscription_currency: null,
					},
					title: video.title,
					description: video.description,
					hashtags: video.hashtags || [],
					video_url: video.video_url,
					thumbnail_url: video.thumbnail_url,
					duration: video.duration,
					is_premium: video.is_premium || false,
					is_hidden: video.is_hidden || false,
					hidden_at: video.hidden_at,
					likes_count: video.likes_count || 0,
					comments_count: video.comments_count || 0,
					views_count: video.views_count || 0,
					created_at: video.created_at,
					is_liked: videoInteractions.is_liked,
					is_following: videoInteractions.is_following,
					is_subscribed: videoInteractions.is_subscribed,
				};
			});

			console.log(`🔍 Found ${processedVideos.length} videos for hashtag "${hashtag}"`);

			// Calculate if there are more results
			const total = count || 0;
			const hasMore = offset + limit < total;

			return {
				success: true,
				data: {
					videos: processedVideos,
					hasMore,
					total,
				},
			};
		} catch (error) {
			console.error('❌ Error in getVideosByHashtag:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to get videos by hashtag',
			};
		}
	}

	/**
	 * Delete a video permanently
	 */
	static async deleteVideo(videoId: string): Promise<AuthResponse<void>> {
		try {
			// First get the video to get file URLs
			const { data: video, error: fetchError } = await supabase
				.from('videos')
				.select('video_url, thumbnail_url')
				.eq('id', videoId)
				.single();

			if (fetchError) {
				return {
					success: false,
					error: fetchError.message,
				};
			}

			// Extract file names from URLs for deletion
			const videoFileName = video.video_url?.split('/').pop();
			const thumbnailFileName = video.thumbnail_url?.split('/').pop();

			// Delete from database first
			const { error: deleteError } = await supabase
				.from('videos')
				.delete()
				.eq('id', videoId);

			if (deleteError) {
				return {
					success: false,
					error: deleteError.message,
				};
			}

			// Delete files from storage (don't fail if this doesn't work)
			const deletePromises = [];
			
			if (videoFileName) {
				deletePromises.push(
					supabase.storage.from('videos').remove([videoFileName])
				);
			}
			
			if (thumbnailFileName) {
				deletePromises.push(
					supabase.storage.from('thumbnails').remove([thumbnailFileName])
				);
			}

			// Execute deletions in parallel, but don't wait for them to complete
			Promise.all(deletePromises).catch(error => 
				console.warn('Failed to delete some storage files:', error)
			);

			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to delete video',
			};
		}
	}

}
