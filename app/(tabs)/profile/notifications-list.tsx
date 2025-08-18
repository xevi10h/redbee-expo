import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GroupedNotificationItem } from '@/components/notifications/GroupedNotificationItem';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useNotificationsList } from '@/hooks/useNotificationsList';
import { GroupedNotification } from '@/services/notificationService';

export default function NotificationsListScreen() {
	const { user } = useRequireAuth();
	const {
		notifications,
		groupedNotifications,
		unreadCount,
		isLoading,
		hasMore,
		markAsRead,
		markAllAsRead,
		refresh,
		loadMore,
	} = useNotificationsList();

	// Auto-mark notifications as read when screen comes into focus
	useFocusEffect(
		useCallback(() => {
			// Mark all as read when entering the notifications screen
			markAllAsRead();
			refresh(true);
		}, [markAllAsRead, refresh]),
	);

	const handleNotificationPress = useCallback(
		(groupedNotification: GroupedNotification) => {
			const notification = groupedNotification.notification;

			// Navigate based on notification type
			if (
				notification.entity_id &&
				['video_like', 'video_comment', 'comment_like'].includes(
					notification.type,
				)
			) {
				// Video-related notifications - navigate to video detail
				router.push(`/video/${notification.entity_id}`);
			} else if (notification.type === 'follow') {
				// Follow notification - navigate to actor's profile
				// TODO: Implement user profile route like /user/[id] or /profile/[id]
				// For now, just log the action
				console.log('Navigate to user profile:', notification.actor_username);
				// Future: router.push(`/user/${notification.actor_id}`);
			}
		},
		[],
	);

	const renderNotification = ({ item }: { item: GroupedNotification }) => (
		<GroupedNotificationItem
			groupedNotification={item}
			onPress={handleNotificationPress}
			onMarkAsRead={markAsRead}
		/>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="bell" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>No hay notificaciones</Text>
			<Text style={styles.emptySubtitle}>
				Cuando alguien interactúe con tu contenido, las notificaciones
				aparecerán aquí
			</Text>
		</View>
	);

	const renderLoadingFooter = () => {
		if (!isLoading || !hasMore) return null;

		return (
			<View style={styles.loadingFooter}>
				<ActivityIndicator size="small" color={Colors.primary} />
			</View>
		);
	};

	if (!user) {
		return null;
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

				<View style={styles.headerTitleContainer}>
					<Text style={styles.headerTitle}>Notificaciones</Text>
					{unreadCount > 0 && (
						<View style={styles.unreadCountBadge}>
							<Text style={styles.unreadCountText}>
								{unreadCount > 99 ? '99+' : unreadCount}
							</Text>
						</View>
					)}
				</View>

				<View style={styles.headerSpacer} />
			</View>

			{/* Notifications List */}
			<FlatList
				data={groupedNotifications}
				renderItem={renderNotification}
				keyExtractor={(item) => item.id}
				style={styles.list}
				refreshControl={
					<RefreshControl
						refreshing={isLoading && notifications.length === 0}
						onRefresh={() => refresh(false)}
						tintColor={Colors.primary}
						colors={[Colors.primary]}
						progressBackgroundColor={Colors.backgroundSecondary}
					/>
				}
				onEndReached={() => {
					if (hasMore && !isLoading) {
						loadMore();
					}
				}}
				onEndReachedThreshold={0.1}
				ListEmptyComponent={!isLoading ? renderEmptyState : null}
				ListFooterComponent={renderLoadingFooter}
				showsVerticalScrollIndicator={false}
				contentContainerStyle={
					groupedNotifications.length === 0
						? styles.emptyListContent
						: undefined
				}
			/>
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
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		backgroundColor: Colors.background,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.backgroundSecondary,
	},
	headerTitleContainer: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	headerTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		color: Colors.text,
	},
	unreadCountBadge: {
		backgroundColor: Colors.primary,
		borderRadius: 10,
		minWidth: 20,
		height: 20,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 6,
	},
	unreadCountText: {
		fontSize: 11,
		fontFamily: 'Inter-Bold',
		color: Colors.text,
	},
	headerSpacer: {
		width: 40,
	},
	list: {
		flex: 1,
	},
	emptyListContent: {
		flex: 1,
	},
	emptyState: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	emptyTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	loadingFooter: {
		paddingVertical: 20,
		alignItems: 'center',
	},
});
