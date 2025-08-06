import { VideoService } from '@/services';
import { Video } from '@/shared/types';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';

export type VideoSortOption = 'created_at' | 'views_count' | 'likes_count';

export const useProfileVideos = (userId: string, viewerId?: string) => {
	const { refreshSession } = useAuthStore();
	
	const [userVideos, setUserVideos] = useState<Video[]>([]);
	const [likedVideos, setLikedVideos] = useState<Video[]>([]);
	const [hiddenVideos, setHiddenVideos] = useState<Video[]>([]);
	const [sortOption, setSortOption] = useState<VideoSortOption>('created_at');
	const [isLoadingVideos, setIsLoadingVideos] = useState(false);
	const [isLoadingLiked, setIsLoadingLiked] = useState(false);
	const [isLoadingHidden, setIsLoadingHidden] = useState(false);
	const [hasMoreVideos, setHasMoreVideos] = useState(true);
	const [hasMoreLiked, setHasMoreLiked] = useState(false);
	const [hasMoreHidden, setHasMoreHidden] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Sorted videos based on current sort option (no filtering here - tabs handle filtering)
	const filteredUserVideos = useMemo(() => {
		// Sort by selected option
		const sorted = [...userVideos].sort((a, b) => {
			switch (sortOption) {
				case 'views_count':
					return b.views_count - a.views_count; // Descendente (más visualizaciones primero)
				case 'likes_count':
					return b.likes_count - a.likes_count; // Descendente (más me gusta primero)
				case 'created_at':
				default:
					return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Descendente (más recientes primero)
			}
		});
		
		return sorted;
	}, [userVideos, sortOption]);

	// Function to change video sort option
	const setSortOption_ = useCallback((sort: VideoSortOption) => {
		setSortOption(sort);
	}, []);

	// Simple video loading using existing search functionality
	const loadUserVideos = useCallback(async (page = 0, refresh = false) => {
		if (!userId || !viewerId) return;

		setIsLoadingVideos(true);
		setError(null);

		try {
			// Use the new getUserVideos method that includes hidden videos when viewing own profile
			const result = await VideoService.getUserVideos(userId, viewerId, true); // includeHidden = true

			if (result.success && result.data) {
				const allUserVideos = result.data.videos;
				
				// Separate visible and hidden videos
				const visibleVideos = allUserVideos.filter(video => !video.is_hidden);
				const hiddenVideos = allUserVideos.filter(video => video.is_hidden);
				
				console.log(`📹 Profile videos loaded: ${visibleVideos.length} visible, ${hiddenVideos.length} hidden`);
				
				// Debug: log thumbnail URLs for first video
				if (visibleVideos.length > 0) {
					const firstVideo = visibleVideos[0];
					console.log(`🖼️ First video thumbnail debug: 
						id: ${firstVideo.id}
						thumbnail_url: ${firstVideo.thumbnail_url}
						title: ${firstVideo.title}
						created_at: ${firstVideo.created_at}`);
				}
				
				if (refresh || page === 0) {
					setUserVideos(visibleVideos);
					setHiddenVideos(hiddenVideos);
				}
				
				setHasMoreVideos(false); // For simplicity, no pagination for now
				setHasMoreHidden(false);
			} else {
				setError(result.error || 'Failed to load videos');
				setUserVideos([]);
				setHiddenVideos([]);
			}
		} catch (error) {
			console.error('Error loading user videos:', error);
			setError('Failed to load videos');
			setUserVideos([]);
			setHiddenVideos([]);
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

	// Load hidden videos
	const loadHiddenVideos = useCallback(async (page = 0, refresh = false) => {
		// Hidden videos are already loaded with loadUserVideos
		return;
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

	const loadMoreHiddenVideos = useCallback(async () => {
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

	// Video management functions
	const hideVideo = useCallback(async (videoId: string) => {
		const result = await VideoService.hideVideo(videoId);
		if (result.success) {
			// Move video from visible to hidden
			const video = userVideos.find(v => v.id === videoId);
			if (video) {
				setUserVideos(prev => prev.filter(v => v.id !== videoId));
				setHiddenVideos(prev => [...prev, { ...video, is_hidden: true }]);
			}
		}
		return result;
	}, [userVideos]);

	const showVideo = useCallback(async (videoId: string) => {
		const result = await VideoService.showVideo(videoId);
		if (result.success) {
			// Move video from hidden to visible
			const video = hiddenVideos.find(v => v.id === videoId);
			if (video) {
				setHiddenVideos(prev => prev.filter(v => v.id !== videoId));
				setUserVideos(prev => [...prev, { ...video, is_hidden: false }]);
			}
		}
		return result;
	}, [hiddenVideos]);

	const deleteVideo = useCallback(async (videoId: string) => {
		const result = await VideoService.deleteVideo(videoId);
		if (result.success) {
			// Remove from both lists
			setUserVideos(prev => prev.filter(v => v.id !== videoId));
			setHiddenVideos(prev => prev.filter(v => v.id !== videoId));
			
			// Refresh user session to update videos_count in the profile
			// The database trigger already decremented the count, we just need to fetch the updated data
			try {
				await refreshSession();
				console.log('✅ User profile refreshed after video deletion');
			} catch (error) {
				console.warn('⚠️ Failed to refresh user session after video deletion:', error);
			}
		}
		return result;
	}, [refreshSession]);

	// Legacy functions for compatibility
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
		filteredUserVideos,
		likedVideos,
		hiddenVideos,
		
		// Sort
		sortOption,
		setSortOption: setSortOption_,
		
		// Loading states
		isLoadingVideos,
		isLoadingLiked,
		isLoadingHidden,
		
		// Pagination
		hasMoreVideos,
		hasMoreLiked,
		hasMoreHidden,
		
		// Error
		error,
		
		// Actions
		loadUserVideos,
		loadLikedVideos,
		loadHiddenVideos,
		loadMoreUserVideos,
		loadMoreLikedVideos,
		loadMoreHiddenVideos,
		refreshVideos,
		
		// Video management
		hideVideo,
		showVideo,
		deleteVideo,
		
		// Legacy
		updateVideo,
		removeVideo,
	};
};