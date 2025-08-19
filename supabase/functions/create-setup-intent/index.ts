import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers':
		'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { headers: corsHeaders });
	}

	try {
		const authHeader = req.headers.get('Authorization')!;
		const token = authHeader.replace('Bearer ', '');

		const supabaseAdmin = createClient(
			Deno.env.get('SUPABASE_URL') ?? '',
			Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
		);

		const {
			data: { user },
			error: userError,
		} = await supabaseAdmin.auth.getUser(token);

		if (userError || !user) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
			apiVersion: '2023-10-16',
		});

		// Get user's Stripe customer ID
		const { data: userProfile } = await supabaseAdmin
			.from('profiles')
			.select('stripe_customer_id')
			.eq('id', user.id)
			.single();

		let customerId = userProfile?.stripe_customer_id;

		// Create customer if not exists
		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email,
				metadata: {
					user_id: user.id,
				},
			});

			customerId = customer.id;

			// Update profile with customer ID
			await supabaseAdmin
				.from('profiles')
				.update({ stripe_customer_id: customerId })
				.eq('id', user.id);
		}

		// Create setup intent
		const setupIntent = await stripe.setupIntents.create({
			customer: customerId,
			payment_method_types: ['card'],
			usage: 'off_session',
		});

		return new Response(
			JSON.stringify({
				client_secret: setupIntent.client_secret,
				setup_intent_id: setupIntent.id,
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('Error creating setup intent:', error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
