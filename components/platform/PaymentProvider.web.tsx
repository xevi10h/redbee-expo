import React from 'react';

// Mock Stripe provider for web - payments not supported on web yet
export function StripeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}