import { supabase } from '@/lib/supabase';
import { AuthResponse } from '@/shared/types';
import {
	initPaymentSheet,
	initStripe,
	presentPaymentSheet,
} from '@stripe/stripe-react-native';
import { Platform } from 'react-native';

export interface PaymentMethod {
	id: string;
	user_id: string;
	stripe_payment_method_id: string;
	type: 'card' | 'bank_account';
	card_brand?: string;
	card_last4?: string;
	card_exp_month?: number;
	card_exp_year?: number;
	bank_last4?: string;
	bank_name?: string;
	is_default: boolean;
	created_at: string;
}

export interface CreatorEarnings {
	id: string;
	creator_id: string;
	subscription_id?: string;
	amount: number;
	currency: string;
	commission_rate: number;
	net_amount: number;
	payment_date: string;
	status: 'pending' | 'available' | 'paid';
	stripe_transfer_id?: string;
}

export interface Withdrawal {
	id: string;
	creator_id: string;
	amount: number;
	currency: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	withdrawal_method: 'bank_account' | 'paypal';
	paypal_email?: string;
	requested_at: string;
	processed_at?: string;
	completed_at?: string;
	failure_reason?: string;
}

export class PaymentService {
	/**
	 * Initialize Stripe SDK
	 */
	static async initializeStripe(): Promise<void> {
		try {
			if (Platform.OS === 'web') return;

			const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
			if (
				!publishableKey ||
				publishableKey === 'your_stripe_publishable_key_here'
			) {
				throw new Error('Stripe publishable key not configured');
			}

			console.log('Initializing Stripe with key:', publishableKey);

			await initStripe({
				publishableKey,
				merchantIdentifier: 'merchant.com.redbeeapp.mobile',
				urlScheme:
					'com.googleusercontent.apps.1063993481887-dc5u4v8ktj7c37acd6m97guj33faingm',
			});

			console.log('Stripe initialized successfully');
		} catch (error) {
			console.error('Failed to initialize Stripe:', error);
			throw new Error(
				error instanceof Error ? error.message : 'Stripe initialization failed',
			);
		}
	}

