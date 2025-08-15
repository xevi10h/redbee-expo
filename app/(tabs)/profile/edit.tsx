import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
	Alert,
	Dimensions,
	Image,
	PanResponder,
	ScrollView,
	StyleSheet,
	Switch,
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

// Sistema de precios recomendados por idioma/país
type PricingData = {
	price: number;
	currency: string;
	currencySymbol: string;
	minPrice: number;
	maxPrice: number;
};

const RECOMMENDED_PRICING: Record<string, PricingData> = {
	es: {
		price: 3.95,
		currency: 'EUR',
		currencySymbol: '€',
		minPrice: 1.99,
		maxPrice: 9.99,
	},
	en: {
		price: 4.95,
		currency: 'USD',
		currencySymbol: '$',
		minPrice: 2.99,
		maxPrice: 12.99,
	},
	fr: {
		price: 3.95,
		currency: 'EUR',
		currencySymbol: '€',
		minPrice: 1.99,
		maxPrice: 9.99,
	},
	de: {
		price: 3.95,
		currency: 'EUR',
		currencySymbol: '€',
		minPrice: 1.99,
		maxPrice: 9.99,
	},
	it: {
		price: 3.95,
		currency: 'EUR',
		currencySymbol: '€',
		minPrice: 1.99,
		maxPrice: 9.99,
	},
	pt: {
		price: 18.99,
		currency: 'BRL',
		currencySymbol: 'R$',
		minPrice: 9.99,
		maxPrice: 39.99,
	},
	ja: {
		price: 690,
		currency: 'JPY',
		currencySymbol: '¥',
		minPrice: 299,
		maxPrice: 1299,
	},
	zh: {
		price: 32.95,
		currency: 'CNY',
		currencySymbol: '¥',
		minPrice: 15.99,
		maxPrice: 79.99,
	},
	ko: {
		price: 5900,
		currency: 'KRW',
		currencySymbol: '₩',
		minPrice: 2900,
		maxPrice: 14900,
	},
	ar: {
		price: 1299,
		currency: 'ARS',
		currencySymbol: '$',
		minPrice: 699,
		maxPrice: 2999,
	},
	mx: {
		price: 89.95,
		currency: 'MXN',
		currencySymbol: '$',
		minPrice: 49.99,
		maxPrice: 199.99,
	},
};

const getRecommendedPricing = (locale: string): PricingData => {
	const languageCode = locale.split('-')[0].toLowerCase();
	return RECOMMENDED_PRICING[languageCode] || RECOMMENDED_PRICING['en'];
};

// Drag-responsive Slider with real-time feedback
const CustomSlider = ({
	value,
	minimumValue,
	maximumValue,
	onValueChange,
	step = 0.01,
}: {
	value: number;
	minimumValue: number;
	maximumValue: number;
	onValueChange: (value: number) => void;
	step?: number;
}) => {
	const sliderWidth = Dimensions.get('window').width - 80;
	const [isDragging, setIsDragging] = useState(false);
	const [dragValue, setDragValue] = useState(value);

	// Update drag value when prop value changes (and not dragging)
	useEffect(() => {
		if (!isDragging) {
			setDragValue(value);
		}
	}, [value, isDragging]);

	// Calculate percentage from value
	const getPercentage = (val: number): number => {
		if (maximumValue <= minimumValue) return 0;
		const percentage = (val - minimumValue) / (maximumValue - minimumValue);
		return Math.max(0, Math.min(1, percentage));
	};

	// Convert x position to value
	const getValueFromX = (x: number): number => {
		const clampedX = Math.max(0, Math.min(sliderWidth, x));
		const percentage = clampedX / sliderWidth;
		const rawValue = minimumValue + percentage * (maximumValue - minimumValue);
		const steppedValue = Math.round(rawValue / step) * step;
		return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
	};

	// PanResponder for drag gestures
	const panResponder = PanResponder.create({
		onStartShouldSetPanResponder: () => true,
		onMoveShouldSetPanResponder: () => true,

		onPanResponderGrant: (event) => {
			setIsDragging(true);
			const newValue = getValueFromX(event.nativeEvent.locationX);
			setDragValue(newValue);
			onValueChange(newValue);
		},

		onPanResponderMove: (event, gestureState) => {
			const newValue = getValueFromX(event.nativeEvent.locationX);
			setDragValue(newValue);
			onValueChange(newValue);
		},

		onPanResponderRelease: () => {
			setIsDragging(false);
		},

		onPanResponderTerminate: () => {
			setIsDragging(false);
		},
	});

	// Use drag value for visual feedback during drag, prop value otherwise
	const displayValue = isDragging ? dragValue : value;
	const currentPercentage = getPercentage(displayValue);
	const thumbPosition = currentPercentage * sliderWidth;
	const activeTrackWidth = currentPercentage * sliderWidth;

	return (
		<View style={customSliderStyles.container}>
			{/* Background track */}
			<View style={customSliderStyles.track} />

			{/* Active track */}
			<View
				style={[customSliderStyles.activeTrack, { width: activeTrackWidth }]}
			/>

			{/* Thumb with PanResponder */}
			<View
				{...panResponder.panHandlers}
				style={[
					customSliderStyles.thumb,
					{
						left: thumbPosition - 10,
						transform: isDragging ? [{ scale: 1.1 }] : [{ scale: 1 }],
					},
				]}
			/>

			{/* Invisible touch area for better interaction */}
			<View
				{...panResponder.panHandlers}
				style={customSliderStyles.touchArea}
			/>
		</View>
	);
};

