'use client';

import Link from 'next/link';
import { useSubscription } from '@/lib/subscription/SubscriptionProvider';
import { formatTrialRemaining } from '@/lib/subscription/derive';

export default function SubscriptionStatus() {
  const { view, isLoading } = useSubscription();

  if (isLoading) {
    return null;
  }

  if (view.status === 'active') {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
        <p className="text-green-800">✓ Premium account active</p>
      </div>
    );
  }

  if (view.isTrialing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
        <p className="text-blue-900 mb-2">
          Free trial — {formatTrialRemaining(view)}
        </p>
        <Link
          href="/payments"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Upgrade to Premium →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
      <p className="text-blue-900 mb-2">
        Upgrade to Premium for unlimited features
      </p>
      <Link
        href="/payments"
        className="text-blue-600 hover:text-blue-700 font-medium"
      >
        View Plans →
      </Link>
    </div>
  );
}
