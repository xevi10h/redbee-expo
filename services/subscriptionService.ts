import { supabase } from '@/lib/supabase';
import { AuthResponse } from '@/shared/types';
import { confirmPayment } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';

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
	status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete';
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

export interface PaymentMethod {
	id: string;
	stripe_payment_method_id: string;
	type: string;
	card_brand?: string;
	card_last4?: string;
	card_exp_month?: number;
	card_exp_year?: number;
	is_default: boolean;
}

export class SubscriptionService {
	/**
	 * Get user's payment methods for subscription selection
	 */
	static async getPaymentMethodsForSubscription(): Promise<
		AuthResponse<PaymentMethod[]>
	> {
		try {
			const { data, error } = await supabase
				.from('payment_methods')
				.select('*')
				.eq('user_id', (await supabase.auth.getUser()).data.user?.id)
				.order('is_default', { ascending: false })
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
						: 'Failed to get payment methods',
			};
		}
	}

	/**
	 * Create subscription with selected payment method
	 */
	static async createSubscription(
		creatorId: string,
		selectedPaymentMethodId?: string,
	): Promise<
		AuthResponse<{
			subscription_id: string;
			client_secret?: string;
			requires_action?: boolean;
			processing?: boolean;
			pending?: boolean;
			needs_attention?: boolean;
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

			let paymentMethodId: string;

			if (selectedPaymentMethodId) {
				// Use the selected payment method
				paymentMethodId = selectedPaymentMethodId;
			} else {
				// Get user's default payment method
				const { data: paymentMethods, error: pmError } = await supabase
					.from('payment_methods')
					.select('stripe_payment_method_id')
					.eq('user_id', (await supabase.auth.getUser()).data.user?.id)
					.eq('is_default', true)
					.limit(1);

				if (pmError || !paymentMethods || paymentMethods.length === 0) {
					return {
						success: false,
						error:
							'No payment method found. Please add a payment method first.',
					};
				}

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

			console.log('Subscription creation response:', response);

			if (response.error) {
				return {
					success: false,
					error: response.error.message || 'Failed to create subscription',
				};
			}

			const {
				subscription_id,
				client_secret,
				status,
				requires_action,
				payment_intent_status,
			} = response.data;

			console.log('Subscription created:', {
				subscription_id,
				status,
				requires_action,
				payment_intent_status,
			});

			// If subscription is already active (payment succeeded immediately)
			if (status === 'active') {
				console.log('Subscription is immediately active');
				return {
					success: true,
					data: {
						subscription_id,
					},
				};
			}

			// If subscription is processing, let user know it's being processed
			if (status === 'processing' || payment_intent_status === 'processing') {
				console.log('Payment is processing, will be confirmed shortly');

				// Optionally poll for status updates or show processing message
				setTimeout(async () => {
					await this.refreshSubscriptionStatus(subscription_id);
				}, 3000);

				return {
					success: true,
					data: {
						subscription_id,
						processing: true,
					},
				};
			}

			// If payment requires confirmation, handle it
			if (requires_action && client_secret) {
				console.log('Payment requires confirmation, processing...');

				if (Platform.OS === 'web') {
					// For web, return the client secret so the UI can handle it
					return {
						success: true,
						data: {
							subscription_id,
							client_secret,
							requires_action: true,
						},
					};
				}

				// For mobile, confirm payment with Stripe
				const { error: stripeError, paymentIntent } = await confirmPayment(
					client_secret,
					{
						paymentMethodType: 'Card',
					},
				);

				if (stripeError) {
					console.error('Stripe payment error:', stripeError);

					// Cancel the subscription since payment failed
					await this.cancelSubscription(subscription_id);

					return {
						success: false,
						error: stripeError.message,
					};
				}

				console.log('Payment confirmed successfully:', paymentIntent?.status);

				// Wait a moment for Stripe webhooks to process
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Refresh subscription status
				const refreshResult = await this.refreshSubscriptionStatus(
					subscription_id,
				);

				if (!refreshResult.success) {
					console.warn(
						'Could not refresh subscription status after payment confirmation',
					);
				}

				return {
					success: true,
					data: {
						subscription_id,
					},
				};
			}

			// For incomplete status without requires_action, it might be pending
			if (status === 'incomplete') {
				console.log('Subscription is incomplete, may need time to process');

				// Try to refresh status after a moment
				setTimeout(async () => {
					try {
						await this.refreshSubscriptionStatus(subscription_id);
					} catch (error) {
						console.error('Error refreshing subscription status:', error);
					}
				}, 2000);

				return {
					success: true,
					data: {
						subscription_id,
						pending: true,
					},
				};
			}

			// If we get here, log the unexpected state but don't fail completely
			console.warn('Unexpected subscription state:', {
				status,
				requires_action,
				payment_intent_status,
			});

			return {
				success: true,
				data: {
					subscription_id,
					needs_attention: true,
				},
			};
		} catch (error) {
			console.error('Create subscription error:', error);

			// If we created a subscription but then failed, return the ID for debugging
			let errorData: any = {};
			if (
				error instanceof Error &&
				error.message &&
				error.message.includes('subscription_id:')
			) {
				const subscriptionId = error.message
					.split('subscription_id:')[1]
					.trim();
				errorData.subscription_id = subscriptionId;
			}

			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to create subscription',
				data: Object.keys(errorData).length > 0 ? errorData : undefined,
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
	 * Refresh subscription status from Stripe
	 */
	static async refreshSubscriptionStatus(
		subscriptionId: string,
	): Promise<AuthResponse<void>> {
		try {
			const response = await supabase.functions.invoke('confirm-subscription', {
				body: {
					subscription_id: subscriptionId,
				},
			});

			if (response.error) {
				return {
					success: false,
					error:
						response.error.message || 'Failed to refresh subscription status',
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
						: 'Failed to refresh subscription status',
			};
		}
	}

	/**
	 * Debug subscription (only for development)
	 */
	static async debugSubscription(subscriptionId: string): Promise<any> {
		try {
			const response = await supabase.functions.invoke('debug-subscription', {
				body: {
					subscription_id: subscriptionId,
				},
			});

			console.log('Debug subscription response:', response);
			return response.data;
		} catch (error) {
			console.error('Debug subscription error:', error);
			return null;
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
	 * Get all subscriptions (active and inactive), with only the latest subscription per creator
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

			// Remove duplicates by keeping only the latest subscription for each creator
			const uniqueSubscriptions: Subscription[] = [];
			const seenCreators = new Set<string>();

			(data || []).forEach((subscription) => {
				if (!seenCreators.has(subscription.creator_id)) {
					seenCreators.add(subscription.creator_id);
					uniqueSubscriptions.push(subscription);
				}
			});

			return {
				success: true,
				data: uniqueSubscriptions,
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
