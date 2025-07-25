import { Feather } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
	Alert,
	Animated,
	Dimensions,
	Pressable,
	Share,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber, formatTimeAgo } from '@/shared/functions/utils';
import { User, Video as VideoType } from '@/shared/types';

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
}

interface VideoControlsProps {
	video: VideoType;
	currentUser: User;
	onLike: () => void;
	onComment: () => void;
	onFollow: () => void;
	onSubscribe: () => void;
	onReport: () => void;
	onUserPress: () => void;
}

// Premium Modal Component
const PremiumModal: React.FC<{
	isVisible: boolean;
	video: VideoType;
	onClose: () => void;
	onSubscribe: () => void;
}> = ({ isVisible, video, onClose, onSubscribe }) => {
	const { t } = useTranslation();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

	useEffect(() => {
		if (isVisible) {
			Animated.spring(slideAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		} else {
			Animated.spring(slideAnim, {
				toValue: SCREEN_HEIGHT,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		}
	}, [isVisible]);

	if (!isVisible) return null;

	return (
		<View style={styles.modalOverlay}>
			<Pressable style={styles.modalBackdrop} onPress={onClose} />
			<Animated.View
				style={[
					styles.modalContainer,
					{ transform: [{ translateY: slideAnim }] },
				]}
			>
				<View style={styles.modalHeader}>
					<View style={styles.modalHandle} />
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather name="x" size={24} color={Colors.text} />
					</TouchableOpacity>
				</View>

				<View style={styles.modalContent}>
					{/* Creator Info */}
					<View style={styles.creatorHeader}>
						<View style={styles.creatorAvatar}>
							<Feather name="user" size={24} color={Colors.text} />
						</View>
						<View style={styles.creatorInfo}>
							<Text style={styles.creatorName}>
								{video.user?.display_name || video.user?.username}
							</Text>
							<Text style={styles.creatorUsername}>
								@{video.user?.username}
							</Text>
						</View>
						<View style={styles.premiumBadge}>
							<Feather name="star" size={16} color={Colors.text} />
						</View>
					</View>

					{/* Premium Benefits */}
					<View style={styles.benefitsContainer}>
						<Text style={styles.benefitsTitle}>
							{t('video.subscribeToWatch')}
						</Text>
						<Text style={styles.benefitsSubtitle}>
							Suscríbete para disfrutar de todo el contenido premium
						</Text>

						<View style={styles.benefitsList}>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Acceso a todos los videos premium
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Comentar en contenido exclusivo
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Apoyar directamente al creador
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Disfrutar de contenido de mayor calidad
								</Text>
							</View>
						</View>
					</View>

					{/* Subscription Price */}
					<View style={styles.priceContainer}>
						<Text style={styles.priceAmount}>
							€{video.user?.subscription_price || 4.99}
						</Text>
						<Text style={styles.pricePeriod}>/mes</Text>
					</View>

					{/* Subscribe Button */}
					<TouchableOpacity
						style={styles.subscribeButton}
						onPress={onSubscribe}
						activeOpacity={0.8}
					>
						<LinearGradient
							colors={Colors.gradientPrimary}
							style={styles.subscribeGradient}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							<Feather name="star" size={20} color={Colors.text} />
							<Text style={styles.subscribeText}>{t('video.subscribe')}</Text>
						</LinearGradient>
					</TouchableOpacity>

					<Text style={styles.disclaimer}>
						Puedes cancelar en cualquier momento
					</Text>
				</View>
			</Animated.View>
		</View>
	);
};

// Video Controls Component
const VideoControls: React.FC<VideoControlsProps> = ({
	video,
	currentUser,
	onLike,
	onComment,
	onFollow,
	onSubscribe,
	onReport,
	onUserPress,
}) => {
	const { t } = useTranslation();
	const [showPremiumModal, setShowPremiumModal] = useState(false);

	const handleShare = async () => {
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			await Share.share({
				message: `¡Mira este increíble video de @${video.user?.username} en Redbee!`,
				url: `https://redbee.app/video/${video.id}`, // URL ficticia
			});
		} catch (error) {
			console.error('Share error:', error);
		}
	};

	const handleLike = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onLike();
	};

	const handleComment = () => {
		if (video.is_premium && !video.is_subscribed) {
			setShowPremiumModal(true);
			return;
		}
		onComment();
	};

	const handleReport = () => {
		Alert.alert(
			'Reportar video',
			'¿Por qué estás reportando este video?',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{ text: 'Contenido inapropiado', onPress: () => onReport() },
				{ text: 'Spam', onPress: () => onReport() },
				{ text: 'Acoso', onPress: () => onReport() },
				{ text: 'Otro motivo', onPress: () => onReport() },
			],
			{ cancelable: true },
		);
	};

	return (
		<>
			{/* Left Side - User Info */}
			<View style={styles.leftControls}>
				<TouchableOpacity
					style={styles.userInfoContainer}
					onPress={onUserPress}
					activeOpacity={0.8}
				>
					<View style={styles.avatarContainer}>
						<LinearGradient
							colors={Colors.gradientPrimary}
							style={styles.avatarGradient}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							<Feather name="user" size={20} color={Colors.text} />
						</LinearGradient>
					</View>
					<Text style={styles.username}>@{video.user?.username}</Text>
				</TouchableOpacity>

				<View style={styles.videoInfo}>
					{video.title && (
						<Text style={styles.videoTitle} numberOfLines={2}>
							{video.title}
						</Text>
					)}
					{video.description && (
						<Text style={styles.videoDescription} numberOfLines={3}>
							{video.description}
						</Text>
					)}
					{video.hashtags && video.hashtags.length > 0 && (
						<Text style={styles.hashtags} numberOfLines={2}>
							{video.hashtags.map((tag) => `#${tag}`).join(' ')}
						</Text>
					)}
				</View>

				{/* Follow/Subscribe Buttons */}
				<View style={styles.actionButtonsContainer}>
					{!video.is_following && video.user?.id !== currentUser.id && (
						<TouchableOpacity
							style={styles.followButton}
							onPress={onFollow}
							activeOpacity={0.8}
						>
							<Text style={styles.followButtonText}>{t('video.follow')}</Text>
						</TouchableOpacity>
					)}

					{video.is_premium &&
						!video.is_subscribed &&
						video.user?.id !== currentUser.id && (
							<TouchableOpacity
								style={styles.modalSubscribeButton}
								onPress={() => setShowPremiumModal(true)}
								activeOpacity={0.8}
							>
								<LinearGradient
									colors={Colors.gradientPrimary}
									style={styles.subscribeGradient}
									start={{ x: 0, y: 0 }}
									end={{ x: 1, y: 0 }}
								>
									<Feather name="star" size={16} color={Colors.text} />
									<Text style={styles.subscribeText}>
										{t('video.subscribe')}
									</Text>
								</LinearGradient>
							</TouchableOpacity>
						)}
				</View>
			</View>

			{/* Right Side - Action Buttons */}
			<View style={styles.rightControls}>
				{/* Premium Badge */}
				{video.is_premium && (
					<TouchableOpacity
						style={styles.premiumIndicator}
						onPress={() => !video.is_subscribed && setShowPremiumModal(true)}
					>
						<Feather name="star" size={20} color={Colors.premium} />
					</TouchableOpacity>
				)}

				{/* Like Button */}
				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleLike}
					activeOpacity={0.7}
				>
					<Feather
						name="heart"
						size={28}
						color={video.is_liked ? Colors.error : Colors.text}
						style={video.is_liked && styles.likedIcon}
					/>
					<Text style={styles.actionText}>
						{formatNumber(video.likes_count)}
					</Text>
				</TouchableOpacity>

				{/* Comment Button */}
				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleComment}
					activeOpacity={0.7}
				>
					<Feather name="message-circle" size={28} color={Colors.text} />
					<Text style={styles.actionText}>
						{formatNumber(video.comments_count)}
					</Text>
				</TouchableOpacity>

				{/* Share Button */}
				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleShare}
					activeOpacity={0.7}
				>
					<Feather name="share" size={28} color={Colors.text} />
					<Text style={styles.actionText}>{t('video.share')}</Text>
				</TouchableOpacity>

				{/* Report Button */}
				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleReport}
					activeOpacity={0.7}
				>
					<Feather name="flag" size={24} color={Colors.text} />
				</TouchableOpacity>
			</View>

			{/* Premium Modal */}
			<PremiumModal
				isVisible={showPremiumModal}
				video={video}
				onClose={() => setShowPremiumModal(false)}
				onSubscribe={() => {
					setShowPremiumModal(false);
					onSubscribe();
				}}
			/>
		</>
	);
};

