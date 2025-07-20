import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RelativePathString, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
	Alert,
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
import { useAuth, useGuestOnly } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { validateEmail } from '@/shared/functions/utils';
import { LoginCredentials } from '@/shared/types';

export default function SignInScreen() {
	const { t } = useTranslation();
	const { signIn, signInWithGoogle, signInWithApple, error, clearError } =
		useAuth();

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

	const handleGoogleSignIn = async () => {
		setIsLoading(true);
		clearError();

		try {
			await signInWithGoogle();
			// OAuth flow will handle navigation
		} catch (err) {
			console.error('Google sign in error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAppleSignIn = async () => {
		setIsLoading(true);
		clearError();

		try {
			await signInWithApple();
			// OAuth flow will handle navigation
		} catch (err) {
			console.error('Apple sign in error:', err);
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
		<LinearGradient colors={['#000000', '#1C1C1E']} style={styles.container}>
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

					{/* Divider */}
					<View style={styles.divider}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
						<View style={styles.dividerLine} />
					</View>

					{/* OAuth Buttons */}
					<View style={styles.oauthButtons}>
						<Button
							title={t('auth.continueWithGoogle')}
							onPress={handleGoogleSignIn}
							variant="secondary"
							disabled={isLoading}
							fullWidth
							icon={<Feather name="chrome" size={18} color="#FFFFFF" />}
							style={styles.oauthButton}
						/>

						{Platform.OS === 'ios' && (
							<Button
								title={t('auth.continueWithApple')}
								onPress={handleAppleSignIn}
								variant="secondary"
								disabled={isLoading}
								fullWidth
								icon={<Feather name="smartphone" size={18} color="#FFFFFF" />}
								style={styles.oauthButton}
							/>
						)}
					</View>

					{/* Footer */}
					<View style={styles.footer}>
						<Text style={styles.footerText}>
							{t('auth.dontHaveAccount')}{' '}
							<TouchableOpacity
								onPress={() => router.push('/auth/sign-up')}
								disabled={isLoading}
							>
								<Text style={styles.footerLink}>{t('auth.signUp')}</Text>
							</TouchableOpacity>
						</Text>
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
	},
	header: {
		alignItems: 'center',
		marginBottom: 48,
	},
	title: {
		fontSize: 32,
		fontFamily: 'Poppins-Bold',
		fontWeight: 'bold',
		color: '#FFFFFF',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: '#ADB5BD',
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
		color: '#E1306C',
	},
	signInButton: {
		marginTop: 8,
	},
	divider: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 24,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: '#6C757D',
	},
	dividerText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
		marginHorizontal: 16,
	},
	oauthButtons: {
		gap: 12,
		marginBottom: 32,
	},
	oauthButton: {
		backgroundColor: '#1C1C1E',
	},
	footer: {
		alignItems: 'center',
	},
	footerText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#ADB5BD',
		textAlign: 'center',
	},
	footerLink: {
		color: '#E1306C',
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
	},
});
