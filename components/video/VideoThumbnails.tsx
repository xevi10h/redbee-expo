import { VideoView, useVideoPlayer } from 'expo-video';
import { memo, useCallback, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
const TRIMMER_WIDTH = screenWidth - 32;

interface VideoThumbnailsProps {
	videoUri: string;
	duration: number;
}

export const VideoThumbnails = memo(function VideoThumbnails({
	videoUri,
	duration,
}: VideoThumbnailsProps) {
	// Smart thumbnail count based on video characteristics
	const isLikelyLocal =
		!videoUri.includes('icloud') &&
		!videoUri.includes('CloudDocs') &&
		!videoUri.includes('tmp');
	const thumbnailCount = isLikelyLocal
		? Math.min(5, Math.max(3, Math.ceil(duration / 20))) // More thumbnails for local videos
		: Math.min(3, Math.max(2, Math.ceil(duration / 60))); // Fewer for potentially slow videos
	const thumbnailWidth = TRIMMER_WIDTH / thumbnailCount;

	// Generate thumbnail times with better distribution
	const thumbnailTimes: number[] = [];
	for (let i = 0; i < thumbnailCount; i++) {
		const progress = i / Math.max(1, thumbnailCount - 1);
		const time = progress * duration;
		// Add offset to avoid black frames at start/end
		const safeTime = Math.min(duration - 0.5, Math.max(0.5, time));
		thumbnailTimes.push(safeTime);
	}

	return (
		<View style={styles.container}>
			{thumbnailTimes.map((time, index) => (
				<VideoThumbnail
					key={`${videoUri}-${index}`} // Simplified key
					videoUri={videoUri}
					time={time}
					width={thumbnailWidth}
					index={index}
				/>
			))}
		</View>
	);
});

interface VideoThumbnailProps {
	videoUri: string;
	time: number;
	width: number;
	index: number;
}

const VideoThumbnail = memo(function VideoThumbnail({
	videoUri,
	time,
	width,
	index,
}: VideoThumbnailProps) {
	const [isReady, setIsReady] = useState(false);
	const [hasError, setHasError] = useState(false);

	// Optimized player creation with better resource management
	const player = useVideoPlayer(videoUri, (player) => {
		player.loop = false;
		player.muted = true;
		player.volume = 0;
		// Reduce quality for thumbnails to improve performance
		player.playbackRate = 1.0;
	});

	const handleSeekToTime = useCallback(() => {
		try {
			if (player && !hasError) {
				player.currentTime = time;
				setIsReady(true);
			}
		} catch (error) {
			console.warn(`Error seeking thumbnail ${index}:`, error);
			setHasError(true);
		}
	}, [player, time, index, hasError]);

	useEffect(() => {
		let mounted = true;
		let timeoutId: ReturnType<typeof setTimeout>;
		let retryTimeoutId: ReturnType<typeof setTimeout>;

		const handleStatusChange = (status: any) => {
			if (!mounted || hasError) return;

			if (status.status === 'readyToPlay' && !isReady) {
				// Smart staggering based on video source
				const isLikelyLocal =
					!videoUri.includes('icloud') && !videoUri.includes('CloudDocs');
				const baseDelay = isLikelyLocal ? 100 : 300; // Faster for local videos
				const staggerDelay = isLikelyLocal ? 150 : 400; // Less stagger for local

				timeoutId = setTimeout(() => {
					if (mounted && !hasError) {
						handleSeekToTime();
					}
				}, index * staggerDelay + baseDelay);
			} else if (status.status === 'error') {
				console.warn(`Thumbnail ${index} error:`, status.error);
				setHasError(true);
			}
		};

		const unsubscribe = player.addListener('statusChange', handleStatusChange);

		// Fallback timeout to mark as ready even if seeking fails
		retryTimeoutId = setTimeout(() => {
			if (mounted && !isReady && !hasError) {
				setIsReady(true);
			}
		}, 3000 + index * 200);

		return () => {
			mounted = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			if (retryTimeoutId) {
				clearTimeout(retryTimeoutId);
			}
			if (unsubscribe?.remove) {
				unsubscribe.remove();
			}
		};
	}, [player, time, index, isReady, hasError, handleSeekToTime]);

	// Show simplified placeholder for failed thumbnails
	if (hasError) {
		return (
			<View style={[styles.thumbnail, { width }]}>
				<View style={styles.errorOverlay}>
					<Text style={styles.errorText}>•</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={[styles.thumbnail, { width }]}>
			<VideoView
				player={player}
				style={styles.video}
				contentFit="cover"
				nativeControls={false}
				allowsFullscreen={false}
				allowsPictureInPicture={false}
			/>
			{!isReady && (
				<View style={styles.loadingOverlay}>
					<View style={styles.placeholderContent} />
				</View>
			)}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		height: 60,
		width: TRIMMER_WIDTH,
		backgroundColor: '#1a1a1a',
		borderRadius: 8,
		overflow: 'hidden',
	},
	thumbnail: {
		height: 60,
		backgroundColor: '#2a2a2a',
		position: 'relative',
	},
	video: {
		width: '100%',
		height: '100%',
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: '#2a2a2a',
		justifyContent: 'center',
		alignItems: 'center',
	},
	placeholderContent: {
		width: '50%',
		height: '50%',
		backgroundColor: '#404040',
		borderRadius: 4,
	},
	errorOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: '#333333',
		justifyContent: 'center',
		alignItems: 'center',
	},
	errorText: {
		color: '#666666',
		fontSize: 12,
	},
});
