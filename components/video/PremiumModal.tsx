import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import {
	Animated,
	Dimensions,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Colors } from '@/constants/Colors';
import { useTranslation } from '@/hooks/useTranslation';
import { Video as VideoType } from '@/shared/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PremiumModalProps {
	isVisible: boolean;
	video: VideoType;
	onClose: () => void;
	onSubscribe: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
	isVisible,
	video,
	onClose,
	onSubscribe,
}) => {
	const { t } = useTranslation();
	const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

	useEffect(() => {
		if (isVisible) {
			Animated.spring(slideAnim, {
				toValue: 0,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		} else {
			Animated.spring(slideAnim, {
				toValue: SCREEN_HEIGHT,
				useNativeDriver: true,
				tension: 100,
				friction: 8,
			}).start();
		}
	}, [isVisible, slideAnim]);

	if (!isVisible) return null;

	return (
		<View style={styles.modalOverlay}>
			<Pressable style={styles.modalBackdrop} onPress={onClose} />
			<Animated.View
				style={[
					styles.modalContainer,
					{ transform: [{ translateY: slideAnim }] },
				]}
			>
				<View style={styles.modalHeader}>
					<View style={styles.modalHandle} />
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather name="x" size={24} color={Colors.text} />
					</TouchableOpacity>
				</View>

				<View style={styles.modalContent}>
					<View style={styles.creatorHeader}>
						<View style={styles.creatorAvatar}>
							<Feather name="user" size={24} color={Colors.text} />
						</View>
						<View style={styles.creatorInfo}>
							<Text style={styles.creatorName}>
								{video.user?.display_name || video.user?.username}
							</Text>
							<Text style={styles.creatorUsername}>
								@{video.user?.username}
							</Text>
						</View>
						<View style={styles.premiumBadge}>
							<Feather name="star" size={16} color={Colors.text} />
						</View>
					</View>

					<View style={styles.benefitsContainer}>
						<Text style={styles.benefitsTitle}>
							{t('video.subscribeToWatch')}
						</Text>
						<Text style={styles.benefitsSubtitle}>
							Suscríbete para disfrutar de todo el contenido premium
						</Text>

						<View style={styles.benefitsList}>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Acceso a todos los videos premium
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Comentar en contenido exclusivo
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Apoyar directamente al creador
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									Disfrutar de contenido de mayor calidad
								</Text>
							</View>
						</View>
					</View>

					<View style={styles.priceContainer}>
						<Text style={styles.priceAmount}>
							€{video.user?.subscription_price || 4.99}
						</Text>
						<Text style={styles.pricePeriod}>/mes</Text>
					</View>

					<TouchableOpacity
						style={styles.subscribeButton}
						onPress={onSubscribe}
						activeOpacity={0.8}
					>
						<LinearGradient
							colors={Colors.gradientPrimary}
							style={styles.subscribeGradient}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
						>
							<Feather name="star" size={20} color={Colors.text} />
							<Text style={styles.subscribeText}>{t('video.subscribe')}</Text>
						</LinearGradient>
					</TouchableOpacity>

					<Text style={styles.disclaimer}>
						Puedes cancelar en cualquier momento
					</Text>
				</View>
			</Animated.View>
		</View>
	);
};

const styles = StyleSheet.create({
	modalOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: Colors.modalOverlay,
		justifyContent: 'flex-end',
		zIndex: 1000,
	},
	modalBackdrop: {
		...StyleSheet.absoluteFillObject,
	},
	modalContainer: {
		backgroundColor: Colors.modalBackground,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		maxHeight: SCREEN_HEIGHT * 0.8,
	},
	modalHeader: {
		alignItems: 'center',
		paddingTop: 12,
		paddingHorizontal: 16,
		position: 'relative',
	},
	modalHandle: {
		width: 40,
		height: 4,
		backgroundColor: Colors.textTertiary,
		borderRadius: 2,
		marginBottom: 16,
	},
	closeButton: {
		position: 'absolute',
		right: 16,
		top: 16,
		padding: 4,
	},
	modalContent: {
		paddingHorizontal: 24,
		paddingBottom: 32,
	},
	creatorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	creatorAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.backgroundSecondary,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	creatorInfo: {
		flex: 1,
	},
	creatorName: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
		marginBottom: 2,
	},
	creatorUsername: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	premiumBadge: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: Colors.premium,
		justifyContent: 'center',
		alignItems: 'center',
	},
	benefitsContainer: {
		marginBottom: 24,
	},
	benefitsTitle: {
		fontSize: 20,
		fontFamily: 'Poppins-SemiBold',
		color: Colors.text,
		marginBottom: 8,
		textAlign: 'center',
	},
	benefitsSubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 20,
		textAlign: 'center',
	},
	benefitsList: {
		gap: 12,
	},
	benefitItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	benefitText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		flex: 1,
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		justifyContent: 'center',
		marginBottom: 24,
	},
	priceAmount: {
		fontSize: 32,
		fontFamily: 'Poppins-Bold',
		color: Colors.premium,
	},
	pricePeriod: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.premium,
		marginLeft: 4,
	},
	subscribeButton: {
		borderRadius: 8,
		overflow: 'hidden',
		marginBottom: 16,
	},
	subscribeGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 16,
		gap: 8,
	},
	subscribeText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.text,
	},
	disclaimer: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'center',
	},
});
