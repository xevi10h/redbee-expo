import { supabase } from '@/lib/supabase';
import { AuthResponse } from '@/shared/types';
import { Platform } from 'react-native';
import { PaymentService } from './paymentService';

// Import Stripe only on native platforms
let Stripe: any;
if (Platform.OS !== 'web') {
	try {
		Stripe = require('@stripe/stripe-react-native').default;
	} catch (e) {
		console.warn('Stripe not available on this platform');
	}
}

export interface SubscriptionPlan {
	price: number;
	currency: string;
	interval: 'month' | 'year';
	creator_id: string;
}

export interface Subscription {
	id: string;
	subscriber_id: string;
	creator_id: string;
	stripe_subscription_id?: string;
	status: 'active' | 'canceled' | 'past_due' | 'unpaid';
	current_period_start: string;
	current_period_end: string;
	price: number;
	currency: string;
	created_at: string;
	creator?: {
		id: string;
		username: string;
		display_name: string;
		avatar_url: string;
	};
}

export class SubscriptionService {
	/**
	 * Create subscription for a creator
	 */
	static async createSubscription(creatorId: string): Promise<
		AuthResponse<{
			subscription_id: string;
			client_secret?: string;
		}>
	> {
		try {
			// Get creator's subscription details
			const { data: creator, error: creatorError } = await supabase
				.from('profiles')
				.select('subscription_price, subscription_currency')
				.eq('id', creatorId)
				.single();

			if (creatorError) {
				return {
					success: false,
					error: 'Creator not found',
				};
			}

			if (creator.subscription_price <= 0) {
				return {
					success: false,
					error: 'Creator does not offer paid subscriptions',
				};
			}

			// Get user's default payment method
			const { data: paymentMethods, error: pmError } = await supabase
				.from('payment_methods')
				.select('stripe_payment_method_id')
				.eq('user_id', (await supabase.auth.getUser()).data.user?.id)
				.eq('is_default', true)
				.limit(1);

			if (pmError) {
				return {
					success: false,
					error: 'Failed to retrieve payment methods. Please try again later.',
				};
			}

			let paymentMethodId: string;

			if (!paymentMethods || paymentMethods.length === 0) {
				// User doesn't have a payment method, let them add one now
				console.log('No payment method found, prompting user to add one...');
				
				const addPaymentResult = await PaymentService.addPaymentMethod();
				
				if (!addPaymentResult.success || !addPaymentResult.data) {
					return {
						success: false,
						error: addPaymentResult.error || 'Failed to add payment method',
					};
				}

				// Set the new payment method as default and use it for subscription
				await PaymentService.setDefaultPaymentMethod(addPaymentResult.data.id);
				paymentMethodId = addPaymentResult.data.stripe_payment_method_id;
			} else {
				// Use existing default payment method
				paymentMethodId = paymentMethods[0].stripe_payment_method_id;
			}

			// Create subscription using Supabase Edge Function
			const response = await supabase.functions.invoke('create-subscription', {
				body: {
					creator_id: creatorId,
					payment_method_id: paymentMethodId,
					price: creator.subscription_price,
					currency: creator.subscription_currency,
				},
			});

			if (response.error) {
				return {
					success: false,
					error: response.error.message || 'Failed to create subscription',
				};
			}

			const { subscription_id, client_secret } = response.data;

			// If payment requires confirmation, handle it with Stripe
			if (client_secret) {
				const { error: stripeError } = await Stripe.confirmPayment(
					client_secret,
					{
						paymentMethodType: 'Card',
					},
				);

				if (stripeError) {
					return {
						success: false,
						error: stripeError.message,
					};
				}
			}

			return {
				success: true,
				data: {
					subscription_id,
					client_secret,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to create subscription',
			};
		}
	}

	/**
	 * Cancel subscription
	 */
	static async cancelSubscription(
		subscriptionId: string,
	): Promise<AuthResponse<void>> {
		try {
			// Cancel with Supabase Edge Function
			const response = await supabase.functions.invoke('cancel-subscription', {
				body: {
					subscription_id: subscriptionId,
				},
			});

			if (response.error) {
				return {
					success: false,
					error: response.error.message || 'Failed to cancel subscription',
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to cancel subscription',
			};
		}
	}

	/**
	 * Get user's active subscriptions
	 */
	static async getUserSubscriptions(
		userId: string,
	): Promise<AuthResponse<Subscription[]>> {
		try {
			const { data, error } = await supabase
				.from('subscriptions')
				.select(
					`
					*,
					creator:profiles!subscriptions_creator_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
				)
				.eq('subscriber_id', userId)
				.eq('status', 'active')
				.gte('current_period_end', new Date().toISOString());

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: data || [],
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to get subscriptions',
			};
		}
	}

	/**
	 * Get all subscriptions (active and inactive)
	 */
	static async getAllUserSubscriptions(
		userId: string,
	): Promise<AuthResponse<Subscription[]>> {
		try {
			const { data, error } = await supabase
				.from('subscriptions')
				.select(
					`
					*,
					creator:profiles!subscriptions_creator_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
				)
				.eq('subscriber_id', userId)
				.order('created_at', { ascending: false });

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: data || [],
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to get subscriptions',
			};
		}
	}

	/**
	 * Check if user is subscribed to a creator
	 */
	static async isSubscribedToCreator(
		subscriberId: string,
		creatorId: string,
	): Promise<
		AuthResponse<{
			isSubscribed: boolean;
			subscription?: Subscription;
		}>
	> {
		try {
			const { data, error } = await supabase
				.from('subscriptions')
				.select('*')
				.eq('subscriber_id', subscriberId)
				.eq('creator_id', creatorId)
				.eq('status', 'active')
				.gte('current_period_end', new Date().toISOString())
				.maybeSingle();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: {
					isSubscribed: !!data,
					subscription: data || undefined,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to check subscription status',
			};
		}
	}

	/**
	 * Get creator's subscribers
	 */
	static async getCreatorSubscribers(creatorId: string): Promise<
		AuthResponse<{
			count: number;
			subscribers: Array<{
				id: string;
				subscriber: {
					id: string;
					username: string;
					display_name: string;
					avatar_url: string;
				} | null;
				status: string;
				current_period_end: string;
				created_at: string;
			}>;
		}>
	> {
		try {
			const { data, error } = await supabase
				.from('subscriptions')
				.select(
					`
					id,
					status,
					current_period_end,
					created_at,
					subscriber:profiles!subscriptions_subscriber_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`,
				)
				.eq('creator_id', creatorId)
				.eq('status', 'active')
				.gte('current_period_end', new Date().toISOString())
				.order('created_at', { ascending: false });

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: {
					count: data?.length || 0,
					subscribers: (data || []).map((item) => ({
						id: item.id,
						status: item.status,
						current_period_end: item.current_period_end,
						created_at: item.created_at,
						subscriber: Array.isArray(item.subscriber)
							? item.subscriber[0] || null
							: item.subscriber,
					})),
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to get subscribers',
			};
		}
	}

	/**
	 * Get subscription analytics for creator
	 */
	static async getSubscriptionAnalytics(creatorId: string): Promise<
		AuthResponse<{
			totalSubscribers: number;
			activeSubscribers: number;
			monthlyRevenue: number;
			currency: string;
			recentSubscriptions: number;
		}>
	> {
		try {
			// Get all subscriptions for creator
			const { data: subscriptions, error } = await supabase
				.from('subscriptions')
				.select('*')
				.eq('creator_id', creatorId);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			const now = new Date();
			const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

			const activeSubscriptions =
				subscriptions?.filter(
					(sub) =>
						sub.status === 'active' && new Date(sub.current_period_end) > now,
				) || [];

			const recentSubscriptions =
				subscriptions?.filter(
					(sub) => new Date(sub.created_at) > thirtyDaysAgo,
				) || [];

			const monthlyRevenue = activeSubscriptions.reduce(
				(total, sub) => total + (sub.price || 0),
				0,
			);
			const currency = subscriptions?.[0]?.currency || 'USD';

			return {
				success: true,
				data: {
					totalSubscribers: subscriptions?.length || 0,
					activeSubscribers: activeSubscriptions.length,
					monthlyRevenue,
					currency,
					recentSubscriptions: recentSubscriptions.length,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to get subscription analytics',
			};
		}
	}
}
