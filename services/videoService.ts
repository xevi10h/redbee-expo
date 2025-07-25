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
	 * Get videos feed with pagination
	 */
	static async getVideosFeed(filters: VideoFilters): Promise<AuthResponse<{
		videos: Video[];
		hasMore: boolean;
		total: number;
	}>> {
		try {
			const {
				feed_type = 'forYou',
				page = 0,
				limit = 10,
				user_id,
				is_premium,
				search_query,
				hashtags
			} = filters;

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
				`);

			// Apply filters based on feed type
			if (feed_type === 'following' && user_id) {
				// Get videos from users that current user follows
				query = query.in('user_id', [
					// TODO: Get list of followed user IDs
					// This would require a subquery to the follows table
				]);
			}

			// Apply other filters
			if (is_premium !== undefined) {
				query = query.eq('is_premium', is_premium);
			}

			if (search_query) {
				query = query.or(`title.ilike.%${search_query}%, description.ilike.%${search_query}%`);
			}

			if (hashtags && hashtags.length > 0) {
				query = query.overlaps('hashtags', hashtags);
			}

			// Apply pagination and sorting
			const startRange = page * limit;
			const endRange = startRange + limit - 1;

			const { data: videos, error, count } = await query.order('created_at', { ascending: false }).range(startRange, endRange);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Calculate if there are more videos
			const total = count || 0;
			const hasMore = startRange + limit < total;

			// Process videos to add interaction states
			const processedVideos: Video[] = (videos || []).map(video => ({
				...video,
				is_liked: false, // TODO: Check if current user liked this video
				is_following: false, // TODO: Check if current user follows video creator
				is_subscribed: false, // TODO: Check if current user is subscribed to creator
			}));

			return {
				success: true,
				data: {
					videos: processedVideos,
					hasMore,
					total,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch videos',
			};
		}
	}

	/**
	 * Toggle like on a video
	 */
	static async toggleLike(videoId: string, userId: string): Promise<AuthResponse<{ liked: boolean }>> {
		try {
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
				const { error: insertError } = await supabase
					.from('likes')
					.insert({
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
	 * Report a video
	 */
	static async reportVideo(
		videoId: string,
		reporterId: string,
		reason: string
	): Promise<AuthResponse<void>> {
		try {
			// Get video details for the report
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
			const { error: reportError } = await supabase
				.from('reports')
				.insert({
					video_id: videoId,
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
				error: error instanceof Error ? error.message : 'Failed to report video',
			};
		}
	}

	/**
	 * Increment video view count
	 */
	static async incrementViewCount(videoId: string): Promise<void> {
		try {
			await supabase.rpc('increment_video_views', {
				video_id: videoId,
			});
		} catch (error) {
			console.error('Failed to increment view count:', error);
			// Don't throw error as this is not critical
		}
	}
}