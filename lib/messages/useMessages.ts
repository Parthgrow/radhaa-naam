"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Message, MessagePage } from "./types";

/** A message in the list; `pending` while it is being saved. */
export type Entry = Message & { pending?: boolean };

export type SendOutcome = "saved" | "invalid" | "rate_limited" | "failed";

/** Your messages to Radha Rani: load, save (optimistic, safe to retry) and delete. */
export function useMessages(active: boolean) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = useRef(false);

  const fetchPage = useCallback(async (before: string | null): Promise<MessagePage | null> => {
    try {
      const res = await fetch(`/api/messages${before ? `?before=${before}` : ""}`, { cache: "no-store" });
      if (res.status === 402) {
        window.location.href = "/";
        return null;
      }
      return res.ok ? ((await res.json()) as MessagePage) : null;
    } catch {
      return null;
    }
  }, []);

  // Fresh list each time the sheet opens
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    fetchPage(null).then((page) => {
      if (cancelled) return;
      if (!page) {
        setError("Sandesh nahi khul paye. Internet check kijiye.");
        return;
      }
      setError(null);
      // Keep anything still being saved at the top
      setEntries((prev) => [...prev.filter((e) => e.pending), ...page.messages]);
      setNextCursor(page.nextCursor);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading.current) return;
    loading.current = true;
    const page = await fetchPage(nextCursor);
    if (page) {
      setEntries((prev) => [...prev, ...page.messages]);
      setNextCursor(page.nextCursor);
    }
    loading.current = false;
  }, [fetchPage, nextCursor]);

  /**
   * Save a message. It appears in the list at once; a failed attempt is retried
   * with the SAME id, so the server can never keep two copies. On failure the
   * entry is removed again and the caller keeps the draft.
   */
  const send = useCallback(async (body: string): Promise<SendOutcome> => {
    const id = crypto.randomUUID();
    setEntries((prev) => [{ id, body, createdAt: new Date().toISOString(), pending: true }, ...prev]);
    const drop = () => setEntries((prev) => prev.filter((e) => e.id !== id));

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, body }),
        });
        if (res.status === 402) {
          window.location.href = "/";
          return "failed";
        }
        if (res.ok) {
          const data = (await res.json()) as { message: Message };
          setEntries((prev) => prev.map((e) => (e.id === id ? data.message : e)));
          return "saved";
        }
        if (res.status === 429) {
          drop();
          return "rate_limited";
        }
        if (res.status === 400) {
          drop();
          return "invalid";
        }
        throw new Error(String(res.status));
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    drop();
    return "failed";
  }, []);

  const remove = useCallback(async (id: string) => {
    setError(null);
    let removed: Entry | undefined;
    let index = 0;
    setEntries((prev) => {
      index = prev.findIndex((e) => e.id === id);
      removed = prev[index];
      return prev.filter((e) => e.id !== id);
    });
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) return;
      throw new Error(String(res.status));
    } catch {
      // Put it back where it was
      const back = removed;
      if (back) setEntries((prev) => [...prev.slice(0, index), back, ...prev.slice(index)]);
      setError("Sandesh hataya nahi ja saka. Dobara koshish kijiye.");
    }
  }, []);

  return { entries, loaded, hasMore: nextCursor !== null, error, send, remove, loadMore };
}
