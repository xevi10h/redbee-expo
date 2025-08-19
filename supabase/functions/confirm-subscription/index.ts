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
    const { subscription_id, payment_intent_id } = await req.json()

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

    // Get the subscription from Stripe to verify its current status
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription_id)
    
    if (!stripeSubscription) {
      return new Response(
        JSON.stringify({ error: 'Subscription not found in Stripe' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Update subscription status in database
    const { data: updatedSubscription, error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscription_id)
      .eq('subscriber_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update subscription:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update subscription status' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // If the subscription is now active, process the successful payment
    if (stripeSubscription.status === 'active') {
      const invoice = await stripe.invoices.retrieve(stripeSubscription.latest_invoice as string)
      const paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent as string)

      // Update payment transaction status
      await supabaseAdmin
        .from('payment_transactions')
        .update({
          status: paymentIntent.status,
        })
        .eq('stripe_payment_intent_id', paymentIntent.id)

      // Process the successful payment if not already processed
      await supabaseAdmin.rpc('process_subscription_payment', {
        p_subscription_id: updatedSubscription.id,
        p_amount: updatedSubscription.price,
        p_currency: updatedSubscription.currency.toUpperCase(),
        p_stripe_payment_intent_id: paymentIntent.id,
        p_commission_rate: 30.00
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          current_period_start: updatedSubscription.current_period_start,
          current_period_end: updatedSubscription.current_period_end,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error confirming subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})