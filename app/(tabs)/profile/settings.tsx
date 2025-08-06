import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
	ActionSheetIOS,
	Alert,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/Colors';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import {
	NotificationPreferences,
	NotificationService,
} from '@/services/notificationService';
import { Language } from '@/shared/types';
import { useAuthStore } from '@/stores/authStore';

interface SettingsItemProps {
	title: string;
	subtitle?: string;
	icon: string;
	onPress?: () => void;
	rightComponent?: React.ReactNode;
	showArrow?: boolean;
	destructive?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
	title,
	subtitle,
	icon,
	onPress,
	rightComponent,
	showArrow = true,
	destructive = false,
}) => {
	return (
		<TouchableOpacity
			style={styles.settingsItem}
			onPress={onPress}
			disabled={!onPress}
		>
			<View style={styles.settingsItemLeft}>
				<View
					style={[styles.settingsIcon, destructive && styles.destructiveIcon]}
				>
					<Feather
						name={icon as any}
						size={20}
						color={destructive ? Colors.error : Colors.primary}
					/>
				</View>
				<View style={styles.settingsText}>
					<Text
						style={[
							styles.settingsTitle,
							destructive && styles.destructiveText,
						]}
					>
						{title}
					</Text>
					{subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
				</View>
			</View>

			<View style={styles.settingsItemRight}>
				{rightComponent}
				{showArrow && onPress && (
					<Feather name="chevron-right" size={20} color={Colors.textTertiary} />
				)}
			</View>
		</TouchableOpacity>
	);
};

interface LanguageSelectorProps {
	currentLanguage: Language;
	onLanguageChange: (language: Language) => void;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
	currentLanguage,
	onLanguageChange,
}) => {
	const { t } = useTranslation();

	// Solo incluir idiomas con traducciones completas
	const languages: { code: Language; name: string }[] = [
		{ code: 'es_ES', name: t('settings.languages.es_ES') },
		{ code: 'en_US', name: t('settings.languages.en_US') },
		{ code: 'ca_ES', name: t('settings.languages.ca_ES') },
		{ code: 'fr_FR', name: t('settings.languages.fr_FR') },
		{ code: 'it_IT', name: t('settings.languages.it_IT') },
		{ code: 'pt_PT', name: t('settings.languages.pt_PT') },
	];

	const currentLanguageName =
		languages.find((lang) => lang.code === currentLanguage)?.name || 'Español';

	const handleLanguagePress = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		
		const languageOptions = languages.map(lang => lang.name);
		const cancelText = t('common.cancel');
		
		if (Platform.OS === 'ios') {
			ActionSheetIOS.showActionSheetWithOptions(
				{
					options: [...languageOptions, cancelText],
					cancelButtonIndex: languageOptions.length,
					title: t('settings.selectLanguage'),
					message: t('settings.languageChangeNote'),
				},
				(buttonIndex) => {
					if (buttonIndex < languageOptions.length) {
						const selectedLanguage = languages[buttonIndex];
						if (selectedLanguage.code !== currentLanguage) {
							onLanguageChange(selectedLanguage.code);
							Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						}
					}
				}
			);
		} else {
			// Android - usar Alert tradicional
			Alert.alert(
				t('settings.selectLanguage'),
				t('settings.languageChangeNote'),
				languages.map((lang) => ({
					text: lang.name,
					onPress: () => {
						if (lang.code !== currentLanguage) {
							onLanguageChange(lang.code);
							Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						}
					},
				})).concat([
					{
						text: cancelText,
						style: 'cancel',
					},
				]),
				{ cancelable: true }
			);
		}
	};

	return (
		<SettingsItem
			title={t('settings.language')}
			subtitle={currentLanguageName}
			icon="globe"
			onPress={handleLanguagePress}
		/>
	);
};

