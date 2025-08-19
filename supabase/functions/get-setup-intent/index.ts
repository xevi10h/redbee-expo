import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders })
	}

	try {
		// Get the authorization header from the request
		const authHeader = req.headers.get('Authorization')!
		const token = authHeader.replace('Bearer ', '')

		// Create a Supabase client with the service role key
		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
		)

		// Get the user from the token
		const {
			data: { user },
			error: userError,
		} = await supabaseAdmin.auth.getUser(token)

		if (userError || !user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			})
		}

		// Parse the request body
		const { client_secret } = await req.json()

		if (!client_secret) {
			return new Response(JSON.stringify({ error: 'Client secret is required' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			})
		}

		// Initialize Stripe
		const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
			apiVersion: '2023-10-16',
		})

		// Retrieve the setup intent
		const setupIntent = await stripe.setupIntents.retrieve(
			client_secret.split('_secret_')[0]
		)

		// Retrieve the payment method if attached
		let paymentMethod = null
		if (setupIntent.payment_method) {
			paymentMethod = await stripe.paymentMethods.retrieve(
				typeof setupIntent.payment_method === 'string' 
					? setupIntent.payment_method 
					: setupIntent.payment_method.id
			)
		}

		return new Response(
			JSON.stringify({ 
				...setupIntent,
				payment_method: paymentMethod 
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			}
		)
	} catch (error) {
		console.error('Error retrieving setup intent:', error)
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		})
	}
})