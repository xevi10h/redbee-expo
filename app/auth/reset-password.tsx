import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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
import { useGuestOnly } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { SupabaseAuthService } from '@/services/supabaseAuth';
import { validateEmail } from '@/shared/functions/utils';

export default function ResetPasswordScreen() {
	const { t } = useTranslation();

	// This hook will redirect to home if user is already authenticated
	useGuestOnly('/');

	const [email, setEmail] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [emailSent, setEmailSent] = useState(false);
	const [emailError, setEmailError] = useState('');

	const validateForm = (): boolean => {
		if (!email) {
			setEmailError(t('auth.errors.emailRequired'));
			return false;
		}

		if (!validateEmail(email)) {
			setEmailError(t('auth.errors.invalidEmail'));
			return false;
		}

		setEmailError('');
		return true;
	};

	const handleSendResetEmail = async () => {
		if (!validateForm()) return;

		setIsLoading(true);

		try {
			const result = await SupabaseAuthService.resetPassword(email);

			if (result.success) {
				setEmailSent(true);
				Alert.alert(
					t('auth.resetEmailSent'),
					t('auth.resetEmailInstructions'),
					[{ text: t('common.ok') }],
				);
			} else {
				Alert.alert(
					t('common.error'),
					result.error || t('auth.errors.resetFailed'),
					[{ text: t('common.ok') }],
				);
			}
		} catch (error) {
			Alert.alert(t('common.error'), t('auth.errors.resetFailed'), [
				{ text: t('common.ok') },
			]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleBackToSignIn = () => {
		router.back();
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
					{/* Back Button */}
					<TouchableOpacity
						style={styles.backButton}
						onPress={handleBackToSignIn}
					>
						<Feather name="arrow-left" size={24} color={Colors.text} />
					</TouchableOpacity>

					{/* Header */}
					{!emailSent && (
						<View style={styles.header}>
							<View style={styles.iconContainer}>
								<Feather name="key" size={48} color={Colors.primary} />
							</View>
							<Text style={styles.title}>{t('auth.resetPassword')}</Text>
							<Text style={styles.subtitle}>
								Ingresa tu correo electrónico y te enviaremos un enlace para
								restablecer tu contraseña.
							</Text>
						</View>
					)}

					{!emailSent ? (
						/* Reset Form */
						<View style={styles.form}>
							<Input
								label={t('auth.email')}
								value={email}
								onChangeText={(text) => {
									setEmail(text);
									if (emailError) {
										setEmailError('');
									}
								}}
								placeholder="correo@ejemplo.com"
								keyboardType="email-address"
								autoCapitalize="none"
								autoComplete="email"
								leftIcon="mail"
								error={emailError}
								autoFocus
							/>

							<Button
								title={t('auth.sendResetEmail')}
								onPress={handleSendResetEmail}
								loading={isLoading}
								disabled={isLoading}
								fullWidth
								style={styles.resetButton}
							/>
						</View>
					) : (
						/* Success State */
						<View style={styles.successContainer}>
							<View style={styles.successIconContainer}>
								<Feather name="check-circle" size={64} color={Colors.success} />
							</View>
							<Text style={styles.successTitle}>
								{t('auth.resetEmailSent')}
							</Text>
							<Text style={styles.successText}>
								{t('auth.resetEmailInstructions')}
							</Text>

							<Button
								title={t('auth.backToSignIn')}
								onPress={handleBackToSignIn}
								variant="outline"
								fullWidth
								style={styles.backToSignInButton}
							/>

							<TouchableOpacity
								style={styles.resendContainer}
								onPress={() => {
									setEmailSent(false);
									setEmail('');
								}}
							>
								<Text style={styles.resendText}>
									¿No recibiste el correo?{' '}
									<Text style={styles.resendLink}>Enviar de nuevo</Text>
								</Text>
							</TouchableOpacity>
						</View>
					)}

					{/* Footer */}
					{!emailSent && (
						<View style={styles.footer}>
							<TouchableOpacity onPress={handleBackToSignIn}>
								<Text style={styles.footerText}>
									<Feather name="arrow-left" size={16} color={Colors.primary} />{' '}
									{t('auth.backToSignIn')}
								</Text>
							</TouchableOpacity>
						</View>
					)}
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
		fontFamily: 'Raleway-Bold',
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
	resetButton: {
		marginTop: 8,
	},
	successContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
	},
	successIconContainer: {
		marginBottom: 24,
	},
	successTitle: {
		fontSize: 24,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 12,
		textAlign: 'center',
	},
	successText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32,
		paddingHorizontal: 16,
	},
	backToSignInButton: {
		marginBottom: 24,
	},
	resendContainer: {
		alignItems: 'center',
	},
	resendText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	resendLink: {
		color: Colors.primary,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
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
