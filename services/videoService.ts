import { supabase } from '@/lib/supabase';
import { AuthResponse, Video } from '@/shared/types';
import { getThumbnailAsync } from 'expo-video-thumbnails';
import * as FileSystem from 'expo-file-system';

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
	 * Upload a new video with immediate thumbnail generation
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
	}): Promise<AuthResponse<{ videoId: string }>> {
		try {
			const { videoUri, title, description, hashtags, isPremium, userId, thumbnailTime } = data;

			// Generate unique filenames
			const timestamp = Date.now();
			const videoFileName = `video_${userId}_${timestamp}.mp4`;
			const thumbnailFileName = `thumbnail_${userId}_${timestamp}.jpg`;
			
			// Get auth session
			const { data: { session } } = await supabase.auth.getSession();
			const authToken = session?.access_token;
			
			if (!authToken) {
				throw new Error('No authentication token found');
			}

			let thumbnailUrl: string | null = null;

			// Generate thumbnail - use specified time or default to 1 second
			const thumbTime = thumbnailTime !== undefined && thumbnailTime >= 0 ? thumbnailTime : 1;
			
			try {
				const timeInMilliseconds = Math.round(Number(thumbTime) * 1000);
				
				// Generate thumbnail using expo-video-thumbnails
				const { uri: thumbnailUri } = await getThumbnailAsync(videoUri, {
					time: timeInMilliseconds,
					quality: 0.8,
				});

				if (thumbnailUri) {
					// Upload thumbnail using Supabase client
					const { error: thumbnailUploadError } = await supabase.storage
						.from('thumbnails')
						.upload(thumbnailFileName, {
							uri: thumbnailUri,
							type: 'image/jpeg',
							name: thumbnailFileName,
						} as any);

					if (!thumbnailUploadError) {
						// Get thumbnail public URL
						const { data: thumbUrlData } = supabase.storage
							.from('thumbnails')
							.getPublicUrl(thumbnailFileName);
						
						thumbnailUrl = thumbUrlData.publicUrl;
					}
				}
			} catch (thumbnailError) {
				console.error('Failed to generate thumbnail:', thumbnailError);
				// Continue without thumbnail rather than failing the whole upload
			}
			
			// Comprehensive diagnostic before upload
			console.log('=== STARTING COMPLETE SUPABASE DIAGNOSTIC ===');
			
			// 1. Check authentication
			console.log('1. Checking authentication...');
			console.log('Auth token present:', !!authToken);
			console.log('Auth token length:', authToken?.length);
			console.log('User ID:', userId);
			
			// 2. Check bucket access with detailed logging
			console.log('2. Checking videos bucket access...');
			try {
				const { data: files, error: listError } = await supabase.storage
					.from('videos')
					.list('', { limit: 1 });
				
				if (listError) {
					console.error('BUCKET ACCESS ERROR:', listError);
					console.error('Error code:', listError.statusCode);
					console.error('Error message:', listError.message);
					throw new Error(`Videos bucket issue: ${listError.message} (Code: ${listError.statusCode})`);
				}
				console.log('✅ Videos bucket accessible, files:', files?.length || 0);
			} catch (bucketError) {
				console.error('BUCKET CHECK FAILED:', bucketError);
				throw bucketError;
			}
			
			// 3. Test small upload first to isolate the issue
			console.log('3. Testing small file upload to videos bucket...');
			try {
				const testFileName = `test_${Date.now()}.txt`;
				const testContent = 'Test upload to videos bucket';
				
				const { error: testUploadError } = await supabase.storage
					.from('videos')
					.upload(testFileName, testContent, {
						contentType: 'text/plain'
					});
				
				if (testUploadError) {
					console.error('SMALL FILE UPLOAD FAILED:', testUploadError);
					console.error('Test upload error code:', testUploadError.statusCode);
					console.error('Test upload error message:', testUploadError.message);
					throw new Error(`Videos bucket upload test failed: ${testUploadError.message}`);
				} else {
					console.log('✅ Small file upload successful');
					// Clean up test file
					await supabase.storage.from('videos').remove([testFileName]);
					console.log('✅ Test file cleaned up');
				}
			} catch (testError) {
				console.error('TEST UPLOAD ERROR:', testError);
				throw testError;
			}
			
			// 4. Check if we can upload video using Supabase client first
			console.log('4. Testing video upload with Supabase client...');
			try {
				const { data: videoUploadData, error: videoUploadError } = await supabase.storage
					.from('videos')
					.upload(videoFileName, {
						uri: videoUri,
						type: 'video/mp4',
						name: videoFileName,
					} as any);
				
				if (videoUploadError) {
					console.error('SUPABASE CLIENT UPLOAD FAILED:', videoUploadError);
					console.error('Client error code:', videoUploadError.statusCode);
					console.error('Client error message:', videoUploadError.message);
					console.log('Will try fetch method as fallback...');
				} else {
					console.log('✅ SUPABASE CLIENT UPLOAD SUCCESSFUL!');
					console.log('Upload data:', videoUploadData);
					
					// Get video public URL and complete upload
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
						await Promise.all([
							supabase.storage.from('videos').remove([videoFileName]),
							thumbnailUrl ? supabase.storage.from('thumbnails').remove([thumbnailFileName]) : Promise.resolve()
						]);
						return {
							success: false,
							error: `Failed to save video record: ${dbError.message}`,
						};
					}

					return {
						success: true,
						data: { videoId: videoData.id },
					};
				}
			} catch (clientUploadError) {
				console.error('SUPABASE CLIENT EXCEPTION:', clientUploadError);
				console.log('Will try fetch method as fallback...');
			}
			
			console.log('=== FALLING BACK TO FETCH METHOD ===');

			// Get video file info for better debugging
			const videoFileInfo = await FileSystem.getInfoAsync(videoUri);
			console.log('Video file info:', {
				exists: videoFileInfo.exists,
				size: videoFileInfo.size,
				isDirectory: videoFileInfo.isDirectory,
				uri: videoUri,
			});
			
			// Check if file is too large (100MB = 104,857,600 bytes)
			const MAX_FILE_SIZE = 104857600; // 100MB
			if (videoFileInfo.size && videoFileInfo.size > MAX_FILE_SIZE) {
				throw new Error(`Video file too large: ${Math.round(videoFileInfo.size / 1024 / 1024)}MB. Maximum allowed: 100MB`);
			}
			
			const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
			const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${videoFileName}`;
			console.log('Upload URL:', uploadUrl);
			console.log('Video file size:', videoFileInfo.size ? `${Math.round(videoFileInfo.size / 1024 / 1024 * 100) / 100}MB` : 'Unknown');
			
			// Strategy 1: Try direct fetch with binary data instead of FormData
			console.log('=== STRATEGY 1: BINARY UPLOAD ===');
			const attemptBinaryUpload = async (): Promise<Response | null> => {
				try {
					console.log('Reading video file as binary...');
					const videoData = await FileSystem.readAsStringAsync(videoUri, {
						encoding: FileSystem.EncodingType.Base64,
					});
					
					console.log('Converting base64 to binary...');
					const binaryString = atob(videoData);
					const bytes = new Uint8Array(binaryString.length);
					for (let i = 0; i < binaryString.length; i++) {
						bytes[i] = binaryString.charCodeAt(i);
					}
					
					console.log('Uploading binary data...');
					const response = await fetch(uploadUrl, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${authToken}`,
							'Content-Type': 'video/mp4',
							'Content-Length': bytes.length.toString(),
						},
						body: bytes,
					});
					
					console.log('Binary upload response status:', response.status);
					return response;
				} catch (error) {
					console.error('Binary upload failed:', error);
					return null;
				}
			};
			
			// Strategy 2: FormData upload with iOS fixes
			const attemptFormDataUpload = async (retryCount = 0): Promise<Response | null> => {
				try {
					console.log(`=== STRATEGY 2: FORMDATA UPLOAD (Attempt ${retryCount + 1}) ===`);
					
					const videoFormData = new FormData();
					// iOS fix: Use file:// protocol explicitly
					const fileUri = videoUri.startsWith('file://') ? videoUri : `file://${videoUri}`;
					
					videoFormData.append('file', {
						uri: fileUri,
						type: 'video/mp4',
						name: videoFileName,
					} as any);
					
					const response = await fetch(uploadUrl, {
						method: 'POST',
						headers: {
							'Authorization': `Bearer ${authToken}`,
							// Let React Native set Content-Type automatically
						},
						body: videoFormData,
					});
					
					console.log(`FormData attempt ${retryCount + 1} response status:`, response.status);
					
					if (!response.ok && retryCount < 2) {
						console.log('FormData upload failed, retrying...');
						await new Promise(resolve => setTimeout(resolve, 1500));
						return attemptFormDataUpload(retryCount + 1);
					}
					
					return response;
				} catch (error) {
					console.error(`FormData upload attempt ${retryCount + 1} failed:`, error);
					if (retryCount < 2) {
						await new Promise(resolve => setTimeout(resolve, 1500));
						return attemptFormDataUpload(retryCount + 1);
					}
					return null;
				}
			};
			
			// Strategy 3: XMLHttpRequest approach
			const attemptXHRUpload = async (): Promise<Response | null> => {
				return new Promise((resolve) => {
					try {
						console.log('=== STRATEGY 3: XMLHttpRequest UPLOAD ===');
						
						const xhr = new XMLHttpRequest();
						xhr.open('POST', uploadUrl, true);
						xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
						
						xhr.onload = function() {
							console.log('XHR upload response status:', xhr.status);
							resolve(new Response(xhr.responseText, { 
								status: xhr.status,
								statusText: xhr.statusText 
							}));
						};
						
						xhr.onerror = function() {
							console.error('XHR upload error');
							resolve(null);
						};
						
						const formData = new FormData();
						formData.append('file', {
							uri: videoUri,
							type: 'video/mp4',
							name: videoFileName,
						} as any);
						
						xhr.send(formData);
					} catch (error) {
						console.error('XHR upload setup failed:', error);
						resolve(null);
					}
				});
			};
			
			// Try all upload strategies in order
			let response: Response | null = null;
			let lastError: string = '';
			
			try {
				// Strategy 1: Binary upload (best for iOS)
				response = await attemptBinaryUpload();
				if (response && response.ok) {
					console.log('✅ Binary upload successful!');
				} else if (response) {
					const errorText = await response.text();
					lastError = `Binary upload failed: HTTP ${response.status} - ${errorText}`;
					console.log('❌ Binary upload failed, trying FormData...');
					response = null;
				}
			} catch (error) {
				console.log('❌ Binary upload threw error, trying FormData...');
				lastError = `Binary upload error: ${error.message}`;
				response = null;
			}
			
			// Strategy 2: FormData upload (standard approach with retries)
			if (!response) {
				try {
					response = await attemptFormDataUpload();
					if (response && response.ok) {
						console.log('✅ FormData upload successful!');
					} else if (response) {
						const errorText = await response.text();
						lastError = `FormData upload failed: HTTP ${response.status} - ${errorText}`;
						console.log('❌ FormData upload failed, trying XHR...');
						response = null;
					}
				} catch (error) {
					console.log('❌ FormData upload threw error, trying XHR...');
					lastError = `FormData upload error: ${error.message}`;
					response = null;
				}
			}
			
			// Strategy 3: XMLHttpRequest (last resort)
			if (!response) {
				try {
					response = await attemptXHRUpload();
					if (response && response.ok) {
						console.log('✅ XHR upload successful!');
					} else if (response) {
						const errorText = await response.text();
						lastError = `XHR upload failed: HTTP ${response.status} - ${errorText}`;
						console.log('❌ XHR upload failed');
						response = null;
					}
				} catch (error) {
					console.log('❌ XHR upload threw error');
					lastError = `XHR upload error: ${error.message}`;
					response = null;
				}
			}
			
			// If all strategies failed
			if (!response || !response.ok) {
				console.error('All upload strategies failed. Last error:', lastError);
				// Clean up thumbnail if it was uploaded
				if (thumbnailUrl) {
					await supabase.storage.from('thumbnails').remove([thumbnailFileName]);
				}
				
				// Provide detailed error message based on file size
				const fileSizeMB = videoFileInfo.size ? Math.round(videoFileInfo.size / 1024 / 1024 * 100) / 100 : 0;
				
				if (fileSizeMB > 50) {
					throw new Error(`Upload failed for large video (${fileSizeMB}MB). Try with a smaller file or compress the video first. Error: ${lastError}`);
				} else if (lastError.includes('Network request failed')) {
					throw new Error(`Network error uploading video. This is common on iOS. Try: 1) Switch between WiFi/cellular, 2) Restart the app, 3) Try a shorter video. Technical error: ${lastError}`);
				} else {
					throw new Error(`Video upload failed after trying all methods. Error: ${lastError}`);
				}
			}
			
			console.log('🎉 Video upload completed successfully!');
		} catch (error) {
			console.error('Video upload process error:', error);
			// Clean up thumbnail if it was uploaded
			if (thumbnailUrl) {
				await supabase.storage.from('thumbnails').remove([thumbnailFileName]);
			}
			throw error;
		}

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
				thumbnail_url: thumbnailUrl, // Will be null if thumbnail generation failed
				is_premium: isPremium,
				duration: 0, // Will be updated when we can calculate duration
			})
			.select('id')
			.single();

		if (dbError) {
			// If database insert fails, clean up uploaded files
			await Promise.all([
				supabase.storage.from('videos').remove([videoFileName]),
				thumbnailUrl ? supabase.storage.from('thumbnails').remove([thumbnailFileName]) : Promise.resolve()
			]);
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
