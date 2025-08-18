import { VideoView, useVideoPlayer } from 'expo-video';
import React, { memo, useEffect, useState } from 'react';
import {
	Dimensions,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');
const THUMBNAIL_SIZE = (screenWidth - 48) / 3; // 3 columns with margins

interface ThumbnailSelectorProps {
	visible: boolean;
	videoUri: string;
	startTime: number;
	endTime: number;
	selectedTime: number;
	onSelect: (time: number) => void;
	onClose: () => void;
}

export const ThumbnailSelector = memo(function ThumbnailSelector({
	visible,
	videoUri,
	startTime,
	endTime,
	selectedTime,
	onSelect,
	onClose,
}: ThumbnailSelectorProps) {
	const { t } = useTranslation();

	// Generate thumbnail times within trimmed range
	const thumbnailTimes = React.useMemo(() => {
		const duration = endTime - startTime;
		const count = Math.min(12, Math.max(6, Math.ceil(duration / 5))); // 6-12 thumbnails
		const interval = duration / (count - 1);

		const times: number[] = [];
		for (let i = 0; i < count; i++) {
			// Round to avoid decimal precision issues
			const time = Math.round((startTime + i * interval) * 10) / 10;
			times.push(time);
		}

		return times;
	}, [startTime, endTime]);

	const formatTime = (timeInSeconds: number) => {
		const minutes = Math.floor(timeInSeconds / 60);
		const seconds = Math.floor(timeInSeconds % 60);
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	};

	const handleSelect = (time: number) => {
		onSelect(time);
		onClose();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<SafeAreaView style={styles.container} edges={['top']}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.cancelButton}>Cancelar</Text>
					</TouchableOpacity>
					<Text style={styles.title}>Seleccionar portada</Text>
					<View style={{ width: 70 }} />
				</View>

				{/* Instructions */}
				<View style={styles.instructions}>
					<Text style={styles.instructionsText}>
						Elige el frame que se mostrará como portada de tu video
					</Text>
				</View>

				{/* Thumbnail Grid */}
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.gridContainer}
					showsVerticalScrollIndicator={false}
				>
					{thumbnailTimes.map((time, index) => (
						<ThumbnailOption
							key={index}
							videoUri={videoUri}
							time={time}
							isSelected={Math.abs(time - selectedTime) < 0.1}
							onPress={() => handleSelect(time)}
							formatTime={formatTime}
						/>
					))}
				</ScrollView>
			</SafeAreaView>
		</Modal>
	);
});

interface ThumbnailOptionProps {
	videoUri: string;
	time: number;
	isSelected: boolean;
	onPress: () => void;
	formatTime: (time: number) => string;
}

const ThumbnailOption = memo(function ThumbnailOption({
	videoUri,
	time,
	isSelected,
	onPress,
	formatTime,
}: ThumbnailOptionProps) {
	const [isReady, setIsReady] = useState(false);

	const player = useVideoPlayer(videoUri, (player) => {
		player.loop = false;
		player.muted = true;
		player.volume = 0;
	});

	useEffect(() => {
		let mounted = true;
		let timeoutId: ReturnType<typeof setTimeout>;

		const handleStatusChange = (status: any) => {
			if (!mounted) return;

			if (status.status === 'readyToPlay' && !isReady) {
				timeoutId = setTimeout(() => {
					if (mounted && player) {
						try {
							player.currentTime = time;
							setIsReady(true);
						} catch (error) {
							console.warn('Error setting thumbnail time:', error);
						}
					}
				}, 100);
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
	}, [player, time, isReady]);

	return (
		<TouchableOpacity
			style={[styles.thumbnailOption, isSelected && styles.selectedThumbnail]}
			onPress={onPress}
			activeOpacity={0.8}
		>
			<View style={styles.thumbnailContainer}>
				<VideoView
					player={player}
					style={styles.thumbnail}
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
				{isSelected && (
					<View style={styles.selectedOverlay}>
						<View style={styles.checkmark}>
							<Text style={styles.checkmarkText}>✓</Text>
						</View>
					</View>
				)}
			</View>
			<Text style={styles.timeLabel}>{formatTime(time)}</Text>
		</TouchableOpacity>
	);
});

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
	cancelButton: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
		minWidth: 70,
	},
	title: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		color: Colors.text,
		textAlign: 'center',
	},
	instructions: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: Colors.backgroundSecondary,
	},
	instructionsText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	scrollView: {
		flex: 1,
	},
	gridContainer: {
		padding: 16,
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	thumbnailOption: {
		marginBottom: 16,
		alignItems: 'center',
	},
	thumbnailContainer: {
		width: THUMBNAIL_SIZE,
		height: THUMBNAIL_SIZE * 1.3,
		borderRadius: 8,
		overflow: 'hidden',
		backgroundColor: '#2a2a2a',
		position: 'relative',
	},
	thumbnail: {
		width: '100%',
		height: '100%',
	},
	selectedThumbnail: {
		transform: [{ scale: 0.95 }],
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: '#2a2a2a',
		justifyContent: 'center',
		alignItems: 'center',
	},
	placeholderContent: {
		width: '60%',
		height: '60%',
		backgroundColor: '#404040',
		borderRadius: 4,
	},
	selectedOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.3)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkmark: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},
	checkmarkText: {
		fontSize: 18,
		color: Colors.text,
		fontWeight: 'bold',
	},
	timeLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.textSecondary,
		marginTop: 4,
		textAlign: 'center',
	},
});
