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
    const { payment_method_id } = await req.json()

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

    // Verify that the user owns this payment method
    const { data: paymentMethod, error: paymentMethodError } = await supabaseAdmin
      .from('payment_methods')
      .select('*')
      .eq('stripe_payment_method_id', payment_method_id)
      .eq('user_id', user.id)
      .single()

    if (paymentMethodError || !paymentMethod) {
      return new Response(
        JSON.stringify({ error: 'Payment method not found or unauthorized' }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Check if this payment method is being used by any active subscriptions
    const { data: activeSubscriptions } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('subscriber_id', user.id)
      .eq('status', 'active')

    if (activeSubscriptions && activeSubscriptions.length > 0) {
      // Check if any of these subscriptions use this payment method
      for (const subscription of activeSubscriptions) {
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)
        if (stripeSubscription.default_payment_method === payment_method_id) {
          return new Response(
            JSON.stringify({ error: 'Cannot remove payment method that is being used by active subscriptions' }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            },
          )
        }
      }
    }

    // Detach payment method from Stripe
    await stripe.paymentMethods.detach(payment_method_id)

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Error detaching payment method:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})