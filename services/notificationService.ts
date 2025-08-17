import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface Notification {
	id: string;
	type: 'video_like' | 'follow' | 'comment_like' | 'video_comment' | 'comment_reply';
	entity_id?: string;
	entity_type?: 'video' | 'comment';
	is_read: boolean;
	created_at: string;
	actor_username: string;
	actor_display_name: string;
	actor_avatar_url?: string;
	entity_title?: string;
}

export interface GroupedNotification {
	id: string;
	type: 'single' | 'group';
	notification: Notification; // Primary notification (most recent)
	notifications: Notification[]; // All notifications in the group
	count: number;
	created_at: string;
	is_read: boolean;
}

export interface NotificationPreferences {
	id: string;
	user_id: string;
	video_likes_enabled: boolean;
	comment_likes_enabled: boolean;
	new_followers_enabled: boolean;
	new_subscribers_enabled?: boolean;
	video_comments_enabled: boolean;
	comment_replies_enabled: boolean;
	push_notifications_enabled: boolean;
	email_notifications_enabled: boolean;
}

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true, 
        shouldShowList: true,   
    }),
});

export class NotificationService {
	/**
	 * Request notification permissions
	 */
	static async requestPermissions(): Promise<boolean> {
		try {
			const { status: existingStatus } = await Notifications.getPermissionsAsync();
			let finalStatus = existingStatus;

			if (existingStatus !== 'granted') {
				const { status } = await Notifications.requestPermissionsAsync();
				finalStatus = status;
			}

			if (finalStatus !== 'granted') {
				console.log('Notification permission denied');
				return false;
			}

			// Configure notification channel for Android
			if (Platform.OS === 'android') {
				await Notifications.setNotificationChannelAsync('default', {
					name: 'Default',
					importance: Notifications.AndroidImportance.MAX,
					vibrationPattern: [0, 250, 250, 250],
					lightColor: Colors.primary,
				});
			}

			return true;
		} catch (error) {
			console.error('Error requesting notification permissions:', error);
			return false;
		}
	}

	/**
	 * Get push notification token
	 */
	static async getExpoPushToken(): Promise<string | null> {
		try {
			const token = (await Notifications.getExpoPushTokenAsync()).data;
			console.log('Expo push token:', token);
			return token;
		} catch (error) {
			console.error('Error getting push token:', error);
			return null;
		}
	}

	/**
	 * Register device for push notifications
	 */
	static async registerForPushNotifications(userId: string): Promise<void> {
		try {
			const hasPermission = await this.requestPermissions();
			if (!hasPermission) return;

			const token = await this.getExpoPushToken();
			if (!token) return;

			// Store token in user profile or separate table
			await supabase
				.from('profiles')
				.update({ push_token: token })
				.eq('id', userId);

		} catch (error) {
			console.error('Error registering for push notifications:', error);
		}
	}

	/**
	 * Show local notification
	 */
	static async showLocalNotification(
		title: string, 
		body: string, 
		data?: any
	): Promise<void> {
		try {
			await Notifications.scheduleNotificationAsync({
				content: {
					title,
					body,
					data,
					sound: true,
				},
				trigger: null, // Show immediately
			});
		} catch (error) {
			console.error('Error showing local notification:', error);
		}
	}

	/**
	 * Handle notification tap
	 */
	static async handleNotificationTap(notification: any, navigation: any): Promise<void> {
		try {
			const { data } = notification.request.content;
			
			switch (data?.type) {
				case 'like':
					// Navigate to video
					if (data.video_id) {
						navigation.navigate('VideoPlayer', { videoId: data.video_id });
					}
					break;
				case 'comment':
					// Navigate to video comments
					if (data.video_id) {
						navigation.navigate('VideoPlayer', { 
							videoId: data.video_id,
							openComments: true 
						});
					}
					break;
				case 'follow':
					// Navigate to user profile
					if (data.user_id) {
						navigation.navigate('Profile', { userId: data.user_id });
					}
					break;
				case 'subscription':
					// Navigate to subscriptions
					navigation.navigate('Subscriptions');
					break;
				default:
					// Navigate to home
					navigation.navigate('Home');
					break;
			}
		} catch (error) {
			console.error('Error handling notification tap:', error);
		}
	}

	// DATABASE NOTIFICATION METHODS

	/**
	 * Get notifications for a user with pagination
	 */
	static async getUserNotifications(
		userId: string,
		offset: number = 0,
		limit: number = 20
	): Promise<{ data: Notification[] | null; error: Error | null }> {
		try {
			const { data, error } = await supabase.rpc('get_user_notifications', {
				user_id_param: userId,
				page_offset: offset,
				page_limit: limit,
			});

			if (error) {
				throw error;
			}

			return { data: data || [], error: null };
		} catch (error) {
			console.error('Error fetching notifications:', error);
			return { data: null, error: error as Error };
		}
	}

