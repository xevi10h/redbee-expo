import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import {
	CreatorEarnings,
	PaymentService,
	Withdrawal,
} from '@/services/paymentService';

interface EarningsItemProps {
	earning: CreatorEarnings;
}

const EarningsItem: React.FC<EarningsItemProps> = ({ earning }) => {
	const { t } = useTranslation();

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'available':
				return Colors.success;
			case 'pending':
				return Colors.warning;
			case 'paid':
				return Colors.textSecondary;
			default:
				return Colors.textSecondary;
		}
	};

	return (
		<View style={styles.earningItem}>
			<View style={styles.earningHeader}>
				<Text style={styles.earningAmount}>
					${earning.net_amount.toFixed(2)}
				</Text>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: getStatusColor(earning.status) },
					]}
				>
					<Text style={styles.statusText}>
						{t(`earnings.${earning.status}Status`)}
					</Text>
				</View>
			</View>
			<Text style={styles.earningDescription}>
				{t('earnings.subscriptionPayment')}
			</Text>
			<Text style={styles.earningDate}>{formatDate(earning.payment_date)}</Text>
			<View style={styles.earningDetails}>
				<Text style={styles.earningDetailText}>
					{t('earnings.grossEarnings')}: ${earning.amount.toFixed(2)}
				</Text>
				<Text style={styles.earningDetailText}>
					{t('earnings.commissionNote')}: {earning.commission_rate}%
				</Text>
			</View>
		</View>
	);
};

interface WithdrawalItemProps {
	withdrawal: Withdrawal;
}

const WithdrawalItem: React.FC<WithdrawalItemProps> = ({ withdrawal }) => {
	const { t } = useTranslation();

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
				return Colors.success;
			case 'processing':
				return Colors.primary;
			case 'pending':
				return Colors.warning;
			case 'failed':
				return Colors.error;
			default:
				return Colors.textSecondary;
		}
	};

	return (
		<View style={styles.withdrawalItem}>
			<View style={styles.withdrawalHeader}>
				<Text style={styles.withdrawalAmount}>
					-${withdrawal.amount.toFixed(2)}
				</Text>
				<View
					style={[
						styles.statusBadge,
						{ backgroundColor: getStatusColor(withdrawal.status) },
					]}
				>
					<Text style={styles.statusText}>
						{t(`earnings.${withdrawal.status}`)}
					</Text>
				</View>
			</View>
			<Text style={styles.withdrawalMethod}>
				{t(`earnings.${withdrawal.withdrawal_method}`)}
				{withdrawal.paypal_email && ` (${withdrawal.paypal_email})`}
			</Text>
			<Text style={styles.withdrawalDate}>
				{t('earnings.requestedOn', {
					date: formatDate(withdrawal.requested_at),
				})}
			</Text>
			{withdrawal.completed_at && (
				<Text style={styles.withdrawalCompletedDate}>
					{t('earnings.completedOn', {
						date: formatDate(withdrawal.completed_at),
					})}
				</Text>
			)}
			{withdrawal.failure_reason && (
				<Text style={styles.failureReason}>
					{t('earnings.failureReason', { reason: withdrawal.failure_reason })}
				</Text>
			)}
		</View>
	);
};

