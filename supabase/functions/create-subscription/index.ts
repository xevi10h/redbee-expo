import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { creator_id, payment_method_id, price, currency = 'USD' } = await req.json()

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Get the user from the token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    })

    // Get user's Stripe customer ID
    const { data: subscriberProfile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!subscriberProfile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'Stripe customer not found. Please add a payment method first.' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Get creator's Stripe account details
    const { data: creatorProfile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id, username')
      .eq('id', creator_id)
      .single()

    // Check if user is already subscribed
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('subscriber_id', user.id)
      .eq('creator_id', creator_id)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .maybeSingle()

    if (existingSubscription) {
      return new Response(
        JSON.stringify({ error: 'Already subscribed to this creator' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Create or get price in Stripe
    let stripePriceId: string
    const priceInCents = Math.round(price * 100)

    // First, let's search for existing price
    const prices = await stripe.prices.list({
      lookup_keys: [`creator_${creator_id}_monthly_${priceInCents}`],
    })

    if (prices.data.length > 0) {
      stripePriceId = prices.data[0].id
    } else {
      // Create new price
      const stripePrice = await stripe.prices.create({
        unit_amount: priceInCents,
        currency: currency.toLowerCase(),
        recurring: { interval: 'month' },
        product_data: {
          name: `${creatorProfile?.username || 'Creator'} Monthly Subscription`,
        },
        lookup_key: `creator_${creator_id}_monthly_${priceInCents}`,
      })
      stripePriceId = stripePrice.id
    }

    // Create subscription in Stripe
    const stripeSubscription = await stripe.subscriptions.create({
      customer: subscriberProfile.stripe_customer_id,
      items: [{ price: stripePriceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      default_payment_method: payment_method_id,
      expand: ['latest_invoice.payment_intent'],
    })

    // Create subscription record in database
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .insert({
        subscriber_id: user.id,
        creator_id: creator_id,
        stripe_subscription_id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        price: price,
        currency: currency,
      })
      .select()
      .single()

    if (subscriptionError) {
      // Cancel the Stripe subscription if database insert fails
      await stripe.subscriptions.cancel(stripeSubscription.id)
      throw subscriptionError
    }

    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent

    // Create payment transaction record
    await supabaseAdmin
      .from('payment_transactions')
      .insert({
        subscription_id: subscription.id,
        payer_id: user.id,
        recipient_id: creator_id,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_invoice_id: invoice.id,
        amount: price,
        currency: currency,
        status: paymentIntent.status,
        type: 'subscription',
        description: `Monthly subscription to ${creatorProfile?.username}`,
      })

    let response = {
      subscription_id: stripeSubscription.id,
      status: stripeSubscription.status,
    }

    if (paymentIntent.status === 'requires_action') {
      response.client_secret = paymentIntent.client_secret
      response.requires_action = true
    } else if (paymentIntent.status === 'succeeded') {
      // Process the successful payment
      await supabaseAdmin.rpc('process_subscription_payment', {
        p_subscription_id: subscription.id,
        p_amount: price,
        p_currency: currency.toUpperCase(),
        p_stripe_payment_intent_id: paymentIntent.id,
        p_commission_rate: 30.00
      })
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error creating subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})