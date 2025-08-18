import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import {
	Notification,
	NotificationService,
} from '@/services/notificationService';

interface NotificationItemProps {
	notification: Notification;
	onPress?: (notification: Notification) => void;
	onMarkAsRead?: (notificationId: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
	notification,
	onPress,
	onMarkAsRead,
}) => {
	const { t } = useTranslation();
	const message = NotificationService.getNotificationMessage(notification, t);
	const iconName = NotificationService.getNotificationIcon(notification.type);

	const getTimeAgo = (dateString: string): string => {
		const now = new Date();
		const notificationDate = new Date(dateString);
		const diffInMinutes = Math.floor(
			(now.getTime() - notificationDate.getTime()) / (1000 * 60),
		);

		if (diffInMinutes < 1) return t('notifications.justNow');
		if (diffInMinutes < 60)
			return `${diffInMinutes}${t('notifications.minutesAgo')}`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}${t('notifications.hoursAgo')}`;

		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}${t('notifications.daysAgo')}`;

		const diffInWeeks = Math.floor(diffInDays / 7);
		return `${diffInWeeks}${t('notifications.weeksAgo')}`;
	};

	const handlePress = () => {
		if (!notification.is_read && onMarkAsRead) {
			onMarkAsRead(notification.id);
		}
		onPress?.(notification);
	};

	return (
		<TouchableOpacity
			style={[
				styles.container,
				!notification.is_read && styles.unreadContainer,
			]}
			onPress={handlePress}
			activeOpacity={0.8}
		>
			{/* Notification Icon */}
			<View style={styles.iconContainer}>
				<LinearGradient
					colors={getIconColors(notification.type)}
					style={styles.iconGradient}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
				>
					<Feather name={iconName as any} size={20} color={Colors.text} />
				</LinearGradient>
			</View>

			{/* Content */}
			<View style={styles.content}>
				<Text
					style={[
						styles.message,
						!notification.is_read && styles.unreadMessage,
					]}
					numberOfLines={2}
				>
					{message}
				</Text>
				<Text style={styles.timestamp}>
					{getTimeAgo(notification.created_at)}
				</Text>
			</View>

			{/* Unread Indicator */}
			{!notification.is_read && <View style={styles.unreadDot} />}
		</TouchableOpacity>
	);
};

const getIconColors = (
	type: Notification['type'],
): readonly [string, string] => {
	switch (type) {
		case 'video_like':
			return ['#ff6b6b', '#ee5a52'];
		case 'follow':
			return [Colors.primary, Colors.primaryDark];
		case 'comment_like':
			return ['#4ecdc4', '#44a08d'];
		case 'video_comment':
			return ['#45b7d1', '#3a9bc1'];
		case 'comment_reply':
			return ['#f9ca24', '#f0932b'];
		default:
			return [Colors.textTertiary, Colors.textTertiary];
	}
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		backgroundColor: Colors.background,
	},
	unreadContainer: {
		backgroundColor: Colors.backgroundSecondary,
	},
	iconContainer: {
		marginRight: 12,
	},
	iconGradient: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		flex: 1,
	},
	message: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		lineHeight: 20,
		marginBottom: 4,
	},
	unreadMessage: {
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
	},
	timestamp: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	unreadDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: Colors.primary,
		marginLeft: 8,
	},
});
