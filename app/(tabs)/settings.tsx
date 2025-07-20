import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	Alert,
	ScrollView,
	StyleSheet,
	Switch,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
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
						color={destructive ? '#DC3545' : '#E1306C'}
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
					<Feather name="chevron-right" size={20} color="#6C757D" />
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
	const [isVisible, setIsVisible] = useState(false);

	const languages: { code: Language; name: string }[] = [
		{ code: 'es_ES', name: t('settings.languages.es_ES') },
		{ code: 'ca_ES', name: t('settings.languages.ca_ES') },
		{ code: 'fr_FR', name: t('settings.languages.fr_FR') },
		{ code: 'it_IT', name: t('settings.languages.it_IT') },
		{ code: 'en_US', name: t('settings.languages.en_US') },
		{ code: 'ja_JP', name: t('settings.languages.ja_JP') },
		{ code: 'zh_CN', name: t('settings.languages.zh_CN') },
		{ code: 'pt_PT', name: t('settings.languages.pt_PT') },
		{ code: 'th_TH', name: t('settings.languages.th_TH') },
		{ code: 'id_ID', name: t('settings.languages.id_ID') },
		{ code: 'ms_MY', name: t('settings.languages.ms_MY') },
	];

	const currentLanguageName =
		languages.find((lang) => lang.code === currentLanguage)?.name || 'Español';

	const handleLanguageSelect = (language: Language) => {
		onLanguageChange(language);
		setIsVisible(false);
	};

	if (isVisible) {
		return (
			<View style={styles.languageSelector}>
				<View style={styles.languageHeader}>
					<Text style={styles.languageTitle}>{t('settings.language')}</Text>
					<TouchableOpacity onPress={() => setIsVisible(false)}>
						<Feather name="x" size={24} color="#FFFFFF" />
					</TouchableOpacity>
				</View>
				<ScrollView style={styles.languageList}>
					{languages.map((language) => (
						<TouchableOpacity
							key={language.code}
							style={styles.languageOption}
							onPress={() => handleLanguageSelect(language.code)}
						>
							<Text
								style={[
									styles.languageOptionText,
									currentLanguage === language.code && styles.selectedLanguage,
								]}
							>
								{language.name}
							</Text>
							{currentLanguage === language.code && (
								<Feather name="check" size={20} color="#E1306C" />
							)}
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>
		);
	}

	return (
		<SettingsItem
			title={t('settings.language')}
			subtitle={currentLanguageName}
			icon="globe"
			onPress={() => setIsVisible(true)}
		/>
	);
};

export default function SettingsScreen() {
	const { t } = useTranslation();
	const { user, signOut } = useAuth();
	const setLanguage = useAuthStore((state) => state.setLanguage);

	// This hook will redirect to auth if user is not authenticated
	useRequireAuth();

	const [notificationsEnabled, setNotificationsEnabled] = useState(true);
	const [darkModeEnabled, setDarkModeEnabled] = useState(true);

	const handleEditProfile = () => {
		console.log('Navigate to edit profile');
		// TODO: Implement navigation to edit profile screen
	};

	const handleChangePassword = () => {
		console.log('Navigate to change password');
		// TODO: Implement navigation to change password screen
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
			'Descargar datos',
			'Te enviaremos un correo con todos tus datos en 24-48 horas.',
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
		Alert.alert(
			t('settings.logout'),
			'¿Estás seguro de que quieres cerrar sesión?',
			[
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
			],
		);
	};

	const handleDeleteAccount = () => {
		Alert.alert(
			t('settings.deleteAccount'),
			'Esta acción no se puede deshacer. Se eliminarán todos tus datos permanentemente.',
			[
				{ text: t('common.cancel'), style: 'cancel' },
				{
					text: t('common.delete'),
					style: 'destructive',
					onPress: () => {
						// Second confirmation
						Alert.alert(
							'¿Estás absolutamente seguro?',
							'Escribe "ELIMINAR" para confirmar la eliminación permanente de tu cuenta.',
							[
								{ text: t('common.cancel'), style: 'cancel' },
								{
									text: 'Confirmar eliminación',
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

	const handleLanguageChange = (language: Language) => {
		setLanguage(language);
		// TODO: Also update in backend if needed
	};

	if (!user) {
		return null; // useRequireAuth will handle redirect
	}

	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>{t('settings.accountSettings')}</Text>
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Account Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Cuenta</Text>

					<SettingsItem
						title={t('settings.editProfile')}
						subtitle="Nombre, bio, foto de perfil"
						icon="user"
						onPress={handleEditProfile}
					/>

					<SettingsItem
						title={t('settings.changePassword')}
						subtitle="Actualizar tu contraseña"
						icon="lock"
						onPress={handleChangePassword}
					/>
				</View>

				{/* Preferences Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Preferencias</Text>

					<LanguageSelector
						currentLanguage={user.language}
						onLanguageChange={handleLanguageChange}
					/>

					<SettingsItem
						title={t('settings.notifications')}
						subtitle="Gestionar notificaciones"
						icon="bell"
						onPress={handleNotificationSettings}
						rightComponent={
							<Switch
								value={notificationsEnabled}
								onValueChange={setNotificationsEnabled}
								trackColor={{ false: '#6C757D', true: '#E1306C' }}
								thumbColor="#FFFFFF"
							/>
						}
						showArrow={false}
					/>

					<SettingsItem
						title="Modo oscuro"
						subtitle="Tema de la aplicación"
						icon="moon"
						rightComponent={
							<Switch
								value={darkModeEnabled}
								onValueChange={setDarkModeEnabled}
								trackColor={{ false: '#6C757D', true: '#E1306C' }}
								thumbColor="#FFFFFF"
							/>
						}
						showArrow={false}
					/>
				</View>

				{/* Privacy Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>{t('settings.privacy')}</Text>

					<SettingsItem
						title="Configuración de privacidad"
						subtitle="Controla quien puede verte"
						icon="shield"
						onPress={handlePrivacySettings}
					/>

					<SettingsItem
						title={t('settings.blockedUsers')}
						subtitle="Usuarios que has bloqueado"
						icon="user-x"
						onPress={handleBlockedUsers}
					/>

					<SettingsItem
						title={t('settings.downloadData')}
						subtitle="Descargar una copia de tus datos"
						icon="download"
						onPress={handleDownloadData}
					/>
				</View>

				{/* Support Section */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Soporte</Text>

					<SettingsItem
						title={t('settings.help')}
						subtitle="Centro de ayuda y FAQ"
						icon="help-circle"
						onPress={handleHelp}
					/>

					<SettingsItem
						title={t('settings.termsOfService')}
						subtitle="Términos y condiciones"
						icon="file-text"
						onPress={handleTermsOfService}
					/>

					<SettingsItem
						title={t('settings.privacyPolicy')}
						subtitle="Política de privacidad"
						icon="shield"
						onPress={handlePrivacyPolicy}
					/>
				</View>

				{/* App Info */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Aplicación</Text>

					<SettingsItem
						title={t('settings.version')}
						subtitle="1.0.0"
						icon="info"
						showArrow={false}
					/>
				</View>

				{/* Danger Zone */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Zona de peligro</Text>

					<SettingsItem
						title={t('settings.logout')}
						subtitle="Cerrar sesión en este dispositivo"
						icon="log-out"
						onPress={handleSignOut}
						destructive
					/>

					<SettingsItem
						title={t('settings.deleteAccount')}
						subtitle="Eliminar permanentemente tu cuenta"
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
		backgroundColor: '#000000',
	},
	header: {
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: '#000000',
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	title: {
		fontSize: 24,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#FFFFFF',
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
		color: '#FFFFFF',
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
		borderBottomColor: '#1C1C1E',
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
		backgroundColor: 'rgba(225, 48, 108, 0.1)',
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
		color: '#FFFFFF',
		marginBottom: 2,
	},
	destructiveText: {
		color: '#DC3545',
	},
	settingsSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: '#6C757D',
	},
	settingsItemRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	languageSelector: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: '#000000',
		zIndex: 1000,
	},
	languageHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	languageTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		fontWeight: '600',
		color: '#FFFFFF',
	},
	languageList: {
		flex: 1,
	},
	languageOption: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#1C1C1E',
	},
	languageOptionText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: '#FFFFFF',
	},
	selectedLanguage: {
		color: '#E1306C',
	},
	bottomSpacing: {
		height: 32,
	},
});
