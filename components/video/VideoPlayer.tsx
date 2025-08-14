import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Animated,
	Dimensions,
	Platform,
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
import { VideoProgressSlider } from '../video/VideoProgressSlider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tab bar measurements (matching _layout.tsx) - when not in fullscreen
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70;
// Video height should exclude tab bar area when in home feed
const VIDEO_HEIGHT = SCREEN_HEIGHT - TAB_BAR_HEIGHT;

interface VideoPlayerProps {
	video: VideoType;
	isActive: boolean;
	currentUser: User;
	onLike: () => void;
	onComment: () => void;
	onFollow: () => void;
	onSubscribe: () => void;
	onReport: () => void;
	onHideVideo?: () => void;
	onDeleteVideo?: () => void;
	onUserPress: () => void;
	onCommentAdded: (comment: Comment) => void;
	isFullscreen?: boolean; // Para indicar si estamos en pantalla completa
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
	onHideVideo,
	onDeleteVideo,
	onUserPress,
	onCommentAdded,
	isFullscreen = false,
}) => {
	const [hasError, setHasError] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [showCommentsModal, setShowCommentsModal] = useState(false); // ✅ NUEVO: Estado del modal de comentarios
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const { t } = useTranslation();

	const player = useVideoPlayer(video.video_url, (player) => {
		player.loop = true;
		player.muted = false;
		player.timeUpdateEventInterval = 0.1; // More frequent updates to catch duration sooner
		player.audioMixingMode = 'mixWithOthers';

		// Try to get duration immediately
		console.log('🎥 Player created, initial duration:', player.duration);
	});

	const { isPlaying } = useEvent(player, 'playingChange', {
		isPlaying: player.playing,
	});

	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [isLoaded, setIsLoaded] = useState(false);
	const [isSeeking, setIsSeeking] = useState(false);

	useEventListener(player, 'timeUpdate', ({ currentTime: time }) => {
		// Only update currentTime if we're not currently seeking to avoid conflicts
		if (!isSeeking) {
			setCurrentTime(time);
		}

		// Update duration if it has changed
		const videoDuration = player.duration;
		if (videoDuration !== duration && videoDuration > 0) {
			setDuration(videoDuration);
		}
	});

	useEventListener(player, 'statusChange', ({ status, error }) => {
		console.log(
			'🎬 Video status changed:',
			status,
			'player.duration:',
			player.duration,
		);
		if (status === 'error') {
			console.error('❌ Video load error:', error);
			setHasError(true);
			setIsLoaded(false);
			setIsSeeking(false);
		} else if (status === 'readyToPlay') {
			console.log('✅ Video ready to play');
			setHasError(false);
			setIsLoaded(true);
			setIsSeeking(false);
			// Asegurar que obtenemos la duración cuando el video está listo
			const videoDuration = player.duration;
			console.log(
				'📏 Video ready, player.duration:',
				videoDuration,
				'current state duration:',
				duration,
			);
			if (videoDuration > 0) {
				console.log('✅ Setting duration to:', videoDuration);
				setDuration(videoDuration);
			} else {
				console.warn('⚠️ Player duration is still 0 when ready');
			}
		} else if (status === 'loading') {
			console.log('⏳ Video loading...');
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

	// Polling más agresivo para asegurar que obtenemos la duración
	useEffect(() => {
		if (isLoaded && duration === 0) {
			console.log(
				'🔄 Starting duration polling - isLoaded:',
				isLoaded,
				'current duration:',
				duration,
			);
			const interval = setInterval(() => {
				const videoDuration = player.duration;
				console.log(
					'🔍 Polling duration:',
					videoDuration,
					'NaN?',
					isNaN(videoDuration),
				);
				if (videoDuration > 0 && !isNaN(videoDuration)) {
					console.log('✅ Duration found via polling:', videoDuration);
					setDuration(videoDuration);
					clearInterval(interval);
				}
			}, 200); // Poll more frequently

			// Limpiar después de 15 segundos para evitar polling infinito
			const timeout = setTimeout(() => {
				console.log('🛑 Duration polling timeout');
				clearInterval(interval);
			}, 15000);

			return () => {
				clearInterval(interval);
				clearTimeout(timeout);
			};
		}
	}, [isLoaded, duration, player]);

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

	const handleSeek = useCallback(
		(time: number) => {
			console.log('Seeking to:', time, 'seconds', 'duration:', duration);

			if (!isLoaded || duration <= 0) {
				console.warn('Cannot seek: video not loaded or invalid duration');
				return;
			}

			setIsSeeking(true);

			try {
				// Asegurar que el tiempo está en el rango válido
				const clampedTime = Math.max(0, Math.min(duration, time));
				console.log('Clamped time:', clampedTime);

				// Set the player time directly (this should work based on VideoTrimmer implementation)
				player.currentTime = clampedTime;

				// Update our local state immediately for better UX
				setCurrentTime(clampedTime);

				// Reset seeking state after a short delay
				setTimeout(() => {
					setIsSeeking(false);
				}, 300);
			} catch (error) {
				console.error('Error seeking video:', error);
				setIsSeeking(false);
			}
		},
		[player, duration, isLoaded],
	);

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

	// Progress calculation is now handled by VideoProgressSlider internally

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
							<ActivityIndicator 
								size="large" 
								color={Colors.primary}
								style={styles.loadingSpinner}
							/>
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
								<MaterialCommunityIcons
									name="crown"
									size={32}
									color={Colors.premium}
								/>
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
						onHideVideo={onHideVideo}
						onDeleteVideo={onDeleteVideo}
						onUserPress={onUserPress}
						onCommentAdded={handleCommentAdded}
					/>
				</Animated.View>
			)}

			{/* Back button for fullscreen mode */}
			{isFullscreen && (
				<Animated.View
					style={[styles.backButtonContainer, { opacity: fadeAnim }]}
				>
					<TouchableOpacity
						style={styles.backButton}
						onPress={() => router.back()}
						activeOpacity={0.7}
					>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>
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

			{/* Slider de progreso siempre visible */}
			<VideoProgressSlider
				currentTime={currentTime}
				duration={duration}
				onSeek={handleSeek}
				isActive={isActive && isLoaded}
				isSeeking={isSeeking}
				isFullscreen={isFullscreen}
				videoUri={video.video_url}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT, // Video a pantalla completa
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
		fontFamily: 'Raleway-SemiBold',
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
	controlsContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		pointerEvents: 'box-none',
	},
	backButtonContainer: {
		position: 'absolute',
		top: 70,
		left: 20,
		zIndex: 1000,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
});

export default VideoPlayer;
