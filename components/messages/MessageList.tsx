"use client";

import { useState } from "react";
import type { Entry } from "@/lib/messages/useMessages";

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** Your past messages, newest first. Removing one asks to be tapped twice. */
export default function MessageList({
  entries,
  loaded,
  hasMore,
  error,
  onRemove,
  onMore,
}: {
  entries: Entry[];
  loaded: boolean;
  hasMore: boolean;
  error: string | null;
  onRemove: (id: string) => void;
  onMore: () => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);

  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">Mere sandesh</h3>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      {entries.length === 0 ? (
        <p className="text-sm text-muted">{loaded ? "Abhi koi sandesh nahi. Pehla sandesh likhiye." : "…"}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <li key={e.id} className={`rounded-2xl bg-surface px-4 py-3 ring-1 ring-ring/40 ${e.pending ? "opacity-60" : ""}`}>
              <p className="select-text whitespace-pre-wrap break-words text-sm text-foreground">{e.body}</p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                <span>{e.pending ? "Arpit ho raha hai…" : when(e.createdAt)}</span>
                {!e.pending &&
                  (confirming === e.id ? (
                    <span className="flex gap-3">
                      <button type="button" onClick={() => { setConfirming(null); onRemove(e.id); }} className="font-medium text-red-600">
                        Hatayein
                      </button>
                      <button type="button" onClick={() => setConfirming(null)}>
                        Rehne dein
                      </button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirming(e.id)} aria-label="Sandesh hatayein">
                      🗑
                    </button>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <button type="button" onClick={onMore} className="mt-3 w-full py-2 text-sm text-primary">
          Aur purane sandesh
        </button>
      )}
    </section>
  );
}
