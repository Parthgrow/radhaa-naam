import "server-only";
import { redisMessageRepository } from "@/lib/kv/messages";
import { createMessageService } from "./service";

/** The service wired to Redis and the real clock; routes import this. */
export const messages = createMessageService({ repo: redisMessageRepository, now: () => Date.now() });
