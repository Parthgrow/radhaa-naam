'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import {
  deriveView,
  type SubscriptionPayload,
  type SubscriptionView,
} from './derive';

interface SubscriptionContextValue {
  view: SubscriptionView;
  isLoading: boolean;
  error: string | null;
  /** Re-fetch status from the server (e.g. after returning from checkout). */
  refetch: () => Promise<void>;
}

const EMPTY_PAYLOAD: SubscriptionPayload = { status: 'none' };

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status: authStatus } = useSession();
  const [payload, setPayload] = useState<SubscriptionPayload>(EMPTY_PAYLOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Avoid setState after unmount during the async fetch.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payments/verify');
      if (!res.ok) throw new Error('Failed to fetch subscription');
      const data = (await res.json()) as SubscriptionPayload;
      if (mounted.current) setPayload(data);
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Fail OPEN for presentation: leave whatever we last had. The server
        // layer (Part 2) is the real gate, so a transient read error here
        // must not paywall a paying user.
      }
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  // Fetch when authenticated; reset to `none` when signed out.
  useEffect(() => {
    if (authStatus === 'loading') return;
    if (authStatus === 'unauthenticated') {
      setPayload(EMPTY_PAYLOAD);
      setIsLoading(false);
      setError(null);
      return;
    }
    fetchStatus();
  }, [authStatus, fetchStatus]);

  // Refresh when the tab regains focus, so a trial that expired elsewhere
  // (or a checkout completed in another tab) is reflected.
  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const onFocus = () => fetchStatus();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [authStatus, fetchStatus]);

  const view = useMemo(() => deriveView(payload, new Date()), [payload]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({ view, isLoading, error, refetch: fetchStatus }),
    [view, isLoading, error, fetchStatus]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error(
      'useSubscription must be used within a <SubscriptionProvider>'
    );
  }
  return ctx;
}
