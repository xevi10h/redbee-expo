import { VideoService } from '@/services/videoService';
import { FeedType, Video } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';

export const useVideoFeed = (feedType: FeedType, userId?: string) => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [error, setError] = useState<string | null>(null);

	// Load videos function
	const loadVideos = useCallback(
		async (refresh = false) => {
			if (refresh) {
				setIsRefreshing(true);
				setPage(0);
				setError(null);
			} else {
				if (!hasMore || isLoading) return;
				setIsLoading(true);
			}

			try {
				const result = await VideoService.getVideosFeed({
					feed_type: feedType,
					page: refresh ? 0 : page,
					limit: 10,
					user_id: userId,
				});
				console.log('result', result);

				if (result.success && result.data) {
					if (refresh) {
						setVideos(result.data.videos);
						setPage(1);
					} else {
						setVideos((prev) => [...prev, ...result.data.videos]);
						setPage((prev) => prev + 1);
					}

					setHasMore(result.data.hasMore);
					setError(null);
				} else {
					setError(result.error || 'Failed to load videos');
				}
			} catch (error) {
				console.error('Error loading videos:', error);
				setError(
					error instanceof Error ? error.message : 'Failed to load videos',
				);
			} finally {
				setIsLoading(false);
				setIsRefreshing(false);
			}
		},
		[feedType, page, hasMore, isLoading, userId],
	);

	// Initial load
	useEffect(() => {
		if (userId) {
			loadVideos(true);
		}
	}, [feedType, userId]);

	// Refresh handler
	const handleRefresh = useCallback(() => {
		if (!isRefreshing && !isLoading) {
			setHasMore(true);
			loadVideos(true);
		}
	}, [isRefreshing, isLoading, loadVideos]);

	// Load more handler
	const handleLoadMore = useCallback(() => {
		if (!isLoading && !isRefreshing && hasMore) {
			loadVideos(false);
		}
	}, [isLoading, isRefreshing, hasMore, loadVideos]);

	// Update video in state (for optimistic updates)
	const updateVideo = useCallback(
		(videoId: string, updates: Partial<Video>) => {
			setVideos((prev) =>
				prev.map((video) =>
					video.id === videoId ? { ...video, ...updates } : video,
				),
			);
		},
		[],
	);

	// Remove video from state
	const removeVideo = useCallback((videoId: string) => {
		setVideos((prev) => prev.filter((video) => video.id !== videoId));
	}, []);

	// Video interaction handlers with optimistic updates
	const handleVideoLike = useCallback(
		async (videoId: string) => {
			if (!userId) return false;

			const video = videos.find((v) => v.id === videoId);
			if (!video) return false;

			// Optimistic update
			updateVideo(videoId, {
				is_liked: !video.is_liked,
				likes_count: video.is_liked
					? video.likes_count - 1
					: video.likes_count + 1,
			});

			try {
				const result = await VideoService.toggleLike(videoId, userId);

				if (result.success) {
					// Update with actual result
					updateVideo(videoId, {
						is_liked: result.data?.liked || false,
					});
					return result.data?.liked || false;
				} else {
					// Revert optimistic update on error
					updateVideo(videoId, {
						is_liked: video.is_liked,
						likes_count: video.likes_count,
					});
					throw new Error(result.error);
				}
			} catch (error) {
				// Revert optimistic update on error
				updateVideo(videoId, {
					is_liked: video.is_liked,
					likes_count: video.likes_count,
				});
				console.error('Like error:', error);
				return video.is_liked;
			}
		},
		[videos, userId, updateVideo],
	);

	const handleUserFollow = useCallback(
		async (targetUserId: string) => {
			if (!userId || userId === targetUserId) return false;

			// Optimistic update for all videos from this user
			const userVideos = videos.filter((v) => v.user?.id === targetUserId);
			const isCurrentlyFollowing = userVideos[0]?.is_following;

			userVideos.forEach((video) => {
				updateVideo(video.id, { is_following: !isCurrentlyFollowing });
			});

			try {
				// Import UserService dynamically to avoid circular dependencies
				const { UserService } = await import('@/services/userService');
				const result = await UserService.toggleFollow(targetUserId, userId);

				if (result.success) {
					// Update with actual result
					userVideos.forEach((video) => {
						updateVideo(video.id, {
							is_following: result.data?.following || false,
						});
					});
					return result.data?.following || false;
				} else {
					// Revert optimistic update on error
					userVideos.forEach((video) => {
						updateVideo(video.id, { is_following: isCurrentlyFollowing });
					});
					throw new Error(result.error);
				}
			} catch (error) {
				// Revert optimistic update on error
				userVideos.forEach((video) => {
					updateVideo(video.id, { is_following: isCurrentlyFollowing });
				});
				console.error('Follow error:', error);
				return isCurrentlyFollowing;
			}
		},
		[videos, userId, updateVideo],
	);

	const handleVideoComment = useCallback((videoId: string) => {
		// This would typically open a comment modal or navigate to comments
		console.log('Open comments for video:', videoId);
	}, []);

	const handleVideoReport = useCallback(
		async (videoId: string, reason: string = 'inappropriate') => {
			if (!userId) return false;

			try {
				const result = await VideoService.reportVideo(videoId, userId, reason);
				return result.success;
			} catch (error) {
				console.error('Report error:', error);
				return false;
			}
		},
		[userId],
	);

	const handleCommentAdded = useCallback(
		(videoId: string) => {
			updateVideo(videoId, {
				comments_count:
					(videos.find((v) => v.id === videoId)?.comments_count || 0) + 1,
			});
		},
		[videos, updateVideo],
	);

	return {
		videos,
		isLoading,
		isRefreshing,
		hasMore,
		error,
		handleRefresh,
		handleLoadMore,
		updateVideo,
		removeVideo,
		handleVideoLike,
		handleUserFollow,
		handleVideoComment,
		handleVideoReport,
		handleCommentAdded,
		reload: () => loadVideos(true),
	};
};
