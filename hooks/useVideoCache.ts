import { Video } from '@/shared/types';
import { useCallback, useRef } from 'react';

export const useVideoCache = () => {
	const cache = useRef<Map<string, {
		uri: string;
		preloaded: boolean;
		lastAccessed: number;
	}>>(new Map());

	const maxCacheSize = 20; // Maximum videos to keep in cache

	// Preload video
	const preloadVideo = useCallback(async (videoUri: string) => {
		if (cache.current.has(videoUri)) {
			// Update last accessed time
			const cached = cache.current.get(videoUri)!;
			cache.current.set(videoUri, {
				...cached,
				lastAccessed: Date.now(),
			});
			return;
		}

		try {
			// TODO: Implement actual preloading logic
			// This could involve downloading the video or preparing it for playback
			
			cache.current.set(videoUri, {
				uri: videoUri,
				preloaded: true,
				lastAccessed: Date.now(),
			});

			// Cleanup old cache entries
			if (cache.current.size > maxCacheSize) {
				const entries = Array.from(cache.current.entries());
				entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
				
				// Remove oldest entries
				const toRemove = entries.slice(0, entries.length - maxCacheSize);
				toRemove.forEach(([uri]) => cache.current.delete(uri));
			}
		} catch (error) {
			console.error('Failed to preload video:', error);
		}
	}, []);

	// Preload next videos in feed
	const preloadNextVideos = useCallback((currentIndex: number, videos: Video[]) => {
		const videosToPreload = videos.slice(currentIndex + 1, currentIndex + 4);
		
		videosToPreload.forEach(video => {
			preloadVideo(video.video_url);
		});
	}, [preloadVideo]);

	// Check if video is cached
	const isVideoCached = useCallback((videoUri: string) => {
		return cache.current.has(videoUri) && cache.current.get(videoUri)?.preloaded;
	}, []);

	// Clear cache
	const clearCache = useCallback(() => {
		cache.current.clear();
	}, []);

	return {
		preloadVideo,
		preloadNextVideos,
		isVideoCached,
		clearCache,
		cacheSize: cache.current.size,
	};
};