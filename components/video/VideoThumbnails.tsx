import { VideoView, useVideoPlayer } from 'expo-video';
import React, { memo, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

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
	// Use fewer thumbnails for better performance
	const thumbnailCount = Math.max(4, Math.min(6, Math.ceil(duration / 4)));
	const thumbnailWidth = TRIMMER_WIDTH / thumbnailCount;
	
	// Generate thumbnail times
	const thumbnailTimes: number[] = [];
	for (let i = 0; i < thumbnailCount; i++) {
		const time = (i / (thumbnailCount - 1)) * duration;
		// Add small offset to avoid black frames
		thumbnailTimes.push(Math.min(duration - 0.1, Math.max(0.1, time)));
	}

	return (
		<View style={styles.container}>
			{thumbnailTimes.map((time, index) => (
				<VideoThumbnail
					key={`${videoUri}-${index}-${time}`}
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
	
	// Always create the player - no conditional hooks
	const player = useVideoPlayer(videoUri, (player) => {
		player.loop = false;
		player.muted = true;
		player.volume = 0;
	});

	useEffect(() => {
		let mounted = true;
		let timeoutId: NodeJS.Timeout;

		const handleStatusChange = (status: any) => {
			if (!mounted) return;
			
			if (status.status === 'readyToPlay' && !isReady) {
				// Stagger the seeking to avoid simultaneous operations
				timeoutId = setTimeout(() => {
					if (mounted && player) {
						try {
							player.currentTime = time;
							setIsReady(true);
						} catch (error) {
							console.warn(`Error seeking thumbnail ${index}:`, error);
						}
					}
				}, index * 100);
			}
		};

		const unsubscribe = player.addListener('statusChange', handleStatusChange);

		return () => {
			mounted = false;
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
			if (unsubscribe?.remove) {
				unsubscribe.remove();
			}
		};
	}, [player, time, index, isReady]);

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
});