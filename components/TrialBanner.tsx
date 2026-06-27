'use client';

import Link from 'next/link';
import { useSubscription } from '@/lib/subscription/SubscriptionProvider';
import { formatTrialRemaining } from '@/lib/subscription/derive';

/**
 * Sticky banner shown only while the user is in their trial. Turns urgent in
 * the final two days. Hidden for active/expired/none.
 */
export default function TrialBanner() {
  const { view, isLoading } = useSubscription();

  if (isLoading || !view.isTrialing) return null;

  const urgent = view.daysLeftInTrial <= 2;
  console.log("value of view is ", view); 

  return (
    <div
      className={`w-full text-sm px-4 py-2 flex items-center justify-center gap-3 ${
        urgent
          ? 'bg-amber-100 text-amber-900 border-b border-amber-200'
          : 'bg-blue-50 text-blue-900 border-b border-blue-100'
      }`}
    >
      <span>
        Free trial — <strong>{formatTrialRemaining(view)}</strong>
      </span>
      <Link
        href="/payments"
        className="font-medium underline underline-offset-2 hover:opacity-80"
      >
        Upgrade now
      </Link>
    </div>
  );
}