const customSliderStyles = StyleSheet.create({
	container: {
		height: 40,
		justifyContent: 'center',
		position: 'relative',
	},
	track: {
		height: 4,
		backgroundColor: Colors.borderSecondary,
		borderRadius: 2,
		position: 'absolute',
		left: 0,
		right: 0,
	},
	activeTrack: {
		height: 4,
		backgroundColor: Colors.primary,
		borderRadius: 2,
		position: 'absolute',
		left: 0,
	},
	touchArea: {
		height: 40,
		position: 'absolute',
		left: 0,
		right: 0,
	},
	thumb: {
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: Colors.primary,
		position: 'absolute',
		top: 10,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		borderWidth: 2,
		borderColor: Colors.text,
	},
});

export default function EditProfileScreen() {
	const { t } = useTranslation();
	const { user, updateProfile } = useAuth();

	const [isLoading, setIsLoading] = useState(false);
	const [displayName, setDisplayName] = useState(user?.display_name || '');
	const [username, setUsername] = useState(user?.username || '');
	const [bio, setBio] = useState(user?.bio || '');
	const [avatarUri, setAvatarUri] = useState<string | null>(null);
	const [hasPremiumContent, setHasPremiumContent] = useState(
		user?.has_premium_content || false,
	);
	const [subscriptionPrice, setSubscriptionPrice] = useState(0);
	const [subscriptionCurrency, setSubscriptionCurrency] = useState('EUR');
	const [pricingData, setPricingData] = useState<PricingData>(
		RECOMMENDED_PRICING['es'],
	);

	// Initialize pricing based on user's locale
	useEffect(() => {
		if (!user) return;

		const locale = 'es-ES'; // You can get this from user preferences or device locale
		const pricing = getRecommendedPricing(locale);
		setPricingData(pricing);
		setSubscriptionCurrency(pricing.currency);

		// Set initial price from user data or recommended price
		// Use recommended price if user price is 0 or undefined
		const userPrice = user.subscription_price;
		const initialPrice = userPrice && userPrice > 0 ? userPrice : pricing.price;

		console.log('Initializing price:', {
			userPrice,
			recommendedPrice: pricing.price,
			initialPrice,
		});
		setSubscriptionPrice(initialPrice);
	}, [user]);

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
				has_premium_content: hasPremiumContent,
				subscription_price: hasPremiumContent ? subscriptionPrice : 0,
				subscription_currency: subscriptionCurrency,
				// Only include avatar_url if a new image was selected
				...(avatarUri && { avatar_url: avatarUri }),
			};

			// Use the auth store updateProfile function
			const success = await updateProfile(updateData);

			if (success) {
				// Navigate directly to profile without alert
				router.replace('/(tabs)/profile');
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
			Alert.alert(
				t('profile.permissionNeeded'),
				t('profile.photoPermissionMessage'),
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]) {
			setAvatarUri(result.assets[0].uri);
			// Image will be uploaded when saving the profile
		}
	};

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
				<Text style={styles.title}>{t('profile.editProfile')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Avatar Section */}
				<View style={styles.avatarSection}>
					<TouchableOpacity
						style={styles.avatarContainer}
						onPress={handlePickImage}
					>
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
						<Text style={styles.inputHint}>
							{bio.length}/200 {t('profile.bioCharacterCount')}
						</Text>
					</View>

					{/* Premium Content Toggle */}
					<View style={styles.inputGroup}>
						<Text style={styles.label}>Contenido Premium</Text>
						<View style={styles.switchContainer}>
							<View style={styles.switchInfo}>
								<MaterialCommunityIcons
									name="crown"
									size={24}
									color={Colors.primary}
								/>
								<View style={styles.switchTextContainer}>
									<Text style={styles.switchTitle}>
										Ofrecer contenido exclusivo
									</Text>
									<Text style={styles.switchSubtitle}>
										Permite a tus seguidores suscribirse para acceder a
										contenido premium
									</Text>
								</View>
							</View>
							<Switch
								value={hasPremiumContent}
								onValueChange={setHasPremiumContent}
								trackColor={{
									false: Colors.borderSecondary,
									true: Colors.primary,
								}}
								thumbColor={Colors.text}
								ios_backgroundColor={Colors.borderSecondary}
							/>
						</View>
					</View>

					{/* Precio de suscripción - Solo visible si Premium está activado */}
					{hasPremiumContent && (
						<View style={styles.inputGroup}>
							<Text style={styles.label}>Precio de suscripción mensual</Text>
							<View style={styles.priceSliderContainer}>
								<View style={styles.priceDisplayContainer}>
									<Text style={styles.currentPrice}>
										{pricingData.currencySymbol}
										{subscriptionPrice.toFixed(2)}
									</Text>
									<Text style={styles.currentCurrency}>
										{pricingData.currency} / mes
									</Text>
								</View>
								<View style={styles.recommendedPriceContainer}>
									<View style={styles.recommendedBadge}>
										<MaterialCommunityIcons
											name="crown"
											size={12}
											color={Colors.primary}
										/>
										<Text style={styles.recommendedText}>Recomendado</Text>
									</View>
									<Text style={styles.recommendedPrice}>
										{pricingData.currencySymbol}
										{pricingData.price.toFixed(2)}
									</Text>
								</View>
								<CustomSlider
									minimumValue={pricingData.minPrice}
									maximumValue={pricingData.maxPrice}
									value={subscriptionPrice}
									onValueChange={setSubscriptionPrice}
									step={0.01}
								/>
								<View style={styles.priceRangeContainer}>
									<Text style={styles.priceRangeText}>
										{pricingData.currencySymbol}
										{pricingData.minPrice.toFixed(2)}
									</Text>
									<TouchableOpacity
										style={styles.useRecommendedButton}
										onPress={() => setSubscriptionPrice(pricingData.price)}
									>
										<Text style={styles.useRecommendedText}>
											Usar recomendado
										</Text>
									</TouchableOpacity>
									<Text style={styles.priceRangeText}>
										{pricingData.currencySymbol}
										{pricingData.maxPrice.toFixed(2)}
									</Text>
								</View>
							</View>
							<Text style={styles.inputHint}>
								Precio recomendado basado en tu audiencia y región. Puedes
								ajustarlo según tus preferencias.
							</Text>
						</View>
					)}
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
		fontFamily: 'Raleway-SemiBold',
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
	priceSliderContainer: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	priceDisplayContainer: {
		alignItems: 'center',
		marginBottom: 16,
	},
	currentPrice: {
		fontSize: 28,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.primary,
	},
	currentCurrency: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginTop: 4,
	},
	recommendedPriceContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
		paddingHorizontal: 8,
	},
	recommendedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: Colors.primaryDark,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 4,
	},
	recommendedText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
	},
	recommendedPrice: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.textSecondary,
	},
	priceRangeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 8,
	},
	priceRangeText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	useRecommendedButton: {
		backgroundColor: Colors.primary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
	},
	useRecommendedText: {
		fontSize: 12,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	switchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	switchInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 16,
	},
	switchTextContainer: {
		marginLeft: 12,
		flex: 1,
	},
	switchTitle: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 4,
	},
	switchSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		lineHeight: 18,
	},
});
