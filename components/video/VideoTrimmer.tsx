import { useEvent, useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import {
	Alert,
	Dimensions,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import {
	Gesture,
	GestureDetector,
	GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { SimpleTrimmerBar } from './SimpleTrimmerBar';
import { VideoThumbnails } from './VideoThumbnails';

const { width: screenWidth } = Dimensions.get('window');
const TRIMMER_WIDTH = screenWidth - 32;
const HANDLE_WIDTH = 12;
const MIN_DURATION = 15; // Minimum 15 seconds
const MAX_DURATION = 300; // Maximum 5 minutes (300 seconds)

interface VideoTrimmerProps {
	videoUri: string;
	duration: number;
	onTrimChange: (startTime: number, endTime: number) => void;
	onNext: () => void;
	onCancel: () => void;
}

export function VideoTrimmer({
	videoUri,
	duration,
	onTrimChange,
	onNext,
	onCancel,
}: VideoTrimmerProps) {
	const { t } = useTranslation();

	// Trim state
	const [startTime, setStartTime] = useState(0);
	const [endTime, setEndTime] = useState(Math.min(duration, MAX_DURATION));
	const [currentTime, setCurrentTime] = useState(0);
	const [isLoaded, setIsLoaded] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [useThumbnails, setUseThumbnails] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState('Cargando video...');

	// Smart thumbnail loading based on video characteristics
	useEffect(() => {
		// Disable thumbnails for very long videos or when performance might be poor
		if (duration > 120) {
			// Disable thumbnails for videos longer than 2 minutes
			setUseThumbnails(false);
		}

		// Also check if video seems to be from iCloud (might be slow)
		const isLikelyiCloud =
			videoUri.includes('icloud') ||
			videoUri.includes('CloudDocs') ||
			videoUri.includes('tmp'); // Sometimes iCloud videos are in tmp

		if (isLikelyiCloud) {
			console.log(
				'🔄 Detected potential iCloud video, using simplified trimmer',
			);
			setUseThumbnails(false);
			setLoadingMessage('Descargando de iCloud...');
		}
	}, [duration, videoUri]);

	// Video player setup with optimized configuration
	const player = useVideoPlayer(videoUri, (player) => {
		player.loop = false; // We'll handle custom looping
		player.muted = false;
		player.timeUpdateEventInterval = 0.1; // Faster updates for better responsiveness
		// Optimize for trimming use case
		player.preservesPitch = false; // Disable pitch correction for better performance
		// Reduce quality for faster loading
		player.playbackRate = 1.0;
	});

	const { isPlaying } = useEvent(player, 'playingChange', {
		isPlaying: player.playing,
	});

	// Shared values for smooth animations
	const startHandleX = useSharedValue(0);
	const endHandleX = useSharedValue(0);
	const startHandleStartX = useSharedValue(0);
	const endHandleStartX = useSharedValue(0);
	const currentTimeX = useSharedValue(0);
	const currentTimeStartX = useSharedValue(0);

	// Initialize handle positions
	useEffect(() => {
		const startX = (startTime / duration) * TRIMMER_WIDTH;
		// Subtract handle width to keep it within bounds
		const endX = (endTime / duration) * TRIMMER_WIDTH - HANDLE_WIDTH;
		const currentX = (currentTime / duration) * TRIMMER_WIDTH;

		startHandleX.value = startX;
		endHandleX.value = Math.max(HANDLE_WIDTH, endX); // Ensure minimum distance from start
		currentTimeX.value = Math.max(0, Math.min(TRIMMER_WIDTH - 2, currentX));
	}, [startTime, endTime, currentTime, duration]);

	// Optimized video event listeners with throttling
	useEventListener(player, 'timeUpdate', ({ currentTime: time }) => {
		if (!isDragging && isLoaded) {
			setCurrentTime(time);

			// Custom loop within selected range with debouncing
			if (time >= endTime - 0.1 && isPlaying) {
				// Small buffer to prevent rapid looping
				try {
					player.currentTime = startTime;
				} catch (error) {
					console.warn('Error setting current time:', error);
				}
			}
		}
	});

	useEventListener(player, 'statusChange', ({ status, error }) => {
		if (status === 'readyToPlay') {
			setIsLoaded(true);
			// Start playing from startTime with delay for better stability
			setTimeout(() => {
				try {
					player.currentTime = startTime;
					player.play();
				} catch (error) {
					console.warn('Error starting playback:', error);
				}
			}, 100);
		} else if (status === 'error' && error) {
			console.error('Video error:', error);
			setIsLoaded(true); // Show interface even with error
		}
	});

	// Progressive timeout fallback for loading
	useEffect(() => {
		// Quick timeout for local videos
		const quickTimeout = setTimeout(() => {
			if (!isLoaded) {
				console.log(
					'Video taking longer than expected, checking if it needs download...',
				);
				setLoadingMessage('Esto está tardando más de lo normal...');
			}
		}, 3000); // 3 second warning

		// Medium timeout
		const mediumTimeout = setTimeout(() => {
			if (!isLoaded) {
				setLoadingMessage('Puede que el video esté en iCloud...');
			}
		}, 6000); // 6 second update

		// Extended timeout for iCloud videos
		const extendedTimeout = setTimeout(() => {
			if (!isLoaded) {
				console.warn('Video took too long to load, showing interface anyway');
				setIsLoaded(true);
			}
		}, 10000); // 10 second timeout

		return () => {
			clearTimeout(quickTimeout);
			clearTimeout(mediumTimeout);
			clearTimeout(extendedTimeout);
		};
	}, [isLoaded]);

	// Helper function to show trim validation error
	const showTrimTooShortError = useCallback(() => {
		Alert.alert(t('common.error'), t('upload.trimTooShort'), [
			{ text: t('common.ok') },
		]);
	}, [t]);

	// Worklet functions for gesture handlers
	const updateStartTimeFromGesture = useCallback(
		(x: number) => {
			'worklet';
			const newStartTime = Math.max(0, (x / TRIMMER_WIDTH) * duration);
			const maxStartTime = Math.max(0, endTime - MIN_DURATION);
			const clampedStartTime = Math.min(newStartTime, maxStartTime);

			// Check if the trim duration would be too short
			if (endTime - clampedStartTime < MIN_DURATION) {
				runOnJS(showTrimTooShortError)();
				return;
			}

			runOnJS(setStartTime)(clampedStartTime);
			runOnJS(setEndTime)(endTime);
			runOnJS(onTrimChange)(clampedStartTime, endTime);
		},
		[duration, endTime, onTrimChange, showTrimTooShortError],
	);

	const updateEndTimeFromGesture = useCallback(
		(x: number) => {
			'worklet';
			// Add handle width back to get the actual time
			const newEndTime = Math.min(
				duration,
				((x + HANDLE_WIDTH) / TRIMMER_WIDTH) * duration,
			);
			const minEndTime = Math.min(duration, startTime + MIN_DURATION);
			const clampedEndTime = Math.max(newEndTime, minEndTime);

			// Check if the trim duration would be too short
			if (clampedEndTime - startTime < MIN_DURATION) {
				runOnJS(showTrimTooShortError)();
				return;
			}

			runOnJS(setStartTime)(startTime);
			runOnJS(setEndTime)(clampedEndTime);
			runOnJS(onTrimChange)(startTime, clampedEndTime);
		},
		[duration, startTime, onTrimChange, showTrimTooShortError],
	);

	// Helper function for seeking
	const handleSeekFromGesture = useCallback(
		(time: number) => {
			setCurrentTime(time);
			try {
				player.currentTime = time;
			} catch (error) {
				console.warn('Error seeking during gesture:', error);
			}
		},
		[player],
	);

	// Worklet function for current time seeking
	const updateCurrentTimeFromGesture = useCallback(
		(x: number) => {
			'worklet';
			const newTime = Math.max(
				0,
				Math.min(duration, (x / TRIMMER_WIDTH) * duration),
			);

			runOnJS(handleSeekFromGesture)(newTime);
		},
		[duration, handleSeekFromGesture],
	);

	// Helper functions for video control
	const pauseVideo = useCallback(() => {
		if (isPlaying) {
			player.pause();
		}
	}, [isPlaying, player]);

	const resumeVideo = useCallback(
		(time: number) => {
			try {
				player.currentTime = time;
				player.play();
			} catch (error) {
				console.warn('Error resuming playback:', error);
			}
		},
		[player],
	);

	// Start handle gesture with proper initialization
	const startHandleGesture = Gesture.Pan()
		.onStart(() => {
			runOnJS(setIsDragging)(true);
			startHandleStartX.value = startHandleX.value;
			runOnJS(pauseVideo)();
		})
		.onUpdate((event) => {
			const newX = Math.max(
				0,
				Math.min(
					endHandleX.value - HANDLE_WIDTH * 2,
					startHandleStartX.value + event.translationX,
				),
			);
			startHandleX.value = newX;
			updateStartTimeFromGesture(newX);
		})
		.onEnd(() => {
			runOnJS(setIsDragging)(false);
			// Animate to final position
			startHandleX.value = withSpring((startTime / duration) * TRIMMER_WIDTH);
			runOnJS(resumeVideo)(startTime);
		});

	// End handle gesture with proper initialization
	const endHandleGesture = Gesture.Pan()
		.onStart(() => {
			runOnJS(setIsDragging)(true);
			endHandleStartX.value = endHandleX.value;
			runOnJS(pauseVideo)();
		})
		.onUpdate((event) => {
			const newX = Math.max(
				startHandleX.value + HANDLE_WIDTH * 2,
				Math.min(
					TRIMMER_WIDTH - HANDLE_WIDTH, // Keep within bounds
					endHandleStartX.value + event.translationX,
				),
			);
			endHandleX.value = newX;
			updateEndTimeFromGesture(newX);
		})
		.onEnd(() => {
			runOnJS(setIsDragging)(false);
			// Animate to final position with handle width offset
			endHandleX.value = withSpring(
				(endTime / duration) * TRIMMER_WIDTH - HANDLE_WIDTH,
			);
			runOnJS(resumeVideo)(startTime);
		});

	// Current time indicator gesture for scrubbing
	const currentTimeGesture = Gesture.Pan()
		.onStart(() => {
			'worklet';
			runOnJS(setIsDragging)(true);
			currentTimeStartX.value = currentTimeX.value;
			runOnJS(pauseVideo)();
		})
		.onUpdate((event) => {
			'worklet';
			const newX = Math.max(
				0,
				Math.min(
					TRIMMER_WIDTH - 2, // Account for indicator width
					currentTimeStartX.value + event.translationX,
				),
			);
			currentTimeX.value = newX;
			updateCurrentTimeFromGesture(newX);
		})
		.onEnd(() => {
			'worklet';
			runOnJS(setIsDragging)(false);
			// Don't resume automatically, let user control playback
		});

	// Play/pause handler
	const handlePlayPause = useCallback(() => {
		try {
			if (isPlaying) {
				player.pause();
			} else {
				player.currentTime = startTime;
				player.play();
			}
		} catch (error) {
			console.warn('Error toggling playback:', error);
		}
	}, [isPlaying, player, startTime]);

	// Handler for Next button with validation
	const handleNext = useCallback(() => {
		const trimDuration = endTime - startTime;
		if (trimDuration < MIN_DURATION) {
			showTrimTooShortError();
			return;
		}
		onNext();
	}, [startTime, endTime, onNext, showTrimTooShortError]);

	// Time formatting utility
	const formatTime = (timeInSeconds: number) => {
		const minutes = Math.floor(timeInSeconds / 60);
		const seconds = Math.floor(timeInSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	// Animated styles for handles and overlays
	const startHandleStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: startHandleX.value }],
	}));

	const endHandleStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: endHandleX.value }],
	}));

	// Left overlay (darkened area before start time)
	const leftOverlayStyle = useAnimatedStyle(() => ({
		width: startHandleX.value,
	}));

	// Right overlay (darkened area after end time)
	const rightOverlayStyle = useAnimatedStyle(() => ({
		left: endHandleX.value,
		width: TRIMMER_WIDTH - endHandleX.value,
	}));

	// Selected range highlight
	const selectedRangeStyle = useAnimatedStyle(() => ({
		left: startHandleX.value,
		width: endHandleX.value - startHandleX.value,
	}));

	// Optimized current time indicator position updates
	useEffect(() => {
		if (!isDragging) {
			const position = (currentTime / duration) * TRIMMER_WIDTH;
			const clampedPosition = Math.max(
				0,
				Math.min(TRIMMER_WIDTH - 2, position),
			); // Account for indicator width
			// Use direct assignment for better performance during playback
			currentTimeX.value = clampedPosition;
		}
	}, [currentTime, duration, isDragging]);

	// Current time indicator
	const currentTimeIndicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: currentTimeX.value }],
	}));

	return (
		<GestureHandlerRootView style={styles.container}>
			<SafeAreaView style={styles.container} edges={['top']}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={onCancel} style={styles.headerButton}>
						<Text style={styles.headerButtonText}>Cancelar</Text>
					</TouchableOpacity>
					<Text style={styles.headerTitle}>Recortar</Text>
					<TouchableOpacity onPress={handleNext} style={styles.headerButton}>
						<Text style={[styles.headerButtonText, styles.nextButton]}>
							Siguiente
						</Text>
					</TouchableOpacity>
				</View>

				{/* Video Player */}
				<View style={styles.videoContainer}>
					<VideoView
						player={player}
						style={styles.video}
						contentFit="contain"
						nativeControls={false}
						allowsFullscreen={false}
						allowsPictureInPicture={false}
					/>

					{/* Loading Overlay */}
					{!isLoaded && (
						<View style={styles.loadingVideoOverlay}>
							<View style={styles.loadingVideoContainer}>
								<Text style={styles.loadingVideoText}>{loadingMessage}</Text>
								{loadingMessage.includes('iCloud') && (
									<Text style={styles.loadingVideoSubtext}>
										Los videos de iCloud pueden tardar en descargarse
									</Text>
								)}
							</View>
						</View>
					)}

					{/* Play/Pause Overlay */}
					{isLoaded && (
						<TouchableOpacity
							style={styles.playOverlay}
							onPress={handlePlayPause}
							activeOpacity={0.7}
						>
							{!isPlaying && (
								<View style={styles.playButton}>
									<Text style={styles.playButtonText}>▶</Text>
								</View>
							)}
						</TouchableOpacity>
					)}
				</View>

				{/* Time Display */}
				<View style={styles.timeContainer}>
					<Text style={styles.timeText}>
						{formatTime(startTime)} - {formatTime(endTime)}
					</Text>
					<Text style={styles.durationText}>
						{formatTime(endTime - startTime)}
					</Text>
				</View>

				{/* Video Trimmer */}
				<View style={styles.trimmerContainer}>
					<View style={styles.trimmerTrack}>
						{/* Conditional thumbnail loading based on performance */}
						{isLoaded && useThumbnails ? (
							<VideoThumbnails videoUri={videoUri} duration={duration} />
						) : (
							<SimpleTrimmerBar duration={duration} />
						)}

						{/* Left overlay (before start) */}
						<Animated.View style={[styles.overlay, leftOverlayStyle]} />

						{/* Right overlay (after end) */}
						<Animated.View style={[styles.overlay, rightOverlayStyle]} />

						{/* Selected range highlight */}
						<Animated.View style={[styles.selectedRange, selectedRangeStyle]} />

						{/* Current time indicator - Interactive */}
						<GestureDetector gesture={currentTimeGesture}>
							<Animated.View
								style={[styles.currentTimeIndicator, currentTimeIndicatorStyle]}
							>
								{/* Visual handle at the top */}
								<View style={styles.currentTimeVisualHandle} />
								{/* Invisible touch area for better gesture detection */}
								<View style={styles.currentTimeHandle} />
							</Animated.View>
						</GestureDetector>

						{/* Start handle */}
						<GestureDetector gesture={startHandleGesture}>
							<Animated.View
								style={[
									styles.trimHandle,
									styles.startHandle,
									startHandleStyle,
								]}
							>
								<View style={styles.handleLine} />
								<View style={styles.handleGrip} />
							</Animated.View>
						</GestureDetector>

						{/* End handle */}
						<GestureDetector gesture={endHandleGesture}>
							<Animated.View
								style={[styles.trimHandle, styles.endHandle, endHandleStyle]}
							>
								<View style={styles.handleLine} />
								<View style={styles.handleGrip} />
							</Animated.View>
						</GestureDetector>
					</View>

					{/* Time labels */}
					<View style={styles.timeLabels}>
						<Text style={styles.timeLabel}>{formatTime(0)}</Text>
						<Text style={styles.timeLabel}>{formatTime(duration)}</Text>
					</View>
				</View>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	headerButton: {
		minWidth: 80,
	},
	headerButtonText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	headerTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		color: Colors.text,
		textAlign: 'center',
	},
	nextButton: {
		color: Colors.primary,
		textAlign: 'right',
	},
	videoContainer: {
		flex: 1,
		backgroundColor: Colors.background,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	video: {
		width: '100%',
		height: '100%',
	},
	playOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
	},
	playButton: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	playButtonText: {
		fontSize: 32,
		color: Colors.text,
		marginLeft: 4,
	},
	timeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.backgroundSecondary,
	},
	timeText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	durationText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
	},
	trimmerContainer: {
		backgroundColor: Colors.backgroundSecondary,
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 50,
	},
	trimmerTrack: {
		height: 70,
		width: TRIMMER_WIDTH,
		position: 'relative',
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: 'transparent', // Fallback while thumbnails load
		paddingTop: 10,
	},
	overlay: {
		position: 'absolute',
		bottom: 0,
		height: 60,
		borderRadius: 8,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
	},
	selectedRange: {
		position: 'absolute',
		bottom: 0,
		height: 60,
		backgroundColor: 'transparent',
		borderTopWidth: 3,
		borderBottomWidth: 3,
		borderTopColor: Colors.primary,
		borderBottomColor: Colors.primary,
	},
	currentTimeIndicator: {
		position: 'absolute',
		top: 10,
		width: 3,
		height: 60,
		backgroundColor: Colors.warning,
		zIndex: 15, // Higher than trim handles
		alignItems: 'center',
		justifyContent: 'flex-start',
	},
	currentTimeVisualHandle: {
		position: 'absolute',
		top: -10,
		width: 16,
		height: 16,
		borderRadius: 8,
		backgroundColor: Colors.warning,
		borderWidth: 2,
		borderColor: Colors.text,
		left: -6.5, // Center over the 3px line
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.3,
		shadowRadius: 3,
		elevation: 5,
	},
	currentTimeHandle: {
		position: 'absolute',
		width: 30, // Even larger touch area
		height: 60, // Match trimmer height
		backgroundColor: 'transparent',
		left: -13.5, // Center the touch area over the indicator
		top: 10,
	},
	trimHandle: {
		position: 'absolute',
		top: 8,
		width: HANDLE_WIDTH,
		height: 60,
		backgroundColor: Colors.primary,
		borderRadius: 6,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 20,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	startHandle: {
		borderTopLeftRadius: 6,
		borderBottomLeftRadius: 6,
		borderTopRightRadius: 2,
		borderBottomRightRadius: 2,
	},
	endHandle: {
		borderTopLeftRadius: 2,
		borderBottomLeftRadius: 2,
		borderTopRightRadius: 6,
		borderBottomRightRadius: 6,
	},
	handleLine: {
		width: 2,
		height: 40,
		backgroundColor: Colors.text,
		borderRadius: 1,
		marginBottom: 4,
	},
	handleGrip: {
		width: 8,
		height: 3,
		backgroundColor: Colors.text,
		borderRadius: 1.5,
		marginBottom: 2,
	},
	timeLabels: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 8,
	},
	timeLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	loadingVideoOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.8)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingVideoContainer: {
		backgroundColor: Colors.backgroundSecondary,
		padding: 20,
		borderRadius: 12,
		alignItems: 'center',
	},
	loadingVideoText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
		textAlign: 'center',
	},
	loadingVideoSubtext: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		marginTop: 8,
	},
});
