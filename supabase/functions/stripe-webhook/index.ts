import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response('Missing signature or webhook secret', { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log(`Received Stripe webhook event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event, supabaseAdmin)
        break
        
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, stripe, supabaseAdmin)
        break
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, supabaseAdmin)
        break
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, supabaseAdmin)
        break
        
      case 'setup_intent.succeeded':
        await handleSetupIntentSucceeded(event, supabaseAdmin)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event, supabaseAdmin)
        break
        
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})

async function handlePaymentIntentSucceeded(event: Stripe.Event, supabaseAdmin: any) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  
  // Update payment transaction status
  const { error } = await supabaseAdmin
    .from('payment_transactions')
    .update({ 
      status: 'succeeded',
      updated_at: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id)
    
  if (error) {
    console.error(`Failed to update payment transaction: ${error.message}`)
    throw error
  }
  
  console.log(`Payment intent succeeded: ${paymentIntent.id}`)
}

async function handleInvoicePaymentSucceeded(event: Stripe.Event, stripe: Stripe, supabaseAdmin: any) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string
  const amount = invoice.amount_paid / 100 // Convert from cents
  const currency = invoice.currency
  
  // Get subscription details
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single()
    
  if (subError || !subscription) {
    console.error(`Subscription not found: ${subscriptionId}`)
    return
  }
  
  // Process subscription payment
  const { error: processError } = await supabaseAdmin.rpc('process_subscription_payment', {
    p_subscription_id: subscription.id,
    p_amount: amount,
    p_currency: currency.toUpperCase(),
    p_stripe_payment_intent_id: invoice.payment_intent,
    p_commission_rate: 30.00
  })
  
  if (processError) {
    console.error(`Failed to process subscription payment: ${processError.message}`)
    throw processError
  }
  
  console.log(`Invoice payment succeeded for subscription: ${subscriptionId}`)
}

async function handleSubscriptionUpdated(event: Stripe.Event, supabaseAdmin: any) {
  const subscription = event.data.object as Stripe.Subscription
  
  // Update subscription status and period
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)
    
  if (error) {
    console.error('Failed to update subscription:', error.message)
    throw error
  }
  
  console.log(`Subscription updated: ${subscription.id}`)
}

async function handleSubscriptionDeleted(event: Stripe.Event, supabaseAdmin: any) {
  const subscription = event.data.object as Stripe.Subscription
  
  // Mark subscription as canceled
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
    })
    .eq('stripe_subscription_id', subscription.id)
    
  if (error) {
    console.error('Failed to cancel subscription:', error.message)
    throw error
  }
  
  console.log(`Subscription canceled: ${subscription.id}`)
}

async function handleSetupIntentSucceeded(event: Stripe.Event, supabaseAdmin: any) {
  const setupIntent = event.data.object as Stripe.SetupIntent
  
  // The payment method setup succeeded
  // This is handled in the client-side PaymentService.addPaymentMethod method
  console.log(`Setup intent succeeded: ${setupIntent.id}`)
}

async function handlePaymentFailed(event: Stripe.Event, supabaseAdmin: any) {
  const invoice = event.data.object as Stripe.Invoice
  const subscriptionId = invoice.subscription as string
  
  // Update subscription status to past_due
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId)
    
  if (error) {
    console.error('Failed to update subscription status:', error.message)
  }
  
  // Update payment transaction status
  if (invoice.payment_intent) {
    await supabaseAdmin
      .from('payment_transactions')
      .update({ 
        status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', invoice.payment_intent)
  }
  
  console.log(`Payment failed for subscription: ${subscriptionId}`)
}