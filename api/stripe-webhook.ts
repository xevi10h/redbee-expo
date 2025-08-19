// This is an example implementation for Stripe webhooks
// In a real app, this would be deployed as a server endpoint (e.g., Vercel, Netlify, or your backend)

import { supabase } from '@/lib/supabase';

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

/**
 * Handle Stripe webhook events
 * This function should be deployed as a server endpoint to handle Stripe webhooks
 * 
 * Webhook URL example: https://yourapi.com/api/stripe-webhook
 * 
 * Important: Add this URL to your Stripe webhook configuration
 */
export async function handleStripeWebhook(event: StripeWebhookEvent) {
  console.log(`Received Stripe webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event);
        break;
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
        
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
        
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Webhook error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function handlePaymentIntentSucceeded(event: StripeWebhookEvent) {
  const paymentIntent = event.data.object;
  
  // Update payment transaction status
  const { error } = await supabase
    .from('payment_transactions')
    .update({ 
      status: 'succeeded',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
    
  if (error) {
    throw new Error(`Failed to update payment transaction: ${error.message}`);
  }
  
  console.log(`Payment intent succeeded: ${paymentIntent.id}`);
}

async function handleInvoicePaymentSucceeded(event: StripeWebhookEvent) {
  const invoice = event.data.object;
  const subscriptionId = invoice.subscription;
  const amount = invoice.amount_paid / 100; // Convert from cents
  const currency = invoice.currency;
  
  // Get subscription details
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();
    
  if (subError || !subscription) {
    throw new Error(`Subscription not found: ${subscriptionId}`);
  }
  
  // Process subscription payment
  const { error: processError } = await supabase.rpc('process_subscription_payment', {
    p_subscription_id: subscription.id,
    p_amount: amount,
    p_currency: currency.toUpperCase(),
    p_stripe_payment_intent_id: invoice.payment_intent,
    p_commission_rate: 30.00
  });
  
  if (processError) {
    throw new Error(`Failed to process subscription payment: ${processError.message}`);
  }
  
  console.log(`Invoice payment succeeded for subscription: ${subscriptionId}`);
}

async function handleSubscriptionCreated(event: StripeWebhookEvent) {
  const subscription = event.data.object;
  
  // Update subscription with Stripe details
  const { error } = await supabase
    .from('subscriptions')
    .update({
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
    
  if (error) {
    console.error('Failed to update subscription:', error.message);
  }
  
  console.log(`Subscription created: ${subscription.id}`);
}

async function handleSubscriptionUpdated(event: StripeWebhookEvent) {
  const subscription = event.data.object;
  
  // Update subscription status and period
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
    
  if (error) {
    console.error('Failed to update subscription:', error.message);
  }
  
  console.log(`Subscription updated: ${subscription.id}`);
}

async function handleSubscriptionDeleted(event: StripeWebhookEvent) {
  const subscription = event.data.object;
  
  // Mark subscription as canceled
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id);
    
  if (error) {
    console.error('Failed to cancel subscription:', error.message);
  }
  
  console.log(`Subscription canceled: ${subscription.id}`);
}

async function handleSetupIntentSucceeded(event: StripeWebhookEvent) {
  const setupIntent = event.data.object;
  
  // Payment method setup succeeded
  // This is handled in the client-side PaymentService.addPaymentMethod method
  console.log(`Setup intent succeeded: ${setupIntent.id}`);
}

// Example API route implementation for Next.js/Vercel
/*
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  
  let event: StripeWebhookEvent;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ message: 'Webhook signature verification failed' });
  }

  const result = await handleStripeWebhook(event);
  
  if (result.success) {
    res.status(200).json({ received: true });
  } else {
    res.status(500).json({ error: result.error });
  }
}
*/

// Example for Express.js
/*
app.post('/api/stripe-webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event: StripeWebhookEvent;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook signature verification failed');
  }

  const result = await handleStripeWebhook(event);
  
  if (result.success) {
    res.status(200).json({ received: true });
  } else {
    res.status(500).json({ error: result.error });
  }
});
*/