interface WithdrawalModalProps {
	visible: boolean;
	availableBalance: number;
	onClose: () => void;
	onSubmit: (
		amount: number,
		method: 'bank_account' | 'paypal',
		details: any,
	) => void;
}

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
	visible,
	availableBalance,
	onClose,
	onSubmit,
}) => {
	const { t } = useTranslation();
	const [amount, setAmount] = useState('');
	const [method, setMethod] = useState<'bank_account' | 'paypal' | null>(null);
	const [paypalEmail, setPaypalEmail] = useState('');
	const [accountNumber, setAccountNumber] = useState('');
	const [routingNumber, setRoutingNumber] = useState('');
	const [accountHolder, setAccountHolder] = useState('');
	const [bankName, setBankName] = useState('');

	const resetForm = () => {
		setAmount('');
		setMethod(null);
		setPaypalEmail('');
		setAccountNumber('');
		setRoutingNumber('');
		setAccountHolder('');
		setBankName('');
	};

	const handleSubmit = () => {
		const withdrawalAmount = parseFloat(amount);

		// Validations
		if (!withdrawalAmount || withdrawalAmount <= 0) {
			Alert.alert(t('common.error'), t('earnings.enterValidAmount'));
			return;
		}

		if (withdrawalAmount < 100) {
			Alert.alert(t('common.error'), t('earnings.minimumNotMet'));
			return;
		}

		if (withdrawalAmount > availableBalance) {
			Alert.alert(t('common.error'), t('earnings.insufficientBalance'));
			return;
		}

		if (!method) {
			Alert.alert(t('common.error'), t('earnings.selectWithdrawalMethod'));
			return;
		}

		let details: any = {};

		if (method === 'paypal') {
			if (!paypalEmail) {
				Alert.alert(t('common.error'), t('earnings.enterPaypalEmail'));
				return;
			}
			details = { email: paypalEmail };
		} else {
			if (!accountNumber || !routingNumber || !accountHolder || !bankName) {
				Alert.alert(t('common.error'), t('earnings.enterBankDetails'));
				return;
			}
			details = {
				accountNumber,
				routingNumber,
				accountHolderName: accountHolder,
				bankName,
			};
		}

		onSubmit(withdrawalAmount, method, details);
		resetForm();
	};

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
		>
			<SafeAreaView style={styles.modalContainer}>
				<View style={styles.modalHeader}>
					<TouchableOpacity onPress={onClose}>
						<Text style={styles.modalCancelText}>{t('payments.cancel')}</Text>
					</TouchableOpacity>
					<Text style={styles.modalTitle}>{t('earnings.withdrawFunds')}</Text>
					<TouchableOpacity onPress={handleSubmit}>
						<Text style={styles.modalSubmitText}>
							{t('earnings.requestWithdrawal')}
						</Text>
					</TouchableOpacity>
				</View>

				<ScrollView
					style={styles.modalContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.balanceInfo}>
						<Text style={styles.balanceLabel}>
							{t('earnings.availableBalance')}
						</Text>
						<Text style={styles.balanceAmount}>
							${availableBalance.toFixed(2)}
						</Text>
						<Text style={styles.minimumNote}>
							{t('earnings.minimumWithdrawal')}
						</Text>
					</View>

					<View style={styles.formSection}>
						<Text style={styles.sectionTitle}>
							{t('earnings.withdrawalAmount')}
						</Text>
						<TextInput
							style={styles.amountInput}
							value={amount}
							onChangeText={setAmount}
							placeholder="100.00"
							keyboardType="decimal-pad"
							placeholderTextColor={Colors.textTertiary}
						/>
					</View>

					<View style={styles.formSection}>
						<Text style={styles.sectionTitle}>
							{t('earnings.withdrawalMethod')}
						</Text>
						<TouchableOpacity
							style={[
								styles.methodButton,
								method === 'paypal' && styles.methodButtonActive,
							]}
							onPress={() => setMethod('paypal')}
						>
							<Feather
								name="mail"
								size={20}
								color={method === 'paypal' ? Colors.white : Colors.primary}
							/>
							<Text
								style={[
									styles.methodButtonText,
									method === 'paypal' && styles.methodButtonTextActive,
								]}
							>
								{t('earnings.paypal')}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.methodButton,
								method === 'bank_account' && styles.methodButtonActive,
							]}
							onPress={() => setMethod('bank_account')}
						>
							<Feather
								name="credit-card"
								size={20}
								color={
									method === 'bank_account' ? Colors.white : Colors.primary
								}
							/>
							<Text
								style={[
									styles.methodButtonText,
									method === 'bank_account' && styles.methodButtonTextActive,
								]}
							>
								{t('earnings.bankAccount')}
							</Text>
						</TouchableOpacity>
					</View>

					{method === 'paypal' && (
						<View style={styles.formSection}>
							<Text style={styles.sectionTitle}>
								{t('earnings.paypalEmail')}
							</Text>
							<TextInput
								style={styles.textInput}
								value={paypalEmail}
								onChangeText={setPaypalEmail}
								placeholder="your@email.com"
								keyboardType="email-address"
								placeholderTextColor={Colors.textTertiary}
								autoCapitalize="none"
							/>
						</View>
					)}

					{method === 'bank_account' && (
						<View style={styles.formSection}>
							<Text style={styles.sectionTitle}>
								{t('earnings.accountHolderName')}
							</Text>
							<TextInput
								style={styles.textInput}
								value={accountHolder}
								onChangeText={setAccountHolder}
								placeholder="John Doe"
								placeholderTextColor={Colors.textTertiary}
							/>

							<Text style={styles.sectionTitle}>{t('earnings.bankName')}</Text>
							<TextInput
								style={styles.textInput}
								value={bankName}
								onChangeText={setBankName}
								placeholder="Chase Bank"
								placeholderTextColor={Colors.textTertiary}
							/>

							<Text style={styles.sectionTitle}>
								{t('earnings.accountNumber')}
							</Text>
							<TextInput
								style={styles.textInput}
								value={accountNumber}
								onChangeText={setAccountNumber}
								placeholder="1234567890"
								keyboardType="number-pad"
								placeholderTextColor={Colors.textTertiary}
							/>

							<Text style={styles.sectionTitle}>
								{t('earnings.routingNumber')}
							</Text>
							<TextInput
								style={styles.textInput}
								value={routingNumber}
								onChangeText={setRoutingNumber}
								placeholder="021000021"
								keyboardType="number-pad"
								placeholderTextColor={Colors.textTertiary}
							/>
						</View>
					)}

					<Text style={styles.processingNote}>
						{t('earnings.processingTime')}
					</Text>
				</ScrollView>
			</SafeAreaView>
		</Modal>
	);
};

