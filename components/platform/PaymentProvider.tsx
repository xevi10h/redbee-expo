import React from 'react';
import { Platform } from 'react-native';

// Conditional import for Stripe Provider
let RealStripeProvider: any;
if (Platform.OS !== 'web') {
  try {
    const stripe = require('@stripe/stripe-react-native');
    RealStripeProvider = stripe.StripeProvider;
  } catch (e) {
    console.warn('Stripe not available on this platform');
  }
}

export function StripeProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  // If no Stripe provider available (web) or key not configured, return children directly
  if (!RealStripeProvider || !publishableKey || publishableKey === 'your_stripe_publishable_key_here') {
    return <>{children}</>;
  }
  
  return (
    <RealStripeProvider publishableKey={publishableKey}>
      {children}
    </RealStripeProvider>
  );
}