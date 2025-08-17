import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { NotificationService, Notification, GroupedNotification } from '@/services/notificationService';

export const useNotificationsList = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<GroupedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { user } = useAuthStore();

  // Load notifications and mark them as read
  const loadNotifications = useCallback(async (refresh = false, markAsReadOnLoad = false) => {
    if (!user?.id) return;

    setIsLoading(true);
    const currentPage = refresh ? 0 : page;
    const limit = 20;
    const offset = currentPage * limit;

    try {
      const { data, error } = await NotificationService.getUserNotifications(
        user.id,
        offset,
        limit
      );

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      const newNotifications = data || [];
      
      // If markAsReadOnLoad is true, mark all unread notifications as read
      if (markAsReadOnLoad && refresh) {
        const unreadNotificationIds = newNotifications
          .filter(notification => !notification.is_read)
          .map(notification => notification.id);

        if (unreadNotificationIds.length > 0) {
          await markAllAsRead();
          // Update local state to reflect read status
          newNotifications.forEach(notification => {
            if (!notification.is_read) {
              notification.is_read = true;
            }
          });
        }
      }
      
      if (refresh) {
        setNotifications(newNotifications);
        setGroupedNotifications(NotificationService.groupNotifications(newNotifications));
        setPage(1);
      } else {
        const allNotifications = [...notifications, ...newNotifications];
        setNotifications(allNotifications);
        setGroupedNotifications(NotificationService.groupNotifications(allNotifications));
        setPage(prev => prev + 1);
      }

      setHasMore(newNotifications.length === limit);
    } catch (error) {
      console.error('Exception loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, page]);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await NotificationService.getUnreadCount(user.id);

      if (error) {
        console.error('Error loading unread count:', error);
        return;
      }

      setUnreadCount(data || 0);
    } catch (error) {
      console.error('Exception loading unread count:', error);
    }
  }, [user?.id]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await NotificationService.markAsRead(notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Exception marking notification as read:', error);
    }
  }, [user?.id]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await NotificationService.markAllAsRead(user.id);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Exception marking all notifications as read:', error);
    }
  }, [user?.id]);

  // Refresh notifications
  const refresh = useCallback((markAsReadOnLoad = false) => {
    loadNotifications(true, markAsReadOnLoad);
    if (!markAsReadOnLoad) {
      loadUnreadCount();
    }
  }, [loadNotifications, loadUnreadCount]);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      loadNotifications(false, false);
    }
  }, [isLoading, hasMore, loadNotifications]);

  // Initialize
  useEffect(() => {
    if (user?.id) {
      refresh();
    }
  }, [user?.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const subscription = NotificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        console.log('New notification received:', notification);
        // Refresh to get the new notification with actor data
        loadUnreadCount();
        // Optionally reload notifications if user is on notifications screen
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, loadUnreadCount]);

  return {
    notifications,
    groupedNotifications,
    unreadCount,
    isLoading,
    hasMore,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    refresh,
    loadMore,
  };
};