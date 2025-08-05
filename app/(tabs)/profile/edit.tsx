import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
	Alert,
	Image,
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
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';

export default function EditProfileScreen() {
	const { t } = useTranslation();
	const { user, updateProfile } = useAuth();
	
	const [isLoading, setIsLoading] = useState(false);
	const [displayName, setDisplayName] = useState(user?.display_name || '');
	const [username, setUsername] = useState(user?.username || '');
	const [bio, setBio] = useState(user?.bio || '');
	const [subscriptionPrice, setSubscriptionPrice] = useState(
		user?.subscription_price?.toString() || ''
	);
	const [avatarUri, setAvatarUri] = useState<string | null>(null);

	if (!user) {
		router.replace('/auth/sign-in');
		return null;
	}

	const handleSave = async () => {
		if (!user) return;

		if (!displayName.trim() || !username.trim()) {
			Alert.alert(t('common.error'), t('profile.fieldsRequired'));
			return;
		}

		setIsLoading(true);

		try {
			const updateData = {
				display_name: displayName.trim(),
				username: username.trim(),
				bio: bio.trim(),
				subscription_price: subscriptionPrice ? parseFloat(subscriptionPrice) : 0,
			};

			// Use the auth store updateProfile function
			const success = await updateProfile(updateData);

			if (success) {
				Alert.alert(t('common.success'), t('profile.updateSuccess'), [
					{ text: t('common.ok'), onPress: () => router.push('/(tabs)/profile') }
				]);
			} else {
				Alert.alert(t('common.error'), t('profile.updateError'));
			}
		} catch (error) {
			console.error('Error updating profile:', error);
			Alert.alert(t('common.error'), t('profile.updateError'));
		} finally {
			setIsLoading(false);
		}
	};

	const handlePickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		
		if (status !== 'granted') {
			Alert.alert(t('profile.permissionNeeded'), t('profile.photoPermissionMessage'));
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]) {
			setAvatarUri(result.assets[0].uri);
			// TODO: Upload image to server
			Alert.alert(t('profile.comingSoon'), t('profile.avatarUploadSoon'));
		}
	};


	return (
		<SafeAreaView style={styles.container} edges={['top']}>
			<StatusBar style="light" />

			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.backButton}
					onPress={() => router.push('/(tabs)/profile')}
				>
					<Feather name="arrow-left" size={24} color={Colors.text} />
				</TouchableOpacity>
				<Text style={styles.title}>{t('profile.editProfile')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Avatar Section */}
				<View style={styles.avatarSection}>
					<TouchableOpacity style={styles.avatarContainer} onPress={handlePickImage}>
						<LinearGradient
							colors={Colors.gradientPrimary}
							style={styles.avatarGradient}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							{avatarUri || user.avatar_url ? (
								<Image 
									source={{ uri: avatarUri || user.avatar_url }} 
									style={styles.avatarImage}
									resizeMode="cover"
								/>
							) : (
								<Feather name="user" size={40} color={Colors.text} />
							)}
						</LinearGradient>
						<View style={styles.avatarEditIcon}>
							<Feather name="camera" size={16} color={Colors.text} />
						</View>
					</TouchableOpacity>
					<Text style={styles.avatarHint}>{t('profile.tapToChangePhoto')}</Text>
				</View>

				{/* Form Section */}
				<View style={styles.formSection}>
					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.displayName')} *</Text>
						<TextInput
							style={styles.input}
							value={displayName}
							onChangeText={setDisplayName}
							placeholder={t('profile.displayNamePlaceholder')}
							placeholderTextColor={Colors.textTertiary}
							maxLength={50}
						/>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.username')} *</Text>
						<TextInput
							style={styles.input}
							value={username}
							onChangeText={setUsername}
							placeholder={t('profile.usernamePlaceholder')}
							placeholderTextColor={Colors.textTertiary}
							autoCapitalize="none"
							maxLength={30}
						/>
						<Text style={styles.inputHint}>{t('profile.usernameHint')}</Text>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.bio')}</Text>
						<TextInput
							style={[styles.input, styles.textArea]}
							value={bio}
							onChangeText={setBio}
							placeholder={t('profile.bioPlaceholder')}
							placeholderTextColor={Colors.textTertiary}
							multiline
							numberOfLines={4}
							maxLength={200}
						/>
						<Text style={styles.inputHint}>{bio.length}/200 {t('profile.bioCharacterCount')}</Text>
					</View>

					<View style={styles.inputGroup}>
						<Text style={styles.label}>{t('profile.subscriptionPriceLabel')}</Text>
						<TextInput
							style={styles.input}
							value={subscriptionPrice}
							onChangeText={setSubscriptionPrice}
							placeholder={t('profile.subscriptionPricePlaceholder')}
							placeholderTextColor={Colors.textTertiary}
							keyboardType="decimal-pad"
						/>
						<Text style={styles.inputHint}>
							{t('profile.subscriptionPriceHint')}
						</Text>
					</View>
				</View>

				{/* Save Button */}
				<View style={styles.buttonSection}>
					<Button
						title={isLoading ? t('profile.saving') : t('profile.saveChanges')}
						onPress={handleSave}
						disabled={isLoading}
						style={styles.saveButton}
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
	avatarSection: {
		alignItems: 'center',
		paddingVertical: 32,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	avatarContainer: {
		position: 'relative',
		marginBottom: 12,
	},
	avatarGradient: {
		width: 100,
		height: 100,
		borderRadius: 50,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
	},
	avatarEditIcon: {
		position: 'absolute',
		bottom: 0,
		right: 0,
		backgroundColor: Colors.primary,
		borderRadius: 16,
		width: 32,
		height: 32,
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 3,
		borderColor: Colors.background,
	},
	avatarHint: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	formSection: {
		paddingHorizontal: 16,
		paddingTop: 24,
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
	input: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	textArea: {
		height: 100,
		textAlignVertical: 'top',
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
	saveButton: {
		width: '100%',
	},
	bottomSpacing: {
		height: 32,
	},
});