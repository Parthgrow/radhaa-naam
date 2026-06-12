import type { PersistedState } from "./state";

/**
 * Merge server history with client state on login
 * Strategy:
 * - For completed days (before today): use server data (source of truth)
 * - For today: use client data (still being edited, server is catching up)
 * - For future: shouldn't exist, but client wins if it does
 */
export async function mergeServerHistoryWithClient(
  clientState: PersistedState,
  userId: string
): Promise<PersistedState> {
  if (typeof window === "undefined") return clientState;

  try {
    // Fetch 30 days of history from server
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    const response = await fetch(
      `/api/jaap/history?startDate=${startStr}&endDate=${endStr}`
    );

    if (!response.ok) {
      console.warn("Failed to fetch server history, using client state");
      return clientState;
    }

    const result = await response.json();
    if (!result.success) {
      console.warn("Server history fetch failed, using client state");
      return clientState;
    }

    const serverHistory = result.data as Record<
      string,
      { date: string; beads: number; malas: number }
    >;

    // Merge: use server for past dates, client for today
    const mergedHistory = { ...clientState.history };

    Object.entries(serverHistory).forEach(([date, record]) => {
      if (date === clientState.todayDate) {
        // Today: keep client state (still being edited)
        // Don't override with server
      } else {
        // Past dates: use server as source of truth
        mergedHistory[date] = record;
      }
    });

    // Recalculate lifetime stats from merged history
    let totalBeads = 0;
    let totalMalas = 0;

    Object.values(mergedHistory).forEach((record) => {
      totalBeads += record.beads;
      totalMalas += record.malas;
    });

    // Add today's beads
    totalBeads += clientState.todayBeads;
    totalMalas += clientState.todayMalas;

    return {
      ...clientState,
      history: mergedHistory,
      lifetimeBeads: totalBeads,
      lifetimeMalas: totalMalas,
    };
  } catch (error) {
    console.error("Error merging server history:", error);
    // Return client state unchanged on error
    return clientState;
  }
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