	/**
	 * Get unread notification count for a user
	 */
	static async getUnreadCount(
		userId: string
	): Promise<{ data: number | null; error: Error | null }> {
		try {
			const { data, error } = await supabase.rpc('get_unread_notification_count', {
				user_id_param: userId,
			});

			if (error) {
				throw error;
			}

			return { data: data || 0, error: null };
		} catch (error) {
			console.error('Error fetching unread count:', error);
			return { data: null, error: error as Error };
		}
	}

	/**
	 * Mark a specific notification as read
	 */
	static async markAsRead(
		notificationId: string
	): Promise<{ error: Error | null }> {
		try {
			const { error } = await supabase.rpc('mark_notification_read', {
				notification_id: notificationId,
			});

			if (error) {
				throw error;
			}

			return { error: null };
		} catch (error) {
			console.error('Error marking notification as read:', error);
			return { error: error as Error };
		}
	}

	/**
	 * Mark all notifications as read for a user
	 */
	static async markAllAsRead(
		userId: string
	): Promise<{ error: Error | null }> {
		try {
			const { error } = await supabase.rpc('mark_all_notifications_read', {
				user_id_param: userId,
			});

			if (error) {
				throw error;
			}

			return { error: null };
		} catch (error) {
			console.error('Error marking all notifications as read:', error);
			return { error: error as Error };
		}
	}

	/**
	 * Get notification preferences for a user
	 */
	static async getPreferences(
		userId: string
	): Promise<{ data: NotificationPreferences | null; error: Error | null }> {
		try {
			const { data, error } = await supabase
				.from('notification_preferences')
				.select('*')
				.eq('user_id', userId)
				.single();

			if (error) {
				// If no preferences exist, create default ones
				if (error.code === 'PGRST116') {
					return await this.createDefaultPreferences(userId);
				}
				throw error;
			}

			return { data, error: null };
		} catch (error) {
			console.error('Error fetching notification preferences:', error);
			return { data: null, error: error as Error };
		}
	}

	/**
	 * Create default notification preferences for a user
	 */
	static async createDefaultPreferences(
		userId: string
	): Promise<{ data: NotificationPreferences | null; error: Error | null }> {
		try {
			const defaultPreferences = {
				user_id: userId,
				push_notifications_enabled: true,
				video_likes_enabled: true,
				new_followers_enabled: true,
				new_subscribers_enabled: true,
				comment_likes_enabled: true,
				video_comments_enabled: true,
				comment_replies_enabled: true,
				email_notifications_enabled: false,
			};

			const { data, error } = await supabase
				.from('notification_preferences')
				.insert(defaultPreferences)
				.select()
				.single();

			if (error) {
				throw error;
			}

			return { data, error: null };
		} catch (error) {
			console.error('Error creating default preferences:', error);
			return { data: null, error: error as Error };
		}
	}

	/**
	 * Update notification preferences for a user
	 */
	static async updatePreferences(
		userId: string,
		preferences: Partial<Omit<NotificationPreferences, 'id' | 'user_id'>>
	): Promise<{ error: Error | null }> {
		try {
			const { error } = await supabase
				.from('notification_preferences')
				.update(preferences)
				.eq('user_id', userId);

			if (error) {
				throw error;
			}

			return { error: null };
		} catch (error) {
			console.error('Error updating notification preferences:', error);
			return { error: error as Error };
		}
	}

