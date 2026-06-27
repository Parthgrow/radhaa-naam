'use client';

import { useEffect } from 'react';
import { useSubscription } from '@/lib/subscription/SubscriptionProvider';

/**
 * Fire-and-forget: re-fetches subscription status once on mount. Drop this on
 * the post-checkout success page so the rest of the app reflects the new
 * subscription without a full reload.
 */
export default function RefreshSubscriptionOnMount() {
  const { refetch } = useSubscription();
  useEffect(() => {
    refetch();
  }, [refetch]);
  return null;
}
