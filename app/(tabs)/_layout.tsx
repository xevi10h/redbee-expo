import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import { useTranslation } from '@/hooks/useTranslation';

export default function TabLayout() {
	const { t } = useTranslation();

	return (
		<Tabs
			screenOptions={{
				tabBarActiveTintColor: '#E1306C',
				tabBarInactiveTintColor: '#6C757D',
				tabBarStyle: {
					backgroundColor: '#000000',
					borderTopWidth: 1,
					borderTopColor: '#1C1C1E',
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
			/>
			<Tabs.Screen
				name="search"
				options={{
					title: t('navigation.search'),
					tabBarIcon: ({ color, size }) => (
						<Feather name="search" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="upload"
				options={{
					title: t('navigation.upload'),
					tabBarIcon: ({ color, size, focused }) => (
						<LinearGradient
							colors={focused ? ['#E1306C', '#F77737'] : ['#6C757D', '#6C757D']}
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
							<Feather name="plus" size={size} color="#FFFFFF" />
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
				name="profile"
				options={{
					title: t('navigation.profile'),
					tabBarIcon: ({ color, size }) => (
						<Feather name="user" size={size} color={color} />
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: t('navigation.settings'),
					tabBarIcon: ({ color, size }) => (
						<Feather name="settings" size={size} color={color} />
					),
				}}
			/>
		</Tabs>
	);
}
