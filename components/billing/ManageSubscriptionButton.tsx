"use client";

import { useState } from "react";

/** Opens Dodo's customer portal: cancel, change card, invoices. */
export default function ManageSubscriptionButton({
  label = "Manage subscription",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not open subscription settings");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open subscription settings");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={open}
        disabled={loading}
        className={
          className ??
          "w-full rounded-xl bg-surface px-4 py-2.5 text-sm text-foreground ring-1 ring-ring/40 transition hover:bg-ring/20 disabled:opacity-60"
        }
      >
        {loading ? "Opening…" : label}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
