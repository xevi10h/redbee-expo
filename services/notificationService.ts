import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
}