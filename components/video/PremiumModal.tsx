import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
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
import { PaymentService } from '@/services/paymentService';
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
	const [loading, setLoading] = useState(false);
	const [hasPaymentMethod, setHasPaymentMethod] = useState(false);

	useEffect(() => {
		if (isVisible) {
			checkPaymentMethods();
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

	const checkPaymentMethods = async () => {
		try {
			const response = await PaymentService.getPaymentMethods();
			if (response.success && response.data) {
				setHasPaymentMethod(response.data.length > 0);
			}
		} catch (error) {
			console.error('Error checking payment methods:', error);
			setHasPaymentMethod(false);
		}
	};

	const handleSubscribe = async () => {
		if (!hasPaymentMethod) {
			// Navigate to add payment method first
			onClose();
			// You might want to add navigation logic here
			return;
		}

		setLoading(true);
		try {
			await onSubscribe();
		} finally {
			setLoading(false);
		}
	};

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
							<MaterialCommunityIcons
								name="crown"
								size={16}
								color={Colors.text}
							/>
						</View>
					</View>

					<View style={styles.benefitsContainer}>
						<Text style={styles.benefitsTitle}>
							{t('video.subscribeToWatch')}
						</Text>
						<Text style={styles.benefitsSubtitle}>
							{t('video.subscriptionBenefits.supportCreator')}
						</Text>

						<View style={styles.benefitsList}>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									{t('video.subscriptionBenefits.accessPremium')}
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									{t('video.subscriptionBenefits.commentPremium')}
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="check" size={20} color={Colors.premium} />
								<Text style={styles.benefitText}>
									{t('video.subscriptionBenefits.supportCreator')}
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

					{!hasPaymentMethod ? (
						<TouchableOpacity
							style={styles.paymentMethodButton}
							onPress={handleSubscribe}
							activeOpacity={0.8}
							disabled={loading}
						>
							<View style={styles.paymentMethodContent}>
								{loading ? (
									<ActivityIndicator size="small" color={Colors.primary} />
								) : (
									<>
										<Feather
											name="credit-card"
											size={20}
											color={Colors.primary}
										/>
										<Text style={styles.paymentMethodText}>
											{t('subscriptions.addPaymentMethodFirst')}
										</Text>
									</>
								)}
							</View>
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={styles.subscribeButton}
							onPress={handleSubscribe}
							activeOpacity={0.8}
							disabled={loading}
						>
							<LinearGradient
								colors={Colors.gradientPrimary}
								style={styles.subscribeGradient}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 0 }}
							>
								{loading ? (
									<ActivityIndicator size="small" color={Colors.text} />
								) : (
									<>
										<MaterialCommunityIcons
											name="crown"
											size={20}
											color={Colors.text}
										/>
										<Text style={styles.subscribeText}>
											{t('video.subscribe')}
										</Text>
									</>
								)}
							</LinearGradient>
						</TouchableOpacity>
					)}

					<Text style={styles.disclaimer}>
						{t('subscriptions.confirmCancelMessage', {
							username: '',
							endDate: '',
						}).split('?')[1] || 'You can cancel anytime'}
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
		fontFamily: 'Raleway-SemiBold',
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
		fontFamily: 'Raleway-Bold',
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
	paymentMethodButton: {
		borderRadius: 8,
		borderWidth: 2,
		borderColor: Colors.primary,
		backgroundColor: Colors.backgroundSecondary,
		marginBottom: 16,
	},
	paymentMethodContent: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
		paddingVertical: 16,
		gap: 8,
	},
	paymentMethodText: {
		fontSize: 16,
		fontFamily: 'Inter-SemiBold',
		color: Colors.primary,
	},
	disclaimer: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
		textAlign: 'center',
	},
});
