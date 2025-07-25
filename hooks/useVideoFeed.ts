import { VideoService } from '@/services/videoService';
import { Video } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';

export const useVideoFeed = (feedType: 'forYou' | 'following') => {
	const [videos, setVideos] = useState<Video[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [error, setError] = useState<string | null>(null);

	// Load videos function
	const loadVideos = useCallback(async (refresh = false) => {
		if (refresh) {
			setIsRefreshing(true);
			setPage(0);
			setError(null);
		} else {
			setIsLoading(true);
		}

		try {
			const result = await VideoService.getVideosFeed({
				feed_type: feedType,
				page: refresh ? 0 : page,
				limit: 10,
			});

			if (result.success && result.data && Array.isArray(result.data.videos)) {
				if (refresh) {
					setVideos(result.data.videos);
					setPage(1);
				} else {
					setVideos(prev => [...prev, ...result.data.videos]);
					setPage(prev => prev + 1);
				}
				
				setHasMore(result.data.hasMore);
				setError(null);
			} else {
				setError(result.error || 'Failed to load videos');
			}
		} catch (error) {
			console.error('Error loading videos:', error);
			setError(error instanceof Error ? error.message : 'Failed to load videos');
		} finally {
			setIsLoading(false);
			setIsRefreshing(false);
		}
	}, [feedType, page]);

	// Initial load
	useEffect(() => {
		loadVideos(true);
	}, [feedType]);

	// Refresh handler
	const handleRefresh = useCallback(() => {
		if (!isRefreshing && !isLoading) {
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
	const updateVideo = useCallback((videoId: string, updates: Partial<Video>) => {
		setVideos(prev => prev.map(video => 
			video.id === videoId ? { ...video, ...updates } : video
		));
	}, []);

	// Remove video from state
	const removeVideo = useCallback((videoId: string) => {
		setVideos(prev => prev.filter(video => video.id !== videoId));
	}, []);

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
		reload: () => loadVideos(true),
	};
};

// utils/videoUtils.ts
export const VideoUtils = {
	/**
	 * Format video duration from seconds to mm:ss
	 */
	formatDuration: (seconds: number): string => {
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	},

	/**
	 * Check if video is premium and user has access
	 */
	canAccessVideo: (video: Video, isSubscribed: boolean = false): boolean => {
		return !video.is_premium || isSubscribed;
	},

	/**
	 * Get video quality based on connection and device
	 */
	getOptimalVideoQuality: (): 'low' | 'medium' | 'high' => {
		// TODO: Implement logic based on network conditions
		// For now, return medium as default
		return 'medium';
	},

	/**
	 * Generate video share text
	 */
	generateShareText: (video: Video): string => {
		const username = video.user?.username || 'unknown';
		const title = video.title || 'video increíble';
		return `¡Mira este ${title} de @${username} en Redbee! 🚀`;
	},

	/**
	 * Validate video file before upload
	 */
	validateVideoFile: (file: {
		duration?: number;
		size?: number;
		type?: string;
	}): { isValid: boolean; error?: string } => {
		const MAX_DURATION = 300; // 5 minutes
		const MIN_DURATION = 15; // 15 seconds
		const MAX_SIZE = 100 * 1024 * 1024; // 100MB

		if (file.duration) {
			if (file.duration < MIN_DURATION) {
				return {
					isValid: false,
					error: `El video debe durar al menos ${MIN_DURATION} segundos`,
				};
			}
			if (file.duration > MAX_DURATION) {
				return {
					isValid: false,
					error: `El video no puede durar más de ${MAX_DURATION / 60} minutos`,
				};
			}
		}

		if (file.size && file.size > MAX_SIZE) {
			return {
				isValid: false,
				error: 'El video no puede superar los 100MB',
			};
		}

		if (file.type && !file.type.startsWith('video/')) {
			return {
				isValid: false,
				error: 'El archivo debe ser un video',
			};
		}

		return { isValid: true };
	},
};