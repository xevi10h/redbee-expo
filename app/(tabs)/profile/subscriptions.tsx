import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/Colors';
import { useAuth, useRequireAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import {
	Subscription,
	SubscriptionService,
} from '@/services/subscriptionService';

interface SubscriptionItemProps {
	subscription: Subscription;
	onCancel: (subscriptionId: string) => void;
	onViewProfile: (creatorId: string) => void;
}

const SubscriptionItem: React.FC<SubscriptionItemProps> = ({
	subscription,
	onCancel,
	onViewProfile,
}) => {
	const { t } = useTranslation();

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString();
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active':
				return Colors.primary;
			case 'canceled':
				return Colors.textSecondary;
			case 'past_due':
				return Colors.warning;
			case 'unpaid':
				return Colors.error;
			default:
				return Colors.textSecondary;
		}
	};

	const handleCancel = () => {
		Alert.alert(
			t('subscriptions.confirmCancelTitle'),
			t('subscriptions.confirmCancelMessage', {
				username:
					subscription.creator?.display_name || subscription.creator?.username,
				endDate: formatDate(subscription.current_period_end),
			}),
			[
				{ text: t('payments.cancel'), style: 'cancel' },
				{
					text: t('subscriptions.confirmCancel'),
					style: 'destructive',
					onPress: () => onCancel(subscription.stripe_subscription_id!),
				},
			],
		);
	};

	return (
		<View style={styles.subscriptionItem}>
			<TouchableOpacity
				style={styles.creatorInfo}
				onPress={() => onViewProfile(subscription.creator_id)}
			>
				<View style={styles.avatarContainer}>
					{subscription.creator?.avatar_url ? (
						<Image
							source={{ uri: subscription.creator.avatar_url }}
							style={styles.avatar}
						/>
					) : (
						<View style={[styles.avatar, styles.avatarPlaceholder]}>
							<Feather name="user" size={24} color={Colors.textTertiary} />
						</View>
					)}
				</View>
				<View style={styles.creatorDetails}>
					<Text style={styles.creatorName}>
						{subscription.creator?.display_name ||
							subscription.creator?.username}
					</Text>
					<Text style={styles.creatorUsername}>
						@{subscription.creator?.username}
					</Text>
					<Text style={styles.subscriptionPrice}>
						{t('subscriptions.subscriptionPrice', {
							price: `$${subscription.price.toFixed(2)}`,
						})}
					</Text>
				</View>
			</TouchableOpacity>

			<View style={styles.subscriptionDetails}>
				<View style={styles.statusContainer}>
					<View
						style={[
							styles.statusDot,
							{ backgroundColor: getStatusColor(subscription.status) },
						]}
					/>
					<Text
						style={[
							styles.statusText,
							{ color: getStatusColor(subscription.status) },
						]}
					>
						{t(`subscriptions.${subscription.status}`)}
					</Text>
				</View>
				<Text style={styles.renewalText}>
					{subscription.status === 'active'
						? t('subscriptions.renewsOn', {
								date: formatDate(subscription.current_period_end),
						  })
						: t('subscriptions.currentPeriod', {
								date: formatDate(subscription.current_period_end),
						  })}
				</Text>
			</View>

			<View style={styles.actionsContainer}>
				{subscription.status === 'active' && (
					<TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
						<Text style={styles.cancelButtonText}>
							{t('subscriptions.cancelSubscription')}
						</Text>
					</TouchableOpacity>
				)}
				<TouchableOpacity
					style={styles.viewProfileButton}
					onPress={() => onViewProfile(subscription.creator_id)}
				>
					<Text style={styles.viewProfileText}>
						{t('subscriptions.viewProfile')}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default function SubscriptionsScreen() {
	const { t } = useTranslation();
	const { user } = useAuth();
	useRequireAuth();

	const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
	const [loading, setLoading] = useState(true);
	const [actionLoading, setActionLoading] = useState(false);

	useEffect(() => {
		if (user?.id) {
			loadSubscriptions();
		}
	}, [user?.id]);

	const loadSubscriptions = async () => {
		if (!user?.id) return;

		setLoading(true);
		const response = await SubscriptionService.getAllUserSubscriptions(user.id);
		if (response.success && response.data) {
			setSubscriptions(response.data);
		} else {
			Alert.alert(t('common.error'), response.error);
		}
		setLoading(false);
	};

	const handleCancelSubscription = async (stripeSubscriptionId: string) => {
		setActionLoading(true);
		const response = await SubscriptionService.cancelSubscription(
			stripeSubscriptionId,
		);
		if (response.success) {
			Alert.alert(t('common.success'), t('subscriptions.subscriptionCanceled'));
			loadSubscriptions();
		} else {
			Alert.alert(t('common.error'), response.error);
		}
		setActionLoading(false);
	};

	const handleViewProfile = (creatorId: string) => {
		router.push(`/profile/${creatorId}`);
	};

	const renderSubscription = ({ item }: { item: Subscription }) => (
		<SubscriptionItem
			subscription={item}
			onCancel={handleCancelSubscription}
			onViewProfile={handleViewProfile}
		/>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyState}>
			<Feather name="users" size={64} color={Colors.textTertiary} />
			<Text style={styles.emptyTitle}>
				{t('subscriptions.noActiveSubscriptions')}
			</Text>
			<Text style={styles.emptySubtitle}>
				{t('subscriptions.subscribeToCreators')}
			</Text>
		</View>
	);

	const activeSubscriptions = subscriptions.filter(
		(sub) => sub.status === 'active',
	);
	const inactiveSubscriptions = subscriptions.filter(
		(sub) => sub.status !== 'active',
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
				<Text style={styles.title}>{t('subscriptions.title')}</Text>
				<View style={styles.headerSpacer} />
			</View>

			{/* Content */}
			{loading ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={Colors.primary} />
				</View>
			) : subscriptions.length === 0 ? (
				renderEmptyState()
			) : (
				<FlatList
					data={subscriptions}
					renderItem={renderSubscription}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.listContainer}
					showsVerticalScrollIndicator={false}
					ListHeaderComponent={
						activeSubscriptions.length > 0 ? (
							<View style={styles.sectionHeader}>
								<Text style={styles.sectionTitle}>
									{t('subscriptions.activeSubscriptions')} (
									{activeSubscriptions.length})
								</Text>
							</View>
						) : null
					}
				/>
			)}

			{actionLoading && (
				<View style={styles.actionLoadingOverlay}>
					<ActivityIndicator size="large" color={Colors.primary} />
					<Text style={styles.actionLoadingText}>
						{t('subscriptions.cancelingSubscription')}
					</Text>
				</View>
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
	listContainer: {
		flexGrow: 1,
		padding: 16,
	},
	sectionHeader: {
		marginBottom: 16,
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: 'Raleway-SemiBold',
		fontWeight: '600',
		color: Colors.text,
	},
	subscriptionItem: {
		backgroundColor: Colors.backgroundSecondary,
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: Colors.borderSecondary,
	},
	creatorInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	avatarContainer: {
		marginRight: 12,
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
	},
	avatarPlaceholder: {
		backgroundColor: Colors.backgroundTertiary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	creatorDetails: {
		flex: 1,
	},
	creatorName: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.text,
		marginBottom: 2,
	},
	creatorUsername: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
		marginBottom: 2,
	},
	subscriptionPrice: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.primary,
	},
	subscriptionDetails: {
		marginBottom: 12,
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6,
	},
	statusText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		textTransform: 'capitalize',
	},
	renewalText: {
		fontSize: 14,
		fontFamily: 'Inter-Regular',
		color: Colors.textSecondary,
	},
	actionsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
	},
	cancelButton: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: Colors.error,
		alignItems: 'center',
	},
	cancelButtonText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.error,
	},
	viewProfileButton: {
		flex: 1,
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 8,
		backgroundColor: Colors.primary,
		alignItems: 'center',
	},
	viewProfileText: {
		fontSize: 14,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.white,
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
	actionLoadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionLoadingText: {
		fontSize: 16,
		fontFamily: 'Inter-Medium',
		fontWeight: '500',
		color: Colors.white,
		marginTop: 12,
	},
});