export default function SettingsScreen() {
	const { t } = useTranslation();
	const { user, signOut, updateProfile } = useAuth();
	const setLanguage = useAuthStore((state) => state.setLanguage);

	// This hook will redirect to auth if user is not authenticated
	useRequireAuth();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [darkModeEnabled, setDarkModeEnabled] = useState(true);
	const [notificationPreferences, setNotificationPreferences] =
		useState<NotificationPreferences | null>(null);

	const handleEditProfile = () => {
		router.push('/(tabs)/profile/edit');
	};

	const handleChangePassword = () => {
		router.push('/(tabs)/profile/change-password');
	};

	const handlePrivacySettings = () => {
		console.log('Navigate to privacy settings');
		// TODO: Implement navigation to privacy settings screen
	};

	const handleNotificationSettings = () => {
		console.log('Navigate to notification settings');
		// TODO: Implement navigation to notification settings screen
	};

	const handleBlockedUsers = () => {
		console.log('Navigate to blocked users');
		// TODO: Implement navigation to blocked users screen
	};

	const handleDownloadData = () => {
		Alert.alert(
			t('settings.downloadData'),
			t('settings.downloadDataDescription'),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.continue'),
					onPress: () => console.log('Download data requested'),
				},
			],
		);
	};

	const handleTermsOfService = () => {
		console.log('Navigate to terms of service');
		// TODO: Implement navigation to terms of service screen
	};

	const handlePrivacyPolicy = () => {
		console.log('Navigate to privacy policy');
		// TODO: Implement navigation to privacy policy screen
	};

	const handleHelp = () => {
		console.log('Navigate to help');
		// TODO: Implement navigation to help screen
	};

	const handleSignOut = () => {
		Alert.alert(t('settings.logout'), t('settings.logoutConfirmation'), [
			{ text: t('common.cancel'), style: 'cancel' },
			{
				text: t('settings.logout'),
				style: 'destructive',
				onPress: async () => {
					try {
						await signOut();
						router.replace('/auth/sign-in');
					} catch (error) {
						console.error('Sign out error:', error);
					}
				},
			},
		]);
	};

	const handleDeleteAccount = () => {
		Alert.alert(
			t('settings.deleteAccount'),
			t('settings.deleteAccountWarning'),
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: () => {
						// Second confirmation
						Alert.alert(
							t('settings.deleteAccountConfirmTitle'),
							t('settings.deleteAccountConfirmDescription'),
							[
								{ text: t('common.cancel'), style: 'cancel' },
								{
									text: t('settings.confirmDeletion'),
									style: 'destructive',
									onPress: () => console.log('Delete account confirmed'),
								},
							],
						);
					},
				},
			],
		);
	};

	const handleLanguageChange = async (language: Language) => {
		// Update language in local state immediately
		setLanguage(language);
		
		// Update in backend
		try {
			const success = await updateProfile({ language });
			if (!success) {
				console.error('Failed to update language in backend');
				// Could show a toast notification here if needed
			}
		} catch (error) {
			console.error('Error updating language:', error);
		}
	};

	const loadNotificationPreferences = async () => {
		if (!user?.id) return;

		try {
			const { data, error } = await NotificationService.getPreferences(user.id);
			if (data && !error) {
				setNotificationPreferences(data);
				setNotificationsEnabled(data.push_notifications_enabled);
			}
		} catch (error) {
			console.error('Error loading notification preferences:', error);
		}
	};

	const updateNotificationPreference = async (
		key: keyof NotificationPreferences,
		value: boolean,
	) => {
		if (!user?.id || !notificationPreferences) return;

		try {
			const { error } = await NotificationService.updatePreferences(user.id, {
				[key]: value,
			});

			if (!error) {
				setNotificationPreferences((prev) =>
					prev ? { ...prev, [key]: value } : null,
				);

				if (key === 'push_notifications_enabled') {
					setNotificationsEnabled(value);
				}
			}
		} catch (error) {
			console.error('Error updating notification preference:', error);
		}
	};

	useEffect(() => {
		loadNotificationPreferences();
	}, [user?.id]);

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.back()}
				>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<Text style={styles.title}>{t('navigation.settings')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Account Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						{t('settings.accountSettings')}
					</Text>

					<SettingsItem
						title={t('settings.editProfile')}
						subtitle={t('profile.editProfile')}
						icon="user"
						onPress={handleEditProfile}
					/>

					<SettingsItem
						title={t('settings.changePassword')}
						subtitle={t('settings.changePassword')}
						icon="lock"
						onPress={handleChangePassword}
					/>
				</View>

				{/* Preferences Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

					<LanguageSelector
						currentLanguage={user.language}
						onLanguageChange={handleLanguageChange}
					/>

					<SettingsItem
						title={t('settings.notifications')}
						subtitle={t('notifications.preferences.pushNotificationsSubtitle')}
						icon="bell"
						rightComponent={
							<Switch
								value={notificationsEnabled}
								onValueChange={(value) =>
									updateNotificationPreference(
										'push_notifications_enabled',
										value,
									)
								}
								trackColor={{
									false: Colors.textTertiary,
									true: Colors.primary,
								}}
								thumbColor={Colors.text}
							/>
						}
						showArrow={false}
					/>

					{/* Detailed notification preferences */}
					{notificationPreferences && (
						<>
							<SettingsItem
								title={t('notifications.preferences.videoLikes')}
								subtitle={t('notifications.preferences.videoLikesSubtitle')}
								icon="heart"
								rightComponent={
									<Switch
										value={notificationPreferences.video_likes_enabled}
										onValueChange={(value) =>
											updateNotificationPreference('video_likes_enabled', value)
										}
										trackColor={{
											false: Colors.textTertiary,
											true: Colors.primary,
										}}
										thumbColor={Colors.text}
									/>
								}
								showArrow={false}
							/>

							<SettingsItem
								title={t('notifications.preferences.newFollowers')}
								subtitle={t('notifications.preferences.newFollowersSubtitle')}
								icon="user-plus"
								rightComponent={
									<Switch
										value={notificationPreferences.new_followers_enabled}
										onValueChange={(value) =>
											updateNotificationPreference(
												'new_followers_enabled',
												value,
											)
										}
										trackColor={{
											false: Colors.textTertiary,
											true: Colors.primary,
										}}
										thumbColor={Colors.text}
									/>
								}
								showArrow={false}
							/>

							<SettingsItem
								title={t('notifications.preferences.commentLikes')}
								subtitle={t('notifications.preferences.commentLikesSubtitle')}
								icon="thumbs-up"
								rightComponent={
									<Switch
										value={notificationPreferences.comment_likes_enabled}
										onValueChange={(value) =>
											updateNotificationPreference(
												'comment_likes_enabled',
												value,
											)
										}
										trackColor={{
											false: Colors.textTertiary,
											true: Colors.primary,
										}}
										thumbColor={Colors.text}
									/>
								}
								showArrow={false}
							/>

							<SettingsItem
								title={t('notifications.preferences.videoComments')}
								subtitle={t('notifications.preferences.videoCommentsSubtitle')}
								icon="message-circle"
								rightComponent={
									<Switch
										value={notificationPreferences.video_comments_enabled}
										onValueChange={(value) =>
											updateNotificationPreference(
												'video_comments_enabled',
												value,
											)
										}
										trackColor={{
											false: Colors.textTertiary,
											true: Colors.primary,
										}}
										thumbColor={Colors.text}
									/>
								}
								showArrow={false}
							/>

							<SettingsItem
								title={t('notifications.preferences.commentReplies')}
								subtitle={t('notifications.preferences.commentRepliesSubtitle')}
								icon="corner-up-left"
								rightComponent={
									<Switch
										value={notificationPreferences.comment_replies_enabled}
										onValueChange={(value) =>
											updateNotificationPreference(
												'comment_replies_enabled',
												value,
											)
										}
										trackColor={{
											false: Colors.textTertiary,
											true: Colors.primary,
										}}
										thumbColor={Colors.text}
									/>
								}
								showArrow={false}
							/>
						</>
					)}

					<SettingsItem
						title={t('settings.darkMode')}
						subtitle={t('settings.darkModeSubtitle')}
						icon="moon"
						rightComponent={
							<Switch
								value={darkModeEnabled}
								onValueChange={setDarkModeEnabled}
								trackColor={{
									false: Colors.textTertiary,
									true: Colors.primary,
								}}
								thumbColor={Colors.text}
							/>
						}
						showArrow={false}
					/>
				</View>

				{/* Privacy Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>{t('settings.privacy')}</Text>

					<SettingsItem
						title={t('settings.privacySettings')}
						subtitle={t('settings.privacySettingsSubtitle')}
						icon="shield"
						onPress={handlePrivacySettings}
					/>

					<SettingsItem
						title={t('settings.blockedUsers')}
						subtitle={t('settings.blockedUsersSubtitle')}
						icon="user-x"
						onPress={handleBlockedUsers}
					/>

					<SettingsItem
						title={t('settings.downloadData')}
						subtitle={t('settings.downloadDataSubtitle')}
						icon="download"
						onPress={handleDownloadData}
					/>
				</View>

				{/* Support Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>{t('settings.support')}</Text>

					<SettingsItem
						title={t('settings.help')}
						subtitle={t('settings.helpSubtitle')}
						icon="help-circle"
						onPress={handleHelp}
					/>

					<SettingsItem
						title={t('settings.termsOfService')}
						subtitle={t('settings.termsOfServiceSubtitle')}
						icon="file-text"
						onPress={handleTermsOfService}
					/>

					<SettingsItem
						title={t('settings.privacyPolicy')}
						subtitle={t('settings.privacyPolicySubtitle')}
						icon="shield"
						onPress={handlePrivacyPolicy}
					/>
				</View>

				{/* App Info */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>{t('settings.application')}</Text>

					<SettingsItem
						title={t('settings.version')}
						subtitle="1.0.0"
						icon="info"
						showArrow={false}
					/>
				</View>

				{/* Danger Zone */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>

					<SettingsItem
						title={t('settings.logout')}
						subtitle={t('settings.logoutSubtitle')}
						icon="log-out"
						onPress={handleSignOut}
						destructive
					/>

					<SettingsItem
						title={t('settings.deleteAccount')}
						subtitle={t('settings.deleteAccountSubtitle')}
						icon="trash-2"
						onPress={handleDeleteAccount}
						destructive
					/>
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
	section: {
		marginTop: 24,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
		marginHorizontal: 16,
	},
	settingsItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	settingsItemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	settingsIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: Colors.premiumBackground,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	destructiveIcon: {
		backgroundColor: 'rgba(220, 53, 69, 0.1)',
	},
	settingsText: {
		flex: 1,
	},
	settingsTitle: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 2,
	},
	destructiveText: {
		color: Colors.error,
	},
	settingsSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	settingsItemRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	bottomSpacing: {
		height: 32,
	},
});
