import { useCallback, useEffect, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

import { useAuth } from '@/hooks/useAuth';
import { 
	Notification, 
	NotificationService 
} from '@/services/notificationService';

export const useUserNotifications = () => {
	const { user } = useAuth();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [subscription, setSubscription] = useState<RealtimeChannel | null>(null);

	// Load initial notifications
	const loadNotifications = useCallback(async () => {
		if (!user?.id) return;

		setLoading(true);
		try {
			const { data, error } = await NotificationService.getUserNotifications(user.id, 0, 50);
			if (data && !error) {
				setNotifications(data);
			}
		} catch (error) {
			console.error('Error loading notifications:', error);
		} finally {
			setLoading(false);
		}
	}, [user?.id]);

	// Load unread count
	const loadUnreadCount = useCallback(async () => {
		if (!user?.id) return;

		try {
			const { data, error } = await NotificationService.getUnreadCount(user.id);
			if (data !== null && !error) {
				setUnreadCount(data);
			}
		} catch (error) {
			console.error('Error loading unread count:', error);
		}
	}, [user?.id]);

	// Mark notification as read
	const markAsRead = useCallback(async (notificationId: string) => {
		try {
			const { error } = await NotificationService.markAsRead(notificationId);
			if (!error) {
				setNotifications(prev =>
					prev.map(notif =>
						notif.id === notificationId
							? { ...notif, is_read: true }
							: notif
					)
				);
				setUnreadCount(prev => Math.max(0, prev - 1));
			}
		} catch (error) {
			console.error('Error marking notification as read:', error);
		}
	}, []);

	// Mark all notifications as read
	const markAllAsRead = useCallback(async () => {
		if (!user?.id) return;

		try {
			const { error } = await NotificationService.markAllAsRead(user.id);
			if (!error) {
				setNotifications(prev =>
					prev.map(notif => ({ ...notif, is_read: true }))
				);
				setUnreadCount(0);
			}
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
		}
	}, [user?.id]);

	// Setup real-time subscription
	useEffect(() => {
		if (!user?.id) return;

		const channel = NotificationService.subscribeToNotifications(
			user.id,
			(newNotification) => {
				// Add new notification to the beginning of the list
				setNotifications(prev => [newNotification, ...prev]);
				setUnreadCount(prev => prev + 1);
			}
		);

		setSubscription(channel);

		return () => {
			if (channel) {
				channel.unsubscribe();
			}
		};
	}, [user?.id]);

	// Load initial data
	useEffect(() => {
		loadNotifications();
		loadUnreadCount();
	}, [loadNotifications, loadUnreadCount]);

	// Cleanup subscription on unmount
	useEffect(() => {
		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [subscription]);

	return {
		notifications,
		unreadCount,
		loading,
		markAsRead,
		markAllAsRead,
		refresh: () => {
			loadNotifications();
			loadUnreadCount();
		},
	};
};