// Main VideoPlayer Component
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
}) => {
	const videoRef = useRef<Video>(null);
	const [isLoaded, setIsLoaded] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [progress, setProgress] = useState(0);
	const fadeAnim = useRef(new Animated.Value(1)).current;
	const { t } = useTranslation();

	// Auto-hide controls
	useEffect(() => {
		let timer: number;

		if (showControls && isPlaying) {
			timer = setTimeout(() => {
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 300,
					useNativeDriver: true,
				}).start(() => setShowControls(false));
			}, 3000);
		}

		return () => clearTimeout(timer);
	}, [showControls, isPlaying, fadeAnim]);

	// Handle video playback based on active state
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive && isLoaded) {
			videoRef.current.playAsync();
			setIsPlaying(true);
		} else {
			videoRef.current.pauseAsync();
			setIsPlaying(false);
		}
	}, [isActive, isLoaded]);

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

	const togglePlayback = async () => {
		if (!videoRef.current) return;

		try {
			if (isPlaying) {
				await videoRef.current.pauseAsync();
				setIsPlaying(false);
			} else {
				await videoRef.current.playAsync();
				setIsPlaying(true);
			}
		} catch (error) {
			console.error('Video playback error:', error);
		}
	};

	const handleLoadStart = () => {
		setIsLoaded(false);
		setHasError(false);
	};

	const handleLoad = () => {
		setIsLoaded(true);
		setHasError(false);
	};

	const handleError = (error: any) => {
		console.error('Video load error:', error);
		setHasError(true);
		setIsLoaded(false);
	};

	const handleProgress = (status: any) => {
		if (status.durationMillis && status.positionMillis) {
			const progressPercent = status.positionMillis / status.durationMillis;
			setProgress(progressPercent);
		}
	};

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
							setIsLoaded(false);
						}}
					>
						<Text style={styles.retryText}>Reintentar</Text>
					</TouchableOpacity>
				</View>
			);
		}

		return (
			<>
				<Video
					ref={videoRef}
					source={{
						uri: video.video_url,
					}}
					style={styles.video}
					resizeMode={ResizeMode.COVER}
					shouldPlay={false}
					isLooping
					isMuted={false}
					onLoadStart={handleLoadStart}
					onLoad={handleLoad}
					onError={handleError}
					onPlaybackStatusUpdate={handleProgress}
				/>

				{/* Loading Overlay */}
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

				{/* Premium Preview Overlay */}
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

				{/* Play/Pause Indicator */}
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

				{/* Progress Bar */}
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

			{/* Video Controls */}
			{showControls && isLoaded && (
				<Animated.View
					style={[styles.controlsContainer, { opacity: fadeAnim }]}
				>
					<VideoControls
						video={video}
						currentUser={currentUser}
						onLike={onLike}
						onComment={onComment}
						onFollow={onFollow}
						onSubscribe={onSubscribe}
						onReport={onReport}
						onUserPress={onUserPress}
					/>
				</Animated.View>
			)}

			{/* Video Stats */}
			<View style={styles.statsContainer}>
				<Text style={styles.viewsText}>
					{formatNumber(video.views_count)} {t('video.views')} •{' '}
					{formatTimeAgo(video.created_at)}
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
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
	leftControls: {
		position: 'absolute',
		left: 16,
		bottom: 100,
		maxWidth: SCREEN_WIDTH * 0.65,
	},
	userInfoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	avatarContainer: {
		marginRight: 8,
	},
	avatarGradient: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
	},
	username: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	videoInfo: {
		marginBottom: 16,
	},
	videoTitle: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		marginBottom: 4,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	videoDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 20,
		marginBottom: 8,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	hashtags: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	actionButtonsContainer: {
		gap: 12,
	},
	followButton: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.primary,
		alignSelf: 'flex-start',
	},
	followButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		color: Colors.primary,
	},
	subscribeButton: {
		borderRadius: 8,
		alignSelf: 'flex-start',
		overflow: 'hidden',
	},
	subscribeGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		gap: 6,
	},
	subscribeText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
	},
	rightControls: {
		position: 'absolute',
		right: 16,
		bottom: 100,
		alignItems: 'center',
		gap: 24,
	},
	premiumIndicator: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: Colors.premiumBackground,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2,
		borderColor: Colors.premium,
	},
	actionButton: {
		alignItems: 'center',
		gap: 4,
	},
	actionText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
		textAlign: 'center',
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	likedIcon: {
		transform: [{ scale: 1.1 }],
	},
	statsContainer: {
		position: 'absolute',
		left: 16,
		bottom: 60,
	},
	viewsText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	// Modal Styles
	modalOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: Colors.modalOverlay,
		justifyContent: 'flex-end',
		zIndex: 1000,
	},
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
	modalContainer: {
		backgroundColor: Colors.modalBackground,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: SCREEN_HEIGHT * 0.8,
	},
	modalHeader: {
		alignItems: 'center',
		paddingTop: 12,
		paddingHorizontal: 16,
		position: 'relative',
	},
	modalHandle: {
		width: 40,
		height: 4,
		backgroundColor: Colors.textTertiary,
		borderRadius: 2,
		marginBottom: 16,
	},
	closeButton: {
		position: 'absolute',
		right: 16,
		top: 16,
		padding: 4,
	},
	modalContent: {
		paddingHorizontal: 24,
		paddingBottom: 32,
	},
	creatorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	creatorAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.backgroundSecondary,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	creatorInfo: {
		flex: 1,
	},
	creatorName: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		marginBottom: 2,
	},
	creatorUsername: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	premiumBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.premium,
		justifyContent: 'center',
		alignItems: 'center',
	},
	benefitsContainer: {
		marginBottom: 24,
	},
	benefitsTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		color: Colors.text,
		marginBottom: 8,
		textAlign: 'center',
	},
	benefitsSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 20,
		textAlign: 'center',
	},
	benefitsList: {
		gap: 12,
	},
	benefitItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	benefitText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		flex: 1,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'center',
		marginBottom: 24,
	},
	priceAmount: {
		fontSize: 32,
		fontFamily: 'Poppins-Bold',
		color: Colors.premium,
	},
	pricePeriod: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.premium,
		marginLeft: 4,
	},
	modalSubscribeButton: {
		borderRadius: 12,
		overflow: 'hidden',
		marginBottom: 16,
	},
	disclaimer: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'center',
	},
});

export default VideoPlayer;
