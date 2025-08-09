import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useTranslation } from '@/hooks/useTranslation';
import { SupabaseAuthService } from '@/services/supabaseAuth';

export default function ConfirmPasswordScreen() {
	const { t } = useTranslation();
	const { token_hash, type } = useLocalSearchParams<{
		token_hash: string;
		type: string;
	}>();

	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [passwordError, setPasswordError] = useState('');
	const [confirmPasswordError, setConfirmPasswordError] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isValidToken, setIsValidToken] = useState(false);

	useEffect(() => {
		// Validate the token when component mounts
		if (token_hash && type === 'recovery') {
			validateToken();
		} else {
			Alert.alert(
				t('common.error'),
				t('auth.invalidToken'),
				[
					{
						text: t('common.ok'),
						onPress: () => router.replace('/auth/sign-in'),
					},
				],
			);
		}
	}, [token_hash, type]);

	const validateToken = async () => {
		try {
			setIsLoading(true);
			const result = await SupabaseAuthService.verifyOtp({
				token_hash: token_hash!,
				type: 'recovery',
			});

			if (result.success) {
				setIsValidToken(true);
			} else {
				Alert.alert(
					t('common.error'),
					t('auth.tokenExpired'),
					[
						{
							text: t('common.ok'),
							onPress: () => router.replace('/auth/sign-in'),
						},
					],
				);
			}
		} catch (error) {
			Alert.alert(
				t('common.error'),
				t('auth.tokenValidationError'),
				[
					{
						text: t('common.ok'),
						onPress: () => router.replace('/auth/sign-in'),
					},
				],
			);
		} finally {
			setIsLoading(false);
		}
	};

	const validateForm = (): boolean => {
		let isValid = true;

		// Validate password
		if (!password) {
			setPasswordError(t('auth.errors.passwordRequired'));
			isValid = false;
		} else if (password.length < 8) {
			setPasswordError(t('auth.passwordMinLength'));
			isValid = false;
		} else {
			setPasswordError('');
		}

		// Validate confirm password
		if (!confirmPassword) {
			setConfirmPasswordError(t('auth.confirmPassword'));
			isValid = false;
		} else if (password !== confirmPassword) {
			setConfirmPasswordError(t('auth.passwordsDoNotMatch'));
			isValid = false;
		} else {
			setConfirmPasswordError('');
		}

		return isValid;
	};

	const handleUpdatePassword = async () => {
		if (!validateForm()) return;

		setIsLoading(true);

		try {
			const result = await SupabaseAuthService.updatePassword(password);

			if (result.success) {
				Alert.alert(
					t('auth.passwordUpdated'),
					t('auth.passwordUpdatedMessage'),
					[
						{
							text: t('common.ok'),
							onPress: () => router.replace('/(tabs)'),
						},
					],
				);
			} else {
				Alert.alert(
					t('common.error'),
					result.error || t('auth.updatePasswordError'),
					[{ text: t('common.ok') }],
				);
			}
		} catch (error) {
			Alert.alert(
				t('common.error'),
				t('auth.updatePasswordError'),
				[{ text: t('common.ok') }],
			);
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackToSignIn = () => {
		router.replace('/auth/sign-in');
	};

	// Show loading while validating token
	if (!isValidToken && isLoading) {
		return (
			<LinearGradient colors={Colors.gradientSecondary} style={styles.container}>
				<StatusBar style="light" />
				<View style={styles.loadingContainer}>
					<Feather name="key" size={48} color={Colors.primary} />
					<Text style={styles.loadingText}>{t('auth.validatingToken')}</Text>
				</View>
			</LinearGradient>
		);
	}

	// Don't render the form if token is not valid
	if (!isValidToken) {
		return null;
	}

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
					{/* Back Button */}
					<TouchableOpacity
						style={styles.backButton}
						onPress={handleBackToSignIn}
					>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>

					{/* Header */}
					<View style={styles.header}>
						<View style={styles.iconContainer}>
							<Feather name="lock" size={48} color={Colors.primary} />
						</View>
						<Text style={styles.title}>{t('auth.newPassword')}</Text>
						<Text style={styles.subtitle}>
							{t('auth.newPasswordPlaceholder')}. {t('auth.passwordMinLength')}.
						</Text>
					</View>

					{/* Password Form */}
					<View style={styles.form}>
						<Input
							label={t('auth.newPassword')}
							value={password}
							onChangeText={(text) => {
								setPassword(text);
								if (passwordError) {
									setPasswordError('');
								}
							}}
							placeholder={t('auth.newPasswordPlaceholder')}
							secureTextEntry={!showPassword}
							rightIcon={showPassword ? 'eye-off' : 'eye'}
							onRightIconPress={() => setShowPassword(!showPassword)}
							leftIcon="lock"
							error={passwordError}
							autoFocus
						/>

						<Input
							label={t('auth.confirmNewPassword')}
							value={confirmPassword}
							onChangeText={(text) => {
								setConfirmPassword(text);
								if (confirmPasswordError) {
									setConfirmPasswordError('');
								}
							}}
							placeholder={t('auth.confirmNewPasswordPlaceholder')}
							secureTextEntry={!showConfirmPassword}
							rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
							onRightIconPress={() =>
								setShowConfirmPassword(!showConfirmPassword)
							}
							leftIcon="lock"
							error={confirmPasswordError}
							style={styles.confirmPasswordInput}
						/>

						<Button
							title={t('auth.updatePassword')}
							onPress={handleUpdatePassword}
							loading={isLoading}
							disabled={isLoading}
							fullWidth
							style={styles.updateButton}
						/>
					</View>

					{/* Footer */}
					<View style={styles.footer}>
						<TouchableOpacity onPress={handleBackToSignIn}>
							<Text style={styles.footerText}>
								<Feather name="arrow-left" size={16} color={Colors.primary} />{' '}
								{t('auth.backToSignInLink')}
							</Text>
						</TouchableOpacity>
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
		paddingHorizontal: 24,
		paddingVertical: 32,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		fontSize: 18,
		fontFamily: 'Inter-Medium',
		color: Colors.text,
		marginTop: 16,
		textAlign: 'center',
	},
	backButton: {
		alignSelf: 'flex-start',
		padding: 8,
		marginBottom: 24,
	},
	header: {
		alignItems: 'center',
		marginBottom: 48,
	},
	iconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		backgroundColor: Colors.premiumBackground,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 28,
		fontFamily: 'Poppins-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 12,
		textAlign: 'center',
	},
	subtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
		paddingHorizontal: 16,
	},
	form: {
		marginBottom: 32,
	},
	confirmPasswordInput: {
		marginTop: 16,
	},
	updateButton: {
		marginTop: 24,
	},
	footer: {
		alignItems: 'center',
		marginTop: 'auto',
	},
	footerText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		color: Colors.primary,
		textAlign: 'center',
	},
});