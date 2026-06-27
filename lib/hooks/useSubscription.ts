// Back-compat shim. The real implementation now lives in the Subscription
// context so the whole app shares a single fetch. Import from either path.
export {
  useSubscription,
  SubscriptionProvider,
} from '@/lib/subscription/SubscriptionProvider';
export type {
  SubscriptionView,
  AccessStatus,
} from '@/lib/subscription/derive';
