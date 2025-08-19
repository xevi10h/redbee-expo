# Stripe Integration with Supabase Edge Functions

This guide will help you set up the complete Stripe payment system using Supabase Edge Functions instead of a separate backend service.

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Supabase CLI installed (`npm install -g supabase`)
3. Your Supabase project set up and running

## Step 1: Get Your Stripe API Keys

### 1.1 Test Keys (Development)
1. Go to your Stripe Dashboard → Developers → API keys
2. Copy your **Secret key** (starts with `sk_test_`)
3. Copy your **Publishable key** (starts with `pk_test_`)

### 1.2 Live Keys (Production)
1. Toggle to "View test data" OFF in Stripe Dashboard
2. Copy your **Secret key** (starts with `sk_live_`)
3. Copy your **Publishable key** (starts with `pk_live_`)

## Step 2: Configure Environment Variables

### 2.1 Update App Environment Variables
Update your `.env` file:

```env
# Replace with your actual Stripe publishable key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
```

### 2.2 Configure Edge Functions Environment
Update `supabase/.env.local`:

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

## Step 3: Deploy Edge Functions

### 3.1 Deploy All Functions
```bash
# Deploy all Stripe-related functions
supabase functions deploy create-setup-intent
supabase functions deploy create-subscription
supabase functions deploy cancel-subscription
supabase functions deploy detach-payment-method
supabase functions deploy stripe-webhook
```

### 3.2 Set Production Secrets (after deployment)
```bash
# Set your Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here

# Set your webhook secret (you'll get this after setting up webhooks)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

## Step 4: Database Setup

The database tables are already created. Make sure you've run:

```bash
supabase db push
```

This creates:
- `payment_methods` - User payment methods
- `creator_earnings` - Creator earnings tracking
- `withdrawals` - Withdrawal requests  
- `payment_transactions` - Payment history
- Updates to `profiles` table with Stripe fields

## Step 5: Configure Stripe Webhooks

### 5.1 Get Your Webhook Endpoint URL
After deploying the functions, your webhook URL will be:
```
https://your-project-id.supabase.co/functions/v1/stripe-webhook
```

### 5.2 Create Webhook in Stripe Dashboard
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set the URL to your webhook endpoint above
4. Select these events:
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded` 
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `setup_intent.succeeded`

### 5.3 Get Webhook Secret and Update
1. After creating the webhook, click on it
2. Copy the **Signing secret** (starts with `whsec_`)
3. Update your secret:
```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

## Step 6: Test the Integration

### 6.1 Test Payment Methods
1. Open your app and go to Settings → Payment Methods
2. Try adding a test card: `4242424242424242`
3. Use any future expiry date and any 3-digit CVC

### 6.2 Test Subscriptions  
1. Set a subscription price in your profile (e.g., $4.99)
2. Try subscribing to yourself with another account
3. Check the earnings in the Earnings section

### 6.3 Test Webhooks Locally (Optional)
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to your local Supabase
stripe listen --forward-to https://your-project-id.supabase.co/functions/v1/stripe-webhook
```

## Step 7: Production Deployment

### 7.1 Switch to Live Keys
1. Update `.env` with your live publishable key
2. Update secrets with live secret key:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_your_actual_secret_key_here
```

### 7.2 Update Webhook URL
Create a new webhook endpoint in Stripe Dashboard with your production URL.

## Available Edge Functions

### `create-setup-intent`
- **Purpose**: Creates a SetupIntent for adding payment methods
- **Authentication**: Required (Bearer token)
- **Returns**: `{ client_secret: string }`

### `create-subscription` 
- **Purpose**: Creates a new subscription
- **Authentication**: Required (Bearer token)
- **Body**: `{ creator_id, payment_method_id, price, currency }`
- **Returns**: `{ subscription_id, client_secret?, requires_action? }`

### `cancel-subscription`
- **Purpose**: Cancels an existing subscription
- **Authentication**: Required (Bearer token)  
- **Body**: `{ subscription_id }`
- **Returns**: `{ success: boolean }`

### `detach-payment-method`
- **Purpose**: Removes a payment method
- **Authentication**: Required (Bearer token)
- **Body**: `{ payment_method_id }`
- **Returns**: `{ success: boolean }`

### `stripe-webhook`
- **Purpose**: Handles Stripe webhook events
- **Authentication**: Stripe signature verification
- **Handles**: Payment confirmations, subscription updates, etc.

## Features Included

✅ **Payment Methods Management**
- Add/remove credit cards securely
- Set default payment methods
- Stripe-hosted card setup

✅ **Subscription System**
- Monthly recurring subscriptions
- Automatic payment processing
- Subscription cancellation with period-end access

✅ **Creator Earnings**
- 30% platform commission (configurable)
- Real-time balance tracking  
- Earnings history with detailed breakdown

✅ **Withdrawal System**
- $100 minimum withdrawal
- PayPal and bank account support
- Withdrawal request tracking

✅ **Webhook Processing**
- Real-time payment status updates
- Automatic earning credit
- Subscription status synchronization

## Error Handling

All functions include comprehensive error handling:
- Authentication validation
- Stripe API error handling
- Database operation validation
- Proper HTTP status codes

## Security Features

✅ **Authentication**: All functions require valid Supabase JWT tokens
✅ **Authorization**: Users can only access their own data
✅ **Webhook Verification**: All webhooks are signature-verified
✅ **Data Validation**: Input validation and sanitization
✅ **Row Level Security**: Database policies enforce user isolation

## Monitoring and Debugging

### View Function Logs
```bash
supabase functions logs stripe-webhook
supabase functions logs create-subscription
```

### Test Functions Locally
```bash
supabase functions serve
# Functions will be available at http://localhost:54321/functions/v1/function-name
```

## Troubleshooting

### Common Issues:

1. **"Stripe publishable key not configured"**
   - Make sure `.env` file has the correct `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

2. **"Setup intent creation failed"**
   - Verify your `STRIPE_SECRET_KEY` is set correctly in Supabase secrets
   - Check function logs for detailed errors

3. **"Webhook signature verification failed"**
   - Ensure `STRIPE_WEBHOOK_SECRET` matches the webhook endpoint in Stripe
   - Check that the webhook URL is correct

4. **Database errors**
   - Run `supabase db push` to ensure all migrations are applied
   - Check that RLS policies allow the operations

### Test Card Numbers:

- **Visa**: 4242424242424242
- **Visa (debit)**: 4000056655665556  
- **Mastercard**: 5555555555554444
- **American Express**: 378282246310005
- **Declined**: 4000000000000002

For more test cards: https://stripe.com/docs/testing#cards

## Support

- Stripe Documentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe React Native: https://github.com/stripe/stripe-react-native

Your complete Stripe payment system is now ready! 🚀