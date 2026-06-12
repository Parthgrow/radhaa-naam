import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { todayKey, lastNDays } from "./date";

const BEADS_PER_MALA = 108;
const DEFAULT_MALA_GOAL = 5;

export interface JaapData {
  todayBeads: number;
  todayMalas: number;
  todayDate: string;
  currentBead: number;
  lifetimeBeads: number;
  lifetimeMalas: number;
  history: Record<string, { beads: number; malas: number }>;
}

export interface JaapSettings {
  naam: string;
  transliteration: string;
  beadsPerMala: number;
  malaGoal: number;
  haptics: boolean;
  sound: boolean;
  theme: "lotus" | "dark" | "auto";
}

export const DEFAULT_SETTINGS: JaapSettings = {
  naam: "राधे राधे",
  transliteration: "Radhe Radhe",
  beadsPerMala: BEADS_PER_MALA,
  malaGoal: DEFAULT_MALA_GOAL,
  haptics: true,
  sound: true,
  theme: "lotus",
};

export function useJaapCount() {
  const { data: session } = useSession();
  const [data, setData] = useState<JaapData>({
    todayBeads: 0,
    todayMalas: 0,
    todayDate: todayKey(),
    currentBead: 0,
    lifetimeBeads: 0,
    lifetimeMalas: 0,
    history: {},
  });
  const [settings, setSettings] = useState<JaapSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch today's data and history from database on login
  useEffect(() => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const today = todayKey();

    Promise.all([
      fetch(`/api/jaap/save-daily?date=${today}`).then((res) => res.json()),
      fetch(`/api/jaap/history?startDate=${new Date(new Date().setDate(new Date().getDate() - 90)).toISOString().split('T')[0]}&endDate=${today}`).then((res) => res.json()),
    ])
      .then(([todayResult, historyResult]) => {
        const beads = todayResult.data?.beads ?? 0;
        const malas = todayResult.data?.malas ?? 0;
        const currentBead = beads % settings.beadsPerMala;
        const history = historyResult.data ?? {};

        setData({
          todayBeads: beads,
          todayMalas: malas,
          todayDate: today,
          currentBead,
          lifetimeBeads: beads,
          lifetimeMalas: malas,
          history,
        });
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch jaap data:", error);
        setIsLoading(false);
      });
  }, [session?.user?.id, settings.beadsPerMala]);

  // Sync data to database
  const syncToDatabase = useCallback(
    async (beads: number, malas: number) => {
      if (!session?.user?.id) return;

      const today = todayKey();
      try {
        await fetch("/api/jaap/save-daily", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: today,
            beads,
            malas,
            clientTimestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error("Failed to sync jaap data:", error);
      }
    },
    [session?.user?.id]
  );

  // Increment bead count
  const count = useCallback(() => {
    setData((prev) => {
      const newBead = prev.currentBead + 1;
      let newMalas = prev.todayMalas;
      let nextBead = newBead;

      // Check if mala is completed
      if (newBead >= settings.beadsPerMala) {
        nextBead = 0;
        newMalas += 1;
      }

      const newBeads = prev.todayBeads + 1;
      syncToDatabase(newBeads, newMalas);

      return {
        ...prev,
        todayBeads: newBeads,
        todayMalas: newMalas,
        currentBead: nextBead,
        lifetimeBeads: prev.lifetimeBeads + 1,
        lifetimeMalas: prev.lifetimeMalas + (newBead >= settings.beadsPerMala ? 1 : 0),
      };
    });
  }, [settings.beadsPerMala, syncToDatabase]);

  // Add jaaps (for bulk add, can add to past dates)
  const addJaaps = useCallback(
    (amount: number, targetDate?: string) => {
      setData((prev) => {
        const date = targetDate ?? prev.todayDate;
        const isToday = date === prev.todayDate;

        if (isToday) {
          // Adding to today
          const newBeads = prev.todayBeads + amount;
          const newMalas = Math.floor(newBeads / settings.beadsPerMala);
          const nextBead = newBeads % settings.beadsPerMala;

          syncToDatabase(newBeads, newMalas);

          return {
            ...prev,
            todayBeads: newBeads,
            todayMalas: newMalas,
            currentBead: nextBead,
            lifetimeBeads: prev.lifetimeBeads + amount,
            lifetimeMalas: prev.lifetimeMalas + (newMalas - prev.todayMalas),
          };
        } else {
          // Adding to past date
          const existing = prev.history[date];
          const prevBeads = existing?.beads ?? 0;
          const prevMalas = existing?.malas ?? 0;
          const newBeads = prevBeads + amount;
          const newMalas = Math.floor(newBeads / settings.beadsPerMala);

          const newHistory = {
            ...prev.history,
            [date]: { beads: newBeads, malas: newMalas },
          };

          // Sync the past date
          fetch("/api/jaap/save-daily", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date,
              beads: newBeads,
              malas: newMalas,
              clientTimestamp: new Date().toISOString(),
            }),
          }).catch((error) => console.error("Failed to sync past date:", error));

          return {
            ...prev,
            history: newHistory,
            lifetimeBeads: prev.lifetimeBeads + amount,
            lifetimeMalas: prev.lifetimeMalas + (newMalas - prevMalas),
          };
        }
      });
    },
    [settings.beadsPerMala, syncToDatabase]
  );

  // Undo last bead
  const undo = useCallback(() => {
    setData((prev) => {
      if (prev.todayBeads === 0) return prev;

      const newBeads = prev.todayBeads - 1;
      const newMalas = Math.floor(newBeads / settings.beadsPerMala);
      const nextBead = newBeads % settings.beadsPerMala;

      syncToDatabase(newBeads, newMalas);

      return {
        ...prev,
        todayBeads: newBeads,
        todayMalas: newMalas,
        currentBead: nextBead,
        lifetimeBeads: Math.max(0, prev.lifetimeBeads - 1),
        lifetimeMalas: newMalas,
      };
    });
  }, [settings.beadsPerMala, syncToDatabase]);

  // Reset current bead
  const resetBead = useCallback(() => {
    setData((prev) => ({
      ...prev,
      currentBead: 0,
    }));
  }, []);

  // Advance to next mala
  const nextMala = useCallback(() => {
    setData((prev) => {
      const newMalas = prev.todayMalas + 1;
      syncToDatabase(prev.todayBeads, newMalas);

      return {
        ...prev,
        todayMalas: newMalas,
        currentBead: 0,
        lifetimeMalas: prev.lifetimeMalas + 1,
      };
    });
  }, [syncToDatabase]);

  // Reset all (clear today's count)
  const resetAll = useCallback(() => {
    setData((prev) => ({
      ...prev,
      todayBeads: 0,
      todayMalas: 0,
      currentBead: 0,
    }));
    syncToDatabase(0, 0);
  }, [syncToDatabase]);

  // Update settings
  const updateSettings = useCallback(
    (patch: Partial<JaapSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  return {
    // Data
    data,
    settings,
    isLoading,

    // Actions
    count,
    addJaaps,
    undo,
    resetBead,
    nextMala,
    resetAll,
    updateSettings,
  };
}
