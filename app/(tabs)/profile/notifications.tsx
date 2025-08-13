import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import {
	NotificationPreferences,
	NotificationService,
} from '@/services/notificationService';

interface NotificationItemProps {
	title: string;
	subtitle: string;
	icon: string;
	iconType?: 'feather' | 'materialCommunity';
	value: boolean;
	onValueChange: (value: boolean) => void;
	disabled?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
	title,
	subtitle,
	icon,
	iconType = 'feather',
	value,
	onValueChange,
	disabled = false,
}) => {
	return (
		<View style={[styles.notificationItem, disabled && styles.disabledItem]}>
			<View style={styles.notificationItemLeft}>
				<View
					style={[styles.notificationIcon, disabled && styles.disabledIcon]}
				>
					{iconType === 'materialCommunity' ? (
						<MaterialCommunityIcons
							name={icon as any}
							size={20}
							color={disabled ? Colors.textTertiary : Colors.primary}
						/>
					) : (
						<Feather
							name={icon as any}
							size={20}
							color={disabled ? Colors.textTertiary : Colors.primary}
						/>
					)}
				</View>
				<View style={styles.notificationText}>
					<Text
						style={[styles.notificationTitle, disabled && styles.disabledText]}
					>
						{title}
					</Text>
					<Text
						style={[
							styles.notificationSubtitle,
							disabled && styles.disabledText,
						]}
					>
						{subtitle}
					</Text>
				</View>
			</View>

			<Switch
				value={value && !disabled}
				onValueChange={disabled ? () => {} : onValueChange}
				disabled={disabled}
				trackColor={{
					false: Colors.textTertiary,
					true: disabled ? Colors.textTertiary : Colors.primary,
				}}
				thumbColor={disabled ? Colors.textTertiary : Colors.text}
			/>
		</View>
	);
};

