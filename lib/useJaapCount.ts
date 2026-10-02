import { useJaap } from "./state";

export { DEFAULT_SETTINGS } from "./state";
export type { Theme, Settings as JaapSettings } from "./state";

/**
 * Read the shared jaap state. Every component calling this sees the same
 * data — it all lives in the single JaapProvider mounted in app/providers.tsx.
 */
export function useJaapCount() {
  const { state, loading, resetToday, ...actions } = useJaap();
  const { settings, ...data } = state;

  return {
    data,
    settings,
    todayLoading: loading,
    ...actions,
    resetAll: resetToday,
  };
}
