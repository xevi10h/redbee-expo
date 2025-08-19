import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentMethod, PaymentService } from '@/services/paymentService';

interface PaymentMethodItemProps {
	paymentMethod: PaymentMethod;
	onSetDefault: (id: string) => void;
	onRemove: (id: string) => void;
}

const PaymentMethodItem: React.FC<PaymentMethodItemProps> = ({
	paymentMethod,
	onSetDefault,
	onRemove,
}) => {
	const { t } = useTranslation();

	const handleRemove = () => {
		Alert.alert(
			t('payments.confirmRemoveTitle'),
			t('payments.confirmRemoveMessage'),
			[
				{ text: t('payments.cancel'), style: 'cancel' },
				{
					text: t('payments.remove'),
					style: 'destructive',
					onPress: () => onRemove(paymentMethod.stripe_payment_method_id),
				},
			],
		);
	};

	return (
		<View style={styles.paymentMethodItem}>
			<View style={styles.paymentMethodInfo}>
				<View style={styles.cardIconContainer}>
					<Feather name="credit-card" size={24} color={Colors.primary} />
				</View>
				<View style={styles.cardDetails}>
					<Text style={styles.cardBrand}>
						{paymentMethod.card_brand?.toUpperCase() || 'CARD'} ****
						{paymentMethod.card_last4}
					</Text>
					<Text style={styles.cardExpiry}>
						{t('payments.expiresOn', {
							month: paymentMethod.card_exp_month?.toString().padStart(2, '0'),
							year: paymentMethod.card_exp_year,
						})}
					</Text>
					{paymentMethod.is_default && (
						<Text style={styles.defaultLabel}>
							{t('payments.defaultPaymentMethod')}
						</Text>
					)}
				</View>
			</View>
			<View style={styles.paymentMethodActions}>
				{!paymentMethod.is_default && (
					<TouchableOpacity
						style={styles.setDefaultButton}
						onPress={() => onSetDefault(paymentMethod.id)}
					>
						<Text style={styles.setDefaultText}>
							{t('payments.setAsDefault')}
						</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity style={styles.removeButton} onPress={handleRemove}>
					<Feather name="trash-2" size={18} color={Colors.error} />
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default function PaymentMethodsScreen() {
	const { t } = useTranslation();
	useRequireAuth();

	const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		loadPaymentMethods();
	}, []);

	const loadPaymentMethods = async () => {
		setLoading(true);
		const response = await PaymentService.getPaymentMethods();
		if (response.success && response.data) {
			setPaymentMethods(response.data);
		} else {
			Alert.alert(t('payments.paymentMethodError'), response.error);
		}
		setLoading(false);
	};

	const handleAddPaymentMethod = async () => {
		setActionLoading(true);
		try {
			console.log('Initializing Stripe...');
			// await PaymentService.initializeStripe();
			const response = await PaymentService.addPaymentMethod();
			if (response.success) {
				Alert.alert(t('common.success'), t('payments.paymentMethodAdded'));
				loadPaymentMethods();
			} else {
				Alert.alert(t('payments.paymentMethodError'), response.error);
			}
		} catch (error) {
			Alert.alert(
				t('payments.paymentMethodError'),
				'Failed to add payment method',
			);
		}
		setActionLoading(false);
	};

	const handleSetDefault = async (paymentMethodId: string) => {
		setActionLoading(true);
		const response = await PaymentService.setDefaultPaymentMethod(
			paymentMethodId,
		);
		if (response.success) {
			loadPaymentMethods();
		} else {
			Alert.alert(t('payments.paymentMethodError'), response.error);
		}
		setActionLoading(false);
	};

	const handleRemove = async (stripePaymentMethodId: string) => {
		setActionLoading(true);
		const response = await PaymentService.removePaymentMethod(
			stripePaymentMethodId,
		);
		if (response.success) {
			Alert.alert(t('common.success'), t('payments.paymentMethodRemoved'));
			loadPaymentMethods();
		} else {
			Alert.alert(t('payments.paymentMethodError'), response.error);
		}
		setActionLoading(false);
	};

	const renderPaymentMethod = ({ item }: { item: PaymentMethod }) => (
		<PaymentMethodItem
			paymentMethod={item}
			onSetDefault={handleSetDefault}
			onRemove={handleRemove}
		/>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="credit-card" size={64} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>{t('payments.noPaymentMethods')}</Text>
			<Text style={styles.emptySubtitle}>
				{t('payments.addFirstPaymentMethod')}
			</Text>
		</View>
	);

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
				<Text style={styles.title}>{t('payments.title')}</Text>
				<TouchableOpacity
					style={[styles.addButton, actionLoading && styles.addButtonDisabled]}
					onPress={handleAddPaymentMethod}
					disabled={actionLoading}
				>
					{actionLoading ? (
						<ActivityIndicator size="small" color={Colors.text} />
					) : (
						<Feather name="plus" size={24} color={Colors.text} />
					)}
				</TouchableOpacity>
			</View>

			{/* Content */}
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary} />
				</View>
			) : (
				<FlatList
					data={paymentMethods}
					renderItem={renderPaymentMethod}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContainer}
					ListEmptyComponent={renderEmptyState}
					showsVerticalScrollIndicator={false}
				/>
			)}
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
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.backgroundSecondary,
	},
	title: {
		flex: 1,
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
		marginHorizontal: 16,
	},
	addButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: Colors.primary,
	},
	addButtonDisabled: {
		opacity: 0.6,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	listContainer: {
		flexGrow: 1,
		padding: 16,
	},
	paymentMethodItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	paymentMethodInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	cardIconContainer: {
		width: 48,
		height: 48,
		borderRadius: 24,
		backgroundColor: Colors.premiumBackground,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	cardDetails: {
		flex: 1,
	},
	cardBrand: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 2,
	},
	cardExpiry: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 2,
	},
	defaultLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
		textTransform: 'uppercase',
	},
	paymentMethodActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	setDefaultButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: Colors.primary,
	},
	setDefaultText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
	},
	removeButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(220, 53, 69, 0.1)',
	},
	emptyState: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 80,
	},
	emptyTitle: {
		fontSize: 20,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
		marginTop: 24,
		marginBottom: 8,
	},
	emptySubtitle: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 24,
		paddingHorizontal: 32,
	},
});
