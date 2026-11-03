/** A message a devotee has written to Radha Rani. One-way: there is no reply. */
export type Message = {
  /** Made on the phone (a UUID); the same id is reused on retries, so a retry can't save twice */
  id: string;
  /** Trimmed, 1 to MAX_BODY characters */
  body: string;
  /** When the server saved it (ISO 8601) */
  createdAt: string;
};

export type MessagePage = {
  /** Newest first */
  messages: Message[];
  /** Pass back as `before` for the next page; null when there are no more */
  nextCursor: string | null;
};

export const MAX_BODY = 1000;
/** Most messages one devotee can save per hour */
export const RATE_PER_HOUR = 30;
export const DEFAULT_PAGE = 20;
export const MAX_PAGE = 50;
