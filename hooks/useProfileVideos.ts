import { VideoService } from '@/services';
import { Video } from '@/shared/types';
import { useCallback, useEffect, useState } from 'react';

export const useProfileVideos = (userId: string, viewerId?: string) => {
	const [userVideos, setUserVideos] = useState<Video[]>([]);
	const [likedVideos, setLikedVideos] = useState<Video[]>([]);
	const [isLoadingVideos, setIsLoadingVideos] = useState(false);
	const [isLoadingLiked, setIsLoadingLiked] = useState(false);
	const [hasMoreVideos, setHasMoreVideos] = useState(true);
	const [hasMoreLiked, setHasMoreLiked] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Simple video loading using existing search functionality
	const loadUserVideos = useCallback(async (page = 0, refresh = false) => {
		if (!userId || !viewerId) return;

		setIsLoadingVideos(true);
		setError(null);

		try {
			// Use search to get all videos, then filter by user
			const result = await VideoService.searchVideos('', viewerId, 0, 50);

			if (result.success && result.data) {
				// Filter videos by the specific user
				const filteredVideos = result.data.videos.filter(video => video.user_id === userId);
				
				if (refresh || page === 0) {
					setUserVideos(filteredVideos);
				}
				
				setHasMoreVideos(false); // For simplicity, no pagination for now
			} else {
				setError(result.error || 'Failed to load videos');
				setUserVideos([]);
			}
		} catch (error) {
			console.error('Error loading user videos:', error);
			setError('Failed to load videos');
			setUserVideos([]);
		} finally {
			setIsLoadingVideos(false);
		}
	}, [userId, viewerId]);

	// Simple liked videos (empty for now)
	const loadLikedVideos = useCallback(async (page = 0, refresh = false) => {
		setIsLoadingLiked(true);
		// For now, just set empty array
		setLikedVideos([]);
		setHasMoreLiked(false);
		setIsLoadingLiked(false);
	}, []);

	// Load more functions (simplified)
	const loadMoreUserVideos = useCallback(async () => {
		// No pagination for now
		return;
	}, []);

	const loadMoreLikedVideos = useCallback(async () => {
		// No pagination for now
		return;
	}, []);

	// Refresh function
	const refreshVideos = useCallback(async () => {
		await Promise.all([
			loadUserVideos(0, true),
			loadLikedVideos(0, true)
		]);
	}, [loadUserVideos, loadLikedVideos]);

	// Update and remove video functions
	const updateVideo = useCallback((videoId: string, updates: Partial<Video>) => {
		setUserVideos(prev =>
			prev.map(video =>
				video.id === videoId ? { ...video, ...updates } : video
			)
		);
	}, []);

	const removeVideo = useCallback((videoId: string) => {
		setUserVideos(prev => prev.filter(video => video.id !== videoId));
	}, []);

	// Auto-load on mount
	useEffect(() => {
		if (userId && viewerId) {
			loadUserVideos(0, true);
		}
	}, [userId, viewerId, loadUserVideos]);

	return {
		// Data
		userVideos,
		likedVideos,
		
		// Loading states
		isLoadingVideos,
		isLoadingLiked,
		
		// Pagination
		hasMoreVideos,
		hasMoreLiked,
		
		// Error
		error,
		
		// Actions
		loadUserVideos,
		loadLikedVideos,
		loadMoreUserVideos,
		loadMoreLikedVideos,
		refreshVideos,
		updateVideo,
		removeVideo,
	};
};