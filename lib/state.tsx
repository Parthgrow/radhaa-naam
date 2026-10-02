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
import { todayKey } from "./date";

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

/** Wait this long after the last change before saving (batches quick taps)… */
const FLUSH_DELAY_MS = 1000;
/** …but never hold changes longer than this while tapping continuously. */
const FLUSH_MAX_WAIT_MS = 5000;
const RETRY_MAX_MS = 30_000;
const SETTINGS_SAVE_DELAY_MS = 500;

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
  | { type: "UPDATE_SETTINGS"; patch: Partial<Settings> }
  | {
      type: "SYNC_RESULT";
      /** Server totals for the days just saved */
      days: Record<string, Delta>;
      lifetime: Delta;
      /** Changes made since that save was sent, not yet on the server */
      unsent: Record<string, Delta>;
    };

/** A change to one day's totals, e.g. +1 bead or -108 beads / -1 mala. */
export type Delta = { beads: number; malas: number };

function isZero(d: Delta): boolean {
  return d.beads === 0 && d.malas === 0;
}

function addDelta(map: Record<string, Delta>, date: string, d: Delta) {
  const prev = map[date] ?? { beads: 0, malas: 0 };
  map[date] = { beads: prev.beads + d.beads, malas: prev.malas + d.malas };
}

function sumDeltas(map: Record<string, Delta>): Delta {
  let beads = 0;
  let malas = 0;
  for (const d of Object.values(map)) {
    beads += d.beads;
    malas += d.malas;
  }
  return { beads, malas };
}

/** What a user action changed, per date — this is what gets sent to the server. */
function diffState(prev: JaapState, next: JaapState): Record<string, Delta> {
  const changes: Record<string, Delta> = {};
  if (prev.todayDate === next.todayDate) {
    const today = {
      beads: next.todayBeads - prev.todayBeads,
      malas: next.todayMalas - prev.todayMalas,
    };
    if (!isZero(today)) changes[next.todayDate] = today;
  }
  for (const [date, record] of Object.entries(next.history)) {
    const before = prev.history[date];
    if (record === before || date === prev.todayDate) continue;
    const d = {
      beads: record.beads - (before?.beads ?? 0),
      malas: record.malas - (before?.malas ?? 0),
    };
    if (!isZero(d)) changes[date] = d;
  }
  return changes;
}

/** Layer not-yet-saved changes on top of totals loaded from the server. */
function applyDeltas(state: JaapState, deltas: Record<string, Delta>): JaapState {
  const history = { ...state.history };
  let { todayBeads, todayMalas } = state;
  for (const [date, d] of Object.entries(deltas)) {
    if (date === state.todayDate) {
      todayBeads = Math.max(0, todayBeads + d.beads);
      todayMalas = Math.max(0, todayMalas + d.malas);
    } else {
      const before = history[date];
      history[date] = {
        date,
        beads: Math.max(0, (before?.beads ?? 0) + d.beads),
        malas: Math.max(0, (before?.malas ?? 0) + d.malas),
      };
    }
  }
  const total = sumDeltas(deltas);
  return {
    ...state,
    history,
    todayBeads,
    todayMalas,
    currentBead: todayBeads % state.settings.beadsPerMala,
    lifetimeBeads: Math.max(0, state.lifetimeBeads + total.beads),
    lifetimeMalas: Math.max(0, state.lifetimeMalas + total.malas),
  };
}

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

    case "SYNC_RESULT": {
      // Show the server's totals (which include other devices) plus whatever
      // this device hasn't sent yet. On a single device this changes nothing.
      let next = state;
      for (const [date, server] of Object.entries(action.days)) {
        const pending = action.unsent[date] ?? { beads: 0, malas: 0 };
        const beads = Math.max(0, server.beads + pending.beads);
        const malas = Math.max(0, server.malas + pending.malas);
        if (date === next.todayDate) {
          if (beads !== next.todayBeads) {
            next = {
              ...next,
              todayBeads: beads,
              todayMalas: malas,
              currentBead: beads % next.settings.beadsPerMala,
            };
          } else if (malas !== next.todayMalas) {
            next = { ...next, todayMalas: malas };
          }
        } else {
          const before = next.history[date];
          if (before?.beads !== beads || before?.malas !== malas) {
            next = { ...next, history: { ...next.history, [date]: { date, beads, malas } } };
          }
        }
      }
      const unsent = sumDeltas(action.unsent);
      return {
        ...next,
        lifetimeBeads: Math.max(0, action.lifetime.beads + unsent.beads),
        lifetimeMalas: Math.max(0, action.lifetime.malas + unsent.malas),
      };
    }

    default:
      return state;
  }
}

