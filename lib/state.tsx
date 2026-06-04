"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { todayKey } from "./date";
import { loadState, saveState } from "./storage";

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

export type PersistedState = {
  version: 1;
  currentBead: number;       // 0..beadsPerMala-1
  todayDate: string;         // YYYY-MM-DD of the active session
  todayBeads: number;        // counter for today (= history[today].beads on save)
  todayMalas: number;        // mala counter for today
  lifetimeBeads: number;
  lifetimeMalas: number;
  history: Record<string, DailyRecord>;
  lastUndoableBead: number | null; // previous bead value for single-step undo
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

function freshState(): PersistedState {
  return {
    version: 1,
    currentBead: 0,
    todayDate: todayKey(),
    todayBeads: 0,
    todayMalas: 0,
    lifetimeBeads: 0,
    lifetimeMalas: 0,
    history: {},
    lastUndoableBead: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}

type Action =
  | { type: "HYDRATE"; payload: PersistedState }
  | { type: "TICK_DAY"; date: string }
  | { type: "COUNT" }
  | { type: "ADD_JAAPS"; amount: number }
  | { type: "UNDO" }
  | { type: "RESET_BEAD" }
  | { type: "NEXT_MALA" }   // manual mala advance
  | { type: "RESET_ALL" }
  | { type: "UPDATE_SETTINGS"; patch: Partial<Settings> };

function applyDayRollover(state: PersistedState, today: string): PersistedState {
  if (state.todayDate === today) return state;
  // archive yesterday's tally into history
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
    lastUndoableBead: null,
  };
}

function reducer(state: PersistedState, action: Action): PersistedState {
  switch (action.type) {
    case "HYDRATE":
      return applyDayRollover(action.payload, todayKey());

    case "TICK_DAY":
      return applyDayRollover(state, action.date);

    case "COUNT": {
      const beadsPerMala = state.settings.beadsPerMala;
      const prevBead = state.currentBead;
      let nextBead = prevBead + 1;
      let malaJustCompleted = false;
      if (nextBead >= beadsPerMala) {
        nextBead = 0;
        malaJustCompleted = true;
      }
      const next: PersistedState = {
        ...state,
        currentBead: nextBead,
        todayBeads: state.todayBeads + 1,
        lifetimeBeads: state.lifetimeBeads + 1,
        todayMalas: state.todayMalas + (malaJustCompleted ? 1 : 0),
        lifetimeMalas: state.lifetimeMalas + (malaJustCompleted ? 1 : 0),
        lastUndoableBead: prevBead,
      };
      return next;
    }

    case "ADD_JAAPS": {
      const amount = Math.max(0, Math.floor(action.amount));
      if (amount === 0) return state;
      const beadsPerMala = state.settings.beadsPerMala;
      const total = state.currentBead + amount;
      const malasCompleted = Math.floor(total / beadsPerMala);
      return {
        ...state,
        currentBead: total % beadsPerMala,
        todayBeads: state.todayBeads + amount,
        lifetimeBeads: state.lifetimeBeads + amount,
        todayMalas: state.todayMalas + malasCompleted,
        lifetimeMalas: state.lifetimeMalas + malasCompleted,
        lastUndoableBead: null, // bulk add isn't single-step undoable
      };
    }

    case "UNDO": {
      if (state.lastUndoableBead === null) return state;
      // Reverse the last COUNT: if the previous count completed a mala (we wrapped
      // from beadsPerMala-1 → 0), undo the mala counter too.
      const beadsPerMala = state.settings.beadsPerMala;
      const wrapped = state.currentBead === 0 && state.lastUndoableBead === beadsPerMala - 1;
      return {
        ...state,
        currentBead: state.lastUndoableBead,
        todayBeads: Math.max(0, state.todayBeads - 1),
        lifetimeBeads: Math.max(0, state.lifetimeBeads - 1),
        todayMalas: Math.max(0, state.todayMalas - (wrapped ? 1 : 0)),
        lifetimeMalas: Math.max(0, state.lifetimeMalas - (wrapped ? 1 : 0)),
        lastUndoableBead: null,
      };
    }

    case "RESET_BEAD":
      return { ...state, currentBead: 0, lastUndoableBead: null };

    case "NEXT_MALA":
      return {
        ...state,
        currentBead: 0,
        todayMalas: state.todayMalas + 1,
        lifetimeMalas: state.lifetimeMalas + 1,
        lastUndoableBead: null,
      };

    case "RESET_ALL":
      return { ...freshState(), settings: state.settings };

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

type JaapContextValue = {
  state: PersistedState;
  hydrated: boolean;
  count: () => void;
  addJaaps: (amount: number) => void;
  undo: () => void;
  resetBead: () => void;
  nextMala: () => void;
  resetAll: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  malaJustCompleted: number; // increment counter — components use as effect dep
};

const JaapContext = createContext<JaapContextValue | null>(null);

export function JaapProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, freshState);
  const hydratedRef = useRef(false);
  const malaCompletionsRef = useRef(0);
  const prevLifetimeMalasRef = useRef(state.lifetimeMalas);

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const loaded = loadState();
    if (loaded) {
      dispatch({ type: "HYDRATE", payload: { ...freshState(), ...loaded, settings: { ...DEFAULT_SETTINGS, ...loaded.settings } } });
    }
    hydratedRef.current = true;
    // Apply theme class once hydrated (avoid SSR mismatch)
    applyThemeClass(loaded?.settings?.theme ?? DEFAULT_SETTINGS.theme);
  }, []);

  // Debounced save (~120ms)
  useEffect(() => {
    if (!hydratedRef.current) return;
    const id = window.setTimeout(() => saveState(state), 120);
    return () => window.clearTimeout(id);
  }, [state]);

  // Apply theme class on every settings.theme change
  useEffect(() => {
    if (!hydratedRef.current) return;
    applyThemeClass(state.settings.theme);
  }, [state.settings.theme]);

  // Detect day rollover while app is open
  useEffect(() => {
    const tick = () => {
      const today = todayKey();
      if (today !== state.todayDate) dispatch({ type: "TICK_DAY", date: today });
    };
    const id = window.setInterval(tick, 30_000);
    const onVis = () => tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [state.todayDate]);

  // Track mala completions for animation triggers
  if (state.lifetimeMalas > prevLifetimeMalasRef.current) {
    malaCompletionsRef.current += 1;
    prevLifetimeMalasRef.current = state.lifetimeMalas;
  } else if (state.lifetimeMalas < prevLifetimeMalasRef.current) {
    prevLifetimeMalasRef.current = state.lifetimeMalas;
  }

  const count = useCallback(() => dispatch({ type: "COUNT" }), []);
  const addJaaps = useCallback((amount: number) => dispatch({ type: "ADD_JAAPS", amount }), []);
  const undo = useCallback(() => dispatch({ type: "UNDO" }), []);
  const resetBead = useCallback(() => dispatch({ type: "RESET_BEAD" }), []);
  const nextMala = useCallback(() => dispatch({ type: "NEXT_MALA" }), []);
  const resetAll = useCallback(() => dispatch({ type: "RESET_ALL" }), []);
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => dispatch({ type: "UPDATE_SETTINGS", patch }),
    []
  );

  const value = useMemo<JaapContextValue>(
    () => ({
      state,
      hydrated: hydratedRef.current,
      count,
      addJaaps,
      undo,
      resetBead,
      nextMala,
      resetAll,
      updateSettings,
      malaJustCompleted: malaCompletionsRef.current,
    }),
    [state, count, addJaaps, undo, resetBead, nextMala, resetAll, updateSettings]
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

/** Derived selector helpers */
export function selectGoalNaam(s: PersistedState): number {
  return s.settings.malaGoal * s.settings.beadsPerMala;
}

export function selectGoalProgress(s: PersistedState): number {
  const goal = selectGoalNaam(s);
  if (goal <= 0) return 0;
  return Math.min(1, s.todayBeads / goal);
}

export function selectDailyHistoryMap(s: PersistedState): Record<string, number> {
  const map: Record<string, number> = {};
  for (const k of Object.keys(s.history)) map[k] = s.history[k].beads;
  if (s.todayBeads > 0) map[s.todayDate] = s.todayBeads;
  return map;
}
