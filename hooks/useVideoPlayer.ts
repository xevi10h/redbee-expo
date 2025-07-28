import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';

export interface VideoPlayerState {
	isPlaying: boolean;
	isLoaded: boolean;
	hasError: boolean;
	isMuted: boolean;
	progress: number;
	duration: number;
	showControls: boolean;
	isBuffering: boolean;
	currentTime: number;
}

export const useVideoPlayerCustom = (videoUri: string, isActive: boolean = true) => {
	const [state, setState] = useState<VideoPlayerState>({
		isPlaying: false,
		isLoaded: false,
		hasError: false,
		isMuted: false,
		progress: 0,
		duration: 0,
		showControls: true,
		isBuffering: false,
		currentTime: 0,
	});

	const player = useVideoPlayer(videoUri, (player) => {
		player.loop = true;
		player.muted = false;
		player.timeUpdateEventInterval = 0.1;
	});

	const { isPlaying } = useEvent(player, 'playingChange', {
		isPlaying: player.playing,
	});

	useEventListener(player, 'timeUpdate', ({ currentTime }) => {
		setState(prev => ({
			...prev,
			currentTime,
			duration: player.duration,
			progress: player.duration > 0 ? currentTime / player.duration : 0,
		}));
	});

	useEventListener(player, 'statusChange', ({ status, error }) => {
		setState(prev => ({
			...prev,
			hasError: status === 'error',
			isLoaded: status === 'readyToPlay',
			isBuffering: status === 'loading',
		}));
	});

	useEffect(() => {
		setState(prev => ({
			...prev,
			isPlaying: player.playing,
			isMuted: player.muted,
		}));
	}, [player.playing, player.muted]);

	const togglePlayback = useCallback(() => {
		if (player.playing) {
			player.pause();
		} else {
			player.play();
		}
	}, [player]);

	const toggleMute = useCallback(() => {
		player.muted = !player.muted;
	}, [player]);

	const seekTo = useCallback((position: number) => {
		if (player.duration > 0) {
			player.currentTime = position * player.duration;
		}
	}, [player]);

	const showControls = useCallback(() => {
		setState(prev => ({ ...prev, showControls: true }));
	}, []);

	useEffect(() => {
		if (isActive && player.status === 'readyToPlay') {
			player.play();
		} else if (!isActive) {
			player.pause();
		}
	}, [isActive, player]);

	return {
		player,
		state,
		actions: {
			togglePlayback,
			toggleMute,
			seekTo,
			showControls,
		},
	};
};