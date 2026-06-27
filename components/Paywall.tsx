'use client';

import PaymentCard from '@/components/PaymentCard';
import { PAYMENT_PRODUCTS } from '@/lib/dodo-payments';
import { useSubscription } from '@/lib/subscription/SubscriptionProvider';

/**
 * The "trial ended / subscribe to continue" screen. Reuses the existing
 * PaymentCard for the actual checkout CTA.
 */
export default function Paywall() {
  const { view } = useSubscription();

  const heading =
    view.status === 'past_due'
      ? 'Your payment needs attention'
      : view.status === 'expired'
        ? 'Your free trial has ended'
        : 'Upgrade to Premium';

  const subheading =
    view.status === 'past_due'
      ? 'Update your payment method to restore access.'
      : 'Subscribe to keep using all premium features.';

  return (
    <div className="max-w-md mx-auto text-center py-10 px-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{heading}</h2>
      <p className="text-gray-600 mb-6">{subheading}</p>
      <PaymentCard productId={PAYMENT_PRODUCTS.monthly.id} />
    </div>
  );
}
