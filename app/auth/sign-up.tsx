import { Feather, Ionicons } from '@expo/vector-icons';
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
import { Colors } from '@/constants/Colors';
import { useAuth, useGuestOnly } from '@/hooks/useAuth';
import {
	getAvailabilityMessage,
	useEmailAvailability,
	useUsernameAvailability,
} from '@/hooks/useAvailabilityCheck';
import { useTranslation } from '@/hooks/useTranslation';
import {
	sanitizeUsername,
	validateEmail,
	validatePassword,
	validateUsername,
} from '@/shared/functions/utils';
import { RegisterCredentials } from '@/shared/types';

export default function SignUpScreen() {
	const { t } = useTranslation();
	const {
		signUp,
		signInWithGoogle,
		signInWithGoogleOAuth,
		signInWithApple,
		error,
		clearError,
	} = useAuth();

	// This hook will redirect to home if user is already authenticated
	useGuestOnly('/');

	const [credentials, setCredentials] = useState<RegisterCredentials>({
		email: '',
		username: '',
		display_name: '',
		password: '',
	});
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [formErrors, setFormErrors] = useState<
		Partial<RegisterCredentials & { confirmPassword: string }>
	>({});
	const [agreedToTerms, setAgreedToTerms] = useState(false);

	// Availability checks
	const {
		isChecking: isCheckingUsername,
		isAvailable: isUsernameAvailable,
		error: usernameError,
	} = useUsernameAvailability(credentials.username);

	const {
		isChecking: isCheckingEmail,
		isAvailable: isEmailAvailable,
		error: emailError,
	} = useEmailAvailability(credentials.email);

	// Clear auth errors when component mounts
	useEffect(() => {
		clearError();
	}, [clearError]);

	const validateForm = (): boolean => {
		const errors: Partial<RegisterCredentials & { confirmPassword: string }> =
			{};

		// Email validation
		if (!credentials.email) {
			errors.email = t('auth.errors.emailRequired');
		} else if (!validateEmail(credentials.email)) {
			errors.email = t('auth.errors.invalidEmail');
		} else if (isEmailAvailable === false) {
			errors.email = t('auth.errors.emailNotAvailable');
		}

		// Username validation
		if (!credentials.username) {
			errors.username = t('auth.errors.usernameRequired');
		} else if (!validateUsername(credentials.username)) {
			errors.username = t('auth.errors.usernameInvalid');
		} else if (isUsernameAvailable === false) {
			errors.username = t('auth.errors.usernameNotAvailable');
		}

		// Display name validation
		if (!credentials.display_name.trim()) {
			errors.display_name = t('auth.errors.displayNameRequired');
		}

		// Password validation
		if (!credentials.password) {
			errors.password = t('auth.errors.passwordRequired');
		} else if (!validatePassword(credentials.password)) {
			errors.password = t('auth.errors.passwordTooShort');
		}

		// Confirm password validation
		if (!confirmPassword) {
			errors.confirmPassword = t('auth.errors.passwordRequired');
		} else if (credentials.password !== confirmPassword) {
			errors.confirmPassword = t('auth.errors.passwordsDoNotMatch');
		}

		setFormErrors(errors);
		return Object.keys(errors).length === 0;
	};

	const handleSignUp = async () => {
		if (!validateForm()) return;

		if (!agreedToTerms) {
			Alert.alert(t('common.error'), t('auth.agreeToTerms'), [
				{ text: t('common.ok') },
			]);
			return;
		}

		// Wait for availability checks to complete
		if (isCheckingUsername || isCheckingEmail) {
			Alert.alert(t('common.info'), t('auth.validation.checking'), [
				{ text: t('common.ok') },
			]);
			return;
		}

		setIsLoading(true);
		clearError();

		try {
			const success = await signUp(credentials);
			if (success) {
				router.replace('/' as RelativePathString);
			}
		} catch (err) {
			console.error('Sign up error:', err);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGoogleSignUp = async () => {
		setIsLoading(true);
		clearError();

		try {
			// Try native Google Sign-In first
			const success = await signInWithGoogle();
			if (success) {
				router.replace('/' as RelativePathString);
			}
		} catch (err) {
			console.error('Google sign up error:', err);

			// If native method fails, try OAuth method as fallback
			try {
				const oauthSuccess = await signInWithGoogleOAuth();
				if (oauthSuccess) {
					router.replace('/' as RelativePathString);
				}
			} catch (oauthErr) {
				console.error('Google OAuth sign up error:', oauthErr);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleAppleSignUp = async () => {
		// Check if we're on iOS
		if (Platform.OS !== 'ios') {
			Alert.alert(
				t('common.info'),
				'Apple Sign-In is only available on iOS devices',
				[{ text: t('common.ok') }],
			);
			return;
		}

		setIsLoading(true);
		clearError();

		try {
			const success = await signInWithApple();
			if (success) {
				router.replace('/' as RelativePathString);
			}
		} catch (err) {
			console.error('Apple sign up error:', err);
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

	// Get availability messages
	const usernameMessage = getAvailabilityMessage(
		isCheckingUsername,
		isUsernameAvailable,
		usernameError,
		'Username',
	);

	const emailMessage = getAvailabilityMessage(
		isCheckingEmail,
		isEmailAvailable,
		emailError,
		'Email',
	);

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
						<Text style={styles.title}>Redbee</Text>
						<Text style={styles.subtitle}>{t('auth.welcome')}</Text>
					</View>

					{/* Social Sign-Up Buttons */}
					<View style={styles.socialButtons}>
						{/* Google Sign-Up */}
						<Button
							title={t('auth.continueWithGoogle')}
							onPress={handleGoogleSignUp}
							variant="secondary"
							disabled={isLoading}
							fullWidth
							icon={
								<Ionicons name="logo-google" size={18} color={Colors.text} />
							}
							style={styles.socialButton}
						/>

						{/* Apple Sign-Up (iOS only) */}
						{Platform.OS === 'ios' && (
							<Button
								title={t('auth.continueWithApple')}
								onPress={handleAppleSignUp}
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

					{/* Divider */}
					<View style={styles.divider}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerText}>{t('auth.orContinueWith')}</Text>
						<View style={styles.dividerLine} />
					</View>

					{/* Sign Up Form */}
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
							success={
								emailMessage?.type === 'success'
									? emailMessage.message
									: undefined
							}
							isLoading={isCheckingEmail}
						/>

						<Input
							label={t('auth.username')}
							value={credentials.username}
							onChangeText={(text) => {
								const sanitized = sanitizeUsername(text);
								setCredentials((prev) => ({ ...prev, username: sanitized }));
								if (formErrors.username) {
									setFormErrors((prev) => ({ ...prev, username: undefined }));
								}
							}}
							placeholder="usuario123"
							autoCapitalize="none"
							autoComplete="username"
							leftIcon="at-sign"
							error={formErrors.username}
							success={
								usernameMessage?.type === 'success'
									? usernameMessage.message
									: undefined
							}
							isLoading={isCheckingUsername}
						/>

						<Input
							label={t('auth.displayName')}
							value={credentials.display_name}
							onChangeText={(display_name) => {
								setCredentials((prev) => ({ ...prev, display_name }));
								if (formErrors.display_name) {
									setFormErrors((prev) => ({
										...prev,
										display_name: undefined,
									}));
								}
							}}
							placeholder="Tu nombre"
							autoCapitalize="words"
							autoComplete="name"
							leftIcon="user"
							error={formErrors.display_name}
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

						<Input
							label={t('auth.confirmPassword')}
							value={confirmPassword}
							onChangeText={(text) => {
								setConfirmPassword(text);
								if (formErrors.confirmPassword) {
									setFormErrors((prev) => ({
										...prev,
										confirmPassword: undefined,
									}));
								}
							}}
							placeholder="••••••••"
							isPassword
							showPasswordToggle
							leftIcon="lock"
							error={formErrors.confirmPassword}
						/>

						{/* Terms and Conditions */}
						<TouchableOpacity
							style={styles.termsContainer}
							onPress={() => setAgreedToTerms(!agreedToTerms)}
						>
							<View
								style={[
									styles.checkbox,
									agreedToTerms && styles.checkboxChecked,
								]}
							>
								{agreedToTerms && (
									<Feather name="check" size={14} color={Colors.text} />
								)}
							</View>
							<Text style={styles.termsText}>
								{t('auth.agreeToTerms')}{' '}
								<Text style={styles.termsLink}>{t('auth.termsOfService')}</Text>{' '}
								{t('auth.and')}{' '}
								<Text style={styles.termsLink}>{t('auth.privacyPolicy')}</Text>
							</Text>
						</TouchableOpacity>

						<Button
							title={t('auth.createAccount')}
							onPress={handleSignUp}
							loading={isLoading}
							disabled={isLoading || !agreedToTerms}
							fullWidth
							style={styles.signUpButton}
						/>
					</View>

					{/* Footer */}
					<View style={styles.footer}>
						<Text style={styles.footerText}>
							{t('auth.alreadyHaveAccount')}{' '}
							<TouchableOpacity
								onPress={() => router.push('/auth/sign-in')}
								disabled={isLoading}
							>
								<Text style={styles.footerLink}>{t('auth.signIn')}</Text>
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
		marginBottom: 32,
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
	socialButtons: {
		gap: 12,
		marginBottom: 24,
	},
	socialButton: {
		backgroundColor: Colors.backgroundSecondary,
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
	form: {
		marginBottom: 24,
	},
	termsContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 24,
		paddingHorizontal: 4,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: Colors.textTertiary,
		backgroundColor: 'transparent',
		marginRight: 12,
		marginTop: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxChecked: {
		backgroundColor: Colors.primary,
		borderColor: Colors.primary,
	},
	termsText: {
		flex: 1,
		fontSize: 13,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 18,
	},
	termsLink: {
		color: Colors.primary,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
	},
	signUpButton: {
		marginTop: 8,
	},
	footer: {
		alignItems: 'center',
	},
	footerText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	footerLink: {
		color: Colors.primary,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
	},
});
