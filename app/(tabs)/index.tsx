import { useFocusEffect } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FollowingScreen, ForYouScreen } from '@/components/screens';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';

export default function HomeScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();
	const [activeTab, setActiveTab] = useState<'forYou' | 'following'>('forYou');
	const [isTabFocused, setIsTabFocused] = useState(true);

	const handleTabChange = useCallback((tab: 'forYou' | 'following') => {
		setActiveTab(tab);
	}, []);

	// Handle tab focus/blur to pause videos when navigating away
	useFocusEffect(
		useCallback(() => {
			// Tab is focused - resume videos
			setIsTabFocused(true);
			
			return () => {
				// Tab is unfocused (user navigated to another tab) - pause all videos
				setIsTabFocused(false);
			};
		}, [])
	);

	if (!user) {
		return null;
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar
				style="light"
				backgroundColor={Colors.background}
				translucent
			/>

			{/* Content - Full Screen */}
			<View style={styles.content}>
				{/* Mantener ambos componentes montados para evitar recargas */}
				<View style={[styles.screenContainer, { opacity: activeTab === 'forYou' ? 1 : 0 }]}>
					<ForYouScreen user={user} isActive={isTabFocused && activeTab === 'forYou'} />
				</View>
				<View style={[styles.screenContainer, { opacity: activeTab === 'following' ? 1 : 0 }]}>
					<FollowingScreen user={user} isActive={isTabFocused && activeTab === 'following'} />
				</View>
			</View>

			{/* Floating Tab Header with Overlay */}
			<View style={styles.tabHeader}>
				<View style={styles.tabOverlay}>
					<View style={styles.tabContainer}>
						<TouchableOpacity
							style={[styles.tab, activeTab === 'forYou' && styles.activeTab]}
							onPress={() => handleTabChange('forYou')}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === 'forYou' && styles.activeTabText,
								]}
							>
								{t('home.forYou')}
							</Text>
							{activeTab === 'forYou' && <View style={styles.tabIndicator} />}
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.tab,
								activeTab === 'following' && styles.activeTab,
							]}
							onPress={() => handleTabChange('following')}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === 'following' && styles.activeTabText,
								]}
							>
								{t('home.following')}
							</Text>
							{activeTab === 'following' && (
								<View style={styles.tabIndicator} />
							)}
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	content: {
		flex: 1,
		// El contenido ocupa toda la pantalla
	},
	screenContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	tabHeader: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		paddingTop: 50, // Espacio para el notch + status bar
		paddingBottom: 16,
		zIndex: 100,
		pointerEvents: 'box-none', // Permite tocar el contenido de abajo excepto en los tabs
	},
	tabOverlay: {
		backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fondo semi-transparente
		backdropFilter: 'blur(10px)', // Efecto de blur (iOS)
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(255, 255, 255, 0.1)',
		paddingVertical: 12,
		pointerEvents: 'auto', // Los tabs sí pueden recibir toques
	},
	tabContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 20,
		gap: 40, // Espacio entre tabs
	},
	tab: {
		paddingVertical: 12,
		paddingHorizontal: 20,
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
		minWidth: 80,
	},
	activeTab: {
		// No background change needed
	},
	tabText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.textTertiary,
		textAlign: 'center',
		textShadowColor: 'rgba(0, 0, 0, 0.8)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	activeTabText: {
		color: Colors.text,
		textShadowColor: 'rgba(0, 0, 0, 0.8)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	tabIndicator: {
		position: 'absolute',
		bottom: -1,
		left: 0,
		right: 0,
		height: 2,
		backgroundColor: Colors.primary,
		borderRadius: 1,
		shadowColor: Colors.primary,
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 4,
	},
});