	/**
	 * Create subscription payment
	 */
	static async createSubscriptionPayment(creatorId: string): Promise<
		AuthResponse<{
			client_secret?: string;
			requires_action?: boolean;
		}>
	> {
		try {
			// Get creator's subscription details
			const { data: creator, error: creatorError } = await supabase
				.from('profiles')
				.select('subscription_price, subscription_currency')
				.eq('id', creatorId)
				.single();

			if (creatorError || !creator) {
				return {
					success: false,
					error: 'Creator not found',
				};
			}

			if (!creator.subscription_price || creator.subscription_price <= 0) {
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

			if (pmError || !paymentMethods || paymentMethods.length === 0) {
				return {
					success: false,
					error:
						'No default payment method found. Please add a payment method first.',
				};
			}

			// Call Supabase Edge Function to create subscription with Stripe
			const response = await supabase.functions.invoke('create-subscription', {
				body: {
					creator_id: creatorId,
					payment_method_id: paymentMethods[0].stripe_payment_method_id,
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

			return {
				success: true,
				data: {
					client_secret: response.data?.client_secret,
					requires_action: response.data?.requires_action,
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
	 * Get user's payment methods
	 */
	static async getPaymentMethods(): Promise<AuthResponse<PaymentMethod[]>> {
		try {
			const { data, error } = await supabase
				.from('payment_methods')
				.select('*')
				.eq('user_id', (await supabase.auth.getUser()).data.user?.id)
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
	 * Add payment method
	 */

	static async addPaymentMethod(): Promise<AuthResponse<PaymentMethod>> {
		try {
			if (Platform.OS === 'web') {
				return {
					success: false,
					error: 'Payment method setup not available on web',
				};
			}

			console.log('Adding payment method...');

			// Create setup intent through Supabase Edge Function
			const response = await supabase.functions.invoke('create-setup-intent');
			console.log('Setup intent response:', response);

			if (response.error) {
				return {
					success: false,
					error: 'Failed to create setup intent',
				};
			}

			const client_secret = response.data?.client_secret;

			if (!client_secret) {
				return {
					success: false,
					error: 'No client secret returned',
				};
			}

			// Initialize payment sheet
			const { error: initError } = await initPaymentSheet({
				setupIntentClientSecret: client_secret,
				merchantDisplayName: 'RedBee',
				style: 'alwaysDark', // o 'alwaysLight'
				customFlow: false,
			});

			if (initError) {
				return {
					success: false,
					error: initError.message,
				};
			}

			// Present payment sheet
			const { error: presentError } = await presentPaymentSheet();

			console.log('Present payment sheet response:', presentError);

			if (presentError) {
				return {
					success: false,
					error: presentError.message,
				};
			}

			// Si llegamos aquí, el setup fue exitoso
			// Ahora necesitamos obtener el setup intent actualizado desde tu backend
			const setupIntentResponse = await supabase.functions.invoke(
				'get-setup-intent',
				{
					body: { client_secret },
				},
			);

			console.log('Setup intent details:', setupIntentResponse);

			if (setupIntentResponse.error) {
				return {
					success: false,
					error: 'Failed to retrieve setup intent',
				};
			}

			const setupIntent = setupIntentResponse.data;

			// Save payment method to database
			const { data, error } = await supabase
				.from('payment_methods')
				.insert({
					user_id: (await supabase.auth.getUser()).data.user?.id,
					stripe_payment_method_id: setupIntent.payment_method.id,
					type: 'card',
					card_brand: setupIntent.payment_method.card?.brand,
					card_last4: setupIntent.payment_method.card?.last4,
					card_exp_month: setupIntent.payment_method.card?.exp_month,
					card_exp_year: setupIntent.payment_method.card?.exp_year,
					is_default: false,
				})
				.select()
				.single();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return {
				success: true,
				data: data,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to add payment method',
			};
		}
	}

	/**
	 * Remove payment method
	 */
	static async removePaymentMethod(
		paymentMethodId: string,
	): Promise<AuthResponse<void>> {
		try {
			// Detach from Stripe using Supabase Edge Function
			const response = await supabase.functions.invoke(
				'detach-payment-method',
				{
					body: { payment_method_id: paymentMethodId },
				},
			);

			if (response.error) {
				return {
					success: false,
					error: response.error.message || 'Failed to remove payment method',
				};
			}

			// Remove from database
			const { error } = await supabase
				.from('payment_methods')
				.delete()
				.eq('stripe_payment_method_id', paymentMethodId)
				.eq('user_id', (await supabase.auth.getUser()).data.user?.id);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to remove payment method',
			};
		}
	}

	/**
	 * Set default payment method
	 */
	static async setDefaultPaymentMethod(
		paymentMethodId: string,
	): Promise<AuthResponse<void>> {
		try {
			const userId = (await supabase.auth.getUser()).data.user?.id;

			// Unset all other defaults
			await supabase
				.from('payment_methods')
				.update({ is_default: false })
				.eq('user_id', userId);

			// Set new default
			const { error } = await supabase
				.from('payment_methods')
				.update({ is_default: true })
				.eq('id', paymentMethodId)
				.eq('user_id', userId);

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to set default payment method',
			};
		}
	}

	/**
	 * Get creator earnings
	 */
	static async getCreatorEarnings(): Promise<
		AuthResponse<{
			earnings: CreatorEarnings[];
			availableBalance: number;
			pendingBalance: number;
			totalEarned: number;
		}>
	> {
		try {
			const userId = (await supabase.auth.getUser()).data.user?.id;

			// Get earnings
			const { data: earnings, error: earningsError } = await supabase
				.from('creator_earnings')
				.select('*')
				.eq('creator_id', userId)
				.order('created_at', { ascending: false });

			if (earningsError) {
				return {
					success: false,
					error: earningsError.message,
				};
			}

			// Get profile balances
			const { data: profile, error: profileError } = await supabase
				.from('profiles')
				.select('available_balance, pending_balance, total_earned')
				.eq('id', userId)
				.single();

			if (profileError) {
				return {
					success: false,
					error: profileError.message,
				};
			}

			return {
				success: true,
				data: {
					earnings: earnings || [],
					availableBalance: profile?.available_balance || 0,
					pendingBalance: profile?.pending_balance || 0,
					totalEarned: profile?.total_earned || 0,
				},
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error ? error.message : 'Failed to get earnings',
			};
		}
	}

	/**
	 * Request withdrawal
	 */
	static async requestWithdrawal(
		amount: number,
		method: 'bank_account' | 'paypal',
		details: any,
	): Promise<AuthResponse<Withdrawal>> {
		try {
			const userId = (await supabase.auth.getUser()).data.user?.id;

			// Check minimum withdrawal amount
			if (amount < 100) {
				return {
					success: false,
					error: 'Minimum withdrawal amount is $100.00',
				};
			}

			// Check available balance
			const { data } = await supabase.rpc('calculate_available_balance', {
				user_id: userId,
			});

			if (!data || data < amount) {
				return {
					success: false,
					error: 'Insufficient available balance for withdrawal',
				};
			}

			// Create withdrawal request
			const withdrawalData: any = {
				creator_id: userId,
				amount,
				currency: 'USD',
				withdrawal_method: method,
				status: 'pending',
			};

			if (method === 'paypal') {
				withdrawalData.paypal_email = details.email;
			} else {
				withdrawalData.bank_account_details = details;
			}

			const { data: withdrawal, error } = await supabase
				.from('withdrawals')
				.insert(withdrawalData)
				.select()
				.single();

			if (error) {
				return {
					success: false,
					error: error.message,
				};
			}

			// Update profile balance
			await supabase
				.from('profiles')
				.update({
					available_balance: data - amount,
				})
				.eq('id', userId);

			return {
				success: true,
				data: withdrawal,
			};
		} catch (error) {
			return {
				success: false,
				error:
					error instanceof Error
						? error.message
						: 'Failed to request withdrawal',
			};
		}
	}

	/**
	 * Get withdrawal history
	 */
	static async getWithdrawalHistory(): Promise<AuthResponse<Withdrawal[]>> {
		try {
			const { data, error } = await supabase
				.from('withdrawals')
				.select('*')
				.eq('creator_id', (await supabase.auth.getUser()).data.user?.id)
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
						: 'Failed to get withdrawal history',
			};
		}
	}
}
