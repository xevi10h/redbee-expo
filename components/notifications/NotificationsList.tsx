import { Feather } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { Notification } from '@/services/notificationService';

import { NotificationItem } from './NotificationItem';

interface NotificationsListProps {
	onNotificationPress?: (notification: Notification) => void;
}

export const NotificationsList: React.FC<NotificationsListProps> = ({
	onNotificationPress,
}) => {
	const { t } = useTranslation();
	const {
		notifications,
		unreadCount,
		loading,
		markAsRead,
		markAllAsRead,
		refresh,
	} = useUserNotifications();

	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		await refresh();
		setRefreshing(false);
	}, [refresh]);

	const renderNotificationItem = ({ item }: { item: Notification }) => (
		<NotificationItem
			notification={item}
			onPress={onNotificationPress}
			onMarkAsRead={markAsRead}
		/>
	);

	const renderHeader = () => (
		<View style={styles.header}>
			<View style={styles.headerLeft}>
				<Text style={styles.title}>{t('notifications.title')}</Text>
				{unreadCount > 0 && (
					<View style={styles.unreadBadge}>
						<Text style={styles.unreadBadgeText}>{unreadCount}</Text>
					</View>
				)}
			</View>
			{unreadCount > 0 && (
				<TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
					<Text style={styles.markAllButtonText}>
						{t('notifications.markAllRead')}
					</Text>
				</TouchableOpacity>
			)}
		</View>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="bell" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>
				{t('notifications.noNotifications')}
			</Text>
			<Text style={styles.emptySubtitle}>
				{t('notifications.noNotificationsSubtitle')}
			</Text>
		</View>
	);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={Colors.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={notifications}
				renderItem={renderNotificationItem}
				keyExtractor={(item) => item.id}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={renderEmptyState}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={handleRefresh}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
						progressBackgroundColor={Colors.backgroundSecondary}
						title="Actualizando..."
						titleColor={Colors.textSecondary}
					/>
				}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
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
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	title: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginRight: 8,
	},
	unreadBadge: {
		backgroundColor: Colors.primary,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	unreadBadgeText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '600',
		color: Colors.text,
	},
	markAllButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		backgroundColor: Colors.backgroundSecondary,
	},
	markAllButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
	},
	emptyState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 64,
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'center',
		lineHeight: 20,
	},
});
