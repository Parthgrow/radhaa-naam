import { kv } from "./client";
import type { BhogItem, SevaId } from "@/lib/seva/sevas";

const PROJECT_PREFIX = "radha";
// Daily counters are kept a while for history/analytics, then expire
const DAY_KEY_TTL_SECONDS = 60 * 24 * 60 * 60;
const OP_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Radha Rani's state for one devotee. It persists until they change it. */
function stateKey(userId: string) {
  return `${PROJECT_PREFIX}:darshan:${userId}`;
}
function userDayKey(userId: string, date: string) {
  return `${PROJECT_PREFIX}:seva:${userId}:${date}`;
}
function globalDayKey(date: string) {
  return `${PROJECT_PREFIX}:seva:global:${date}`;
}
function devoteesDayKey(date: string) {
  return `${PROJECT_PREFIX}:seva:devotees:${date}`;
}
function opKey(userId: string, opId: string) {
  return `${PROJECT_PREFIX}:seva-op:${userId}:${opId}`;
}

/**
 * Offer a seva atomically:
 *  - an opId already applied is not applied again (safe retries)
 *  - the seva's required state must hold (wake needs her asleep; aarti, bhog
 *    and sleep need her awake), checked here so two devices can't race
 *  - flips the state when the seva does (wake / sleep), which also clears the
 *    bhog before her
 *  - a bhog sets the item before her
 *  - counts it for the devotee's day, today's totals and today's devotee count
 *
 * KEYS: op, state, userDay, globalDay, devotees
 * ARGV: seva, require ('awake'|'asleep'), sets ('awake'|'asleep'|''), item ('' = none),
 *       userId, opTtl, dayTtl, nowIso
 * Returns: [status, awake]   status: 1 applied, 0 repeat, -1 wrong state
 */
const OFFER_SCRIPT = `
local awake = redis.call('HGET', KEYS[2], 'awake') == '1'
if not redis.call('SET', KEYS[1], '1', 'NX', 'EX', tonumber(ARGV[6])) then
  return {0, awake and 1 or 0}
end
if (ARGV[2] == 'awake') ~= awake then
  redis.call('DEL', KEYS[1])
  return {-1, awake and 1 or 0}
end
if ARGV[3] ~= '' then
  awake = (ARGV[3] == 'awake')
  redis.call('HSET', KEYS[2], 'awake', awake and '1' or '0', 'since', ARGV[8])
  redis.call('HDEL', KEYS[2], 'bhog')
end
if ARGV[4] ~= '' then
  redis.call('HSET', KEYS[2], 'bhog', ARGV[4])
end
local dayTtl = tonumber(ARGV[7])
redis.call('HINCRBY', KEYS[3], ARGV[1], 1)
redis.call('EXPIRE', KEYS[3], dayTtl)
redis.call('HINCRBY', KEYS[4], ARGV[1], 1)
redis.call('EXPIRE', KEYS[4], dayTtl)
redis.call('PFADD', KEYS[5], ARGV[5])
redis.call('EXPIRE', KEYS[5], dayTtl)
return {1, awake and 1 or 0}
`;

export type OfferResult = { status: "applied" | "repeat" | "wrong_state"; awake: boolean };

export async function recordOffering(args: {
  userId: string;
  opId: string;
  date: string;
  seva: SevaId;
  requires: "awake" | "asleep";
  sets?: "awake" | "asleep";
  item?: BhogItem;
}): Promise<OfferResult> {
  const { userId, opId, date, seva, requires, sets, item } = args;
  const [status, awake] = await kv.eval<(string | number)[], [number, number]>(
    OFFER_SCRIPT,
    [opKey(userId, opId), stateKey(userId), userDayKey(userId, date), globalDayKey(date), devoteesDayKey(date)],
    [seva, requires, sets ?? "", item ?? "", userId, OP_TTL_SECONDS, DAY_KEY_TTL_SECONDS, new Date().toISOString()]
  );
  const s = Number(status);
  return {
    status: s === 1 ? "applied" : s === 0 ? "repeat" : "wrong_state",
    awake: Number(awake) === 1,
  };
}

function toCounts(hash: Record<string, unknown> | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(hash ?? {})) out[k] = Number(v) || 0;
  return out;
}

export type DarshanSnapshot = {
  awake: boolean;
  bhog: string | null;
  global: Record<string, number>;
  devotees: number;
};

/** Her state for this devotee plus today's totals, in one round trip. */
export async function getDarshan(userId: string, date: string): Promise<DarshanSnapshot> {
  const pipe = kv.pipeline();
  pipe.hgetall(stateKey(userId));
  pipe.hgetall(globalDayKey(date));
  pipe.pfcount(devoteesDayKey(date));
  const [state, global, devotees] = await pipe.exec();
  const s = (state ?? {}) as Record<string, unknown>;
  return {
    awake: String(s.awake) === "1",
    bhog: s.bhog ? String(s.bhog) : null,
    global: toCounts(global as Record<string, unknown> | null),
    devotees: Number(devotees) || 0,
  };
}

/** Just whether she's awake, for light uses like the home banner. */
export async function isRadhaRaniAwake(userId: string): Promise<boolean> {
  const awake = await kv.hget<string | number>(stateKey(userId), "awake");
  return String(awake) === "1";
}
