import type { PersistedState } from "./state";

export async function syncToServer(state: PersistedState) {
  if (typeof window === "undefined") return;

  try {
    const payload = {
      date: state.todayDate,
      beads: state.todayBeads,
      malas: state.todayMalas,
      clientTimestamp: new Date().toISOString(),
    };

    const response = await fetch("/api/jaap/save-daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Sync failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error("Sync error:", error);
  }
}

export function registerSyncOnLeave() {
  // No-op - we sync on every change now, so this is optional
  // Could add sync-on-blur if desired, but not necessary
}
