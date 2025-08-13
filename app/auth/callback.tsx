import { LinearGradient } from 'expo-linear-gradient';
import { RelativePathString, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { SupabaseAuthService } from '@/services/supabaseAuth';
import { useAuthStore } from '@/stores/authStore';

export default function AuthCallbackScreen() {
	const { t } = useTranslation();
	const setUser = useAuthStore((state) => state.setUser);

	useEffect(() => {
		const handleAuthCallback = async () => {
			try {
				// Get the current session after OAuth redirect
				const result = await SupabaseAuthService.getCurrentSession();

				if (result.success && result.data) {
					// Set user in store
					setUser(result.data);

					// Navigate to home
					router.replace('/' as RelativePathString);
				} else {
					// OAuth failed, redirect to sign in
					console.error('OAuth callback failed:', result.error);
					router.replace('/auth/sign-in');
				}
			} catch (error) {
				console.error('Auth callback error:', error);
				router.replace('/auth/sign-in');
			}
		};

		// Small delay to ensure the OAuth flow is complete
		const timer = setTimeout(handleAuthCallback, 1000);

		return () => clearTimeout(timer);
	}, [setUser]);

	return (
		<LinearGradient colors={Colors.gradientSecondary} style={styles.container}>
			<StatusBar style="light" />

			<View style={styles.content}>
				<ActivityIndicator size="large" color={Colors.primary} />
				<Text style={styles.title}>{t('auth.loading')}</Text>
				<Text style={styles.subtitle}>Completando inicio de sesión...</Text>
			</View>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 24,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 24,
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
});
