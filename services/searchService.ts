import { supabase } from '@/lib/supabase';
import { AuthResponse, UserProfile, Video } from '@/shared/types';

export interface SearchFilters {
	query?: string;
	type?: 'users' | 'videos' | 'hashtags';
	limit?: number;
	offset?: number;
}

export interface SearchResults {
	users: UserProfile[];
	videos: Video[];
	hashtags: { hashtag: string; count: number }[];
	total: number;
	hasMore: boolean;
}

export class SearchService {
	/**
	 * Search for users
	 */
	static async searchUsers(
		query: string,
		viewerId?: string,
		limit = 20,
		offset = 0,
	): Promise<
		AuthResponse<{
			users: UserProfile[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			if (!query || query.length < 2) {
				return {
					success: true,
					data: {
						users: [],
						hasMore: false,
						total: 0,
					},
				};
			}

			// Use the new search function that handles interactions
			const { data: users, error } = await supabase.rpc(
				'search_users_with_interactions',
				{
					search_query: query,
					viewer_id: viewerId,
					page_offset: offset,
					page_limit: limit,
				},
			);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Get total count separately for pagination
			const { count } = await supabase
				.from('profiles')
				.select('*', { count: 'exact', head: true })
				.or(`username.ilike.%${query}%,display_name.ilike.%${query}%`);

			const processedUsers: UserProfile[] = users || [];

			const total = count || 0;
			const hasMore = offset + limit < total;

			return {
				success: true,
				data: {
					users: processedUsers,
					hasMore,
					total,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to search users',
			};
		}
	}

	/**
	 * Search for trending hashtags
	 */
	static async searchHashtags(
		query?: string,
		limit = 20,
	): Promise<
		AuthResponse<{
			hashtags: { hashtag: string; count: number; trending_score: number }[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			let result;

			if (query && query.length > 0) {
				// Search specific hashtags
				const { data, error } = await supabase.rpc('get_trending_hashtags', {
					limit_count: limit * 3, // Get more to filter
					days_back: 30,
				});

				if (error) {
					return {
						success: false,
						error: error.message,
					};
				}

				// Filter hashtags that match the query
				result = (data || [])
					.filter((item: any) =>
						item.hashtag.toLowerCase().includes(query.toLowerCase()),
					)
					.slice(0, limit);
			} else {
				// Get trending hashtags
				const { data, error } = await supabase.rpc('get_trending_hashtags', {
					limit_count: limit,
					days_back: 7,
				});

				if (error) {
					return {
						success: false,
						error: error.message,
					};
				}

				result = data || [];
			}

			return {
				success: true,
				data: {
					hashtags: result.map((item: any) => ({
						hashtag: item.hashtag,
						count: item.video_count,
						trending_score: item.trending_score,
					})),
					hasMore: false, // For now, we don't implement pagination for hashtags
					total: result.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to search hashtags',
			};
		}
	}

	/**
	 * Get videos by hashtag for hashtag feed
	 */
	static async getVideosByHashtag(
		hashtag: string,
		viewerId?: string,
		limit = 20,
		offset = 0,
	): Promise<
		AuthResponse<{
			videos: Video[];
			hasMore: boolean;
			total: number;
		}>
	> {
		try {
			if (!hashtag) {
				return {
					success: true,
					data: {
						videos: [],
						hasMore: false,
						total: 0,
					},
				};
			}
			
			if (!viewerId) {
				return {
					success: false,
					error: 'Viewer ID is required to search users',
				};
			}

			// Search for videos containing this hashtag using the specific hashtag method
			const { VideoService } = await import('./videoService');
			return await VideoService.getVideosByHashtag(
				hashtag,
				viewerId,
				limit,
				offset,
			);
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to get hashtag videos',
			};
		}
	}

	/**
	 * Search for videos
	 */
	static async searchVideos(
		query: string,
		viewerId?: string,
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
			// Use the existing VideoService.searchVideos method
			const { VideoService } = await import('./videoService');
			return await VideoService.searchVideos(
				query,
				viewerId,
				Math.floor(offset / limit),
				limit,
			);
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to search videos',
			};
		}
	}

	/**
	 * Comprehensive search across all types
	 */
	static async searchAll(
		query: string,
		viewerId?: string,
		limit = 10,
	): Promise<AuthResponse<SearchResults>> {
		try {
			if (!query || query.length < 2) {
				return {
					success: true,
					data: {
						users: [],
						videos: [],
						hashtags: [],
						total: 0,
						hasMore: false,
					},
				};
			}

			// Search users, videos, and hashtags in parallel
			const [usersResult, videosResult, hashtagsResult] = await Promise.all([
				this.searchUsers(query, viewerId, limit),
				this.searchVideos(query, viewerId, limit),
				this.searchHashtags(query, limit),
			]);

			const users = usersResult.success ? usersResult.data?.users || [] : [];
			const videos = videosResult.success
				? videosResult.data?.videos || []
				: [];
			const hashtags = hashtagsResult.success
				? hashtagsResult.data?.hashtags || []
				: [];

			const total = users.length + videos.length + hashtags.length;
			const hasMore =
				usersResult.data?.hasMore ||
				false ||
				videosResult.data?.hasMore ||
				false ||
				hashtagsResult.data?.hasMore ||
				false;

			return {
				success: true,
				data: {
					users,
					videos,
					hashtags,
					total,
					hasMore,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to perform search',
			};
		}
	}

	/**
	 * Get search suggestions based on query
	 */
	static async getSearchSuggestions(
		query: string,
		limit = 5,
	): Promise<
		AuthResponse<{
			suggestions: string[];
		}>
	> {
		try {
			if (!query || query.length < 2) {
				return {
					success: true,
					data: { suggestions: [] },
				};
			}

			// Get user suggestions
			const { data: userSuggestions } = await supabase
				.from('profiles')
				.select('username, display_name')
				.or(`username.ilike.${query}%,display_name.ilike.${query}%`)
				.limit(limit);

			// Get hashtag suggestions
			const { data: hashtagData } = await supabase.rpc(
				'get_trending_hashtags',
				{
					limit_count: limit * 2,
					days_back: 30,
				},
			);

			const hashtagSuggestions = (hashtagData || [])
				.filter((item: any) =>
					item.hashtag.toLowerCase().startsWith(query.toLowerCase()),
				)
				.slice(0, limit)
				.map((item: any) => `#${item.hashtag}`);

			// Combine suggestions
			const suggestions: string[] = [];

			// Add user suggestions
			(userSuggestions || []).forEach((user) => {
				suggestions.push(`@${user.username}`);
				if (user.display_name && user.display_name !== user.username) {
					suggestions.push(user.display_name);
				}
			});

			// Add hashtag suggestions
			suggestions.push(...hashtagSuggestions);

			// Remove duplicates and limit
			const uniqueSuggestions = Array.from(new Set(suggestions)).slice(
				0,
				limit,
			);

			return {
				success: true,
				data: { suggestions: uniqueSuggestions },
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to get search suggestions',
			};
		}
	}
}
