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
		includeHidden: boolean = false,
	): Promise<AuthResponse<{ videos: Video[] }>> {
		try {
			let query = supabase
				.from('videos')
				.select(
					`
					*,
					user:profiles!videos_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url,
						subscription_price,
						subscription_currency
					)
				`,
				)
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
			const videoIds = data.map((v) => v.id);
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
				error:
					error instanceof Error ? error.message : 'Failed to get user videos',
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
	 * Upload a new video with real compression using react-native-compressor
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
		const {
			videoUri,
			title,
			description,
			hashtags,
			isPremium,
			userId,
			thumbnailTime,
			onProgress,
		} = data;
		const timestamp = Date.now();
		const videoFileName = `${userId}/video_${timestamp}.mp4`;
		const thumbnailFileName = `${userId}/thumbnail_${timestamp}.jpg`;
		let thumbnailUrl: string | null = null;
		let compressedVideoUri: string | null = null;
		let compressionCancellationId: string | undefined;

		try {
			console.log('🚀 Starting REAL video upload process...');
			onProgress?.(5);

			// Step 1: Verify authentication with retry
			await this.verifyAuthenticationWithRetry();
			console.log('✅ Authentication verified');
			onProgress?.(10);

			// Step 2: ✅ ACTIVAR BACKGROUND TASK (opcional)
			try {
				const { VideoCompression } = await import(
					'@/services/videoCompression'
				);
				await VideoCompression.activateBackgroundTask();
			} catch (bgError) {
				console.warn('⚠️ Background task not activated (optional):', bgError);
			}

			// Step 3: ✅ COMPRESIÓN REAL OBLIGATORIA
			console.log('🔄 Starting REAL video compression...');
			const compressionResult = await this.compressVideoStandard(videoUri, {
				onProgress: (progress) => {
					// Map compression progress to 10-50% of total
					const totalProgress = 10 + progress * 0.4;
					onProgress?.(totalProgress);
				},
			});

			if (!compressionResult.success || !compressionResult.uri) {
				throw new Error(`REAL compression failed: ${compressionResult.error}`);
			}

			compressedVideoUri = compressionResult.uri;
			compressionCancellationId = compressionResult.cancellationId;

			// Log compression stats
			if (compressionResult.compressionRatio) {
				console.log(
					`✅ REAL compression ratio: ${compressionResult.compressionRatio.toFixed(
						1,
					)}x`,
				);
			}

			onProgress?.(50);

			// Step 4: Generate thumbnail from compressed video
			console.log('🖼️ Generating thumbnail...');
			try {
				const thumbTime =
					thumbnailTime !== undefined && thumbnailTime >= 0 ? thumbnailTime : 1;
				const timeInMilliseconds = Math.round(Number(thumbTime) * 1000);

				const { uri: thumbnailUri } = await getThumbnailAsync(
					compressedVideoUri,
					{
						time: timeInMilliseconds,
						quality: 0.8,
					},
				);

				if (thumbnailUri) {
					const thumbnailUploadResult = await this.uploadThumbnailWithRetry(
						'thumbnails',
						thumbnailFileName,
						thumbnailUri,
						'image/jpeg',
					);

					if (thumbnailUploadResult.success) {
						const { data: thumbUrlData } = supabase.storage
							.from('thumbnails')
							.getPublicUrl(thumbnailFileName);
						thumbnailUrl = thumbUrlData.publicUrl;
						console.log('✅ Thumbnail uploaded successfully');
					}
				}
			} catch (thumbnailError) {
				console.warn('⚠️ Thumbnail generation failed:', thumbnailError);
			}

			onProgress?.(60);

			// Step 5: ✅ UPLOAD con verificación de tamaño
			console.log('📤 Uploading compressed video...');

			// Verificar tamaño antes de upload
			const compressedInfo = await FileSystem.getInfoAsync(compressedVideoUri);
			const compressedSizeMB =
				'size' in compressedInfo ? compressedInfo.size / (1024 * 1024) : 0;

			if (compressedSizeMB > 100) {
				throw new Error(
					`Compressed video too large: ${compressedSizeMB.toFixed(
						2,
					)}MB. Maximum allowed: 100MB`,
				);
			}

			console.log(
				`📦 Uploading compressed video: ${compressedSizeMB.toFixed(2)}MB`,
			);

			const videoUploadResult = await this.uploadFileWithTUS(
				'videos',
				videoFileName,
				compressedVideoUri,
				{
					onProgress: (progress) => {
						// Map upload progress to 60-90% of total
						const totalProgress = 60 + progress * 0.3;
						onProgress?.(totalProgress);
					},
				},
			);

			if (!videoUploadResult.success) {
				throw new Error(`Video upload failed: ${videoUploadResult.error}`);
			}

			console.log('✅ Video uploaded successfully');
			onProgress?.(90);

			// Step 6: Create database record
			const { data: videoUrlData } = supabase.storage
				.from('videos')
				.getPublicUrl(videoFileName);

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
				await Promise.all([
					this.cleanupFile('videos', videoFileName),
					thumbnailUrl
						? this.cleanupFile('thumbnails', thumbnailFileName)
						: Promise.resolve(),
				]);
				throw new Error(`Failed to save video record: ${dbError.message}`);
			}

			console.log('🎉 Video upload completed with REAL compression!');
			onProgress?.(100);

			// Cleanup
			await this.cleanupTempFile(compressedVideoUri);

			return {
				success: true,
				data: { videoId: videoData.id },
			};
		} catch (error) {
			console.error('💥 Video upload error:', error);

			// Cancel compression if active
			if (compressionCancellationId) {
				try {
					const { VideoCompression } = await import(
						'@/services/videoCompression'
					);
					VideoCompression.cancelCompression(compressionCancellationId);
				} catch (cancelError) {
					console.warn('Failed to cancel compression:', cancelError);
				}
			}

			// Cleanup files
			await Promise.all([
				this.cleanupFile('videos', videoFileName),
				thumbnailUrl
					? this.cleanupFile('thumbnails', thumbnailFileName)
					: Promise.resolve(),
				compressedVideoUri
					? this.cleanupTempFile(compressedVideoUri)
					: Promise.resolve(),
			]);

			return {
				success: false,
				error: this.getErrorMessage(error),
			};
		} finally {
			// ✅ DESACTIVAR BACKGROUND TASK (opcional)
			try {
				const { VideoCompression } = await import(
					'@/services/videoCompression'
				);
				await VideoCompression.deactivateBackgroundTask();
				await VideoCompression.cleanupTempFiles();
			} catch (cleanupError) {
				console.warn('⚠️ Cleanup warning (optional):', cleanupError);
			}
		}
	}

	/**
	 * Compress video with standard settings using react-native-compressor
	 * Always compress for consistency using real compression
	 */
	private static async compressVideoStandard(
		videoUri: string,
		options: { onProgress?: (progress: number) => void } = {},
	): Promise<{
		success: boolean;
		uri?: string;
		error?: string;
		compressionRatio?: number;
		cancellationId?: string;
	}> {
		try {
			console.log(
				'🎯 Starting REAL compression with react-native-compressor...',
			);

			// Import VideoCompression service
			const { VideoCompression } = await import('@/services/videoCompression');

			// Get original file size for logging
			const originalInfo = await FileSystem.getInfoAsync(videoUri);
			const originalSizeMB =
				'size' in originalInfo ? originalInfo.size / (1024 * 1024) : 0;

			console.log(`📹 Original size: ${originalSizeMB.toFixed(2)}MB`);

			// ✅ CONFIGURACIÓN ESTÁNDAR FIJA para compresión real
			const compressionSettings: Parameters<
				typeof VideoCompression.compressVideo
			>[1] = {
				quality: 'high' as const,
				maxFileSize: 100,
				resolution: '1080p' as const,
				fps: 30,
				bitrate: 1500, // 1.5 Mbps
				format: 'mp4' as const,
				onProgress: options.onProgress,
			};

			console.log('🔧 Using compression settings:', compressionSettings);

			// ✅ USAR COMPRESIÓN REAL
			const result = await VideoCompression.compressVideo(
				videoUri,
				compressionSettings,
			);

			if (result.success && result.uri) {
				// Verificar el resultado
				const compressedInfo = await FileSystem.getInfoAsync(result.uri);
				const compressedSizeMB =
					'size' in compressedInfo ? compressedInfo.size / (1024 * 1024) : 0;
				const ratio =
					originalSizeMB > 0 ? originalSizeMB / compressedSizeMB : 1;

				console.log(
					`🎉 REAL compression complete: ${originalSizeMB.toFixed(
						2,
					)}MB → ${compressedSizeMB.toFixed(2)}MB (${ratio.toFixed(
						1,
					)}x reduction)`,
				);

				// ✅ VERIFICAR QUE REALMENTE SE COMPRIMIÓ
				if (ratio < 1.5 && originalSizeMB > 30) {
					console.warn(
						`⚠️ Compression ratio too low (${ratio.toFixed(
							1,
						)}x) for large file. May need different settings.`,
					);
				}

				return {
					success: true,
					uri: result.uri,
					compressionRatio: ratio,
					cancellationId: result.cancellationId,
				};
			}

			return {
				success: false,
				error: result.error || 'REAL compression failed',
			};
		} catch (error) {
			console.error('❌ REAL compression error:', error);
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'REAL compression failed',
			};
		}
	}

	private static isErrorWithMessage(
		error: unknown,
	): error is { message: string } {
		return (
			typeof error === 'object' &&
			error !== null &&
			'message' in error &&
			typeof (error as { message: unknown }).message === 'string'
		);
	}

	/**
	 * Upload file with TUS protocol for resumable uploads (videos)
	 */
	private static async uploadFileWithTUS(
		bucket: string,
		fileName: string,
		fileUri: string,
		options: {
			onProgress?: (progress: number) => void;
			maxRetries?: number;
		} = {},
	): Promise<{ success: boolean; error?: string }> {
		const { onProgress } = options;

		try {
			const fileInfo = await FileSystem.getInfoAsync(fileUri);
			if (!fileInfo.exists) {
				return { success: false, error: `File not found: ${fileUri}` };
			}

			const fileSizeMB = 'size' in fileInfo ? fileInfo.size / (1024 * 1024) : 0;
			console.log(
				`📤 Preparing TUS upload ${fileName}: ${fileSizeMB.toFixed(2)}MB`,
			);

			// Get authentication session
			const {
				data: { session },
				error: sessionError,
			} = await supabase.auth.getSession();
			if (sessionError || !session?.access_token) {
				throw new Error('Authentication required for TUS upload');
			}

			// Read file as blob for TUS
			const response = await fetch(`file://${fileUri}`);
			const fileBlob = await response.blob();

			// Get project ID from Supabase URL
			const projectId =
				process.env.EXPO_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0];
			if (!projectId) {
				throw new Error('Could not extract project ID from Supabase URL');
			}

			// Import TUS client
			const tus = require('tus-js-client');

			return new Promise((resolve, reject) => {
				const upload = new tus.Upload(fileBlob, {
					// Use direct storage hostname for better performance
					endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
					retryDelays: [0, 3000, 5000, 10000, 20000],
					headers: {
						authorization: `Bearer ${session.access_token}`,
						'x-upsert': 'true', // Allow overwriting existing files
					},
					uploadDataDuringCreation: true,
					removeFingerprintOnSuccess: true,
					metadata: {
						bucketName: bucket,
						objectName: fileName,
						contentType: 'video/mp4',
						cacheControl: '3600',
					},
					chunkSize: 6 * 1024 * 1024, // 6MB chunks as required by Supabase
					onError: function (error: any) {
						console.error('❌ TUS upload failed:', error);
						reject(new Error(`TUS upload failed: ${error.message || error}`));
					},
					onProgress: function (bytesUploaded: number, bytesTotal: number) {
						const percentage = (bytesUploaded / bytesTotal) * 100;
						console.log(`📊 TUS Progress: ${percentage.toFixed(1)}%`);
						onProgress?.(percentage);
					},
					onSuccess: function () {
						console.log('✅ TUS upload completed successfully');
						resolve({ success: true });
					},
				});

				// Check for previous uploads and resume if possible
				upload
					.findPreviousUploads()
					.then((previousUploads: any[]) => {
						if (previousUploads.length) {
							console.log('🔄 Resuming previous TUS upload');
							upload.resumeFromPreviousUpload(previousUploads[0]);
						}
						// Start the upload
						upload.start();
					})
					.catch((error: any) => {
						console.error('❌ Failed to check previous uploads:', error);
						// Start fresh upload anyway
						upload.start();
					});
			});
		} catch (error) {
			console.error('💥 TUS upload setup error:', error);
			return {
				success: false,
				error: this.getErrorMessage(error),
			};
		}
	}

	/**
	 * Upload file with retry logic (fallback for thumbnails)
	 */
	private static async uploadFileWithRetry(
		bucket: string,
		fileName: string,
		fileUri: string,
		contentType: string,
		options: {
			onProgress?: (progress: number) => void;
			maxRetries?: number;
		} = {},
	): Promise<{ success: boolean; error?: string }> {
		const { maxRetries = 5, onProgress } = options;
		let lastError: any;

		const fileInfo = await FileSystem.getInfoAsync(fileUri);
		if (!fileInfo.exists) {
			return { success: false, error: `File not found: ${fileUri}` };
		}

		const fileSizeMB = 'size' in fileInfo ? fileInfo.size / (1024 * 1024) : 0;
		console.log(
			`📤 Preparing to upload ${fileName}: ${fileSizeMB.toFixed(2)}MB`,
		);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(
					`📤 Upload attempt ${attempt}/${maxRetries} for ${fileName}`,
				);

				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();
				if (sessionError || !session) {
					throw new Error('Authentication required before upload');
				}

				// ✅ Para archivos más grandes (videos), usar FileSystem.uploadAsync con fetch
				// Este método funciona mejor con archivos binarios grandes en React Native

				// 1. Usar la sesión ya obtenida anteriormente
				if (!session?.access_token) {
					throw new Error('No valid authentication token found');
				}

				// 2. Usar FileSystem.uploadAsync para manejar archivos grandes correctamente
				const uploadResponse = await FileSystem.uploadAsync(
					`${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`,
					fileUri,
					{
						fieldName: 'file',
						httpMethod: 'POST',
						uploadType: FileSystem.FileSystemUploadType.MULTIPART,
						headers: {
							Authorization: `Bearer ${session.access_token}`,
							'x-upsert': 'false',
						},
						parameters: {
							// Parámetros adicionales si son necesarios
						},
					},
				);

				// 3. Verificar la respuesta
				if (uploadResponse.status !== 200) {
					const responseBody = uploadResponse.body;
					throw new Error(
						`Upload failed with status ${uploadResponse.status}: ${responseBody}`,
					);
				}

				console.log(`✅ Upload successful on attempt ${attempt}`);
				onProgress?.(100);
				return { success: true };
			} catch (error) {
				lastError = error;
				console.error(`❌ Upload attempt ${attempt} failed:`, error);

				// ... (la lógica de reintentos se mantiene igual)
				if (this.isErrorWithMessage(error)) {
					const message = error.message.toLowerCase();
					if (
						message.includes('already exists') ||
						message.includes('file too large')
					) {
						console.log(
							'🚫 Not retrying due to permanent error type:',
							message,
						);
						break;
					}
				}

				if (attempt < maxRetries) {
					const delay = Math.min(Math.pow(2, attempt) * 1000, 10000);
					console.log(`⏳ Retrying in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		return {
			success: false,
			error: this.getErrorMessage(lastError),
		};
	}

	/**
	 * Upload THUMBNAIL with retry logic using the React Native specific method.
	 */
	private static async uploadThumbnailWithRetry(
		bucket: string,
		fileName: string,
		fileUri: string,
		contentType: string,
		options: {
			maxRetries?: number;
		} = {},
	): Promise<{ success: boolean; error?: string }> {
		const { maxRetries = 3 } = options; // Menos reintentos para archivos pequeños
		let lastError: any;

		// Verificar si el archivo existe
		const fileInfo = await FileSystem.getInfoAsync(fileUri);
		if (!fileInfo.exists) {
			return { success: false, error: `Thumbnail file not found: ${fileUri}` };
		}

		console.log(`🖼️ Preparing to upload thumbnail ${fileName}`);

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(
					`🖼️ Thumbnail Upload attempt ${attempt}/${maxRetries} for ${fileName}`,
				);

				const {
					data: { session },
					error: sessionError,
				} = await supabase.auth.getSession();
				if (sessionError || !session) {
					throw new Error('Authentication required before upload');
				}

				// ✅ Usamos el método de subida específico para React Native que funciona para imágenes
				const { data, error } = await supabase.storage.from(bucket).upload(
					fileName,
					{
						uri: fileUri,
						type: contentType,
						name: fileName,
					} as any,
					{
						upsert: false, // No sobrescribir
					},
				);

				if (error) {
					throw error;
				}

				console.log(`✅ Thumbnail upload successful on attempt ${attempt}`);
				return { success: true };
			} catch (error) {
				lastError = error;
				console.error(`❌ Thumbnail upload attempt ${attempt} failed:`, error);

				if (attempt < maxRetries) {
					const delay = Math.pow(2, attempt) * 500; // Delay más corto
					console.log(`⏳ Retrying thumbnail upload in ${delay}ms...`);
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		return {
			success: false,
			error: this.getErrorMessage(lastError),
		};
	}

	/**
	 * Verify authentication with retry
	 */
	private static async verifyAuthenticationWithRetry(
		maxRetries: number = 2,
	): Promise<void> {
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				const {
					data: { session },
					error,
				} = await supabase.auth.getSession();

				if (error) {
					throw new Error(`Authentication error: ${error.message}`);
				}

				if (!session || !session.access_token) {
					throw new Error('No valid session found');
				}

				// Additional check: verify token is not expired
				const now = Math.floor(Date.now() / 1000);
				if (session.expires_at && session.expires_at < now) {
					throw new Error('Session token expired');
				}

				return; // Success
			} catch (error) {
				if (attempt < maxRetries) {
					console.warn(
						`⚠️ Auth verification attempt ${attempt} failed, retrying...`,
					);
					// Try to refresh session
					try {
						await supabase.auth.refreshSession();
					} catch (refreshError) {
						console.warn('Session refresh failed:', refreshError);
					}
					await new Promise((resolve) => setTimeout(resolve, 1000));
				} else {
					throw error;
				}
			}
		}
	}

	/**
	 * Clean up uploaded file
	 */
	private static async cleanupFile(
		bucket: string,
		fileName: string,
	): Promise<void> {
		try {
			await supabase.storage.from(bucket).remove([fileName]);
			console.log(`🧹 Cleaned up ${bucket}/${fileName}`);
		} catch (error) {
			console.warn(`Failed to cleanup ${bucket}/${fileName}:`, error);
		}
	}

	/**
	 * Clean up temporary file with better detection for react-native-compressor files
	 */
	private static async cleanupTempFile(fileUri: string): Promise<void> {
		try {
			if (
				fileUri &&
				(fileUri.includes('cache') ||
					fileUri.includes('tmp') ||
					fileUri.includes('compressed') ||
					fileUri.includes('Documents'))
			) {
				await FileSystem.deleteAsync(fileUri, { idempotent: true });
				console.log(`🧹 Cleaned up temp file: ${fileUri}`);
			}
		} catch (error) {
			console.warn(`Failed to cleanup temp file ${fileUri}:`, error);
		}
	}

	/**
	 * Enhanced error message handling for compression-specific errors
	 */
	private static getErrorMessage(error: any): string {
		if (typeof error === 'string') return error;
		if (error instanceof Error) return error.message;

		if (error?.message) {
			const message = error.message.toLowerCase();

			// Errores de compresión
			if (message.includes('compression cancelled')) {
				return 'Video compression was cancelled. Please try again.';
			}
			if (message.includes('compression failed')) {
				return 'Video compression failed. Please try with a different video or check your device storage.';
			}
			if (message.includes('format not supported')) {
				return 'Video format not supported. Please use MP4 format.';
			}

			// Errores de upload
			if (message.includes('file too large')) {
				return 'Video file is too large even after compression. Please try a shorter video.';
			}
			if (message.includes('network request failed')) {
				return 'Network error during upload. Please check your internet connection and try again.';
			}
			if (message.includes('row-level security')) {
				return 'Authentication error. Please log out and log in again.';
			}
			if (message.includes('already exists')) {
				return 'A file with this name already exists. Please try again.';
			}

			return error.message;
		}

		return 'Upload failed. Please try again.';
	}

	/**
	 * Cancel upload process if in progress
	 */
	static async cancelUpload(): Promise<void> {
		try {
			const { VideoCompression } = await import('@/services/videoCompression');

			// Cancel all active compressions
			VideoCompression.cancelAllCompressions();

			// Clean up temp files
			await VideoCompression.cleanupTempFiles();

			console.log('🛑 Upload process cancelled');
		} catch (error) {
			console.warn('Failed to cancel upload:', error);
		}
	}

	/**
	 * Get upload status and active operations
	 */
	static async getUploadStatus(): Promise<{
		hasActiveCompressions: boolean;
		activeCompressionIds: string[];
	}> {
		try {
			const { VideoCompression } = await import('@/services/videoCompression');

			return {
				hasActiveCompressions: VideoCompression.hasActiveCompressions(),
				activeCompressionIds: VideoCompression.getActiveCompressions(),
			};
		} catch (error) {
			console.warn('Failed to get upload status:', error);
			return {
				hasActiveCompressions: false,
				activeCompressionIds: [],
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
				.select(
					`
					*,
					user:profiles!videos_user_id_fkey (
						id,
						username,
						display_name,
						avatar_url,
						subscription_price,
						subscription_currency
					)
				`,
				)
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
			const videoIds = data.map((v) => v.id);
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

			console.log(
				`🔍 Found ${processedVideos.length} videos for hashtag "${hashtag}"`,
			);

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
				error:
					error instanceof Error
						? error.message
						: 'Failed to get videos by hashtag',
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
					supabase.storage.from('videos').remove([videoFileName]),
				);
			}

			if (thumbnailFileName) {
				deletePromises.push(
					supabase.storage.from('thumbnails').remove([thumbnailFileName]),
				);
			}

			// Execute deletions in parallel, but don't wait for them to complete
			Promise.all(deletePromises).catch((error) =>
				console.warn('Failed to delete some storage files:', error),
			);

			return {
				success: true,
				data: undefined,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to delete video',
			};
		}
	}
}
