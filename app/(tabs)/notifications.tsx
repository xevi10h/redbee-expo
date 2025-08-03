import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationsList } from '@/components/notifications';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';

export default function NotificationsScreen() {
	const { user } = useRequireAuth();

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />
			<NotificationsList />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
});