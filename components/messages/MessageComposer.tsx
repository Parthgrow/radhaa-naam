"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MAX_BODY } from "@/lib/messages/types";
import type { SendOutcome } from "@/lib/messages/useMessages";
import { useJaapCount } from "@/lib/useJaapCount";
import { vibrate } from "@/lib/sounds";

const ERRORS: Record<Exclude<SendOutcome, "saved">, string> = {
  invalid: "Sandesh khaali ya bahut lamba hai.",
  rate_limited: "Ek ghante mein bahut sandesh ho gaye. Thodi der baad likhiye.",
  failed: "Sandesh save nahi hua. Internet check karke dobara koshish kijiye. Aapka likha hua surakshit hai.",
};

/** Write to Radha Rani. The draft is kept on this phone until it is saved, so nothing written is lost. */
export default function MessageComposer({ onSend }: { onSend: (body: string) => Promise<SendOutcome> }) {
  const { data: session } = useSession();
  const { settings } = useJaapCount();
  const draftKey = session?.user?.id ? `radha-message-draft:${session.user.id}` : null;
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Restore an unsaved draft once we know whose it is (adjusting state while
  // rendering, which React supports, instead of in an effect)
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  if (draftKey && restoredFor !== draftKey) {
    setRestoredFor(draftKey);
    try {
      const saved = typeof window === "undefined" ? null : window.localStorage.getItem(draftKey);
      if (saved) setText(saved);
    } catch {
      // storage blocked: just start empty
    }
  }

  function change(value: string) {
    setText(value);
    setSent(false);
    setError(null);
    if (!draftKey) return;
    try {
      if (value) window.localStorage.setItem(draftKey, value);
      else window.localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }

  const length = Array.from(text).length;
  const tooLong = length > MAX_BODY;
  const canSend = !sending && text.trim().length > 0 && !tooLong;

  async function submit() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    const outcome = await onSend(text);
    setSending(false);
    if (outcome === "saved") {
      change("");
      setSent(true);
      vibrate(settings.haptics, 15);
    } else {
      setError(ERRORS[outcome]);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Jo man mein hai, Radha Rani se kahiye. Yeh sirf aapke aur unke beech hai.</p>
      <textarea
        value={text}
        onChange={(e) => change(e.target.value)}
        rows={5}
        placeholder="Radhe Radhe… apne man ki baat likhiye"
        aria-label="Radha Rani ke liye sandesh"
        className="w-full select-text resize-none rounded-2xl bg-surface px-4 py-3 text-foreground ring-1 ring-ring/40 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center justify-between text-xs">
        <span className={tooLong ? "text-red-600" : "text-muted"}>
          {length}/{MAX_BODY}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {sent && <p className="text-sm text-primary">Aapka sandesh Radha Rani tak pahunch gaya 🙏</p>}
      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        className="w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-white transition active:scale-[0.99] disabled:opacity-40"
      >
        {sending ? "Arpit ho raha hai…" : "Arpit karein 🙏"}
      </button>
    </div>
  );
}
