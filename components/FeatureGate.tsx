'use client';

import Paywall from '@/components/Paywall';
import { useSubscription } from '@/lib/subscription/SubscriptionProvider';

interface FeatureGateProps {
  children: React.ReactNode;
  /** Shown when the user lacks access. Defaults to <Paywall />. */
  fallback?: React.ReactNode;
  /** Shown while status is still loading. Defaults to a neutral skeleton. */
  loading?: React.ReactNode;
}

/**
 * Renders `children` only when the user has access (active or trialing),
 * otherwise the fallback paywall.
 *
 * PRESENTATION ONLY — this hides UI, it does not protect data. The matching
 * premium API routes / server components must enforce access themselves
 * (Part 2). Don't rely on this gate for security.
 */
export default function FeatureGate({
  children,
  fallback,
  loading,
}: FeatureGateProps) {
  const { view, isLoading } = useSubscription();

  // Show a skeleton (not the paywall) while loading, so paying users don't see
  // a paywall flash on every page load.
  if (isLoading) {
    return (
      <>{loading ?? <div className="animate-pulse h-32 rounded-lg bg-gray-100" />}</>
    );
  }

  if (!view.isActive) {
    return <>{fallback ?? <Paywall />}</>;
  }

  return <>{children}</>;
}