export default function NotificationsScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	const [notificationPreferences, setNotificationPreferences] =
		useState<NotificationPreferences | null>(null);
	const [loading, setLoading] = useState(true);

	const loadNotificationPreferences = async () => {
		if (!user?.id) return;

		try {
			const { data, error } = await NotificationService.getPreferences(user.id);
			if (data && !error) {
				setNotificationPreferences(data);
			}
		} catch (error) {
			console.error('Error loading notification preferences:', error);
		} finally {
			setLoading(false);
		}
	};

	const updateNotificationPreference = useCallback(
		async (key: keyof NotificationPreferences, value: boolean) => {
			if (!user?.id || !notificationPreferences) return;

			try {
				const { error } = await NotificationService.updatePreferences(user.id, {
					[key]: value,
				});

				if (!error) {
					setNotificationPreferences((prev) =>
						prev ? { ...prev, [key]: value } : null,
					);
				}
			} catch (error) {
				console.error('Error updating notification preference:', error);
			}
		},
		[user?.id, notificationPreferences],
	);

	// Callbacks optimizados para cada switch
	const handleVideoLikesChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference('video_likes_enabled', value);
		},
		[updateNotificationPreference],
	);

	const handleVideoCommentsChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference('video_comments_enabled', value);
		},
		[updateNotificationPreference],
	);

	const handleCommentLikesChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference('comment_likes_enabled', value);
		},
		[updateNotificationPreference],
	);

	const handleCommentRepliesChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference('comment_replies_enabled', value);
		},
		[updateNotificationPreference],
	);

	const handleNewFollowersChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference('new_followers_enabled', value);
		},
		[updateNotificationPreference],
	);

	const handleNewSubscribersChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference(
				'new_subscribers_enabled' as keyof NotificationPreferences,
				value,
			);
		},
		[updateNotificationPreference],
	);

	const handleMasterSwitchChange = useCallback(
		(value: boolean) => {
			updateNotificationPreference('push_notifications_enabled', value);

			const keys: (keyof NotificationPreferences)[] = [
				'video_likes_enabled',
				'video_comments_enabled',
				'comment_likes_enabled',
				'comment_replies_enabled',
				'new_followers_enabled',
				'new_subscribers_enabled',
			];

			// Si se activan todas las notificaciones, activar también todas las individuales
			if (value) {
				keys.forEach((key) => {
					updateNotificationPreference(key, true);
				});
			} else {
				// Si se desactivan todas las notificaciones, desactivar también todas las individuales
				keys.forEach((key) => {
					if (notificationPreferences && notificationPreferences[key]) {
						updateNotificationPreference(key, false);
					}
				});
			}
		},
		[updateNotificationPreference, notificationPreferences],
	);

	useEffect(() => {
		loadNotificationPreferences();
	}, [user?.id]);

	if (!user || loading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="light" />
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>{t('common.loading')}</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!notificationPreferences) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="light" />
				<View style={styles.loadingContainer}>
					<Text style={styles.loadingText}>Error loading preferences</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<Text style={styles.title}>{t('settings.notifications')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Master Switch */}
				<View style={styles.masterSwitchContainer}>
					<View style={styles.masterSwitchContent}>
						<View style={styles.masterSwitchText}>
							<Text style={styles.masterSwitchTitle}>
								{t('notifications.enableAllNotifications')}
							</Text>
							<Text style={styles.masterSwitchSubtitle}>
								{t('notifications.enableAllNotificationsSubtitle')}
							</Text>
						</View>
						<Switch
							value={notificationPreferences.push_notifications_enabled}
							onValueChange={handleMasterSwitchChange}
							trackColor={{
								false: Colors.textTertiary,
								true: Colors.primary,
							}}
							thumbColor={Colors.text}
						/>
					</View>
				</View>

				{/* Video Interactions */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						{t('notifications.videoInteractions')}
					</Text>

					<NotificationItem
						title={t('notifications.preferences.videoLikes')}
						subtitle={t('notifications.preferences.videoLikesSubtitle')}
						icon="heart"
						value={notificationPreferences.video_likes_enabled}
						onValueChange={handleVideoLikesChange}
						disabled={!notificationPreferences.push_notifications_enabled}
					/>

					<NotificationItem
						title={t('notifications.preferences.videoComments')}
						subtitle={t('notifications.preferences.videoCommentsSubtitle')}
						icon="message-circle"
						value={notificationPreferences.video_comments_enabled}
						onValueChange={handleVideoCommentsChange}
						disabled={!notificationPreferences.push_notifications_enabled}
					/>
				</View>

				{/* Comment Interactions */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						{t('notifications.commentInteractions')}
					</Text>

					<NotificationItem
						title={t('notifications.preferences.commentLikes')}
						subtitle={t('notifications.preferences.commentLikesSubtitle')}
						icon="thumbs-up"
						value={notificationPreferences.comment_likes_enabled}
						onValueChange={handleCommentLikesChange}
						disabled={!notificationPreferences.push_notifications_enabled}
					/>

					<NotificationItem
						title={t('notifications.preferences.commentReplies')}
						subtitle={t('notifications.preferences.commentRepliesSubtitle')}
						icon="corner-up-left"
						value={notificationPreferences.comment_replies_enabled}
						onValueChange={handleCommentRepliesChange}
						disabled={!notificationPreferences.push_notifications_enabled}
					/>
				</View>

				{/* Social Notifications */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						{t('notifications.socialNotifications')}
					</Text>

					<NotificationItem
						title={t('notifications.preferences.newFollowers')}
						subtitle={t('notifications.preferences.newFollowersSubtitle')}
						icon="user-plus"
						value={notificationPreferences.new_followers_enabled}
						onValueChange={handleNewFollowersChange}
						disabled={!notificationPreferences.push_notifications_enabled}
					/>

					<NotificationItem
						title={t('notifications.preferences.newSubscribers')}
						subtitle={t('notifications.preferences.newSubscribersSubtitle')}
						icon="crown"
						iconType="materialCommunity"
						value={notificationPreferences.new_subscribers_enabled || false}
						onValueChange={handleNewSubscribersChange}
						disabled={!notificationPreferences.push_notifications_enabled}
					/>
				</View>

				{/* Bottom Spacing */}
				<View style={styles.bottomSpacing} />
			</ScrollView>
		</SafeAreaView>
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
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerSpacer: {
		width: 40,
	},
	title: {
		flex: 1,
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
	},
	content: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	descriptionContainer: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: Colors.backgroundSecondary,
		marginHorizontal: 16,
		marginTop: 16,
		borderRadius: 12,
	},
	descriptionText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 20,
	},
	section: {
		marginTop: 32,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
		marginHorizontal: 16,
	},
	notificationItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	notificationItemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 16,
	},
	notificationIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: Colors.premiumBackground,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	notificationText: {
		flex: 1,
	},
	notificationTitle: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 2,
	},
	notificationSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		lineHeight: 18,
	},
	bottomSpacing: {
		height: 32,
	},
	masterSwitchContainer: {
		marginTop: 16,
		marginHorizontal: 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: Colors.primary,
	},
	masterSwitchContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
	},
	masterSwitchText: {
		flex: 1,
		marginRight: 8,
	},
	masterSwitchTitle: {
		fontSize: 18,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 4,
	},
	masterSwitchSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 18,
	},
	disabledItem: {
		opacity: 0.5,
	},
	disabledIcon: {
		backgroundColor: Colors.textTertiary + '20',
	},
	disabledText: {
		color: Colors.textTertiary,
	},
});
