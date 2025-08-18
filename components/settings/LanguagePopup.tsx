import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
	Animated,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { Language } from '@/shared/types';

interface LanguageOption {
	code: Language;
	name: string;
}

interface LanguagePopupProps {
	isVisible: boolean;
	currentLanguage: Language;
	onClose: () => void;
	onLanguageSelect: (language: Language) => void;
	anchorRef: React.RefObject<View>;
}

export const LanguagePopup: React.FC<LanguagePopupProps> = ({
	isVisible,
	currentLanguage,
	onClose,
	onLanguageSelect,
	anchorRef,
}) => {
	const { t } = useTranslation();
	const scaleAnim = useRef(new Animated.Value(0)).current;
	const fadeAnim = useRef(new Animated.Value(0)).current;
	const [popupPosition, setPopupPosition] = useState({
		top: 0,
		left: 0,
		width: 0,
	});

	const languages: LanguageOption[] = [
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

	useEffect(() => {
		if (isVisible) {
			// Measure anchor position when popup becomes visible
			if (anchorRef.current) {
				anchorRef.current.measureInWindow((x, y, width, height) => {
					setPopupPosition({
						top: y + height + 8, // 8px spacing below anchor
						left: x,
						width: width,
					});
				});
			}

			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 200,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					tension: 300,
					friction: 20,
				}),
			]).start();
		} else {
			Animated.parallel([
				Animated.timing(fadeAnim, {
					toValue: 0,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.spring(scaleAnim, {
					toValue: 0,
					useNativeDriver: true,
					tension: 300,
					friction: 20,
				}),
			]).start();
		}
	}, [isVisible, fadeAnim, scaleAnim, anchorRef]);

	const handleLanguagePress = (language: Language) => {
		onLanguageSelect(language);
		onClose();
	};

	if (!isVisible) return null;

	return (
		<>
			{/* Backdrop */}
			<Pressable style={styles.backdrop} onPress={onClose} />

			{/* Popup */}
			<Animated.View
				style={[
					styles.popup,
					{
						top: popupPosition.top,
						left: popupPosition.left,
						minWidth: Math.max(popupPosition.width, 280),
						opacity: fadeAnim,
						transform: [
							{ scale: scaleAnim },
							{
								translateY: scaleAnim.interpolate({
									inputRange: [0, 1],
									outputRange: [-10, 0],
								}),
							},
						],
					},
				]}
			>
				{/* Header */}
				<View style={styles.header}>
					<View style={styles.headerLeft}>
						<LinearGradient
							colors={Colors.gradientPrimary}
							style={styles.headerIcon}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							<Feather name="globe" size={16} color={Colors.text} />
						</LinearGradient>
						<Text style={styles.headerTitle}>
							{t('settings.selectLanguage')}
						</Text>
					</View>
				</View>

				{/* Languages List */}
				<ScrollView
					style={styles.languagesList}
					showsVerticalScrollIndicator={false}
					nestedScrollEnabled={true}
				>
					{languages.map((language, index) => {
						const isSelected = currentLanguage === language.code;
						const isLast = index === languages.length - 1;

						return (
							<TouchableOpacity
								key={language.code}
								style={[
									styles.languageItem,
									isSelected && styles.selectedLanguageItem,
									!isLast && styles.languageItemBorder,
								]}
								onPress={() => handleLanguagePress(language.code)}
								activeOpacity={0.7}
							>
								<Text
									style={[
										styles.languageName,
										isSelected && styles.selectedLanguageName,
									]}
								>
									{language.name}
								</Text>

								{isSelected && (
									<LinearGradient
										colors={Colors.gradientPrimary}
										style={styles.checkIconContainer}
										start={{ x: 0, y: 0 }}
										end={{ x: 1, y: 0 }}
									>
										<Feather name="check" size={14} color={Colors.text} />
									</LinearGradient>
								)}
							</TouchableOpacity>
						);
					})}
				</ScrollView>

				{/* Arrow pointing up to anchor */}
				<View
					style={[
						styles.arrow,
						{ left: Math.min(16, popupPosition.width / 2 - 8) },
					]}
				/>
			</Animated.View>
		</>
	);
};

const styles = StyleSheet.create({
	backdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 999,
	},
	popup: {
		position: 'absolute',
		zIndex: 1000,
		backgroundColor: Colors.modalBackground,
		borderRadius: 16,
		maxHeight: 320,
		minWidth: 280,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 8 },
		shadowOpacity: 0.25,
		shadowRadius: 16,
		elevation: 16,
	},
	arrow: {
		position: 'absolute',
		top: -6,
		width: 12,
		height: 12,
		backgroundColor: Colors.modalBackground,
		transform: [{ rotate: '45deg' }],
		borderTopWidth: 1,
		borderLeftWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	headerIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	headerTitle: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		flex: 1,
	},
	languagesList: {
		maxHeight: 240,
	},
	languageItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 16,
		minHeight: 44,
	},
	languageItemBorder: {
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	selectedLanguageItem: {
		backgroundColor: Colors.background,
	},
	languageName: {
		fontSize: 15,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		flex: 1,
	},
	selectedLanguageName: {
		color: Colors.primary,
		fontFamily: 'Inter-SemiBold',
	},
	checkIconContainer: {
		width: 24,
		height: 24,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
