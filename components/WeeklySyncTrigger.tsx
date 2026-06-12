"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useJaap } from "@/lib/state";
import { getWeekStart } from "@/lib/kv/week";

export default function WeeklySyncTrigger() {
  const { state, hydrated } = useJaap();
  const { data: session } = useSession();

  useEffect(() => {
    if (!hydrated || !session?.user?.id) return;

    const weekStart = getWeekStart();
    const totalBeads = computeWeekBeads(state, weekStart);
    const totalMalas = computeWeekMalas(state, weekStart);

    fetch("/api/friends/sync-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalBeads, totalMalas }),
    })
      .then((r) => {
        if (!r.ok) {
          console.warn("Weekly sync failed");
        }
      })
      .catch((error) => {
        console.error("Weekly sync error:", error);
      });
  }, [hydrated, session?.user?.id, state]);

  return null;
}

function computeWeekBeads(state: any, weekStart: string): number {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);

  let total = 0;

  for (const [dateStr, record] of Object.entries(state.history)) {
    const recordDate = new Date(dateStr);
    if (recordDate >= start && recordDate < end) {
      total += (record as any).beads ?? 0;
    }
  }

  if (state.todayDate >= weekStart) {
    const todayStart = new Date(state.todayDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (todayStart < weekEnd) {
      total += state.todayBeads ?? 0;
    }
  }

  return total;
}

function computeWeekMalas(state: any, weekStart: string): number {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 7);

  let total = 0;

  for (const [dateStr, record] of Object.entries(state.history)) {
    const recordDate = new Date(dateStr);
    if (recordDate >= start && recordDate < end) {
      total += (record as any).malas ?? 0;
    }
  }

  if (state.todayDate >= weekStart) {
    const todayStart = new Date(state.todayDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    if (todayStart < weekEnd) {
      total += state.todayMalas ?? 0;
    }
  }

  return total;
}
