import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type, stripe-signature',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, {
			headers: corsHeaders,
		});
	}
	try {
		console.log('Webhook received');
		// Get the raw body for signature verification
		const body = await req.text();
		const signature = req.headers.get('stripe-signature');
		if (!signature) {
			console.error('No stripe signature found');
			return new Response('No stripe signature', {
				status: 400,
			});
		}
		// Initialize Stripe
		const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
			apiVersion: '2023-10-16',
		});
		// Verify webhook signature
		const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
		if (!webhookSecret) {
			console.error('STRIPE_WEBHOOK_SECRET not configured');
			return new Response('Webhook secret not configured', {
				status: 500,
			});
		}
		let event;
		console.log('webhookSecret', webhookSecret);
		try {
			event = await stripe.webhooks.constructEventAsync(
				body,
				signature,
				webhookSecret,
			);
			console.log('Webhook signature verified successfully');
		} catch (err) {
			console.error('Webhook signature verification failed:', err);
			return new Response('Webhook signature verification failed', {
				status: 400,
			});
		}
		console.log(`Processing webhook event: ${event.type}`);
		// Create Supabase client with service role
		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
		);
		// Handle different event types
		switch (event.type) {
			case 'payment_intent.succeeded':
				await handlePaymentIntentSucceeded(event, supabaseAdmin);
				break;
			case 'invoice.payment_succeeded':
				await handleInvoicePaymentSucceeded(event, supabaseAdmin);
				break;
			case 'customer.subscription.created':
				await handleSubscriptionCreated(event, supabaseAdmin);
				break;
			case 'customer.subscription.updated':
				await handleSubscriptionUpdated(event, supabaseAdmin);
				break;
			case 'customer.subscription.deleted':
				await handleSubscriptionDeleted(event, supabaseAdmin);
				break;
			case 'invoice.payment_failed':
				await handleInvoicePaymentFailed(event, supabaseAdmin);
				break;
			default:
				console.log(`Unhandled event type: ${event.type}`);
		}
		console.log(`Successfully processed webhook event: ${event.type}`);
		return new Response(
			JSON.stringify({
				received: true,
			}),
			{
				status: 200,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
			},
		);
	} catch (error) {
		console.error('Webhook error:', error);
		return new Response(
			JSON.stringify({
				error: error.message,
			}),
			{
				status: 500,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json',
				},
			},
		);
	}
});
async function handlePaymentIntentSucceeded(event, supabase) {
	const paymentIntent = event.data.object;
	console.log(`Payment intent succeeded: ${paymentIntent.id}`);
	// Update payment transaction status
	const { error } = await supabase
		.from('payment_transactions')
		.update({
			status: 'succeeded',
			updated_at: new Date(),
		})
		.eq('stripe_payment_intent_id', paymentIntent.id);
	if (error) {
		console.error('Failed to update payment transaction:', error.message);
		throw new Error(`Failed to update payment transaction: ${error.message}`);
	}
	console.log(
		`Updated payment transaction for payment intent: ${paymentIntent.id}`,
	);
}
async function handleInvoicePaymentSucceeded(event, supabase) {
	const invoice = event.data.object;
	const subscriptionId = invoice.subscription;
	const amount = (invoice.amount_paid || 0) / 100; // Convert from cents
	const currency = invoice.currency || 'usd';
	console.log(
		`Invoice payment succeeded for subscription: ${subscriptionId}, amount: ${amount}`,
	);
	// Get subscription details from database
	const { data: subscription, error: subError } = await supabase
		.from('subscriptions')
		.select('*')
		.eq('stripe_subscription_id', subscriptionId)
		.single();
	if (subError || !subscription) {
		console.error(`Subscription not found in database: ${subscriptionId}`);
		throw new Error(`Subscription not found: ${subscriptionId}`);
	}
	// Update subscription status to active
	const { error: updateError } = await supabase
		.from('subscriptions')
		.update({
			status: 'active',
			updated_at: new Date().toISOString(),
		})
		.eq('stripe_subscription_id', subscriptionId);
	if (updateError) {
		console.error('Failed to update subscription status:', updateError.message);
	} else {
		console.log(`Updated subscription status to active: ${subscriptionId}`);
	}
	// Process subscription payment (earnings, etc.)
	try {
		const { error: processError } = await supabase.rpc(
			'process_subscription_payment',
			{
				p_subscription_id: subscription.id,
				p_amount: amount,
				p_currency: currency.toUpperCase(),
				p_stripe_payment_intent_id: invoice.payment_intent,
				p_commission_rate: 30.0,
			},
		);
		if (processError) {
			console.error(
				'Failed to process subscription payment:',
				processError.message,
			);
		} else {
			console.log(`Processed subscription payment: ${subscription.id}`);
		}
	} catch (processError) {
		console.error('Error processing subscription payment:', processError);
		// Don't throw here, subscription should still be marked as active
	}
}
async function handleSubscriptionCreated(event, supabase) {
	const subscription = event.data.object;
	// Update subscription with Stripe details
	const { error } = await supabase
		.from('subscriptions')
		.update({
			stripe_subscription_id: subscription.id,
			status: subscription.status,
			current_period_start: new Date(subscription.current_period_start * 1000),
			current_period_end: new Date(subscription.current_period_end * 1000),
		})
		.eq('stripe_subscription_id', subscription.id);
	if (error) {
		console.error('Failed to update subscription:', error.message);
	}
	console.log(`Subscription created: ${subscription.id}`);
}
async function handleSubscriptionUpdated(event, supabase) {
	const subscription = event.data.object;
	console.log(
		`Subscription updated: ${subscription.id}, status: ${subscription.status}`,
	);
	// Update subscription status and period
	const { error } = await supabase
		.from('subscriptions')
		.update({
			status: subscription.status,
			current_period_start: new Date(subscription.current_period_start * 1000),
			current_period_end: new Date(subscription.current_period_end * 1000),
			updated_at: new Date(),
		})
		.eq('stripe_subscription_id', subscription.id);
	if (error) {
		console.error('Failed to update subscription:', error.message);
		throw new Error(`Failed to update subscription: ${error.message}`);
	} else {
		console.log(`Updated subscription in database: ${subscription.id}`);
	}
}
async function handleSubscriptionDeleted(event, supabase) {
	const subscription = event.data.object;
	console.log(`Subscription deleted: ${subscription.id}`);
	// Mark subscription as canceled
	const { error } = await supabase
		.from('subscriptions')
		.update({
			status: 'canceled',
			updated_at: new Date(),
		})
		.eq('stripe_subscription_id', subscription.id);
	if (error) {
		console.error('Failed to cancel subscription:', error.message);
		throw new Error(`Failed to cancel subscription: ${error.message}`);
	} else {
		console.log(`Marked subscription as canceled: ${subscription.id}`);
	}
}
async function handleInvoicePaymentFailed(event, supabase) {
	const invoice = event.data.object;
	const subscriptionId = invoice.subscription;
	console.log(`Invoice payment failed for subscription: ${subscriptionId}`);
	// Update subscription status to past_due
	const { error } = await supabase
		.from('subscriptions')
		.update({
			status: 'past_due',
			updated_at: new Date(),
		})
		.eq('stripe_subscription_id', subscriptionId);
	if (error) {
		console.error('Failed to update subscription status:', error.message);
	} else {
		console.log(`Updated subscription status to past_due: ${subscriptionId}`);
	}
}
