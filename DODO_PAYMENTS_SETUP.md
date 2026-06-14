# DodoPayments Integration Setup Guide

## Overview
This document describes the DodoPayments integration added to the radhaa-naam app.

## Files Created

### Configuration & Utilities
- **lib/dodo-payments.ts** - DodoPayments client initialization and payment utilities
- **lib/hooks/useSubscription.ts** - React hook for checking subscription status

### API Routes
- **app/api/payments/create-session/route.ts** - Create a checkout session
- **app/api/payments/verify/route.ts** - Verify user's subscription status
- **app/api/webhook/route.ts** - Handle DodoPayments webhooks

### Frontend Pages & Components
- **app/payments/page.tsx** - Main pricing/payment page
- **app/payments/success/page.tsx** - Post-payment success page
- **components/PaymentCard.tsx** - Reusable payment plan card component
- **components/SubscriptionStatus.tsx** - Display subscription status

## Environment Variables

Required environment variables (add to `.env`):

```env
DODO_PAYMENTS_API_KEY="your-api-key"
DODO_PAYMENTS_ENVIRONMENT="test_mode"  # or "live_mode"
DODO_PAYMENTS_WEBHOOK_SECRET="your-webhook-secret"
```

## Payment Products

The following product is configured:
- **Premium Plan** (ID: `pdt_0Ngu3S3kw8H6HaBMmMI1X`) - 14-day free trial

To add more products, update `lib/dodo-payments.ts` > `PAYMENT_PRODUCTS` object.

## How to Use

### 1. Payment Page
Navigate users to `/payments` to view pricing plans. Requires authentication.

```tsx
<Link href="/payments">Upgrade to Premium</Link>
```

### 2. Check Subscription Status
Use the `useSubscription` hook in client components:

```tsx
'use client';
import { useSubscription } from '@/lib/hooks/useSubscription';

export default function MyComponent() {
  const { hasActiveSubscription, isLoading } = useSubscription();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {hasActiveSubscription ? (
        <p>Premium user!</p>
      ) : (
        <p>Regular user</p>
      )}
    </div>
  );
}
```

### 3. Use SubscriptionStatus Component
Display subscription status in your app:

```tsx
import SubscriptionStatus from '@/components/SubscriptionStatus';

export default function Dashboard() {
  return (
    <>
      <SubscriptionStatus />
      {/* rest of page */}
    </>
  );
}
```

## Setup Checklist

- [x] Add DodoPayments API key and webhook secret to `.env`
- [x] Configure product ID (pdt_0Ngu3S3kw8H6HaBMmMI1X) in `lib/dodo-payments.ts`
- [ ] Test checkout in test_mode
- [ ] Add webhook URL to DodoPayments dashboard: `https://yourdomain.com/api/webhook`
- [ ] Create premium feature restrictions using subscription check
- [ ] Switch to live_mode in `.env` for production
- [ ] Test payment flow end-to-end

## Database Schema

Subscription data is stored in Redis with the key pattern:
```
user:{userId}:subscription
```

Fields stored:
- `sessionId` - DodoPayments session ID
- `productId` - Product purchased
- `email` - Customer email
- `status` - "active" or other status
- `createdAt` - Subscription creation timestamp
- `updatedAt` - Last update timestamp

## Restricting Premium Features

To restrict features to premium users, use the subscription check:

```tsx
const { hasActiveSubscription, isLoading } = useSubscription();

if (!isLoading && !hasActiveSubscription) {
  return <PremiumOnlyUI />;
}
```

Or fetch subscription server-side:

```tsx
import { auth } from '@/lib/auth';
import { kv } from '@vercel/kv';

export async function checkPremiumStatus() {
  const session = await auth();
  if (!session?.user?.id) return false;
  
  const subscription = await kv.hgetall(
    `user:${session.user.id}:subscription`
  );
  return subscription?.status === 'active';
}
```

## Webhook Details

DodoPayments sends webhooks to `/api/webhook` for:
- `checkout.session.completed` - Successful payment
- `checkout.session.expired` - Session expired

The webhook handler:
1. Verifies the request signature using HMAC-SHA256
2. Stores subscription data in Redis
3. Returns 200 OK to acknowledge receipt

## Testing

### Test Mode
- Use test_mode in `.env`
- Use test payment credentials from DodoPayments docs
- No real charges

### Success Flow
1. User clicks "Get Started" on a plan
2. Creates checkout session via `/api/payments/create-session`
3. Redirected to DodoPayments checkout URL
4. After payment, redirected to `/payments/success`
5. Webhook stores subscription in Redis

### Error Handling
- Missing auth redirects to login
- Invalid product ID returns 400
- Failed checkout returns 500
- Webhook signature mismatch returns 401

## Security Notes

- All payment routes require authentication
- Webhook signatures are verified with HMAC-SHA256
- User IDs are embedded in session metadata
- Sensitive data (API keys) stored in environment variables only

## Next Steps

1. Get API credentials from DodoPayments dashboard
2. Update `.env` with real credentials
3. Test the flow in test mode
4. Add premium feature restrictions to your app
5. Configure webhook in DodoPayments dashboard
6. Switch to live mode for production
