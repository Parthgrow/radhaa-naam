import { kv } from "./client";
import { RATE_PER_HOUR, type Message, type MessagePage } from "@/lib/messages/types";
import type { MessageRepository, SaveOutcome } from "@/lib/messages/service";

const PROJECT_PREFIX = "radha";
const RATE_WINDOW_SECONDS = 60 * 60;

/** One message, stored as JSON. The userId is part of the key, so no one can reach another's. */
function messageKey(userId: string, id: string) {
  return `${PROJECT_PREFIX}:msg:${userId}:${id}`;
}
/** Sorted set of a devotee's message ids; the score orders them newest first. */
function indexKey(userId: string) {
  return `${PROJECT_PREFIX}:msgs:${userId}`;
}
/** Messages saved in the current hour. */
function rateKey(userId: string) {
  return `${PROJECT_PREFIX}:msg-rate:${userId}`;
}

/**
 * Save one message atomically:
 *  - an id that already exists is a repeat (a retry), not a second copy
 *  - at most RATE_PER_HOUR new messages per hour
 *  - the score is the time in ms, bumped past the newest existing one, so
 *    every message has its own place in the order (and paging never skips)
 *
 * KEYS: message, index, rate
 * ARGV: json, id, nowMs, limit, rateTtl
 * Returns: [status, score]   status: 1 created, 0 repeat, -1 rate limited
 */
const SAVE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return {0, 0} end
local n = tonumber(redis.call('GET', KEYS[3]) or '0')
if n >= tonumber(ARGV[4]) then return {-1, 0} end
local score = tonumber(ARGV[3])
local top = redis.call('ZREVRANGE', KEYS[2], 0, 0, 'WITHSCORES')
if top[2] and tonumber(top[2]) >= score then score = tonumber(top[2]) + 1 end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('ZADD', KEYS[2], score, ARGV[2])
if n == 0 then
  redis.call('SET', KEYS[3], '1', 'EX', tonumber(ARGV[5]))
else
  redis.call('INCR', KEYS[3])
end
return {1, score}
`;

/** ids and scores, newest first, strictly older than the cursor score. */
const LIST_SCRIPT = `
return redis.call('ZREVRANGEBYSCORE', KEYS[1], ARGV[1], '-inf', 'WITHSCORES', 'LIMIT', 0, tonumber(ARGV[2]))
`;

export const redisMessageRepository: MessageRepository = {
  async save(userId, message, nowMs): Promise<SaveOutcome> {
    const [status] = await kv.eval<(string | number)[], [number, number]>(
      SAVE_SCRIPT,
      [messageKey(userId, message.id), indexKey(userId), rateKey(userId)],
      [JSON.stringify(message), message.id, nowMs, RATE_PER_HOUR, RATE_WINDOW_SECONDS]
    );
    const s = Number(status);
    return s === 1 ? "created" : s === 0 ? "repeat" : "rate_limited";
  },

  async get(userId, id) {
    return (await kv.get<Message>(messageKey(userId, id))) ?? null;
  },

  async list(userId, before, limit): Promise<MessagePage> {
    // One extra row tells us whether there is another page
    const flat = await kv.eval<(string | number)[], (string | number)[]>(
      LIST_SCRIPT,
      [indexKey(userId)],
      [before === null ? "+inf" : `(${before}`, limit + 1]
    );
    const rows: Array<{ id: string; score: string }> = [];
    for (let i = 0; i + 1 < flat.length; i += 2) rows.push({ id: String(flat[i]), score: String(flat[i + 1]) });

    const page = rows.slice(0, limit);
    const stored = page.length
      ? await kv.mget<(Message | null)[]>(...page.map((r) => messageKey(userId, r.id)))
      : [];
    // A message missing from storage (an interrupted delete) is skipped, never an error
    const messages = stored.filter((m): m is Message => !!m && typeof m.body === "string");
    return {
      messages,
      nextCursor: rows.length > limit ? page[page.length - 1].score : null,
    };
  },

  async remove(userId, id) {
    const [removed] = await kv.multi().del(messageKey(userId, id)).zrem(indexKey(userId), id).exec<[number, number]>();
    return Number(removed) === 1;
  },
};
