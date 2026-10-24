"use client";

import { useCallback, useEffect, useState } from "react";
import { SEVAS, type BhogItem, type SevaId } from "./sevas";
import type { SevaToday } from "./types";

const ERRORS: Record<string, string> = {
  wrong_state: "Radha Rani ki sthiti badal chuki hai. Dekhiye aur dobara koshish kijiye.",
};

/** Show the result on screen straight away; the server's answer replaces it. */
function optimistic(t: SevaToday, seva: SevaId, item?: BhogItem): SevaToday {
  const def = SEVAS[seva];
  const register = { ...t.register, [seva]: t.register[seva] + 1 };
  const awake = def.sets ? def.sets === "awake" : t.awake;
  return {
    ...t,
    awake,
    register,
    // Waking or sleeping clears the bhog; offering one sets it
    bhog: def.sets ? null : item ?? t.bhog,
  };
}

/** Radha Rani's state, kept fresh, plus `offer()` with optimistic update and retries. */
export function useSevaToday(initial: SevaToday) {
  const [today, setToday] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/seva/today", { cache: "no-store" });
      if (res.status === 402) {
        window.location.href = "/";
        return;
      }
      if (res.ok) setToday(await res.json());
    } catch {
      // keep showing what we have
    }
  }, []);

  useEffect(() => {
    // Another device may have changed her state; the light also shifts through the day
    const id = window.setInterval(refresh, 60_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const offer = useCallback(
    async (seva: SevaId, item?: BhogItem): Promise<boolean> => {
      setError(null);
      setToday((t) => optimistic(t, seva, item));
      const opId = crypto.randomUUID();
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/seva/offer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opId, seva, ...(item ? { item } : {}) }),
          });
          if (res.status === 402) {
            window.location.href = "/";
            return false;
          }
          const data = await res.json();
          if (data.today) setToday(data.today);
          if (res.ok) return true;
          if (res.status === 409 || res.status === 400) {
            setError(ERRORS[data.error] ?? "Seva nahi ho payi.");
            return false;
          }
          throw new Error(data.error);
        } catch {
          if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
      setError("Seva nahi ho payi. Internet check karke dobara koshish kijiye.");
      await refresh();
      return false;
    },
    [refresh]
  );

  return { today, offer, error, refresh };
}
