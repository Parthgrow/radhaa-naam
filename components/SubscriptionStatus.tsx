'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface SubscriptionData {
  hasActiveSubscription: boolean;
  subscription: any;
}

export default function SubscriptionStatus() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/payments/verify');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  if (isLoading) {
    return null;
  }

  if (subscription?.hasActiveSubscription) {
    return (
      <div className="bg-green-50 border border-green-200 rounded p-3 text-sm">
        <p className="text-green-800">
          ✓ Premium account active
        </p>
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
