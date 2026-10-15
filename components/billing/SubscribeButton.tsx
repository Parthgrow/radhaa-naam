"use client";

import { useState } from "react";

export default function SubscribeButton({ label = "Subscribe" }: { label?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/create-session", { method: "POST" });
      if (res.status === 409) {
        // Already subscribed (e.g. paid in another tab)
        window.location.href = "/";
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={subscribe}
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-white shadow-[var(--shadow)] transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Opening checkout…" : label}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
