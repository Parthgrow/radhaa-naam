"use client";

import { useCallback, useEffect, useState } from "react";
import { useJaapCount } from "@/lib/useJaapCount";
import { SEVAS, type BhogTier, type SevaId } from "./sevas";
import type { SevaToday } from "./types";

const ERRORS: Record<string, string> = {
  over_limit: "Aaj ke liye yeh seva poori ho gayi.",
  not_now: "Is seva ka samay abhi nahi hai.",
  locked: "Yeh bhog abhi khula nahi hai. Thoda aur jaap kijiye.",
};

/** Count an offering on screen straight away; the server's answer replaces it. */
function optimistic(t: SevaToday, seva: SevaId, count: number, tier?: BhogTier): SevaToday {
  const def = SEVAS[seva];
  const reg = { ...t.register };
  if (seva === "aarti_mangala" || seva === "aarti_sandhya") reg.aarti += 1;
  if (seva === "phool") reg.petals += count;
  if (def.bhog) reg.bhog += 1;
  if (seva === "deep_daan") reg.diyas += count;
  return {
    ...t,
    register: reg,
    sevas: t.sevas.map((s) =>
      s.id === seva ? { ...s, used: s.used + count, available: s.used + count < s.limit, ...(tier ? { tier } : {}) } : s
    ),
    event:
      seva === "deep_daan" && t.event
        ? { ...t.event, myDiyas: t.event.myDiyas + count, totalDiyas: t.event.totalDiyas + count }
        : t.event,
  };
}

/** Today's seva state, kept fresh, plus `offer()` with optimistic update and retries. */
export function useSevaToday(initial: SevaToday) {
  const { syncNow } = useJaapCount();
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
    // Malas chanted moments ago may still be on their way to the server
    syncNow().finally(refresh);
    // Windows open and close through the day
    const id = window.setInterval(refresh, 60_000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [syncNow, refresh]);

  const offer = useCallback(
    async (seva: SevaId, { count = 1, tier }: { count?: number; tier?: BhogTier } = {}): Promise<boolean> => {
      setError(null);
      setToday((t) => optimistic(t, seva, count, tier));
      const opId = crypto.randomUUID();
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const res = await fetch("/api/seva/offer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ opId, seva, count, ...(tier ? { tier } : {}) }),
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
