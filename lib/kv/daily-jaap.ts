import { kv } from "./client";
import type { DailyJaap, DayTotals, UserSettings } from "./types";

const PROJECT_PREFIX = "radha";
// How long an applied opId is remembered, so a retried batch isn't counted twice
const OP_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Pre-increment format: the whole day stored as one JSON value. Read-only now. */
function getLegacyDailyKey(userId: string, date: string): string {
  return `${PROJECT_PREFIX}:daily:${userId}:${date}`;
}

/** Day totals as a hash { beads, malas } so they can be incremented atomically. */
function getDayKey(userId: string, date: string): string {
  return `${PROJECT_PREFIX}:day:${userId}:${date}`;
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

function getOpKey(userId: string, opId: string): string {
  return `${PROJECT_PREFIX}:op:${userId}:${opId}`;
}

/**
 * Apply one change to a day, atomically:
 *  - skip if this opId was already applied (safe retries)
 *  - seed the day from its legacy JSON value the first time it's written
 *  - add the change, never going below 0
 *  - add what the day actually changed by to lifetime (if lifetime exists yet;
 *    otherwise the one-time backfill will count this day)
 *
 * KEYS: opKey, dayKey, lifetimeKey, historyIndexKey
 * ARGV: beadsDelta, malasDelta, seedBeads, seedMalas, date, opTtlSeconds
 * Returns: [applied (0|1), dayBeads, dayMalas]
 */
const INCREMENT_SCRIPT = `
local fresh = redis.call('SET', KEYS[1], '1', 'NX', 'EX', tonumber(ARGV[6]))
if redis.call('EXISTS', KEYS[2]) == 0 then
  redis.call('HSET', KEYS[2], 'beads', tonumber(ARGV[3]), 'malas', tonumber(ARGV[4]))
end
local oldBeads = tonumber(redis.call('HGET', KEYS[2], 'beads') or '0')
local oldMalas = tonumber(redis.call('HGET', KEYS[2], 'malas') or '0')
if not fresh then
  return {0, oldBeads, oldMalas}
end
local newBeads = math.max(0, oldBeads + tonumber(ARGV[1]))
local newMalas = math.max(0, oldMalas + tonumber(ARGV[2]))
redis.call('HSET', KEYS[2], 'beads', newBeads, 'malas', newMalas)
redis.call('SADD', KEYS[4], ARGV[5])
if redis.call('EXISTS', KEYS[3]) == 1 then
  redis.call('HINCRBY', KEYS[3], 'beads', newBeads - oldBeads)
  redis.call('HINCRBY', KEYS[3], 'malas', newMalas - oldMalas)
end
return {1, newBeads, newMalas}
`;

/** Write lifetime totals only if nobody has created them yet. */
const SET_LIFETIME_IF_MISSING_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  redis.call('HSET', KEYS[1], 'beads', tonumber(ARGV[1]), 'malas', tonumber(ARGV[2]))
end
return {tonumber(redis.call('HGET', KEYS[1], 'beads')), tonumber(redis.call('HGET', KEYS[1], 'malas'))}
`;

function toTotals(hash: Record<string, unknown> | null): DayTotals | null {
  if (!hash) return null;
  return { beads: Number(hash.beads ?? 0), malas: Number(hash.malas ?? 0) };
}

export async function incrementDay(
  userId: string,
  opId: string,
  date: string,
  beads: number,
  malas: number
): Promise<DayTotals> {
  // Seed values for a day that only exists in the legacy format. The script
  // ignores them if the day hash already exists, so a stale read is harmless.
  const legacy = await kv.get<DailyJaap>(getLegacyDailyKey(userId, date));
  const [, dayBeads, dayMalas] = await kv.eval<(string | number)[], [number, number, number]>(
    INCREMENT_SCRIPT,
    [
      getOpKey(userId, opId),
      getDayKey(userId, date),
      getLifetimeStatsKey(userId),
      getHistoryIndexKey(userId),
    ],
    [beads, malas, legacy?.beads ?? 0, legacy?.malas ?? 0, date, OP_TTL_SECONDS]
  );
  return { beads: Number(dayBeads), malas: Number(dayMalas) };
}

/** Read many days in one round trip; days never written are left out. */
export async function getDays(
  userId: string,
  dates: string[]
): Promise<Record<string, DayTotals>> {
  if (dates.length === 0) return {};
  const pipe = kv.pipeline();
  for (const date of dates) {
    pipe.hgetall(getDayKey(userId, date));
    pipe.get(getLegacyDailyKey(userId, date));
  }
  const results = await pipe.exec();

  const out: Record<string, DayTotals> = {};
  dates.forEach((date, i) => {
    const day = toTotals(results[i * 2] as Record<string, unknown> | null);
    const legacy = results[i * 2 + 1] as DailyJaap | null;
    if (day) out[date] = day;
    else if (legacy) out[date] = { beads: legacy.beads, malas: legacy.malas };
  });
  return out;
}

/** All dates from startDate to endDate inclusive (YYYY-MM-DD, calendar dates). */
export function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function getHistoryRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<Record<string, DayTotals>> {
  return getDays(userId, dateRange(startDate, endDate));
}

/**
 * Lifetime totals. Users from before lifetime was stored get it computed once
 * from every day they've saved, then it's kept up to date by incrementDay.
 */
export async function getLifetime(userId: string): Promise<DayTotals> {
  const existing = toTotals(await kv.hgetall(getLifetimeStatsKey(userId)));
  if (existing) return existing;

  const dates = await kv.smembers<string[]>(getHistoryIndexKey(userId));
  const days = await getDays(userId, dates);
  let beads = 0;
  let malas = 0;
  for (const day of Object.values(days)) {
    beads += day.beads;
    malas += day.malas;
  }

  const [storedBeads, storedMalas] = await kv.eval<number[], [number, number]>(
    SET_LIFETIME_IF_MISSING_SCRIPT,
    [getLifetimeStatsKey(userId)],
    [beads, malas]
  );
  return { beads: Number(storedBeads), malas: Number(storedMalas) };
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
