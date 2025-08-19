# Stripe Integration Setup Guide

This guide will help you set up Stripe payments for your Redbee app, including subscriptions, payment methods, and earnings management.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe CLI installed (for webhook testing)
3. A backend server to handle Stripe webhooks

## Step 1: Stripe Account Setup

### 1.1 Get Your API Keys
1. Log in to your Stripe Dashboard
2. Go to Developers → API keys
3. Copy your **Publishable key** and **Secret key**
4. For production, use your live keys

### 1.2 Update Environment Variables
Update your `.env` file:

```env
# Replace with your actual Stripe publishable key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Backend configuration (update with your backend URL)
EXPO_PUBLIC_API_BASE_URL=https://your-backend.com/api
```

## Step 2: Backend API Setup

You need to create the following API endpoints on your backend:

### 2.1 Create Subscription Endpoint
```
POST /api/create-subscription
```

**Request Body:**
```json
{
  "creator_id": "uuid",
  "payment_method_id": "pm_xxxxx",
  "price": 9.99,
  "currency": "USD"
}
```

**Response:**
```json
{
  "subscription_id": "sub_xxxxx",
  "client_secret": "pi_xxxxx_secret_xxxxx",
  "requires_action": false
}
```

### 2.2 Cancel Subscription Endpoint
```
POST /api/cancel-subscription
```

**Request Body:**
```json
{
  "subscription_id": "sub_xxxxx"
}
```

### 2.3 Setup Intent Endpoint (for adding payment methods)
```
POST /api/create-setup-intent
```

**Response:**
```json
{
  "client_secret": "seti_xxxxx_secret_xxxxx"
}
```

### 2.4 Detach Payment Method Endpoint
```
POST /api/detach-payment-method
```

**Request Body:**
```json
{
  "payment_method_id": "pm_xxxxx"
}
```

## Step 3: Webhook Configuration

### 3.1 Set Up Webhook Endpoint
1. Deploy the webhook handler from `api/stripe-webhook.ts` to your backend
2. The endpoint should be accessible at `/api/stripe-webhook`

### 3.2 Configure Webhooks in Stripe Dashboard
1. Go to Developers → Webhooks in your Stripe Dashboard
2. Click "Add endpoint"
3. Set the URL to `https://your-backend.com/api/stripe-webhook`
4. Select the following events:
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `setup_intent.succeeded`

### 3.3 Get Webhook Secret
1. After creating the webhook, copy the **Signing secret**
2. Add it to your backend environment variables:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Step 4: Database Migration

The database tables have already been created by running:
```bash
supabase db push
```

This creates the following tables:
- `payment_methods` - User payment methods
- `creator_earnings` - Earnings from subscriptions
- `withdrawals` - Withdrawal requests
- `payment_transactions` - Transaction history

## Step 5: Testing

### 5.1 Test with Stripe CLI (Local Development)
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to Stripe CLI: `stripe login`
3. Forward webhooks to your local server:
```bash
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

### 5.2 Test Payment Methods
Use Stripe's test card numbers:
- **Visa:** 4242424242424242
- **Visa (debit):** 4000056655665556
- **Mastercard:** 5555555555554444
- **American Express:** 378282246310005

## Step 6: App Features

The integration provides the following features:

### For Subscribers:
1. **Payment Methods Management** (`/profile/payment-methods`)
   - Add/remove payment methods
   - Set default payment method
   - View card details

2. **Subscription Management** (`/profile/subscriptions`)
   - View active subscriptions
   - Cancel subscriptions
   - See renewal dates and pricing

### For Creators:
1. **Earnings Dashboard** (`/profile/earnings`)
   - View available balance
   - See earnings history
   - Track commission deductions (30%)

2. **Withdraw Funds**
   - Minimum withdrawal: $100
   - PayPal or bank account options
   - 3-5 business day processing

### Subscription Flow:
1. User tries to subscribe to a creator
2. If no payment method exists, they're prompted to add one
3. Payment is processed through Stripe
4. Subscription is created and activated
5. Creator earns money (minus 30% commission)
6. Subscription renews monthly automatically

## Step 7: Production Considerations

### 7.1 Security
- Use HTTPS for all webhook endpoints
- Verify webhook signatures
- Store sensitive data encrypted
- Use environment variables for secrets

### 7.2 Error Handling
- Handle failed payments gracefully
- Implement retry logic for webhooks
- Log all payment-related errors

### 7.3 Compliance
- Implement proper terms of service
- Handle subscription cancellations properly
- Provide clear pricing information
- Follow local tax regulations

## Step 8: Commission System

The app implements a 30% commission system:
- When a user pays $10/month for a subscription
- Creator receives $7 (after 30% commission)
- Platform keeps $3

This is handled automatically in the `process_subscription_payment` database function.

## Troubleshooting

### Common Issues:

1. **Stripe key not configured**
   - Make sure `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
   - Don't use the secret key in the frontend

2. **Webhook not receiving events**
   - Check webhook URL is accessible
   - Verify webhook secret is correct
   - Check webhook event selection in Stripe Dashboard

3. **Payment method setup fails**
   - Ensure Stripe is initialized before use
   - Check device/platform compatibility
   - Verify network connectivity

4. **Database errors**
   - Run `supabase db push` to apply migrations
   - Check RLS policies are correctly configured
   - Verify user authentication

## Support

For issues with this integration:
1. Check Stripe Dashboard logs
2. Review webhook delivery attempts
3. Check app logs for errors
4. Verify API endpoint responses

## Additional Resources

- [Stripe React Native Documentation](https://github.com/stripe/stripe-react-native)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)