/**
 * Changes waiting to be saved. `pending` collects changes as they happen;
 * on flush they're sealed into `inflight` with fresh opIds and sent. A failed
 * send keeps the same opIds, so the retry can't be counted twice. Persisted to
 * localStorage so taps made offline survive a reload.
 */
type Op = { opId: string; date: string } & Delta;
type Outbox = { inflight: Op[] | null; pending: Record<string, Delta> };

const OUTBOX_KEY_PREFIX = "radha-jaap-outbox:";

function emptyOutbox(): Outbox {
  return { inflight: null, pending: {} };
}

function loadOutbox(userId: string): Outbox {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY_PREFIX + userId);
    if (!raw) return emptyOutbox();
    const parsed = JSON.parse(raw) as Outbox;
    return { inflight: parsed.inflight ?? null, pending: parsed.pending ?? {} };
  } catch {
    return emptyOutbox();
  }
}

function saveOutbox(userId: string | undefined, outbox: Outbox) {
  if (!userId) return;
  try {
    const key = OUTBOX_KEY_PREFIX + userId;
    if (!outbox.inflight && Object.keys(outbox.pending).length === 0) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, JSON.stringify(outbox));
    }
  } catch {
    // storage full / blocked — changes still sync from memory
  }
}

/** Everything in the outbox, sent or not, per date. */
function outboxDeltas(outbox: Outbox): Record<string, Delta> {
  const all: Record<string, Delta> = {};
  for (const op of outbox.inflight ?? []) addDelta(all, op.date, op);
  for (const [date, d] of Object.entries(outbox.pending)) addDelta(all, date, d);
  return all;
}

/** Known settings fields only, falling back to defaults (drops userId, updatedAt, …). */
function pickSettings(saved: Partial<Settings> | null): Settings {
  const out = { ...DEFAULT_SETTINGS };
  if (!saved) return out;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (saved[key] !== undefined && saved[key] !== null) {
      (out as Record<keyof Settings, unknown>)[key] = saved[key];
    }
  }
  return out;
}

