import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
	Alert,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { PaymentService } from '@/services/paymentService';
import {
	PaymentMethod,
	SubscriptionService,
} from '@/services/subscriptionService';
import { formatCurrency } from '@/shared/functions/utils';

interface PaymentMethodSelectionModalProps {
	visible: boolean;
	onClose: () => void;
	onConfirm: (paymentMethodId?: string) => void;
	creatorName: string;
	price: number;
	currency: string;
	loading?: boolean;
}

export const PaymentMethodSelectionModal: React.FC<
	PaymentMethodSelectionModalProps
> = ({
	visible,
	onClose,
	onConfirm,
	creatorName,
	price,
	currency,
	loading,
}) => {
	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
		string | null
	>(null);
	const [loadingMethods, setLoadingMethods] = useState(false);
	const [addingPaymentMethod, setAddingPaymentMethod] = useState(false);

	// Load payment methods when modal opens
	useEffect(() => {
		if (visible) {
			loadPaymentMethods();
		}
	}, [visible]);

	const loadPaymentMethods = async () => {
		setLoadingMethods(true);
		try {
			const result =
				await SubscriptionService.getPaymentMethodsForSubscription();
			if (result.success && result.data) {
				setPaymentMethods(result.data);

				// Auto-select default payment method if available
				const defaultMethod = result.data.find((pm) => pm.is_default);
				if (defaultMethod) {
					setSelectedPaymentMethodId(defaultMethod.stripe_payment_method_id);
				} else if (result.data.length > 0) {
					setSelectedPaymentMethodId(result.data[0].stripe_payment_method_id);
				}
			} else {
				console.error('Failed to load payment methods:', result.error);
			}
		} catch (error) {
			console.error('Error loading payment methods:', error);
		} finally {
			setLoadingMethods(false);
		}
	};

	const handleAddPaymentMethod = async () => {
		setAddingPaymentMethod(true);
		try {
			const result = await PaymentService.addPaymentMethod();
			if (result.success && result.data) {
				// Reload payment methods
				await loadPaymentMethods();
				// Select the newly added payment method
				setSelectedPaymentMethodId(result.data.stripe_payment_method_id);
			} else {
				Alert.alert('Error', result.error || 'Failed to add payment method');
			}
		} catch (error) {
			Alert.alert('Error', 'Failed to add payment method');
		} finally {
			setAddingPaymentMethod(false);
		}
	};

	const handleConfirm = () => {
		if (!selectedPaymentMethodId && paymentMethods.length > 0) {
			Alert.alert('Error', 'Please select a payment method');
			return;
		}
		onConfirm(selectedPaymentMethodId || undefined);
	};

	const getCardIcon = (brand?: string): 'credit-card' => {
		switch (brand?.toLowerCase()) {
			case 'visa':
				return 'credit-card';
			case 'mastercard':
				return 'credit-card';
			case 'amex':
				return 'credit-card';
			default:
				return 'credit-card';
		}
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={onClose}
		>
			<View style={styles.container}>
				{/* Header */}
				<View style={styles.header}>
					<TouchableOpacity onPress={onClose} style={styles.closeButton}>
						<Feather name="x" size={24} color={Colors.text} />
					</TouchableOpacity>
					<Text style={styles.title}>Suscribirse a {creatorName}</Text>
					<View style={styles.placeholder} />
				</View>

				{/* Content */}
				<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
					{/* Price Info */}
					<View style={styles.priceContainer}>
						<Text style={styles.priceLabel}>Precio mensual</Text>
						<Text style={styles.priceAmount}>
							{formatCurrency(price, currency)}/mes
						</Text>
						<Text style={styles.priceDescription}>
							Acceso completo a todo el contenido premium de {creatorName}
						</Text>
					</View>

					{/* Payment Methods */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Método de pago</Text>

						{loadingMethods ? (
							<View style={styles.loadingContainer}>
								<Text style={styles.loadingText}>
									Cargando métodos de pago...
								</Text>
							</View>
						) : paymentMethods.length === 0 ? (
							<View style={styles.emptyContainer}>
								<Feather
									name="credit-card"
									size={48}
									color={Colors.textTertiary}
								/>
								<Text style={styles.emptyTitle}>No hay métodos de pago</Text>
								<Text style={styles.emptyDescription}>
									Añade un método de pago para continuar
								</Text>
							</View>
						) : (
							<>
								{paymentMethods.map((paymentMethod) => (
									<TouchableOpacity
										key={paymentMethod.id}
										style={[
											styles.paymentMethodItem,
											selectedPaymentMethodId ===
												paymentMethod.stripe_payment_method_id &&
												styles.selectedPaymentMethod,
										]}
										onPress={() =>
											setSelectedPaymentMethodId(
												paymentMethod.stripe_payment_method_id,
											)
										}
									>
										<View style={styles.paymentMethodInfo}>
											<View style={styles.cardIconContainer}>
												<Feather
													name={getCardIcon(paymentMethod.card_brand)}
													size={20}
													color={Colors.text}
												/>
											</View>
											<View style={styles.cardDetails}>
												<Text style={styles.cardBrand}>
													{paymentMethod.card_brand?.toUpperCase()} ••••{' '}
													{paymentMethod.card_last4}
												</Text>
												<Text style={styles.cardExpiry}>
													{paymentMethod.card_exp_month
														?.toString()
														.padStart(2, '0')}
													/{paymentMethod.card_exp_year?.toString().slice(-2)}
												</Text>
											</View>
											{paymentMethod.is_default && (
												<View style={styles.defaultBadge}>
													<Text style={styles.defaultText}>Principal</Text>
												</View>
											)}
										</View>
										<View style={styles.radioButton}>
											{selectedPaymentMethodId ===
												paymentMethod.stripe_payment_method_id && (
												<View style={styles.radioButtonSelected} />
											)}
										</View>
									</TouchableOpacity>
								))}
							</>
						)}

						{/* Add Payment Method Button */}
						<TouchableOpacity
							style={styles.addPaymentMethodButton}
							onPress={handleAddPaymentMethod}
							disabled={addingPaymentMethod}
						>
							<Feather name="plus" size={20} color={Colors.primary} />
							<Text style={styles.addPaymentMethodText}>
								{addingPaymentMethod ? 'Añadiendo...' : 'Añadir método de pago'}
							</Text>
						</TouchableOpacity>
					</View>

					{/* Benefits */}
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>Beneficios incluidos</Text>
						<View style={styles.benefitsList}>
							<View style={styles.benefitItem}>
								<MaterialCommunityIcons
									name="crown"
									size={20}
									color={Colors.primary}
								/>
								<Text style={styles.benefitText}>
									Acceso a todo el contenido premium
								</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="video" size={20} color={Colors.primary} />
								<Text style={styles.benefitText}>Videos exclusivos</Text>
							</View>
							<View style={styles.benefitItem}>
								<Feather name="x" size={20} color={Colors.primary} />
								<Text style={styles.benefitText}>Cancela cuando quieras</Text>
							</View>
						</View>
					</View>
				</ScrollView>

				{/* Footer */}
				<View style={styles.footer}>
					<Button
						title={loading ? 'Procesando...' : 'Suscribirse'}
						onPress={handleConfirm}
						disabled={
							loading ||
							loadingMethods ||
							(!selectedPaymentMethodId && paymentMethods.length > 0)
						}
						style={styles.subscribeButton}
					/>
					<Text style={styles.footerText}>
						Se cobrará {formatCurrency(price, currency)} cada mes. Puedes
						cancelar en cualquier momento.
					</Text>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	closeButton: {
		padding: 4,
	},
	title: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	placeholder: {
		width: 32,
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
	},
	priceContainer: {
		alignItems: 'center',
		paddingVertical: 32,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
		marginBottom: 24,
	},
	priceLabel: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 8,
	},
	priceAmount: {
		fontSize: 32,
		fontFamily: 'Raleway-Bold',
		fontWeight: 'bold',
		color: Colors.text,
		marginBottom: 8,
	},
	priceDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	section: {
		marginBottom: 32,
	},
	sectionTitle: {
		fontSize: 16,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	loadingText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyTitle: {
		fontSize: 16,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginTop: 16,
		marginBottom: 8,
	},
	emptyDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
	},
	paymentMethodItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: 'transparent',
		marginBottom: 12,
	},
	selectedPaymentMethod: {
		borderColor: Colors.primary,
		backgroundColor: 'rgba(255, 107, 129, 0.1)',
	},
	paymentMethodInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	cardIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 8,
		backgroundColor: Colors.background,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	cardDetails: {
		flex: 1,
	},
	cardBrand: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 2,
	},
	cardExpiry: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	defaultBadge: {
		backgroundColor: Colors.primary,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginRight: 8,
	},
	defaultText: {
		fontSize: 10,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
	},
	radioButton: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: Colors.borderSecondary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	radioButtonSelected: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: Colors.primary,
	},
	addPaymentMethodButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		paddingHorizontal: 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		borderWidth: 2,
		borderColor: Colors.borderSecondary,
		borderStyle: 'dashed',
	},
	addPaymentMethodText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
		marginLeft: 8,
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
	footer: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 32,
		borderTopWidth: 1,
		borderTopColor: Colors.borderSecondary,
	},
	subscribeButton: {
		marginBottom: 12,
	},
	footerText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 16,
	},
});
