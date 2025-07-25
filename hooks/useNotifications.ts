import { NotificationService } from "@/services/notificationService";
import { useCallback, useState } from "react";

export const useNotifications = () => {
	const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
	const [notificationPermissions, setNotificationPermissions] = useState<'granted' | 'denied' | 'unknown'>('unknown');

	const initialize = useCallback(async (userId: string) => {
		try {
			const hasPermission = await NotificationService.requestPermissions();
			setNotificationPermissions(hasPermission ? 'granted' : 'denied');

			if (hasPermission) {
				const token = await NotificationService.getExpoPushToken();
				setExpoPushToken(token);

				if (token) {
					await NotificationService.registerForPushNotifications(userId);
				}
			}
		} catch (error) {
			console.error('Error initializing notifications:', error);
			setNotificationPermissions('denied');
		}
	}, []);

	const showLocalNotification = useCallback(async (
		title: string,
		body: string,
		data?: any
	) => {
		if (notificationPermissions === 'granted') {
			await NotificationService.showLocalNotification(title, body, data);
		}
	}, [notificationPermissions]);

	return {
		expoPushToken,
		notificationPermissions,
		initialize,
		showLocalNotification,
		canShowNotifications: notificationPermissions === 'granted',
	};
};