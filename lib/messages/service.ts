import { DEFAULT_PAGE, MAX_PAGE, type Message, type MessagePage } from "./types";
import { isCursor, isMessageId, parseBody } from "./validation";

export type SaveOutcome = "created" | "repeat" | "rate_limited";

/** Where messages live. The service depends on this, not on Redis. */
export interface MessageRepository {
  /** Save atomically; a message whose id already exists is a repeat, not a second copy. */
  save(userId: string, message: Message, nowMs: number): Promise<SaveOutcome>;
  get(userId: string, id: string): Promise<Message | null>;
  list(userId: string, before: string | null, limit: number): Promise<MessagePage>;
  /** True if the message existed and was removed. */
  remove(userId: string, id: string): Promise<boolean>;
}

export type SendResult =
  | { status: "created" | "repeat"; message: Message }
  | { status: "invalid"; error: "bad_id" | "empty" | "too_long" | "not_text" }
  | { status: "rate_limited" };

/**
 * The use cases. Everything it needs (storage and the clock) is passed in, so
 * tests can use a fake store and a fixed time.
 */
export function createMessageService(deps: { repo: MessageRepository; now: () => number }) {
  const { repo, now } = deps;

  return {
    async send(userId: string, input: { id: unknown; body: unknown }): Promise<SendResult> {
      if (!isMessageId(input.id)) return { status: "invalid", error: "bad_id" };
      const parsed = parseBody(input.body);
      if (!parsed.ok) return { status: "invalid", error: parsed.error };

      const nowMs = now();
      const message: Message = { id: input.id, body: parsed.body, createdAt: new Date(nowMs).toISOString() };
      const outcome = await repo.save(userId, message, nowMs);
      if (outcome === "rate_limited") return { status: "rate_limited" };
      if (outcome === "repeat") {
        // Return what is actually saved, not what this retry carried
        const saved = await repo.get(userId, input.id);
        return { status: "repeat", message: saved ?? message };
      }
      return { status: "created", message };
    },

    list(userId: string, opts: { before?: unknown; limit?: unknown } = {}): Promise<MessagePage> {
      const before = isCursor(opts.before) ? opts.before : null;
      const n = Number(opts.limit);
      const limit = Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_PAGE) : DEFAULT_PAGE;
      return repo.list(userId, before, limit);
    },

    remove(userId: string, id: unknown): Promise<boolean> {
      return isMessageId(id) ? repo.remove(userId, id) : Promise.resolve(false);
    },
  };
}

export type MessageService = ReturnType<typeof createMessageService>;
