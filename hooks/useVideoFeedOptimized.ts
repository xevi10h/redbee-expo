import { UserService, VideoService } from '@/services';
import { FeedType, User, Video } from '@/shared/types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOptimisticUpdates } from './useOptimisticUpdates';

export const useVideoFeedOptimized = (
	feedType: FeedType,
	currentUser: User
) => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	
	// Track viewed videos to avoid showing duplicates
	const viewedVideoIds = useRef<Set<string>>(new Set());
	
	// Optimistic updates hook
	const { applyOptimisticUpdate } = useOptimisticUpdates(videos, setVideos);

	// Memoized video filters
	const filters = useMemo(() => ({
		feed_type: feedType,
		user_id: currentUser.id,
		page: page,
		limit: 10,
	}), [feedType, currentUser.id, page]);

	// Load videos function
	const loadVideos = useCallback(async (refresh = false) => {
		if (refresh) {
			setIsRefreshing(true);
			setPage(0);
			setError(null);
			viewedVideoIds.current.clear();
		} else {
			if (!hasMore || isLoading) return;
			setIsLoading(true);
		}

		try {
			const result = await VideoService.getVideosFeed({
				...filters,
				page: refresh ? 0 : page,
			});

			if (result.success && result.data) {
                const newVideos = result.data.videos.filter(
                    (video: Video) => !viewedVideoIds.current.has(video.id)
                );

                newVideos.forEach((video: Video) => viewedVideoIds.current.add(video.id));

				if (refresh) {
					setVideos(newVideos);
					setPage(1);
				} else {
					setVideos(prev => [...prev, ...newVideos]);
					setPage(prev => prev + 1);
				}

				setHasMore(result.data.hasMore);
				setError(null);
			} else {
				setError(result.error || 'Failed to load videos');
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Failed to load videos';
			setError(errorMessage);
			console.error('Error loading videos:', error);
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [filters, page, hasMore, isLoading]);

	// Video interaction handlers with optimistic updates
	const handleLike = useCallback(async (videoId: string) => {
		const video = videos.find(v => v.id === videoId);
		if (!video) return;

		applyOptimisticUpdate(
			videoId,
			{
				is_liked: !video.is_liked,
				likes_count: video.is_liked ? video.likes_count - 1 : video.likes_count + 1,
			},
			async () => {
				const result = await VideoService.toggleLike(videoId, currentUser.id);
				if (result.success) {
					return {
						is_liked: result.data?.liked,
					};
				}
				throw new Error(result.error);
			}
		);
	}, [videos, currentUser.id, applyOptimisticUpdate]);

	const handleFollow = useCallback(async (userId: string) => {
		const video = videos.find(v => v.user?.id === userId);
		if (!video) return;

		// Update all videos from this user
		const userVideos = videos.filter(v => v.user?.id === userId);
		userVideos.forEach(userVideo => {
			applyOptimisticUpdate(
				userVideo.id,
				{ is_following: !userVideo.is_following },
				async () => {
					const result = await UserService.toggleFollow(userId, currentUser.id);
					if (result.success) {
						return { is_following: result.data?.following };
					}
					throw new Error(result.error);
				}
			);
		});
	}, [videos, currentUser.id, applyOptimisticUpdate]);

	const handleCommentAdded = useCallback((videoId: string) => {
		setVideos(prev => prev.map(video => 
			video.id === videoId 
				? { ...video, comments_count: video.comments_count + 1 }
				: video
		));
	}, []);

	// Initial load and reload on feed type change
	useEffect(() => {
		loadVideos(true);
	}, [feedType]);

	return {
		videos,
		isLoading,
		isRefreshing,
		hasMore,
		error,
		handleLike,
		handleFollow,
		handleCommentAdded,
		handleRefresh: () => loadVideos(true),
		handleLoadMore: () => loadVideos(false),
		retryLoad: () => loadVideos(true),
	};
};