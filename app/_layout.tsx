// Import web shims first
import '../web-shims';

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, Platform } from 'react-native';
import 'react-native-reanimated';

import { Colors } from '@/constants/Colors';
import { useAppInitialization } from '@/hooks/useAppInitialization';
import { useTranslation } from '@/hooks/useTranslation';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
	const { t } = useTranslation();
	const { isInitialized, isLoading, error } = useAppInitialization();

	const [loaded] = useFonts({
		'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
		'Poppins-Medium': require('../assets/fonts/Poppins-Medium.ttf'),
		'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
		'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
		'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
		'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
		'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
		'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
	});

	useEffect(() => {
		if (loaded && isInitialized) {
			SplashScreen.hideAsync();
		}
	}, [loaded, isInitialized]);

	if (!loaded || isLoading || !isInitialized) {
		return (
			<LinearGradient
				colors={Colors.gradientSecondary}
				style={styles.loadingContainer}
			>
				<StatusBar style="light" />
				<View style={styles.loadingContent}>
					<Text style={styles.appName}>Redbee</Text>
					<ActivityIndicator
						size="large"
						color={Colors.primary}
						style={styles.loader}
					/>
					<Text style={styles.loadingText}>{t('common.loading')}</Text>
				</View>
			</LinearGradient>
		);
	}

	if (error) {
		return (
			<LinearGradient
				colors={Colors.gradientSecondary}
				style={styles.errorContainer}
			>
				<StatusBar style="light" />
				<View style={styles.errorContent}>
					<Text style={styles.errorTitle}>
						{t('errors.somethingWentWrong')}
					</Text>
					<Text style={styles.errorText}>{error}</Text>
					<Text style={styles.errorHint}>{t('errors.tryAgainLater')}</Text>
				</View>
			</LinearGradient>
		);
	}

	return (
		<ThemeProvider value={DarkTheme}>
			<Stack>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="video/[id]" options={{ headerShown: false }} />
				<Stack.Screen name="user/[id]" options={{ headerShown: false }} />
				<Stack.Screen name="hashtag/[hashtag]" options={{ headerShown: false }} />
				<Stack.Screen
					name="auth/sign-in"
					options={{
						headerShown: false,
						presentation: 'modal',
					}}
				/>
				<Stack.Screen
					name="auth/sign-up"
					options={{
						headerShown: false,
						presentation: 'modal',
					}}
				/>
				<Stack.Screen
					name="auth/reset-password"
					options={{
						headerShown: false,
						presentation: 'modal',
					}}
				/>
				<Stack.Screen
					name="auth/callback"
					options={{
						headerShown: false,
					}}
				/>
				<Stack.Screen name="+not-found" />
			</Stack>
			<StatusBar style="light" />
		</ThemeProvider>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
	},
	loadingContent: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	appName: {
		fontSize: 48,
		fontFamily: 'Poppins-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 48,
		textAlign: 'center',
	},
	loader: {
		marginBottom: 24,
	},
	loadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	errorContainer: {
		flex: 1,
	},
	errorContent: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	errorTitle: {
		fontSize: 24,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
		textAlign: 'center',
	},
	errorText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.error,
		marginBottom: 8,
		textAlign: 'center',
	},
	errorHint: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
});