type StateResponse = {
  today: Delta;
  history: Record<string, Delta>;
  lifetime: Delta;
  settings: Partial<Settings> | null;
};

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

  // Latest state, updated synchronously so back-to-back taps diff correctly
  const stateRef = useRef(state);
  const userIdRef = useRef(userId);
  // Only send changes once we've loaded what the server holds
  const canSyncRef = useRef(false);
  const outboxRef = useRef<Outbox>(emptyOutbox());
  // Whose changes outboxRef holds (null: taps made before the session loaded)
  const outboxUserRef = useRef<string | null>(null);
  const flushTimerRef = useRef<number | null>(null);
  const firstPendingAtRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const retryDelayRef = useRef(FLUSH_DELAY_MS);
  const flushRef = useRef<(keepalive?: boolean) => void>(() => {});
  const settingsTimerRef = useRef<number | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const act = useCallback((action: Action) => {
    const prev = stateRef.current;
    const next = reducer(prev, action);
    stateRef.current = next;
    dispatch(action);
    return { prev, next };
  }, []);

  const scheduleFlush = useCallback((delayMs: number) => {
    if (flushTimerRef.current !== null) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushRef.current();
    }, delayMs);
  }, []);

  const flush = useCallback(
    async (keepalive = false) => {
      if (!canSyncRef.current || flushingRef.current) return;
      const outbox = outboxRef.current;

      if (!outbox.inflight) {
        const ops: Op[] = Object.entries(outbox.pending)
          .filter(([, d]) => !isZero(d))
          .map(([date, d]) => ({ opId: crypto.randomUUID(), date, ...d }));
        outbox.pending = {};
        firstPendingAtRef.current = null;
        if (ops.length === 0) {
          saveOutbox(userIdRef.current, outbox);
          return;
        }
        outbox.inflight = ops;
        saveOutbox(userIdRef.current, outbox);
      }

      flushingRef.current = true;
      try {
        const res = await fetch("/api/jaap/increment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ops: outbox.inflight }),
          keepalive,
        });
        if (res.status === 400) {
          // The server will never accept this batch; retrying would loop forever
          console.error("Sync rejected:", await res.text(), outbox.inflight);
          outbox.inflight = null;
          saveOutbox(userIdRef.current, outbox);
          return;
        }
        if (!res.ok) throw new Error(`Sync failed: ${res.status}`);

        const result = await res.json();
        outbox.inflight = null;
        saveOutbox(userIdRef.current, outbox);
        retryDelayRef.current = FLUSH_DELAY_MS;
        act({
          type: "SYNC_RESULT",
          days: result.data.days,
          lifetime: result.data.lifetime,
          unsent: { ...outbox.pending },
        });
      } catch (error) {
        console.warn("Sync error, will retry:", error);
        scheduleFlush(retryDelayRef.current);
        retryDelayRef.current = Math.min(retryDelayRef.current * 2, RETRY_MAX_MS);
        return;
      } finally {
        flushingRef.current = false;
      }

      if (Object.keys(outbox.pending).length > 0) scheduleFlush(FLUSH_DELAY_MS);
    },
    [act, scheduleFlush]
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  /** Run a user action and queue what it changed for saving. */
  const record = useCallback(
    (action: Action) => {
      const { prev, next } = act(action);
      const changes = diffState(prev, next);
      if (Object.keys(changes).length === 0) return;

      const outbox = outboxRef.current;
      for (const [date, d] of Object.entries(changes)) addDelta(outbox.pending, date, d);
      saveOutbox(userIdRef.current, outbox);

      const now = Date.now();
      firstPendingAtRef.current ??= now;
      const untilMaxWait = firstPendingAtRef.current + FLUSH_MAX_WAIT_MS - now;
      scheduleFlush(Math.max(0, Math.min(FLUSH_DELAY_MS, untilMaxWait)));
    },
    [act, scheduleFlush]
  );

  // Load today's count, recent history, lifetime totals and settings once per signed-in user
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    canSyncRef.current = false;

    // Changes from an earlier visit that never reached the server, plus any
    // taps made while the session was still loading
    const stored = loadOutbox(userId);
    if (outboxUserRef.current === null) {
      for (const [date, d] of Object.entries(outboxRef.current.pending)) {
        addDelta(stored.pending, date, d);
      }
    }
    outboxRef.current = stored;
    outboxUserRef.current = userId;
    saveOutbox(userId, stored);

    const today = todayKey();
    fetch(`/api/jaap/state?today=${today}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        const result = await res.json();
        if (cancelled) return;
        const data = result.data as StateResponse;

        const settings = pickSettings(data.settings);
        const history: Record<string, DailyRecord> = {};
        for (const [date, d] of Object.entries(data.history)) {
          history[date] = { date, beads: d.beads, malas: d.malas };
        }
        const fromServer: JaapState = {
          ...freshState(),
          todayDate: today,
          todayBeads: data.today.beads,
          todayMalas: data.today.malas,
          lifetimeBeads: data.lifetime.beads,
          lifetimeMalas: data.lifetime.malas,
          history,
          settings,
        };

        canSyncRef.current = true;
        act({
          type: "HYDRATE",
          payload: applyDeltas(fromServer, outboxDeltas(outboxRef.current)),
        });
        flushRef.current();
      })
      .catch((error) => {
        // Keep counting locally; changes stay in the outbox (and localStorage)
        // and are sent on the next successful load.
        console.error("Failed to load jaap data:", error);
      })
      .finally(() => {
        if (!cancelled) setLoadedFor(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, act]);

  const saveSettingsNow = useCallback(() => {
    if (settingsTimerRef.current === null) return;
    window.clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = null;
    fetch("/api/user/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(stateRef.current.settings),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) console.warn(`Saving settings failed: ${res.status}`);
      })
      .catch((error) => console.warn("Saving settings failed:", error));
  }, []);

  // Send changes right away when the app is hidden or closed, and retry when
  // the network comes back
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") {
        flushRef.current(true);
        saveSettingsNow();
      }
    };
    const onPageHide = () => {
      flushRef.current(true);
      saveSettingsNow();
    };
    const onOnline = () => flushRef.current();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("online", onOnline);
    };
  }, [saveSettingsNow]);

  // Apply theme class on every settings.theme change
  useEffect(() => {
    applyThemeClass(state.settings.theme);
  }, [state.settings.theme]);

  // Detect day rollover while app is open
  const { todayDate } = state;
  useEffect(() => {
    const tick = () => {
      const today = todayKey();
      if (today !== stateRef.current.todayDate) act({ type: "TICK_DAY", date: today });
    };
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [todayDate, act]);

  const count = useCallback(() => record({ type: "COUNT" }), [record]);
  const addJaaps = useCallback(
    (amount: number, date?: string) => record({ type: "ADD_JAAPS", amount, date }),
    [record]
  );
  const undo = useCallback(() => record({ type: "UNDO" }), [record]);
  const resetBead = useCallback(() => act({ type: "RESET_BEAD" }), [act]);
  const nextMala = useCallback(() => record({ type: "NEXT_MALA" }), [record]);
  const resetToday = useCallback(() => record({ type: "RESET_TODAY" }), [record]);
  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      act({ type: "UPDATE_SETTINGS", patch });
      if (!canSyncRef.current) return;
      // Typing a custom naam changes settings on every keystroke; save once it settles
      if (settingsTimerRef.current !== null) window.clearTimeout(settingsTimerRef.current);
      settingsTimerRef.current = window.setTimeout(saveSettingsNow, SETTINGS_SAVE_DELAY_MS);
    },
    [act, saveSettingsNow]
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
