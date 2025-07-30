import { VideoService } from '@/services/videoService';
import { FeedType, User, Video } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';

export const useVideoFeedWithPermissions = (
	feedType: FeedType,
	currentUser: User,
) => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [error, setError] = useState<string | null>(null);

	// Load videos function con verificación de permisos
	const loadVideos = useCallback(
		async (refresh = false) => {
			// Validar que tenemos un usuario autenticado
			if (!currentUser?.id) {
				setError('User not authenticated');
				return;
			}

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
					user_id: currentUser.id,
				});

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
		[feedType, page, hasMore, isLoading, currentUser?.id],
	);

	// Video interaction handlers con verificación de permisos
	const handleVideoLike = useCallback(
		async (videoId: string) => {
			if (!currentUser?.id) return false;

			const video = videos.find((v) => v.id === videoId);
			if (!video) return false;

			// Verificar acceso antes de permitir interacción
			const accessResult = await VideoService.canAccessVideo(
				videoId,
				currentUser.id,
			);
			if (!accessResult.success || !accessResult.data?.canAccess) {
				setError('You do not have permission to interact with this video');
				return false;
			}

			// Optimistic update
			setVideos((prev) =>
				prev.map((v) =>
					v.id === videoId
						? {
								...v,
								is_liked: !v.is_liked,
								likes_count: v.is_liked ? v.likes_count - 1 : v.likes_count + 1,
						  }
						: v,
				),
			);

			try {
				const result = await VideoService.toggleLike(videoId, currentUser.id);

				if (result.success) {
					// Update with actual result
					setVideos((prev) =>
						prev.map((v) =>
							v.id === videoId
								? { ...v, is_liked: result.data?.liked || false }
								: v,
						),
					);
					return result.data?.liked || false;
				} else {
					// Revert optimistic update on error
					setVideos((prev) =>
						prev.map((v) =>
							v.id === videoId
								? {
										...v,
										is_liked: video.is_liked,
										likes_count: video.likes_count,
								  }
								: v,
						),
					);
					setError(result.error || 'Failed to like video');
					return video.is_liked;
				}
			} catch (error) {
				// Revert optimistic update on error
				setVideos((prev) =>
					prev.map((v) =>
						v.id === videoId
							? {
									...v,
									is_liked: video.is_liked,
									likes_count: video.likes_count,
							  }
							: v,
					),
				);
				console.error('Like error:', error);
				return video.is_liked;
			}
		},
		[videos, currentUser?.id],
	);

	const handleUserFollow = useCallback(
		async (targetUserId: string) => {
			if (!currentUser?.id || currentUser.id === targetUserId) return false;

			// Optimistic update for all videos from this user
			const userVideos = videos.filter((v) => v.user?.id === targetUserId);
			const isCurrentlyFollowing = userVideos[0]?.is_following;

			userVideos.forEach((video) => {
				setVideos((prev) =>
					prev.map((v) =>
						v.id === video.id
							? { ...v, is_following: !isCurrentlyFollowing }
							: v,
					),
				);
			});

			try {
				// Import UserService dynamically to avoid circular dependencies
				const { UserService } = await import('@/services/userService');
				const result = await UserService.toggleFollow(
					targetUserId,
					currentUser.id,
				);

				if (result.success) {
					// Update with actual result
					userVideos.forEach((video) => {
						setVideos((prev) =>
							prev.map((v) =>
								v.id === video.id
									? { ...v, is_following: result.data?.following || false }
									: v,
							),
						);
					});
					return result.data?.following || false;
				} else {
					// Revert optimistic update on error
					userVideos.forEach((video) => {
						setVideos((prev) =>
							prev.map((v) =>
								v.id === video.id
									? { ...v, is_following: isCurrentlyFollowing }
									: v,
							),
						);
					});
					setError(result.error || 'Failed to follow user');
					return isCurrentlyFollowing;
				}
			} catch (error) {
				// Revert optimistic update on error
				userVideos.forEach((video) => {
					setVideos((prev) =>
						prev.map((v) =>
							v.id === video.id
								? { ...v, is_following: isCurrentlyFollowing }
								: v,
						),
					);
				});
				console.error('Follow error:', error);
				return isCurrentlyFollowing;
			}
		},
		[videos, currentUser?.id],
	);

	const handleUserSubscribe = useCallback(
		async (creatorId: string) => {
			if (!currentUser?.id || currentUser.id === creatorId) return false;

			try {
				// Import SubscriptionService dynamically
				const { SubscriptionService } = await import(
					'@/services/subscriptionService'
				);
				const result = await SubscriptionService.createSubscription(creatorId);

				if (result.success) {
					// Update all videos from this creator to show as subscribed
					setVideos((prev) =>
						prev.map((video) =>
							video.user?.id === creatorId
								? { ...video, is_subscribed: true }
								: video,
						),
					);
					return true;
				} else {
					setError(result.error || 'Failed to subscribe');
					return false;
				}
			} catch (error) {
				console.error('Subscribe error:', error);
				setError('Failed to process subscription');
				return false;
			}
		},
		[currentUser?.id],
	);

	const handleVideoComment = useCallback((videoId: string) => {
		// This would typically open a comment modal or navigate to comments
		console.log('Open comments for video:', videoId);
	}, []);

	const handleVideoReport = useCallback(
		async (videoId: string, reason: string = 'inappropriate') => {
			if (!currentUser?.id) return false;

			try {
				const result = await VideoService.reportVideo(
					videoId,
					currentUser.id,
					reason,
				);
				if (result.success) {
					// Optionally remove the video from the feed after reporting
					// setVideos(prev => prev.filter(v => v.id !== videoId));
				} else {
					setError(result.error || 'Failed to report video');
				}
				return result.success;
			} catch (error) {
				console.error('Report error:', error);
				setError('Failed to report video');
				return false;
			}
		},
		[currentUser?.id],
	);

	const handleCommentAdded = useCallback((videoId: string) => {
		setVideos((prev) =>
			prev.map((video) =>
				video.id === videoId
					? { ...video, comments_count: video.comments_count + 1 }
					: video,
			),
		);
	}, []);

	const handleUserPress = useCallback((userId: string) => {
		// TODO: Navigate to user profile
		console.log('Navigate to user profile:', userId);
	}, []);

	// Initial load and reload on feed type change
	useEffect(() => {
		if (currentUser?.id) {
			loadVideos(true);
		}
	}, [feedType, currentUser?.id]);

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

	return {
		videos,
		isLoading,
		isRefreshing,
		hasMore,
		error,
		handleVideoLike,
		handleUserFollow,
		handleUserSubscribe,
		handleVideoComment,
		handleVideoReport,
		handleCommentAdded,
		handleUserPress,
		handleRefresh,
		handleLoadMore,
		reload: () => loadVideos(true),
		clearError: () => setError(null),
	};
};
