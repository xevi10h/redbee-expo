import { Ionicons } from '@expo/vector-icons';
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
	const {
		signIn,
		signInLocal,
		signInWithGoogle,
		signInWithGoogleOAuth,
		signInWithApple,
		error,
		clearError,
	} = useAuth();

	// This hook will redirect to home if user is already authenticated
	useGuestOnly('/');

	const [credentials, setCredentials] = useState<LoginCredentials>({
		email: '',
		password: '',
	});
	const [isLoading, setIsLoading] = useState(false);
	const [formErrors, setFormErrors] = useState<Partial<LoginCredentials>>({});
	const [authError, setAuthError] = useState<string | null>(null);

	// Clear auth errors when component mounts
	useEffect(() => {
		clearError();
		setAuthError(null);
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
		setAuthError(null);

		try {
			const result = await signInLocal(credentials);
			if (result.success) {
				router.replace('/' as RelativePathString);
			} else {
				// First show an alert
				const errorMessage = result.error || 'auth.errors.signInFailed';
				const alertMessage = errorMessage.startsWith('auth.') ? t(errorMessage) : errorMessage;
				
				Alert.alert(
					t('common.error'),
					alertMessage,
					[
						{
							text: t('common.ok'),
							onPress: () => {
								// After closing alert, set a different error message for inline display
								const inlineErrorMessage = errorMessage === 'auth.errors.invalidCredentials' 
									? 'auth.errors.invalidCredentialsInline'
									: errorMessage;
								setAuthError(inlineErrorMessage);
							}
						}
					]
				);
			}
		} catch (err) {
			console.error('Sign in error:', err);
			const errorMessage = 'auth.errors.unknownError';
			Alert.alert(
				t('common.error'),
				t(errorMessage),
				[
					{
						text: t('common.ok'),
						onPress: () => {
							setAuthError(errorMessage);
						}
					}
				]
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignIn = async () => {
		setIsLoading(true);
		clearError();
		setAuthError(null);

		try {
			// Try native Google Sign-In first
			const success = await signInWithGoogle();
			console.log('Google sign in success:', success);
			if (success) {
				router.replace('/' as RelativePathString);
			}
		} catch (err) {
			console.error('Google sign in error:', err);

			// If native method fails, try OAuth method as fallback
			try {
				const oauthSuccess = await signInWithGoogleOAuth();
				if (oauthSuccess) {
					router.replace('/' as RelativePathString);
				}
			} catch (oauthErr) {
				console.error('Google OAuth sign in error:', oauthErr);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleAppleSignIn = async () => {
		// Check if we're on iOS
		if (Platform.OS !== 'ios') {
			setAuthError('Apple Sign-In is only available on iOS devices');
			return;
		}

		setIsLoading(true);
		clearError();
		setAuthError(null);

		try {
			const success = await signInWithApple();
			if (success) {
				router.replace('/' as RelativePathString);
			}
		} catch (err) {
			console.error('Apple sign in error:', err);
		} finally {
			setIsLoading(false);
		}
	};


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
						<Text style={styles.title}>
							Red
							<Text style={{ color: '#FF3539' }}>Bee</Text>
						</Text>
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
								if (authError) {
									setAuthError(null);
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
								if (authError) {
									setAuthError(null);
								}
							}}
							placeholder="••••••••"
							isPassword
							showPasswordToggle
							leftIcon="lock"
							error={formErrors.password}
						/>

						{/* Auth Error Display - styled like form field error */}
						{authError && (
							<View style={styles.authErrorContainer}>
								<Text style={styles.authErrorText}>
									{authError.startsWith('auth.') ? t(authError) : authError}
								</Text>
							</View>
						)}

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

					{/* Social Sign-In Buttons */}
					<View style={styles.socialButtons}>
						{/* Google Sign-In */}
						<Button
							title={t('auth.continueWithGoogle')}
							onPress={handleGoogleSignIn}
							variant="secondary"
							disabled={isLoading}
							fullWidth
							icon={
								<Ionicons name="logo-google" size={18} color={Colors.text} />
							}
							style={styles.socialButton}
						/>

						{/* Apple Sign-In (iOS only) */}
						{Platform.OS === 'ios' && (
							<Button
								title={t('auth.continueWithApple')}
								onPress={handleAppleSignIn}
								variant="secondary"
								disabled={isLoading}
								fullWidth
								icon={
									<Ionicons name="logo-apple" size={18} color={Colors.text} />
								}
								style={styles.socialButton}
							/>
						)}
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
		fontFamily: 'Raleway-Bold',
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
	authErrorContainer: {
		marginTop: -8, // Negative margin to bring it closer to the password field
		marginBottom: 8,
	},
	authErrorText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.error,
		marginTop: 4,
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
	divider: {
		flexDirection: 'row',
		alignItems: 'center',
		marginVertical: 24,
	},
	dividerLine: {
		flex: 1,
		height: 1,
		backgroundColor: Colors.textTertiary,
	},
	dividerText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginHorizontal: 16,
	},
	socialButtons: {
		gap: 12,
		marginBottom: 32,
	},
	socialButton: {
		backgroundColor: Colors.backgroundSecondary,
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
