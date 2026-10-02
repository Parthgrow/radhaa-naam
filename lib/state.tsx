"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { addDays, todayKey } from "./date";

export type Theme = "lotus" | "dark" | "auto";

export type Settings = {
  naam: string;          // e.g. "राधे राधे"
  transliteration: string; // e.g. "Radhe Radhe"
  beadsPerMala: number;  // default 108
  malaGoal: number;      // default 5
  haptics: boolean;
  sound: boolean;
  theme: Theme;
};

export type DailyRecord = {
  date: string;       // YYYY-MM-DD
  beads: number;      // total beads counted that day
  malas: number;      // completed malas that day
};

export type JaapState = {
  currentBead: number;       // 0..beadsPerMala-1
  todayDate: string;         // YYYY-MM-DD of the active session
  todayBeads: number;        // counter for today
  todayMalas: number;        // mala counter for today
  lifetimeBeads: number;
  lifetimeMalas: number;
  history: Record<string, DailyRecord>; // past days only — today lives in today*
  settings: Settings;
};

export const DEFAULT_SETTINGS: Settings = {
  naam: "राधे राधे",
  transliteration: "Radhe Radhe",
  beadsPerMala: 108,
  malaGoal: 5,
  haptics: true,
  sound: true,
  theme: "lotus",
};

const HISTORY_DAYS = 90;

function freshState(): JaapState {
  return {
    currentBead: 0,
    todayDate: todayKey(),
    todayBeads: 0,
    todayMalas: 0,
    lifetimeBeads: 0,
    lifetimeMalas: 0,
    history: {},
    settings: { ...DEFAULT_SETTINGS },
  };
}

type Action =
  | { type: "HYDRATE"; payload: JaapState }
  | { type: "TICK_DAY"; date: string }
  | { type: "COUNT" }
  | { type: "ADD_JAAPS"; amount: number; date?: string }
  | { type: "UNDO" }
  | { type: "RESET_BEAD" }
  | { type: "NEXT_MALA" }   // manual mala advance
  | { type: "RESET_TODAY" }
  | { type: "UPDATE_SETTINGS"; patch: Partial<Settings> };

function applyDayRollover(state: JaapState, today: string): JaapState {
  if (state.todayDate === today) return state;
  // archive the finished day's tally into history
  const history = { ...state.history };
  if (state.todayBeads > 0) {
    history[state.todayDate] = {
      date: state.todayDate,
      beads: state.todayBeads,
      malas: state.todayMalas,
    };
  }
  return {
    ...state,
    history,
    todayDate: today,
    todayBeads: 0,
    todayMalas: 0,
    currentBead: 0,
  };
}

/** Adding beads to a past day recomputes its malas from the new bead total. */
function addToPastDay(
  existing: DailyRecord | undefined,
  date: string,
  amount: number,
  beadsPerMala: number
): DailyRecord {
  const beads = (existing?.beads ?? 0) + amount;
  return { date, beads, malas: Math.floor(beads / beadsPerMala) };
}

