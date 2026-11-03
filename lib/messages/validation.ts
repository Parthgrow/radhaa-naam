import { MAX_BODY } from "./types";

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CURSOR_RE = /^\d{1,16}$/;

export function isMessageId(value: unknown): value is string {
  return typeof value === "string" && ID_RE.test(value);
}

export function isCursor(value: unknown): value is string {
  return typeof value === "string" && CURSOR_RE.test(value);
}

export type BodyResult = { ok: true; body: string } | { ok: false; error: "empty" | "too_long" | "not_text" };

/**
 * The only way to get a valid body: trims it and enforces 1 to MAX_BODY
 * characters (counted as the person sees them, so a Devanagari or emoji
 * character is one, not several).
 */
export function parseBody(raw: unknown): BodyResult {
  if (typeof raw !== "string") return { ok: false, error: "not_text" };
  const body = raw.trim();
  if (body.length === 0) return { ok: false, error: "empty" };
  if (Array.from(body).length > MAX_BODY) return { ok: false, error: "too_long" };
  return { ok: true, body };
}
