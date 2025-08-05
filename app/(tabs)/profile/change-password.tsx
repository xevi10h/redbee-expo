import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';

export default function ChangePasswordScreen() {
	const { t } = useTranslation();
	const { user } = useRequireAuth();

	const [isLoading, setIsLoading] = useState(false);
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showCurrentPassword, setShowCurrentPassword] = useState(false);
	const [showNewPassword, setShowNewPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const handleChangePassword = async () => {
		if (!currentPassword || !newPassword || !confirmPassword) {
			Alert.alert(t('common.error'), t('profile.fillAllFields'));
			return;
		}

		if (newPassword !== confirmPassword) {
			Alert.alert(t('common.error'), t('profile.passwordsDoNotMatch'));
			return;
		}

		if (newPassword.length < 6) {
			Alert.alert(t('common.error'), t('profile.passwordTooShort'));
			return;
		}

		setIsLoading(true);

		try {
			// First verify current password by attempting to sign in
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user?.email || '',
				password: currentPassword,
			});

			if (signInError) {
				Alert.alert(t('common.error'), t('profile.currentPasswordIncorrect'));
				setIsLoading(false);
				return;
			}

			// Update password
			const { error: updateError } = await supabase.auth.updateUser({
				password: newPassword,
			});

			if (updateError) {
				Alert.alert(t('common.error'), t('profile.passwordChangeError'));
			} else {
				Alert.alert(t('common.success'), t('profile.passwordChangeSuccess'), [
					{ text: t('common.ok'), onPress: () => router.push('/(tabs)/profile/settings') }
				]);
			}
		} catch (error) {
			console.error('Error changing password:', error);
			Alert.alert(t('common.error'), t('profile.passwordChangeError'));
		} finally {
			setIsLoading(false);
		}
	};

	if (!user) {
		return null;
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.push('/(tabs)/profile/settings')}
				>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<Text style={styles.title}>{t('profile.changePassword')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				<View style={styles.formSection}>
					<Text style={styles.description}>
						{t('profile.passwordChangeDescription')}
					</Text>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.currentPassword')}</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								value={currentPassword}
								onChangeText={setCurrentPassword}
								placeholder={t('profile.currentPasswordPlaceholder')}
								placeholderTextColor={Colors.textTertiary}
								secureTextEntry={!showCurrentPassword}
								autoCapitalize="none"
							/>
							<TouchableOpacity
								style={styles.passwordToggle}
								onPress={() => setShowCurrentPassword(!showCurrentPassword)}
							>
								<Feather
									name={showCurrentPassword ? 'eye-off' : 'eye'}
									size={20}
									color={Colors.textTertiary}
								/>
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.newPassword')}</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								value={newPassword}
								onChangeText={setNewPassword}
								placeholder={t('profile.newPasswordPlaceholder')}
								placeholderTextColor={Colors.textTertiary}
								secureTextEntry={!showNewPassword}
								autoCapitalize="none"
							/>
							<TouchableOpacity
								style={styles.passwordToggle}
								onPress={() => setShowNewPassword(!showNewPassword)}
							>
								<Feather
									name={showNewPassword ? 'eye-off' : 'eye'}
									size={20}
									color={Colors.textTertiary}
								/>
							</TouchableOpacity>
						</View>
						<Text style={styles.inputHint}>{t('profile.passwordMinLength')}</Text>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.confirmNewPassword')}</Text>
						<View style={styles.passwordContainer}>
							<TextInput
								style={styles.passwordInput}
								value={confirmPassword}
								onChangeText={setConfirmPassword}
								placeholder={t('profile.confirmPasswordPlaceholder')}
								placeholderTextColor={Colors.textTertiary}
								secureTextEntry={!showConfirmPassword}
								autoCapitalize="none"
							/>
							<TouchableOpacity
								style={styles.passwordToggle}
								onPress={() => setShowConfirmPassword(!showConfirmPassword)}
							>
								<Feather
									name={showConfirmPassword ? 'eye-off' : 'eye'}
									size={20}
									color={Colors.textTertiary}
								/>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Change Password Button */}
				<View style={styles.buttonSection}>
					<Button
						title={isLoading ? t('profile.changingPassword') : t('profile.changePasswordButton')}
						onPress={handleChangePassword}
						disabled={isLoading}
						style={styles.changeButton}
					/>
				</View>

				{/* Security Tips */}
				<View style={styles.tipsSection}>
					<Text style={styles.tipsTitle}>{t('profile.securityTips')}</Text>
					<View style={styles.tip}>
						<Feather name="check" size={16} color={Colors.primary} />
						<Text style={styles.tipText}>{t('profile.securityTip1')}</Text>
					</View>
					<View style={styles.tip}>
						<Feather name="check" size={16} color={Colors.primary} />
						<Text style={styles.tipText}>{t('profile.securityTip2')}</Text>
					</View>
					<View style={styles.tip}>
						<Feather name="check" size={16} color={Colors.primary} />
						<Text style={styles.tipText}>{t('profile.securityTip3')}</Text>
					</View>
					<View style={styles.tip}>
						<Feather name="check" size={16} color={Colors.primary} />
						<Text style={styles.tipText}>{t('profile.securityTip4')}</Text>
					</View>
				</View>

				{/* Bottom Spacing */}
				<View style={styles.bottomSpacing} />
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: Colors.background,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerSpacer: {
		width: 40,
	},
	title: {
		flex: 1,
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
	},
	content: {
		flex: 1,
	},
	formSection: {
		paddingHorizontal: 16,
		paddingTop: 24,
	},
	description: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 32,
		lineHeight: 22,
	},
	inputGroup: {
		marginBottom: 24,
	},
	label: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 8,
	},
	passwordContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	passwordInput: {
		flex: 1,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
	},
	passwordToggle: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	inputHint: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		marginTop: 4,
	},
	buttonSection: {
		paddingHorizontal: 16,
		paddingTop: 24,
	},
	changeButton: {
		width: '100%',
	},
	tipsSection: {
		paddingHorizontal: 16,
		paddingTop: 32,
	},
	tipsTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
	},
	tip: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	tipText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginLeft: 8,
		flex: 1,
	},
	bottomSpacing: {
		height: 32,
	},
});