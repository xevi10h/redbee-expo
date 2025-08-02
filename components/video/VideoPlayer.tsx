import { Feather } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	Animated,
	Dimensions,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { Comment, User, Video as VideoType } from '@/shared/types';
import { CommentsModal } from '../comments/CommentsModal';
import { VideoControls } from '../video/VideoControls';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VideoPlayerProps {
	video: VideoType;
	isActive: boolean;
	currentUser: User;
	onLike: () => void;
	onComment: () => void;
	onFollow: () => void;
	onSubscribe: () => void;
	onReport: () => void;
	onUserPress: () => void;
	onCommentAdded: (comment: Comment) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
	video,
	isActive,
	currentUser,
	onLike,
	onComment,
	onFollow,
	onSubscribe,
	onReport,
	onUserPress,
	onCommentAdded,
}) => {
	const [hasError, setHasError] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [showCommentsModal, setShowCommentsModal] = useState(false); // ✅ NUEVO: Estado del modal de comentarios
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const { t } = useTranslation();

	const player = useVideoPlayer(video.video_url, (player) => {
		player.loop = true;
		player.muted = false;
		player.timeUpdateEventInterval = 0.5;
		player.audioMixingMode = 'mixWithOthers';
	});

	const { isPlaying } = useEvent(player, 'playingChange', {
		isPlaying: player.playing,
	});

	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isLoaded, setIsLoaded] = useState(false);

	useEventListener(player, 'timeUpdate', ({ currentTime: time }) => {
		setCurrentTime(time);
		setDuration(player.duration);
	});

	useEventListener(player, 'statusChange', ({ status, error }) => {
		if (status === 'error') {
			console.error('Video load error:', error);
			setHasError(true);
			setIsLoaded(false);
		} else if (status === 'readyToPlay') {
			setHasError(false);
			setIsLoaded(true);
		} else if (status === 'loading') {
			setIsLoaded(false);
		}
	});

	// ✅ CORRECCIÓN PRINCIPAL: Solo ocultar controles si NO hay modal de comentarios abierto
	useEffect(() => {
		let timer: ReturnType<typeof setTimeout>;

		// ✅ Agregar condición para evitar ocultar controles cuando el modal está abierto
		if (showControls && isPlaying && !showCommentsModal) {
			timer = setTimeout(() => {
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}).start(() => setShowControls(false));
			}, 3000);
		}

		return () => clearTimeout(timer);
	}, [showControls, isPlaying, fadeAnim, showCommentsModal]); // ✅ Agregar showCommentsModal como dependencia

	useEffect(() => {
		if (isActive && isLoaded) {
			player.play();
		} else if (!isActive) {
			player.pause();
		}
	}, [isActive, isLoaded, player]);

	const handleVideoPress = () => {
		if (!showControls) {
			setShowControls(true);
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 200,
				useNativeDriver: true,
			}).start();
		} else {
			togglePlayback();
		}
	};

	const togglePlayback = () => {
		if (isPlaying) {
			player.pause();
		} else {
			player.play();
		}
	};

	const handleCommentPress = useCallback(() => {
		setShowCommentsModal(true);
		setShowControls(true);
		onComment();
	}, [onComment]);

	const handleCommentsModalClose = useCallback(() => {
		setShowCommentsModal(false);
	}, []);

	const handleCommentAdded = useCallback(
		(comment: Comment) => {
			onCommentAdded(comment);
		},
		[onCommentAdded],
	);

	const progress = duration > 0 ? currentTime / duration : 0;

	const renderVideoContent = () => {
		if (hasError) {
			return (
				<View style={styles.errorContainer}>
					<Feather name="alert-circle" size={48} color={Colors.error} />
					<Text style={styles.errorText}>Error al cargar el video</Text>
					<TouchableOpacity
						style={styles.retryButton}
						onPress={() => {
							setHasError(false);
							player.replaceAsync({ uri: video.video_url });
						}}
					>
						<Text style={styles.retryText}>Reintentar</Text>
					</TouchableOpacity>
				</View>
			);
		}

		return (
			<>
				<VideoView
					player={player}
					style={styles.video}
					contentFit="cover"
					nativeControls={false}
					allowsFullscreen={false}
					allowsPictureInPicture={false}
				/>

				{!isLoaded && !hasError && (
					<View style={styles.loadingContainer}>
						<LinearGradient
							colors={Colors.gradientSecondary}
							style={styles.loadingGradient}
						>
							<Animated.View style={styles.loadingSpinner}>
								<Feather name="loader" size={32} color={Colors.primary} />
							</Animated.View>
							<Text style={styles.loadingText}>Cargando video...</Text>
						</LinearGradient>
					</View>
				)}

				{video.is_premium && !video.is_subscribed && (
					<View style={styles.premiumOverlay}>
						<LinearGradient
							colors={['transparent', 'rgba(0,0,0,0.8)']}
							style={styles.premiumGradient}
						>
							<View style={styles.premiumContent}>
								<Feather name="star" size={32} color={Colors.premium} />
								<Text style={styles.premiumTitle}>
									{t('video.previewOnly')}
								</Text>
								<Text style={styles.premiumSubtitle}>
									{t('video.subscribeToWatch')}
								</Text>
							</View>
						</LinearGradient>
					</View>
				)}

				{showControls && isLoaded && (
					<Animated.View style={[styles.playIndicator, { opacity: fadeAnim }]}>
						{!isPlaying && (
							<TouchableOpacity
								style={styles.playButton}
								onPress={togglePlayback}
								activeOpacity={0.8}
							>
								<Feather name="play" size={32} color={Colors.text} />
							</TouchableOpacity>
						)}
					</Animated.View>
				)}

				{isLoaded && progress > 0 && (
					<View style={styles.progressContainer}>
						<View style={styles.progressBar}>
							<View
								style={[styles.progressFill, { width: `${progress * 100}%` }]}
							/>
						</View>
					</View>
				)}
			</>
		);
	};

	return (
		<View style={styles.container}>
			<Pressable style={styles.videoContainer} onPress={handleVideoPress}>
				{renderVideoContent()}
			</Pressable>

			{showControls && isLoaded && (
				<Animated.View
					style={[styles.controlsContainer, { opacity: fadeAnim }]}
				>
					<VideoControls
						video={video}
						currentUser={currentUser}
						onLike={onLike}
						onComment={handleCommentPress} // ✅ Usar la nueva función
						onFollow={onFollow}
						onSubscribe={onSubscribe}
						onReport={onReport}
						onUserPress={onUserPress}
						onCommentAdded={handleCommentAdded}
					/>
				</Animated.View>
			)}

			{/* ✅ CommentsModal manejado directamente aquí para mejor control */}
			<CommentsModal
				isVisible={showCommentsModal}
				video={video}
				currentUser={currentUser}
				onClose={handleCommentsModalClose}
				onCommentAdded={handleCommentAdded}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT - 70,
		marginBottom: 70,
		backgroundColor: Colors.videoBackground,
		position: 'relative',
	},
	videoContainer: {
		flex: 1,
	},
	video: {
		width: '100%',
		height: '100%',
	},
	loadingContainer: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingGradient: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingSpinner: {
		marginBottom: 16,
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		paddingHorizontal: 32,
	},
	errorText: {
		fontSize: 18,
		fontFamily: 'Inter-Medium',
		color: Colors.error,
		marginTop: 16,
		marginBottom: 24,
		textAlign: 'center',
	},
	retryButton: {
		paddingHorizontal: 24,
		paddingVertical: 12,
		backgroundColor: Colors.primary,
		borderRadius: 8,
	},
	retryText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
	},
	premiumOverlay: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: '40%',
	},
	premiumGradient: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
		paddingBottom: 100,
	},
	premiumContent: {
		alignItems: 'center',
	},
	premiumTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		color: Colors.text,
		marginTop: 12,
		marginBottom: 4,
	},
	premiumSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	playIndicator: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -25 }, { translateY: -25 }],
	},
	playButton: {
		width: 50,
		height: 50,
		borderRadius: 25,
		backgroundColor: Colors.overlay,
		justifyContent: 'center',
		alignItems: 'center',
	},
	progressContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	progressBar: {
		height: 2,
		backgroundColor: Colors.videoProgressBackground,
		borderRadius: 1,
	},
	progressFill: {
		height: '100%',
		backgroundColor: Colors.videoProgress,
		borderRadius: 1,
	},
	controlsContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		pointerEvents: 'box-none',
	},
});

export default VideoPlayer;
