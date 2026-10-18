import { kv } from "./client";

const PROJECT_PREFIX = "radha";
// Daily keys are kept a while for history/analytics, then expire
const DAY_KEY_TTL_SECONDS = 60 * 24 * 60 * 60;
const OP_TTL_SECONDS = 7 * 24 * 60 * 60;

function userDayKey(userId: string, date: string) {
  return `${PROJECT_PREFIX}:seva:${userId}:${date}`;
}
function globalDayKey(date: string) {
  return `${PROJECT_PREFIX}:seva:global:${date}`;
}
function devoteesDayKey(date: string) {
  return `${PROJECT_PREFIX}:seva:devotees:${date}`;
}
function eventTotalKey(eventId: string) {
  return `${PROJECT_PREFIX}:event:${eventId}`;
}
function eventUserKey(eventId: string, userId: string) {
  return `${PROJECT_PREFIX}:event:${eventId}:user:${userId}`;
}
function opKey(userId: string, opId: string) {
  return `${PROJECT_PREFIX}:seva-op:${userId}:${opId}`;
}

/**
 * Record an offering atomically:
 *  - an opId already applied is not applied again (safe retries)
 *  - the devotee's total for the day can't go above `limit`
 *    (1 for aarti/shayan, today's malas for petals/diyas)
 *  - updates the devotee's day, today's totals, today's devotee count and,
 *    during an event, the event totals
 *
 * KEYS: op, userDay, globalDay, devotees, eventTotal, eventUser
 * ARGV: field, count, limit, userId, opTtl, dayTtl, hasEvent (0|1)
 * Returns: [status, newUserTotal]  status 1 = applied, 0 = repeat, -1 = over limit
 */
const OFFER_SCRIPT = `
local field = ARGV[1]
local count = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local current = tonumber(redis.call('HGET', KEYS[2], field) or '0')
if not redis.call('SET', KEYS[1], '1', 'NX', 'EX', tonumber(ARGV[5])) then
  return {0, current}
end
if current + count > limit then
  redis.call('DEL', KEYS[1])
  return {-1, current}
end
local dayTtl = tonumber(ARGV[6])
redis.call('HINCRBY', KEYS[2], field, count)
redis.call('EXPIRE', KEYS[2], dayTtl)
redis.call('HINCRBY', KEYS[3], field, count)
redis.call('EXPIRE', KEYS[3], dayTtl)
redis.call('PFADD', KEYS[4], ARGV[4])
redis.call('EXPIRE', KEYS[4], dayTtl)
if ARGV[7] == '1' then
  redis.call('HINCRBY', KEYS[5], field, count)
  redis.call('HINCRBY', KEYS[6], field, count)
end
return {1, current + count}
`;

export type OfferResult = { status: "applied" | "repeat" | "over_limit"; total: number };

export async function recordOffering(args: {
  userId: string;
  opId: string;
  date: string;
  field: string;
  count: number;
  limit: number;
  eventId: string | null;
}): Promise<OfferResult> {
  const { userId, opId, date, field, count, limit, eventId } = args;
  const [status, total] = await kv.eval<(string | number)[], [number, number]>(
    OFFER_SCRIPT,
    [
      opKey(userId, opId),
      userDayKey(userId, date),
      globalDayKey(date),
      devoteesDayKey(date),
      eventTotalKey(eventId ?? "none"),
      eventUserKey(eventId ?? "none", userId),
    ],
    [field, count, limit, userId, OP_TTL_SECONDS, DAY_KEY_TTL_SECONDS, eventId ? "1" : "0"]
  );
  const s = Number(status);
  return { status: s === 1 ? "applied" : s === 0 ? "repeat" : "over_limit", total: Number(total) };
}

function toCounts(hash: Record<string, unknown> | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(hash ?? {})) out[k] = Number(v) || 0;
  return out;
}

export type SevaDaySnapshot = {
  mine: Record<string, number>;
  global: Record<string, number>;
  devotees: number;
  event: { total: Record<string, number>; mine: Record<string, number> } | null;
};

/** Everything about today's seva, in one round trip. */
export async function getSevaDay(
  userId: string,
  date: string,
  eventId: string | null
): Promise<SevaDaySnapshot> {
  const pipe = kv.pipeline();
  pipe.hgetall(userDayKey(userId, date));
  pipe.hgetall(globalDayKey(date));
  pipe.pfcount(devoteesDayKey(date));
  if (eventId) {
    pipe.hgetall(eventTotalKey(eventId));
    pipe.hgetall(eventUserKey(eventId, userId));
  }
  const r = await pipe.exec();
  return {
    mine: toCounts(r[0] as Record<string, unknown> | null),
    global: toCounts(r[1] as Record<string, unknown> | null),
    devotees: Number(r[2]) || 0,
    event: eventId
      ? {
          total: toCounts(r[3] as Record<string, unknown> | null),
          mine: toCounts(r[4] as Record<string, unknown> | null),
        }
      : null,
  };
}
