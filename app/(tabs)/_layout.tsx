import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useCallback } from 'react';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { useUploadState } from '@/hooks/useUploadState';

export default function TabLayout() {
	const { t } = useTranslation();
	const { isAnyProcessActive } = useUploadState();

	// Prevent navigation when upload processes are active
	const handleTabPress = useCallback((e: any) => {
		if (isAnyProcessActive()) {
			e.preventDefault();
		}
	}, [isAnyProcessActive]);

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: Colors.tabBarActive,
				tabBarInactiveTintColor: Colors.tabBarInactive,
				tabBarStyle: {
					backgroundColor: Colors.tabBarBackground,
					borderTopWidth: 1,
					borderTopColor: Colors.tabBarBorder,
					height: Platform.OS === 'ios' ? 90 : 70,
					paddingBottom: Platform.OS === 'ios' ? 30 : 10,
					paddingTop: 10,
					opacity: isAnyProcessActive() ? 0.5 : 1,
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
				name="notifications"
				options={{
					title: t('navigation.notifications'),
					tabBarIcon: ({ color, size }) => (
						<Feather name="bell" size={size} color={color} />
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
						<Feather name="user" size={size} color={color} />
					),
				}}
				listeners={{
					tabPress: handleTabPress,
				}}
			/>
		</Tabs>
	);
}
