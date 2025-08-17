import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { useCallback } from 'react';
import { Platform, View, Image } from 'react-native';

import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { Colors } from '@/constants/Colors';
import { useNotificationsList } from '@/hooks/useNotificationsList';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadState } from '@/hooks/useUploadState';

export default function TabLayout() {
	const { t } = useTranslation();
	const { isAnyProcessActive } = useUploadState();
	const { unreadCount } = useNotificationsList();

	// Prevent navigation when upload processes are active
	const handleTabPress = useCallback(
		(e: any) => {
			if (isAnyProcessActive()) {
				e.preventDefault();
			}
		},
		[isAnyProcessActive],
	);

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors.tabBarActive,
				tabBarInactiveTintColor: Colors.tabBarInactive,
				tabBarStyle: isAnyProcessActive()
					? {
							display: 'none',
					  }
					: {
							backgroundColor: Colors.tabBarBackground,
							borderTopWidth: 1,
							borderTopColor: Colors.tabBarBorder,
							height: Platform.OS === 'ios' ? 90 : 70,
							paddingBottom: Platform.OS === 'ios' ? 30 : 10,
							paddingTop: 10,
					  },
				tabBarLabelStyle: {
					fontSize: 11,
					fontFamily: 'Inter-Medium',
					fontWeight: '500',
				},
				tabBarIconStyle: {
					marginBottom: 2,
				},
				headerShown: false,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: t('navigation.home'),
					tabBarIcon: ({ color, size }) => (
						<Feather name="home" size={size} color={color} />
					),
				}}
				listeners={{
					tabPress: handleTabPress,
				}}
			/>
			<Tabs.Screen
				name="search"
				options={{
					title: t('navigation.search'),
					tabBarIcon: ({ color, size }) => (
						<Feather name="search" size={size} color={color} />
					),
				}}
				listeners={{
					tabPress: handleTabPress,
				}}
			/>
			<Tabs.Screen
				name="upload"
				options={{
					title: t('navigation.upload'),
					tabBarIcon: ({ color, size, focused }) => (
						<LinearGradient
							colors={
								focused
									? Colors.gradientPrimary
									: [Colors.tabBarInactive, Colors.tabBarInactive]
							}
							style={{
								width: 32,
								height: 32,
								borderRadius: 8,
								alignItems: 'center',
								justifyContent: 'center',
							}}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							<Feather name="plus" size={size} color={Colors.text} />
						</LinearGradient>
					),
					tabBarLabelStyle: {
						fontSize: 11,
						fontFamily: 'Inter-Medium',
						fontWeight: '500',
					},
				}}
			/>
			<Tabs.Screen
				name="assistant"
				options={{
					title: 'RedBee AI',
					tabBarIcon: ({ color, size }) => (
						<Image
							source={require('../../assets/images/adaptative-icon.png')}
							style={{
								width: size,
								height: size,
								borderRadius: size / 8,
								tintColor: color,
							}}
						/>
					),
				}}
				listeners={{
					tabPress: handleTabPress,
				}}
			/>
			<Tabs.Screen
				name="profile"
				options={{
					title: t('navigation.profile'),
					tabBarIcon: ({ color, size }) => (
						<View style={{ position: 'relative' }}>
							<Feather name="user" size={size} color={color} />
							<NotificationBadge count={unreadCount} size="small" />
						</View>
					),
				}}
				listeners={{
					tabPress: handleTabPress,
				}}
			/>
		</Tabs>
	);
}
