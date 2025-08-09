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
	 * Subscribe to a creator using Stripe
	 */
	static async subscribeToCreator(
		creatorId: string,
		plan: SubscriptionPlan,
	): Promise<AuthResponse<void>> {
		try {
			// Initialize payment sheet
			const { error: initError } = await Stripe.initPaymentSheet({
				merchantDisplayName: 'Redbee',
				customerId: creatorId, // This should be the current user's customer ID
				paymentIntentClientSecret: 'pi_example_client_secret', // Get from backend
			});

			if (initError) {
				return {
					success: false,
					error: initError.message,
				};
			}

			// Present payment sheet
			const { error: paymentError } = await Stripe.presentPaymentSheet();

			if (paymentError) {
				return {
					success: false,
					error: paymentError.message,
				};
			}

			// If payment succeeds, create subscription in database
			const { error: dbError } = await supabase.from('subscriptions').insert({
				creator_id: creatorId,
				price: plan.price,
				currency: plan.currency,
				interval: plan.interval,
				status: 'active',
				created_at: new Date().toISOString(),
			});

			if (dbError) {
				return {
					success: false,
					error: 'Payment succeeded but failed to save subscription',
				};
			}

			return {
				success: true,
			};
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Subscription failed',
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
			const { error } = await supabase
				.from('subscriptions')
				.update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
				.eq('id', subscriptionId);

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
	 * Get user subscriptions
	 */
	static async getUserSubscriptions(
		userId: string,
	): Promise<AuthResponse<any[]>> {
		try {
			const { data, error } = await supabase
				.from('subscriptions')
				.select('*')
				.eq('user_id', userId)
				.eq('status', 'active');

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