function reducer(state: JaapState, action: Action): JaapState {
  switch (action.type) {
    case "HYDRATE":
      return applyDayRollover(action.payload, todayKey());

    case "TICK_DAY":
      return applyDayRollover(state, action.date);

    case "COUNT": {
      const malaJustCompleted = state.currentBead + 1 >= state.settings.beadsPerMala;
      return {
        ...state,
        currentBead: malaJustCompleted ? 0 : state.currentBead + 1,
        todayBeads: state.todayBeads + 1,
        lifetimeBeads: state.lifetimeBeads + 1,
        todayMalas: state.todayMalas + (malaJustCompleted ? 1 : 0),
        lifetimeMalas: state.lifetimeMalas + (malaJustCompleted ? 1 : 0),
      };
    }

    case "ADD_JAAPS": {
      const amount = Math.max(0, Math.floor(action.amount));
      if (amount === 0) return state;
      const beadsPerMala = state.settings.beadsPerMala;
      const targetDate = action.date ?? state.todayDate;

      // Past-date path: write to history, don't touch currentBead
      if (targetDate !== state.todayDate) {
        const existing = state.history[targetDate];
        const updated = addToPastDay(existing, targetDate, amount, beadsPerMala);
        return {
          ...state,
          history: { ...state.history, [targetDate]: updated },
          lifetimeBeads: state.lifetimeBeads + amount,
          lifetimeMalas: state.lifetimeMalas + (updated.malas - (existing?.malas ?? 0)),
        };
      }

      const total = state.currentBead + amount;
      const malasCompleted = Math.floor(total / beadsPerMala);
      return {
        ...state,
        currentBead: total % beadsPerMala,
        todayBeads: state.todayBeads + amount,
        lifetimeBeads: state.lifetimeBeads + amount,
        todayMalas: state.todayMalas + malasCompleted,
        lifetimeMalas: state.lifetimeMalas + malasCompleted,
      };
    }

    case "UNDO": {
      // Step back one bead. At bead 0 with a completed mala, step back into the
      // last bead of the previous mala and un-complete it. Repeatable.
      if (state.todayBeads === 0) return state;
      const crossesMala = state.currentBead === 0 && state.todayMalas > 0;
      return {
        ...state,
        currentBead: crossesMala
          ? state.settings.beadsPerMala - 1
          : Math.max(0, state.currentBead - 1),
        todayBeads: state.todayBeads - 1,
        lifetimeBeads: Math.max(0, state.lifetimeBeads - 1),
        todayMalas: state.todayMalas - (crossesMala ? 1 : 0),
        lifetimeMalas: Math.max(0, state.lifetimeMalas - (crossesMala ? 1 : 0)),
      };
    }

    case "RESET_BEAD":
      return { ...state, currentBead: 0 };

    case "NEXT_MALA":
      return {
        ...state,
        currentBead: 0,
        todayMalas: state.todayMalas + 1,
        lifetimeMalas: state.lifetimeMalas + 1,
      };

    case "RESET_TODAY":
      return {
        ...state,
        currentBead: 0,
        todayBeads: 0,
        todayMalas: 0,
        lifetimeBeads: Math.max(0, state.lifetimeBeads - state.todayBeads),
        lifetimeMalas: Math.max(0, state.lifetimeMalas - state.todayMalas),
      };

    case "UPDATE_SETTINGS": {
      const settings = { ...state.settings, ...action.patch };
      // If beadsPerMala shrank below currentBead, snap to 0.
      const currentBead =
        state.currentBead >= settings.beadsPerMala ? 0 : state.currentBead;
      return { ...state, settings, currentBead };
    }

    default:
      return state;
  }
}

async function postDailyRecord(date: string, beads: number, malas: number) {
  try {
    const res = await fetch("/api/jaap/save-daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, beads, malas, clientTimestamp: new Date().toISOString() }),
    });
    if (!res.ok) console.warn(`Sync failed: ${res.status} ${res.statusText}`);
  } catch (error) {
    console.error("Sync error:", error);
  }
}

type JaapContextValue = {
  state: JaapState;
  /** True until the session and the user's data have loaded. */
  loading: boolean;
  count: () => void;
  addJaaps: (amount: number, date?: string) => void;
  undo: () => void;
  resetBead: () => void;
  nextMala: () => void;
  resetToday: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
};

const JaapContext = createContext<JaapContextValue | null>(null);