	/**
	 * Subscribe to real-time notifications for a user
	 */
	static subscribeToNotifications(
		userId: string,
		callback: (notification: Notification) => void
	) {
		return supabase
			.channel('notifications')
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'notifications',
					filter: `recipient_id=eq.${userId}`,
				},
				(payload) => {
					// Transform the payload to match our Notification interface
					const notification: Notification = {
						id: payload.new.id,
						type: payload.new.type,
						entity_id: payload.new.entity_id,
						entity_type: payload.new.entity_type,
						is_read: payload.new.is_read,
						created_at: payload.new.created_at,
						actor_username: '', // Will be populated by a separate call if needed
						actor_display_name: '',
						actor_avatar_url: '',
						entity_title: '',
					};
					callback(notification);
				}
			)
			.subscribe();
	}

	/**
	 * Get formatted notification message
	 */
	static getNotificationMessage(notification: Notification, t: (key: string) => string): string {
		// Fallback for username - prioritize display_name, then username, then default
		const actorName = notification.actor_display_name || notification.actor_username || 'Usuario';
		
		switch (notification.type) {
			case 'video_like':
				return `${actorName} ${t('notifications.videoLike')}${notification.entity_title ? ` "${notification.entity_title}"` : ''}`;
			case 'follow':
				return `${actorName} ${t('notifications.follow')}`;
			case 'comment_like':
				return `${actorName} ${t('notifications.commentLike')}${notification.entity_title ? ` "${notification.entity_title}"` : ''}`;
			case 'video_comment':
				return `${actorName} ${t('notifications.videoComment')}${notification.entity_title ? ` "${notification.entity_title}"` : ''}`;
			case 'comment_reply':
				return `${actorName} ${t('notifications.commentReply')}`;
			default:
				return `${actorName} ${t('notifications.interactedWithContent')}`;
		}
	}

	/**
	 * Group notifications by type and entity
	 */
	static groupNotifications(notifications: Notification[]): GroupedNotification[] {
		const groups: { [key: string]: Notification[] } = {};
		
		notifications.forEach(notification => {
			let groupKey: string;
			
			// Group by type and entity_id for video/comment interactions
			if (notification.entity_id && ['video_like', 'video_comment', 'comment_like'].includes(notification.type)) {
				groupKey = `${notification.type}_${notification.entity_id}`;
			} else {
				// Individual notifications for follows and other types
				groupKey = `individual_${notification.id}`;
			}
			
			if (!groups[groupKey]) {
				groups[groupKey] = [];
			}
			groups[groupKey].push(notification);
		});

		return Object.values(groups).map(group => {
			if (group.length === 1) {
				// Single notification
				return {
					id: group[0].id,
					type: 'single',
					notification: group[0],
					notifications: group,
					count: 1,
					created_at: group[0].created_at,
					is_read: group[0].is_read,
				};
			} else {
				// Grouped notifications
				const firstNotification = group[0];
				const allRead = group.every(n => n.is_read);
				
				return {
					id: `group_${firstNotification.type}_${firstNotification.entity_id}`,
					type: 'group',
					notification: firstNotification,
					notifications: group,
					count: group.length,
					created_at: group[0].created_at, // Most recent
					is_read: allRead,
				};
			}
		}).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	}

	/**
	 * Get formatted message for grouped notifications
	 */
	static getGroupedNotificationMessage(groupedNotification: GroupedNotification, t: (key: string) => string): string {
		if (groupedNotification.type === 'single') {
			return this.getNotificationMessage(groupedNotification.notification, t);
		}

		const { notifications, count } = groupedNotification;
		const firstNotification = notifications[0];
		const type = firstNotification.type;

		// Get first few actor names
		const uniqueActors = [...new Set(notifications.map(n => 
			n.actor_display_name || n.actor_username || 'Usuario'
		))];
		
		const firstActor = uniqueActors[0];
		const remainingCount = count - 1;

		switch (type) {
			case 'video_like':
				if (count === 1) {
					return `${firstActor} ${t('notifications.videoLike')}${firstNotification.entity_title ? ` "${firstNotification.entity_title}"` : ''}`;
				} else if (count === 2) {
					return `${firstActor} y ${uniqueActors[1] || 'otra persona'} dieron like a tu vídeo${firstNotification.entity_title ? ` "${firstNotification.entity_title}"` : ''}`;
				} else {
					return `${firstActor} y ${remainingCount} personas más dieron like a tu vídeo${firstNotification.entity_title ? ` "${firstNotification.entity_title}"` : ''}`;
				}
			
			case 'video_comment':
				if (count === 1) {
					return `${firstActor} ${t('notifications.videoComment')}${firstNotification.entity_title ? ` "${firstNotification.entity_title}"` : ''}`;
				} else if (count === 2) {
					return `${firstActor} y ${uniqueActors[1] || 'otra persona'} comentaron tu vídeo${firstNotification.entity_title ? ` "${firstNotification.entity_title}"` : ''}`;
				} else {
					return `${firstActor} y ${remainingCount} personas más comentaron tu vídeo${firstNotification.entity_title ? ` "${firstNotification.entity_title}"` : ''}`;
				}
			
			case 'comment_like':
				if (count === 1) {
					return `${firstActor} ${t('notifications.commentLike')}`;
				} else if (count === 2) {
					return `${firstActor} y ${uniqueActors[1] || 'otra persona'} dieron like a tu comentario`;
				} else {
					return `${firstActor} y ${remainingCount} personas más dieron like a tu comentario`;
				}
			
			default:
				return this.getNotificationMessage(firstNotification, t);
		}
	}

	/**
	 * Get notification icon name
	 */
	static getNotificationIcon(type: Notification['type']): string {
		switch (type) {
			case 'video_like':
				return 'heart';
			case 'follow':
				return 'user-plus';
			case 'comment_like':
				return 'thumbs-up';
			case 'video_comment':
				return 'message-circle';
			case 'comment_reply':
				return 'corner-up-left';
			default:
				return 'bell';
		}
	}
}