export default function EarningsScreen() {
	const { t } = useTranslation();
	const { user } = useAuth();
	useRequireAuth();

	const [earnings, setEarnings] = useState<CreatorEarnings[]>([]);
	const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
	const [availableBalance, setAvailableBalance] = useState(0);
	const [pendingBalance, setPendingBalance] = useState(0);
	const [totalEarned, setTotalEarned] = useState(0);
	const [loading, setLoading] = useState(true);
	const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		loadEarningsData();
		loadWithdrawals();
	}, []);

	const loadEarningsData = async () => {
		setLoading(true);
		const response = await PaymentService.getCreatorEarnings();
		if (response.success && response.data) {
			setEarnings(response.data.earnings);
			setAvailableBalance(response.data.availableBalance);
			setPendingBalance(response.data.pendingBalance);
			setTotalEarned(response.data.totalEarned);
		} else {
			Alert.alert(t('common.error'), response.error);
		}
		setLoading(false);
	};

	const loadWithdrawals = async () => {
		const response = await PaymentService.getWithdrawalHistory();
		if (response.success && response.data) {
			setWithdrawals(response.data);
		}
	};

	const handleWithdrawal = async (
		amount: number,
		method: 'bank_account' | 'paypal',
		details: any,
	) => {
		setActionLoading(true);
		setShowWithdrawalModal(false);

		const response = await PaymentService.requestWithdrawal(
			amount,
			method,
			details,
		);
		if (response.success) {
			Alert.alert(t('common.success'), t('earnings.withdrawalRequested'));
			loadEarningsData();
			loadWithdrawals();
		} else {
			Alert.alert(t('common.error'), response.error);
		}
		setActionLoading(false);
	};

	const renderEarning = ({ item }: { item: CreatorEarnings }) => (
		<EarningsItem earning={item} />
	);
	const renderWithdrawal = ({ item }: { item: Withdrawal }) => (
		<WithdrawalItem withdrawal={item} />
	);

	const renderEarningsEmpty = () => (
		<View style={styles.emptyState}>
			<Feather name="dollar-sign" size={48} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>{t('earnings.noEarnings')}</Text>
			<Text style={styles.emptySubtitle}>{t('earnings.startCreating')}</Text>
		</View>
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.container} edges={['top']}>
				<StatusBar style="light" />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary} />
				</View>
			</SafeAreaView>
		);
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
				<Text style={styles.title}>{t('earnings.title')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			<ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
				{/* Balance Overview */}
				<View style={styles.balanceOverview}>
					<Text style={styles.overviewTitle}>{t('earnings.overview')}</Text>

					<View style={styles.balanceCards}>
						<View style={styles.balanceCard}>
							<Text style={styles.balanceCardLabel}>
								{t('earnings.availableBalance')}
							</Text>
							<Text style={styles.balanceCardAmount}>
								${availableBalance.toFixed(2)}
							</Text>
						</View>

						<View style={styles.balanceCard}>
							<Text style={styles.balanceCardLabel}>
								{t('earnings.pendingBalance')}
							</Text>
							<Text style={styles.balanceCardAmount}>
								${pendingBalance.toFixed(2)}
							</Text>
						</View>
					</View>

					<View style={styles.totalEarnedCard}>
						<Text style={styles.totalEarnedLabel}>
							{t('earnings.totalEarned')}
						</Text>
						<Text style={styles.totalEarnedAmount}>
							${totalEarned.toFixed(2)}
						</Text>
					</View>

					{availableBalance >= 100 ? (
						<TouchableOpacity
							style={styles.withdrawButton}
							onPress={() => setShowWithdrawalModal(true)}
							disabled={actionLoading}
						>
							{actionLoading ? (
								<ActivityIndicator size="small" color={Colors.white} />
							) : (
								<>
									<Feather name="download" size={20} color={Colors.white} />
									<Text style={styles.withdrawButtonText}>
										{t('earnings.withdraw')}
									</Text>
								</>
							)}
						</TouchableOpacity>
					) : (
						<View style={styles.minimumNotReachedContainer}>
							<Feather name="info" size={16} color={Colors.textSecondary} />
							<Text style={styles.minimumNotReachedText}>
								{t('earnings.noMinimumReached')}
							</Text>
						</View>
					)}
				</View>

				{/* Earnings History */}
				<View style={styles.section}>
					<Text style={styles.sectionTitle}>
						{t('earnings.earningsHistory')}
					</Text>
					{earnings.length > 0 ? (
						<FlatList
							data={earnings}
							renderItem={renderEarning}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
							ItemSeparatorComponent={() => <View style={styles.separator} />}
						/>
					) : (
						renderEarningsEmpty()
					)}
				</View>

				{/* Withdrawal History */}
				{withdrawals.length > 0 && (
					<View style={styles.section}>
						<Text style={styles.sectionTitle}>
							{t('earnings.withdrawalHistory')}
						</Text>
						<FlatList
							data={withdrawals}
							renderItem={renderWithdrawal}
							keyExtractor={(item) => item.id}
							scrollEnabled={false}
							ItemSeparatorComponent={() => <View style={styles.separator} />}
						/>
					</View>
				)}
			</ScrollView>

			<WithdrawalModal
				visible={showWithdrawalModal}
				availableBalance={availableBalance}
				onClose={() => setShowWithdrawalModal(false)}
				onSubmit={handleWithdrawal}
			/>
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
	},
	headerSpacer: {
		width: 40,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	content: {
		flex: 1,
	},
	balanceOverview: {
		padding: 16,
		backgroundColor: Colors.backgroundSecondary,
		margin: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	overviewTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 16,
	},
	balanceCards: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 12,
	},
	balanceCard: {
		flex: 1,
		padding: 12,
		backgroundColor: Colors.background,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	balanceCardLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 4,
	},
	balanceCardAmount: {
		fontSize: 16,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	totalEarnedCard: {
		padding: 12,
		backgroundColor: Colors.premiumBackground,
		borderRadius: 8,
		marginBottom: 16,
	},
	totalEarnedLabel: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 4,
	},
	totalEarnedAmount: {
		fontSize: 20,
		fontFamily: 'Raleway-Bold',
		fontWeight: '700',
		color: Colors.primary,
	},
	withdrawButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		backgroundColor: Colors.primary,
		borderRadius: 8,
		gap: 8,
	},
	withdrawButtonText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.white,
	},
	minimumNotReachedContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 12,
		backgroundColor: Colors.backgroundTertiary,
		borderRadius: 8,
		gap: 8,
	},
	minimumNotReachedText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		flex: 1,
	},
	section: {
		margin: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		marginBottom: 12,
	},
	earningItem: {
		padding: 12,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	earningHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	earningAmount: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.success,
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
	},
	statusText: {
		fontSize: 12,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.white,
		textTransform: 'capitalize',
	},
	earningDescription: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		marginBottom: 4,
	},
	earningDate: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 8,
	},
	earningDetails: {
		backgroundColor: Colors.backgroundTertiary,
		padding: 8,
		borderRadius: 6,
	},
	earningDetailText: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 2,
	},
	withdrawalItem: {
		padding: 12,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	withdrawalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	withdrawalAmount: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.error,
	},
	withdrawalMethod: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		marginBottom: 4,
	},
	withdrawalDate: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 2,
	},
	withdrawalCompletedDate: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.success,
		marginBottom: 2,
	},
	failureReason: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.error,
		marginTop: 4,
	},
	separator: {
		height: 8,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 40,
	},
	emptyTitle: {
		fontSize: 16,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
		textAlign: 'center',
		marginTop: 12,
		marginBottom: 4,
	},
	emptySubtitle: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	modalContainer: {
		flex: 1,
		backgroundColor: Colors.background,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: Colors.borderSecondary,
	},
	modalCancelText: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	modalTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	modalSubmitText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
	},
	modalContent: {
		flex: 1,
		padding: 16,
	},
	balanceInfo: {
		alignItems: 'center',
		padding: 20,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		marginBottom: 24,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	balanceLabel: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 4,
	},
	balanceAmount: {
		fontSize: 24,
		fontFamily: 'Raleway-Bold',
		fontWeight: '700',
		color: Colors.primary,
		marginBottom: 8,
	},
	minimumNote: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textTertiary,
	},
	formSection: {
		marginBottom: 24,
	},
	amountInput: {
		fontSize: 18,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		textAlign: 'center',
		padding: 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	methodButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.primary,
		marginBottom: 8,
		gap: 8,
	},
	methodButtonActive: {
		backgroundColor: Colors.primary,
	},
	methodButtonText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
	},
	methodButtonTextActive: {
		color: Colors.white,
	},
	textInput: {
		fontSize: 16,
		fontFamily: 'Inter-Regular',
		color: Colors.text,
		padding: 12,
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
		marginBottom: 12,
	},
	processingNote: {
		fontSize: 12,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		textAlign: 'center',
		lineHeight: 18,
		marginTop: 20,
	},
});