export function JaapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  const stateRef = useRef(state);
  // Only write to the server once we know what it holds; otherwise a failed
  // load would overwrite the user's saved count with a fresh zero.
  const canSyncRef = useRef(false);
  const lastSyncedRef = useRef<{ date: string; beads: number; malas: number } | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Load today's count + recent history once per signed-in user
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    canSyncRef.current = false;

    const today = todayKey();
    const startDate = todayKey(addDays(new Date(), -HISTORY_DAYS));

    Promise.all([
      fetch(`/api/jaap/save-daily?date=${today}`),
      fetch(`/api/jaap/history?startDate=${startDate}&endDate=${today}`),
    ])
      .then(async ([todayRes, historyRes]) => {
        if (!todayRes.ok || !historyRes.ok) {
          throw new Error(`load failed: ${todayRes.status} / ${historyRes.status}`);
        }
        const [todayResult, historyResult] = await Promise.all([
          todayRes.json(),
          historyRes.json(),
        ]);
        if (cancelled) return;

        const settings = stateRef.current.settings;
        const todayBeads: number = todayResult.data?.beads ?? 0;
        const todayMalas: number = todayResult.data?.malas ?? 0;
        const history: Record<string, DailyRecord> = { ...(historyResult.data ?? {}) };
        delete history[today];

        lastSyncedRef.current = { date: today, beads: todayBeads, malas: todayMalas };
        canSyncRef.current = true;
        dispatch({
          type: "HYDRATE",
          payload: {
            ...freshState(),
            todayDate: today,
            todayBeads,
            todayMalas,
            currentBead: todayBeads % settings.beadsPerMala,
            // TODO: real lifetime totals come from the server (not stored yet)
            lifetimeBeads: todayBeads,
            lifetimeMalas: todayMalas,
            history,
            settings,
          },
        });
      })
      .catch((error) => {
        console.error("Failed to load jaap data:", error);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Save today's count whenever it changes
  const { todayDate, todayBeads, todayMalas } = state;
  useEffect(() => {
    if (!canSyncRef.current) return;
    const last = lastSyncedRef.current;
    if (last && last.date === todayDate && last.beads === todayBeads && last.malas === todayMalas) {
      return;
    }
    lastSyncedRef.current = { date: todayDate, beads: todayBeads, malas: todayMalas };
    // A fresh day after rollover has nothing to save yet
    if (last && last.date !== todayDate && todayBeads === 0 && todayMalas === 0) return;
    postDailyRecord(todayDate, todayBeads, todayMalas);
  }, [todayDate, todayBeads, todayMalas]);

  // Apply theme class on every settings.theme change
  useEffect(() => {
    applyThemeClass(state.settings.theme);
  }, [state.settings.theme]);

  // Detect day rollover while app is open
  useEffect(() => {
    const tick = () => {
      const today = todayKey();
      if (today !== todayDate) dispatch({ type: "TICK_DAY", date: today });
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [todayDate]);

  const count = useCallback(() => dispatch({ type: "COUNT" }), []);
  const addJaaps = useCallback((amount: number, date?: string) => {
    const s = stateRef.current;
    dispatch({ type: "ADD_JAAPS", amount, date });
    // Today's changes are saved by the effect above; past days are saved here.
    const n = Math.max(0, Math.floor(amount));
    if (date && date !== s.todayDate && n > 0 && canSyncRef.current) {
      const updated = addToPastDay(s.history[date], date, n, s.settings.beadsPerMala);
      postDailyRecord(date, updated.beads, updated.malas);
    }
  }, []);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const resetBead = useCallback(() => dispatch({ type: "RESET_BEAD" }), []);
  const nextMala = useCallback(() => dispatch({ type: "NEXT_MALA" }), []);
  const resetToday = useCallback(() => dispatch({ type: "RESET_TODAY" }), []);
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => dispatch({ type: "UPDATE_SETTINGS", patch }),
    []
  );

  const loading = status === "loading" || (status === "authenticated" && loadedFor !== userId);

  const value = useMemo<JaapContextValue>(
    () => ({
      state,
      loading,
      count,
      addJaaps,
      undo,
      resetBead,
      nextMala,
      resetToday,
      updateSettings,
    }),
    [state, loading, count, addJaaps, undo, resetBead, nextMala, resetToday, updateSettings]
  );

  return <JaapContext.Provider value={value}>{children}</JaapContext.Provider>;
}

export function useJaap(): JaapContextValue {
  const ctx = useContext(JaapContext);
  if (!ctx) throw new Error("useJaap must be used within JaapProvider");
  return ctx;
}

function applyThemeClass(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-dark");
  if (theme === "dark") root.classList.add("theme-dark");
  else if (theme === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("theme-dark");
  }
}
