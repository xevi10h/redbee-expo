import { supabase } from '@/lib/supabase';
import { AuthResponse } from '@/shared/types';
import Stripe from '@stripe/stripe-react-native';

export interface SubscriptionPlan {
	price: number;
	currency: string;
	interval: 'month' | 'year';
	creator_id: string;
}

export class SubscriptionService {
	/**
	 * Initialize Stripe
	 */
	static async initializeStripe() {
		await Stripe.initStripe({
			publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
			merchantIdentifier: 'merchant.com.redbeeapp.mobile',
			urlScheme: 'redbeeapp',
		});
	}

	/**
	 * Create subscription for a creator
	 */
	static async createSubscription(creatorId: string): Promise<AuthResponse<{
		subscription_id: string;
		client_secret?: string;
	}>> {
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

			// Create payment intent with your backend API
			// TODO: Replace with your actual backend endpoint
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/create-subscription`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
				},
				body: JSON.stringify({
					creator_id: creatorId,
					price: creator.subscription_price,
					currency: creator.subscription_currency,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				return {
					success: false,
					error: errorData.message || 'Failed to create subscription',
				};
			}

			const { subscription_id, client_secret } = await response.json();

			// If payment requires confirmation, handle it with Stripe
			if (client_secret) {
				const { error: stripeError } = await Stripe.confirmPayment(client_secret, {
					paymentMethodType: 'Card',
					paymentMethodData: {
						billingDetails: {
							// TODO: Get user billing details
						},
					},
				});

				if (stripeError) {
					return {
						success: false,
						error: stripeError.message,
					};
				}
			}

			// Create subscription record in Supabase
			const { error: subscriptionError } = await supabase
				.from('subscriptions')
				.insert({
					subscriber_id: (await supabase.auth.getUser()).data.user?.id,
					creator_id: creatorId,
					stripe_subscription_id: subscription_id,
					status: 'active',
					current_period_start: new Date().toISOString(),
					current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
					price: creator.subscription_price,
					currency: creator.subscription_currency,
				});

			if (subscriptionError) {
				return {
					success: false,
					error: subscriptionError.message,
				};
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
				error: error instanceof Error ? error.message : 'Failed to create subscription',
			};
		}
	}

	/**
	 * Cancel subscription
	 */
	static async cancelSubscription(subscriptionId: string): Promise<AuthResponse<void>> {
		try {
			// Cancel with your backend API
			const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/cancel-subscription`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
				},
				body: JSON.stringify({
					subscription_id: subscriptionId,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				return {
					success: false,
					error: errorData.message || 'Failed to cancel subscription',
				};
			}

			// Update subscription status in Supabase
			const { error } = await supabase
				.from('subscriptions')
				.update({ status: 'canceled' })
				.eq('stripe_subscription_id', subscriptionId);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to cancel subscription',
			};
		}
	}

	/**
	 * Get user's active subscriptions
	 */
	static async getUserSubscriptions(userId: string): Promise<AuthResponse<any[]>> {
		try {
			const { data, error } = await supabase
				.from('subscriptions')
				.select(`
					*,
					creator:profiles!subscriptions_creator_id_fkey (
						id,
						username,
						display_name,
						avatar_url
					)
				`)
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
				error: error instanceof Error ? error.message : 'Failed to get subscriptions',
			};
		}
	}
}