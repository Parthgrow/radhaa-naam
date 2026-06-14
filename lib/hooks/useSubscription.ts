import { useEffect, useState } from 'react';

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  subscription: any;
  isLoading: boolean;
  error: string | null;
}

export function useSubscription(): SubscriptionStatus {
  const [status, setStatus] = useState<SubscriptionStatus>({
    hasActiveSubscription: false,
    subscription: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/payments/verify');
        if (response.ok) {
          const data = await response.json();
          setStatus({
            hasActiveSubscription: data.hasActiveSubscription,
            subscription: data.subscription,
            isLoading: false,
            error: null,
          });
        } else {
          setStatus((prev) => ({
            ...prev,
            isLoading: false,
            error: 'Failed to fetch subscription',
          }));
        }
      } catch (error) {
        setStatus((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    fetchSubscription();
  }, []);

  return status;
}
