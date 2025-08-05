import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
	Alert,
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

interface VideoControlsProps {
	video: VideoType;
	currentUser: User;
	onLike: () => void;
	onComment: () => void;
	onFollow: () => void;
	onSubscribe: () => void;
	onReport: () => void;
	onUserPress: () => void;
	onCommentAdded: (comment: Comment) => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
	video,
	currentUser,
	onLike,
	onComment,
	onFollow,
	onSubscribe,
	onReport,
	onUserPress,
	onCommentAdded,
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

	return (
		<>
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
									<Feather name="star" size={16} color={Colors.text} />
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
						<Feather name="star" size={20} color={Colors.premium} />
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

				<TouchableOpacity
					style={styles.actionButton}
					onPress={handleReport}
					activeOpacity={0.7}
				>
					<Feather name="flag" size={24} color={Colors.text} />
				</TouchableOpacity>
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
	leftControls: {
		position: 'absolute',
		left: 16,
		bottom: 130,
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
		bottom: 130,
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
		bottom: 80,
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
