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
	 * Get videos feed with pagination and user interactions
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

			// First, get the list of followed users if feed_type is 'following'
			let followedUserIds: string[] = [];
			if (feed_type === 'following' && user_id) {
				const { data: follows, error: followsError } = await supabase
					.from('follows')
					.select('following_id')
					.eq('follower_id', user_id);

				if (followsError) {
					console.error('Error fetching follows:', followsError);
				} else {
					followedUserIds = follows?.map(f => f.following_id) || [];
				}

				// If user doesn't follow anyone, return empty result
				if (followedUserIds.length === 0) {
					return {
						success: true,
						data: {
							videos: [],
							hasMore: false,
							total: 0,
						},
					};
				}
			}

			// Build the main query
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
				`, { count: 'exact' });

			// Apply feed type filter
			if (feed_type === 'following' && followedUserIds.length > 0) {
				query = query.in('user_id', followedUserIds);
			} else if (feed_type === 'forYou' && user_id) {
				// Exclude user's own videos from "For You" feed
				query = query.neq('user_id', user_id);
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

			const { data: videos, error, count } = await query
				.order('created_at', { ascending: false })
				.range(startRange, endRange);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Calculate if there are more videos
			const total = count || 0;
			const hasMore = startRange + limit < total;

			// Get user interactions for these videos
			let processedVideos: Video[] = videos || [];

			if (user_id && videos && videos.length > 0) {
				const videoIds = videos.map(v => v.id);
				const creatorIds = videos.map(v => v.user_id).filter(Boolean);

				// Get likes
				const { data: likes } = await supabase
					.from('likes')
					.select('video_id')
					.eq('user_id', user_id)
					.in('video_id', videoIds);

				const likedVideoIds = new Set(likes?.map(l => l.video_id) || []);

				// Get follows
				const { data: follows } = await supabase
					.from('follows')
					.select('following_id')
					.eq('follower_id', user_id)
					.in('following_id', creatorIds);

				const followedUserIds = new Set(follows?.map(f => f.following_id) || []);

				// Get active subscriptions
				const { data: subscriptions } = await supabase
					.from('subscriptions')
					.select('creator_id')
					.eq('subscriber_id', user_id)
					.eq('status', 'active')
					.gte('current_period_end', new Date().toISOString())
					.in('creator_id', creatorIds);

				const subscribedCreatorIds = new Set(subscriptions?.map(s => s.creator_id) || []);

				// Process videos with interaction states
				processedVideos = videos.map(video => ({
					...video,
					is_liked: likedVideoIds.has(video.id),
					is_following: followedUserIds.has(video.user_id),
					is_subscribed: subscribedCreatorIds.has(video.user_id),
				}));
			} else {
				// No user context, just return videos without interaction states
				processedVideos = videos?.map(video => ({
					...video,
					is_liked: false,
					is_following: false,
					is_subscribed: false,
				})) || [];
			}

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

	/**
	 * Search videos
	 */
	static async searchVideos(
		searchQuery: string,
		viewerId?: string,
		page = 0,
		limit = 10
	): Promise<AuthResponse<{
		videos: Video[];
		hasMore: boolean;
		total: number;
	}>> {
		try {
			const startRange = page * limit;
			const endRange = startRange + limit - 1;

			const { data: videos, error, count } = await supabase
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
				`, { count: 'exact' })
				.or(`title.ilike.%${searchQuery}%, description.ilike.%${searchQuery}%`)
				.order('views_count', { ascending: false })
				.range(startRange, endRange);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			const total = count || 0;
			const hasMore = startRange + limit < total;

			// Process videos with interaction states if viewer is provided
			let processedVideos: Video[] = videos || [];
			if (viewerId && videos && videos.length > 0) {
				// Similar logic as in getVideosFeed for getting user interactions
				const videoIds = videos.map(v => v.id);
				const creatorIds = videos.map(v => v.user_id).filter(Boolean);

				const [likesResponse, followsResponse, subscriptionsResponse] = await Promise.all([
					supabase.from('likes').select('video_id').eq('user_id', viewerId).in('video_id', videoIds),
					supabase.from('follows').select('following_id').eq('follower_id', viewerId).in('following_id', creatorIds),
					supabase.from('subscriptions').select('creator_id').eq('subscriber_id', viewerId).eq('status', 'active').gte('current_period_end', new Date().toISOString()).in('creator_id', creatorIds)
				]);

				const likedVideoIds = new Set(likesResponse.data?.map(l => l.video_id) || []);
				const followedUserIds = new Set(followsResponse.data?.map(f => f.following_id) || []);
				const subscribedCreatorIds = new Set(subscriptionsResponse.data?.map(s => s.creator_id) || []);

				processedVideos = videos.map(video => ({
					...video,
					is_liked: likedVideoIds.has(video.id),
					is_following: followedUserIds.has(video.user_id),
					is_subscribed: subscribedCreatorIds.has(video.user_id),
				}));
			} else {
				processedVideos = videos?.map(video => ({
					...video,
					is_liked: false,
					is_following: false,
					is_subscribed: false,
				})) || [];
			}

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
				error: error instanceof Error ? error.message : 'Failed to search videos',
			};
		}
	}
}