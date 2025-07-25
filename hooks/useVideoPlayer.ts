import { Video } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface VideoPlayerState {
	isPlaying: boolean;
	isLoaded: boolean;
	hasError: boolean;
	isMuted: boolean;
	progress: number;
	duration: number;
	showControls: boolean;
	isBuffering: boolean;
}

export const useVideoPlayer = (videoUri: string, isActive: boolean = true) => {
	const videoRef = useRef<Video>(null);
	const [state, setState] = useState<VideoPlayerState>({
		isPlaying: false,
		isLoaded: false,
		hasError: false,
		isMuted: false,
		progress: 0,
		duration: 0,
		showControls: true,
		isBuffering: false,
	});

	// Auto-hide controls timer
    const controlsTimer = useRef<number | null>(null);

	// Reset controls timer
	const resetControlsTimer = useCallback(() => {
		if (controlsTimer.current) {
			clearTimeout(controlsTimer.current);
		}
		
		setState(prev => ({ ...prev, showControls: true }));
		
		controlsTimer.current = setTimeout(() => {
			setState(prev => ({ ...prev, showControls: false }));
		}, 3000);
	}, []);

	// Play/pause video
	const togglePlayback = useCallback(async () => {
		if (!videoRef.current) return;

		try {
			if (state.isPlaying) {
				await videoRef.current.pauseAsync();
			} else {
				await videoRef.current.playAsync();
			}
		} catch (error) {
			console.error('Playback toggle error:', error);
		}
	}, [state.isPlaying]);

	// Mute/unmute video
	const toggleMute = useCallback(async () => {
		if (!videoRef.current) return;

		try {
			await videoRef.current.setIsMutedAsync(!state.isMuted);
			setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
		} catch (error) {
			console.error('Mute toggle error:', error);
		}
	}, [state.isMuted]);

	// Seek to position
	const seekTo = useCallback(async (position: number) => {
		if (!videoRef.current || !state.duration) return;

		try {
			const positionMs = position * state.duration * 1000;
			await videoRef.current.setPositionAsync(positionMs);
		} catch (error) {
			console.error('Seek error:', error);
		}
	}, [state.duration]);

	// Video event handlers
	const handleLoadStart = useCallback(() => {
		setState(prev => ({ 
			...prev, 
			isLoaded: false, 
			hasError: false, 
			isBuffering: true 
		}));
	}, []);

	const handleLoad = useCallback((status: any) => {
		setState(prev => ({ 
			...prev, 
			isLoaded: true, 
			hasError: false,
			isBuffering: false,
			duration: status.durationMillis ? status.durationMillis / 1000 : 0
		}));
	}, []);

	const handleError = useCallback((error: any) => {
		console.error('Video load error:', error);
		setState(prev => ({ 
			...prev, 
			hasError: true, 
			isLoaded: false,
			isBuffering: false 
		}));
	}, []);

	const handlePlaybackStatusUpdate = useCallback((status: any) => {
		if (!status.isLoaded) return;

		setState(prev => ({
			...prev,
			isPlaying: status.isPlaying,
			progress: status.durationMillis 
				? status.positionMillis / status.durationMillis 
				: 0,
			isBuffering: status.isBuffering,
		}));
	}, []);

	// Handle active state changes
	useEffect(() => {
		if (!videoRef.current || !state.isLoaded) return;

		if (isActive) {
			videoRef.current.playAsync();
		} else {
			videoRef.current.pauseAsync();
		}
	}, [isActive, state.isLoaded]);

	// Cleanup
	useEffect(() => {
		return () => {
			if (controlsTimer.current) {
				clearTimeout(controlsTimer.current);
			}
		};
	}, []);

	return {
		videoRef,
		state,
		actions: {
			togglePlayback,
			toggleMute,
			seekTo,
			showControls: resetControlsTimer,
		},
		handlers: {
			onLoadStart: handleLoadStart,
			onLoad: handleLoad,
			onError: handleError,
			onPlaybackStatusUpdate: handlePlaybackStatusUpdate,
		},
	};
};