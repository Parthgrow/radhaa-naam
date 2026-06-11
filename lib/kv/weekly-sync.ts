import { kv } from "./client";
import type { WeeklySync } from "./types";

const PROJECT_PREFIX = "radha";

function getWeeklySyncKey(userId: string, weekStart: string): string {
  return `${PROJECT_PREFIX}:weeklysync:${userId}:${weekStart}`;
}

export async function saveWeeklySync(
  userId: string,
  weekStart: string,
  totalBeads: number,
  totalMalas: number
): Promise<WeeklySync> {
  const now = new Date().toISOString();
  const sync: WeeklySync = {
    userId,
    weekStart,
    totalBeads,
    totalMalas,
    syncedAt: now,
  };

  try {
    await kv.set(getWeeklySyncKey(userId, weekStart), sync);
    return sync;
  } catch (error) {
    console.error("Error saving weekly sync:", error);
    throw error;
  }
}

export async function getWeeklySync(
  userId: string,
  weekStart: string
): Promise<WeeklySync | null> {
  try {
    const data = await kv.get<WeeklySync>(getWeeklySyncKey(userId, weekStart));
    if (!data) return null;
    return data;
  } catch (error) {
    console.error("Error getting weekly sync:", error);
    return null;
  }
}

export async function getBulkWeeklySyncs(
  userIds: string[],
  weekStart: string
): Promise<Record<string, WeeklySync | null>> {
  try {
    const results = await Promise.all(
      userIds.map((userId) => getWeeklySync(userId, weekStart))
    );
    const map: Record<string, WeeklySync | null> = {};
    userIds.forEach((userId, i) => {
      map[userId] = results[i];
    });
    return map;
  } catch (error) {
    console.error("Error getting bulk weekly syncs:", error);
    throw error;
  }
}
