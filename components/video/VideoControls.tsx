import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
	Alert,
	Platform,
	Share,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { formatNumber, formatTimeAgo } from '@/shared/functions/utils';
import { Comment, User, Video as VideoType } from '@/shared/types';
import { PremiumModal } from './PremiumModal';

const SCREEN_WIDTH = 375; // Default width for styling

// Positioning ajustado: subir ambos elementos manteniendo separación
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 90 : 70; // Altura real del tab bar
const SLIDER_SPACE = 60; // Espacio del slider desde tab bar (PERFECTO - 5px más)
const STATS_HEIGHT = 25; // Altura del texto de estadísticas
const STATS_MARGIN = 25; // Margen MANTENIDO entre slider y stats (misma separación)
const CONTROLS_MARGIN = 50; // Margen para los controles

// Calculated positions - ambos más arriba, misma separación
const STATS_BOTTOM = TAB_BAR_HEIGHT + SLIDER_SPACE + STATS_MARGIN; // ~150-130 (subido)
const CONTROLS_BOTTOM = STATS_BOTTOM + STATS_HEIGHT + CONTROLS_MARGIN; // ~225-205 (ajustado)

interface VideoControlsProps {
	video: VideoType;
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
	onShowAnalytics?: () => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
	video,
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
	onShowAnalytics,
}) => {
	const { t } = useTranslation();
	const [showPremiumModal, setShowPremiumModal] = useState(false);

	const handleShare = async () => {
		try {
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			await Share.share({
				message: `¡Mira este increíble video de @${video.user?.username} en Redbee!`,
				url: `https://redbee.app/video/${video.id}`,
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
		onComment(); // ✅ Llamar directamente a onComment (manejado por VideoPlayer)
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

	const handleHideVideo = () => {
		Alert.alert(
			'Ocultar video',
			'¿Quieres ocultar este video? Podrás mostrarlo nuevamente desde tu perfil.',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Ocultar',
					style: 'default',
					onPress: () => onHideVideo && onHideVideo()
				}
			]
		);
	};

	const handleDeleteVideo = () => {
		Alert.alert(
			'Eliminar video',
			'¿Estás seguro de que quieres eliminar este video permanentemente? Esta acción no se puede deshacer.',
			[
				{ text: 'Cancelar', style: 'cancel' },
				{
					text: 'Eliminar',
					style: 'destructive',
					onPress: () => onDeleteVideo && onDeleteVideo()
				}
			]
		);
	};

	return (
		<>
			{/* Top right controls - Hide/Delete/Analytics buttons for own videos */}
			{video.user?.id === currentUser.id && (
				<View style={styles.topRightControls}>
					{onShowAnalytics && (
						<TouchableOpacity
							style={styles.topActionButton}
							onPress={onShowAnalytics}
							activeOpacity={0.7}
						>
							<Feather name="bar-chart-2" size={20} color={Colors.primary} />
						</TouchableOpacity>
					)}
					<TouchableOpacity
						style={styles.topActionButton}
						onPress={handleHideVideo}
						activeOpacity={0.7}
					>
						<Feather name="eye-off" size={20} color={Colors.warning} />
					</TouchableOpacity>
					<TouchableOpacity
						style={styles.topActionButton}
						onPress={handleDeleteVideo}
						activeOpacity={0.7}
					>
						<Feather name="trash-2" size={20} color={Colors.error} />
					</TouchableOpacity>
				</View>
			)}

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

				<View style={styles.actionButtonsContainer}>
					{video.user?.id !== currentUser.id && (
						<TouchableOpacity
							style={[
								styles.followButton,
								video.is_following && {
									borderColor: Colors.primaryDark,
								},
							]}
							onPress={onFollow}
							activeOpacity={0.8}
						>
							<MaterialCommunityIcons
								name={video.is_following ? 'check' : 'plus'}
								size={12}
								color={video.is_following ? Colors.primaryDark : Colors.primary}
							/>
							<Text
								style={[
									styles.followButtonText,
									video.is_following && {
										color: Colors.primaryDark,
									},
								]}
							>
								{video.is_following ? t('video.following') : t('video.follow')}
							</Text>
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
									<MaterialCommunityIcons name="crown" size={16} color={Colors.text} />
									<Text style={styles.subscribeText}>
										{t('video.subscribe')}
									</Text>
								</LinearGradient>
							</TouchableOpacity>
						)}
				</View>
			</View>

			<View style={styles.rightControls}>
				{video.is_premium && (
					<TouchableOpacity
						style={styles.premiumIndicator}
						onPress={() => !video.is_subscribed && setShowPremiumModal(true)}
					>
						<MaterialCommunityIcons name="crown" size={20} color={Colors.premium} />
					</TouchableOpacity>
				)}

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

				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleShare}
					activeOpacity={0.7}
				>
					<Feather name="share" size={28} color={Colors.text} />
					<Text style={styles.actionText}>{t('video.share')}</Text>
				</TouchableOpacity>

				{/* Report button only for other users' videos */}
				{video.user?.id !== currentUser.id && (
					<TouchableOpacity
						style={styles.actionButton}
						onPress={handleReport}
						activeOpacity={0.7}
					>
						<Feather name="flag" size={24} color={Colors.text} />
					</TouchableOpacity>
				)}
			</View>

			{/* Stats */}
			<View style={styles.statsContainer}>
				<Text style={styles.viewsText}>
					{formatNumber(video.views_count)} {t('video.views')} •{' '}
					{formatTimeAgo(video.created_at)}
				</Text>
			</View>

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

const styles = StyleSheet.create({
	topRightControls: {
		position: 'absolute',
		top: 70,
		right: 16,
		flexDirection: 'row',
		gap: 12,
		zIndex: 1000,
	},
	topActionButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		justifyContent: 'center',
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	leftControls: {
		position: 'absolute',
		left: 16,
		bottom: CONTROLS_BOTTOM, // Calculado dinámicamente basado en tab bar
		maxWidth: SCREEN_WIDTH * 0.65,
		alignItems: 'flex-start',
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
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		width: 'auto',
		gap: 4,
	},
	followButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-SemiBold',
		color: Colors.primary,
	},
	modalSubscribeButton: {
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
		bottom: CONTROLS_BOTTOM, // Calculado dinámicamente basado en tab bar
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
		bottom: STATS_BOTTOM, // Calculado dinámicamente basado en tab bar
	},
	viewsText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textShadowColor: Colors.overlay,
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
});
