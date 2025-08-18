import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RelativePathString, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Linking,
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
import {
	areWebPagesAvailable,
	getPrivacyUrl,
	getTermsUrl,
	getWebPagesUnavailableMessage,
} from '@/shared/utils/webUrls';
import { useAuthStore } from '@/stores/authStore';

export default function SignUpScreen() {
	const { t } = useTranslation();
	const language = useAuthStore((state) => state.user?.language || 'es_ES');
	const { signUp, error, clearError } = useAuth();

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

	const handleTermsPress = async () => {
		if (!areWebPagesAvailable()) {
			Alert.alert(t('common.info'), getWebPagesUnavailableMessage(), [
				{ text: t('common.ok') },
			]);
			return;
		}

		try {
			const url = getTermsUrl(language);
			const canOpen = await Linking.canOpenURL(url);
			if (canOpen) {
				await Linking.openURL(url);
			} else {
				console.error('Cannot open URL:', url);
				Alert.alert(t('common.error'), 'No se pudo abrir la página web', [
					{ text: t('common.ok') },
				]);
			}
		} catch (error) {
			console.error('Error opening terms URL:', error);
			Alert.alert(t('common.error'), 'Error al abrir la página web', [
				{ text: t('common.ok') },
			]);
		}
	};

	const handlePrivacyPress = async () => {
		if (!areWebPagesAvailable()) {
			Alert.alert(t('common.info'), getWebPagesUnavailableMessage(), [
				{ text: t('common.ok') },
			]);
			return;
		}

		try {
			const url = getPrivacyUrl(language);
			const canOpen = await Linking.canOpenURL(url);
			if (canOpen) {
				await Linking.openURL(url);
			} else {
				console.error('Cannot open URL:', url);
				Alert.alert(t('common.error'), 'No se pudo abrir la página web', [
					{ text: t('common.ok') },
				]);
			}
		} catch (error) {
			console.error('Error opening privacy URL:', error);
			Alert.alert(t('common.error'), 'Error al abrir la página web', [
				{ text: t('common.ok') },
			]);
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
							Red<Text style={{ color: '#FF3539' }}>Bee</Text>
						</Text>
						<Text style={styles.subtitle}>{t('auth.welcome')}</Text>
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
						<View style={styles.termsContainer}>
							<TouchableOpacity
								style={styles.checkboxContainer}
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
							</TouchableOpacity>
							<View style={styles.termsTextContainer}>
								<Text style={styles.termsText}>
									{t('auth.agreeToTerms')}{' '}
									<Text style={styles.termsLink} onPress={handleTermsPress}>
										{t('auth.termsOfService')}
									</Text>{' '}
									{t('auth.and')}{' '}
									<Text style={styles.termsLink} onPress={handlePrivacyPress}>
										{t('auth.privacyPolicy')}
									</Text>
								</Text>
							</View>
						</View>

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
						<View style={styles.footerTextContainer}>
							<Text style={styles.footerText}>
								{t('auth.alreadyHaveAccount')}{' '}
							</Text>
							<TouchableOpacity
								onPress={() => router.push('/auth/sign-in')}
								disabled={isLoading}
							>
								<Text style={styles.footerLink}>{t('auth.signIn')}</Text>
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
		marginBottom: 24,
	},
	termsContainer: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 24,
		paddingHorizontal: 4,
	},
	checkboxContainer: {
		paddingTop: 2,
		paddingRight: 12,
	},
	checkbox: {
		width: 20,
		height: 20,
		borderRadius: 4,
		borderWidth: 2,
		borderColor: Colors.textTertiary,
		backgroundColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkboxChecked: {
		backgroundColor: Colors.primary,
		borderColor: Colors.primary,
	},
	termsTextContainer: {
		flex: 1,
	},
	termsText: {
		fontSize: 13,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 18,
	},
	termsLink: {
		color: Colors.primary,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		fontSize: 13,
		lineHeight: 18,
	},
	signUpButton: {
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
