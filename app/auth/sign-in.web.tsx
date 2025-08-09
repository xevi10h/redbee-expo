import { LinearGradient } from 'expo-linear-gradient';
import { RelativePathString, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Colors } from '@/constants/Colors';
import { useAuth, useGuestOnly } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/shared/functions/utils';
import { LoginCredentials } from '@/shared/types';

export default function SignInScreen() {
	const { t } = useTranslation();
	const { signIn, error, clearError } = useAuth();

	// This hook will redirect to home if user is already authenticated
	useGuestOnly('/');

	const [credentials, setCredentials] = useState<LoginCredentials>({
		email: '',
		password: '',
	});
	const [isLoading, setIsLoading] = useState(false);
	const [formErrors, setFormErrors] = useState<Partial<LoginCredentials>>({});

	// Clear auth errors when component mounts
	useEffect(() => {
		clearError();
	}, [clearError]);

	const validateForm = (): boolean => {
		const errors: Partial<LoginCredentials> = {};

		if (!credentials.email) {
			errors.email = t('auth.errors.emailRequired');
		} else if (!validateEmail(credentials.email)) {
			errors.email = t('auth.errors.invalidEmail');
		}

		if (!credentials.password) {
			errors.password = t('auth.errors.passwordRequired');
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSignIn = async () => {
		if (!validateForm()) return;

		setIsLoading(true);
		clearError();

		try {
			const success = await signIn(credentials);
			if (success) {
				router.replace('/' as RelativePathString);
			}
		} catch (err) {
			console.error('Sign in error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	const showError = () => {
		if (error) {
			Alert.alert(t('common.error'), error, [
				{ text: t('common.ok'), onPress: clearError },
			]);
		}
	};

	// Show error alert when error state changes
	useEffect(() => {
		if (error) {
			showError();
		}
	}, [error]);

	return (
		<LinearGradient colors={Colors.gradientSecondary} style={styles.container}>
			<StatusBar style="light" />

			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.keyboardAvoid}
			>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Header */}
					<View style={styles.header}>
						<Image
							source={require('../../assets/images/icon.png')}
							style={styles.logo}
						/>
						<Text style={styles.title}>Redbee</Text>
						<Text style={styles.subtitle}>{t('auth.welcomeBack')}</Text>
					</View>

					{/* Sign In Form */}
					<View style={styles.form}>
						<Input
							label={t('auth.email')}
							value={credentials.email}
							onChangeText={(email) => {
								setCredentials((prev) => ({ ...prev, email }));
								if (formErrors.email) {
									setFormErrors((prev) => ({ ...prev, email: undefined }));
								}
							}}
							placeholder="correo@ejemplo.com"
							keyboardType="email-address"
							autoCapitalize="none"
							autoComplete="email"
							leftIcon="mail"
							error={formErrors.email}
						/>

						<Input
							label={t('auth.password')}
							value={credentials.password}
							onChangeText={(password) => {
								setCredentials((prev) => ({ ...prev, password }));
								if (formErrors.password) {
									setFormErrors((prev) => ({ ...prev, password: undefined }));
								}
							}}
							placeholder="••••••••"
							isPassword
							showPasswordToggle
							leftIcon="lock"
							error={formErrors.password}
						/>

						<TouchableOpacity
							onPress={() => router.push('/auth/reset-password')}
							style={styles.forgotPassword}
						>
							<Text style={styles.forgotPasswordText}>
								{t('auth.forgotPassword')}
							</Text>
						</TouchableOpacity>

						<Button
							title={t('auth.signIn')}
							onPress={handleSignIn}
							loading={isLoading}
							disabled={isLoading}
							fullWidth
							style={styles.signInButton}
						/>
					</View>

					{/* Footer */}
					<View style={styles.footer}>
						<View style={styles.footerTextContainer}>
							<Text style={styles.footerText}>
								{t('auth.dontHaveAccount')}{' '}
							</Text>
							<TouchableOpacity
								onPress={() => router.push('/auth/sign-up')}
								disabled={isLoading}
							>
								<Text style={styles.footerLink}>{t('auth.signUp')}</Text>
							</TouchableOpacity>
						</View>
					</View>

				</ScrollView>
			</KeyboardAvoidingView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	keyboardAvoid: {
		flex: 1,
	},
	scrollContent: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 32,
		maxWidth: 400,
		alignSelf: 'center',
		width: '100%',
	},
	header: {
		alignItems: 'center',
		marginBottom: 32,
	},
	logo: {
		marginTop: 20,
		width: 80,
		height: 80,
		resizeMode: 'contain',
		marginBottom: 12,
	},
	title: {
		fontSize: 32,
		fontFamily: 'Poppins-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	form: {
		marginBottom: 32,
	},
	forgotPassword: {
		alignSelf: 'flex-end',
		marginBottom: 24,
	},
	forgotPasswordText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
	},
	signInButton: {
		marginTop: 8,
	},
	footer: {
		alignItems: 'center',
	},
	footerTextContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		justifyContent: 'center',
	},
	footerText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		marginRight: 4,
	},
	footerLink: {
		color: Colors.primary,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		fontSize: 14,
	},
});