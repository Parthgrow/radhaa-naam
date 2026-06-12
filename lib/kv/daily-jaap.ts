import { kv } from "./client";
import type { DailyJaap, UserSettings } from "./types";

const PROJECT_PREFIX = "radha";

function getDailyKey(userId: string, date: string): string {
  return `${PROJECT_PREFIX}:daily:${userId}:${date}`;
}

function getUserSettingsKey(userId: string): string {
  return `${PROJECT_PREFIX}:settings:${userId}`;
}

function getLifetimeStatsKey(userId: string): string {
  return `${PROJECT_PREFIX}:lifetime:${userId}`;
}

function getHistoryIndexKey(userId: string): string {
  return `${PROJECT_PREFIX}:history-index:${userId}`;
}

export async function saveDailyRecord(
  userId: string,
  date: string,
  beads: number,
  malas: number,
  clientTimestamp: string
): Promise<DailyJaap> {
  const now = new Date().toISOString();
  const key = getDailyKey(userId, date);

  try {
    // Get existing record to check for conflicts
    const existing = await kv.get<DailyJaap>(key);

    // Conflict resolution: server timestamp wins (last-write-wins)
    if (existing && existing.lastSyncedAt > clientTimestamp) {
      // Server has newer data, return server state
      return existing;
    }

    // Save new record
    const record: DailyJaap = {
      userId,
      date,
      beads,
      malas,
      lastSyncedAt: now,
    };

    await kv.set(key, record);
    // Also track in history index (for range queries later)
    await kv.sadd(getHistoryIndexKey(userId), date);

    return record;
  } catch (error) {
    console.error("Error saving daily record:", error);
    throw error;
  }
}

export async function getDailyRecord(
  userId: string,
  date: string
): Promise<DailyJaap | null> {
  try {
    const data = await kv.get<DailyJaap>(getDailyKey(userId, date));
    return data || null;
  } catch (error) {
    console.error("Error getting daily record:", error);
    return null;
  }
}

export async function getDailyRecords(
  userId: string,
  dates: string[]
): Promise<Record<string, DailyJaap | null>> {
  try {
    const results = await Promise.all(
      dates.map((date) => getDailyRecord(userId, date))
    );
    const map: Record<string, DailyJaap | null> = {};
    dates.forEach((date, i) => {
      map[date] = results[i];
    });
    return map;
  } catch (error) {
    console.error("Error getting daily records:", error);
    throw error;
  }
}

export async function getHistoryRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, DailyJaap>> {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];

    // Generate all dates in range
    let current = new Date(start);
    while (current <= end) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      const day = String(current.getDate()).padStart(2, "0");
      dates.push(`${year}-${month}-${day}`);
      current.setDate(current.getDate() + 1);
    }

    const records = await getDailyRecords(userId, dates);
    const result: Record<string, DailyJaap> = {};
    Object.entries(records).forEach(([date, record]) => {
      if (record) result[date] = record;
    });
    return result;
  } catch (error) {
    console.error("Error getting history range:", error);
    throw error;
  }
}

export async function saveUserSettings(
  userId: string,
  settings: Omit<UserSettings, "userId" | "updatedAt">
): Promise<UserSettings> {
  const now = new Date().toISOString();
  const userSettings: UserSettings = {
    userId,
    ...settings,
    updatedAt: now,
  };

  try {
    await kv.set(getUserSettingsKey(userId), userSettings);
    return userSettings;
  } catch (error) {
    console.error("Error saving user settings:", error);
    throw error;
  }
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const settings = await kv.get<UserSettings>(getUserSettingsKey(userId));
    return settings || null;
  } catch (error) {
    console.error("Error getting user settings:", error);
    return null;
  }
}

export async function updateUserSettings(
  userId: string,
  updates: Partial<Omit<UserSettings, "userId" | "updatedAt">>
): Promise<UserSettings> {
  try {
    const existing = await getUserSettings(userId);
    const settings: Omit<UserSettings, "userId" | "updatedAt"> = {
      naam: updates.naam ?? existing?.naam ?? "राधे राधे",
      transliteration: updates.transliteration ?? existing?.transliteration ?? "Radhe Radhe",
      beadsPerMala: updates.beadsPerMala ?? existing?.beadsPerMala ?? 108,
      malaGoal: updates.malaGoal ?? existing?.malaGoal ?? 5,
      haptics: updates.haptics !== undefined ? updates.haptics : existing?.haptics ?? true,
      sound: updates.sound !== undefined ? updates.sound : existing?.sound ?? true,
      theme: updates.theme ?? existing?.theme ?? "lotus",
    };

    return saveUserSettings(userId, settings);
  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
}
