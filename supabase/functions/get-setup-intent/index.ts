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
		const { client_secret } = await req.json();

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

		// Extract setup intent ID from client secret
		const setupIntentId = client_secret.split('_secret_')[0];

		// Retrieve setup intent with payment method details
		const setupIntent = await stripe.setupIntents.retrieve(setupIntentId, {
			expand: ['payment_method', 'payment_method.card'],
		});

		if (setupIntent.status !== 'succeeded') {
			return new Response(
				JSON.stringify({ error: 'Setup intent not completed' }),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				},
			);
		}

		return new Response(
			JSON.stringify({
				id: setupIntent.id,
				status: setupIntent.status,
				payment_method: setupIntent.payment_method,
			}),
			{
				status: 200,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		);
	} catch (error) {
		console.error('Error retrieving setup intent:', error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
