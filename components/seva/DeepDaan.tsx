"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SevaToday } from "@/lib/seva/types";
import { useJaapCount } from "@/lib/useJaapCount";
import { playChime, vibrate } from "@/lib/sounds";
import GhatScene from "./GhatScene";
import SakhiBubble from "./SakhiBubble";

function formatRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function DeepDaan({ initial }: { initial: SevaToday }) {
  const { settings, syncNow } = useJaapCount();
  const [today, setToday] = useState(initial);
  const [freshKey, setFreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const sending = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/seva/today", { cache: "no-store" });
      if (res.status === 402) {
        window.location.href = "/";
        return;
      }
      if (res.ok) setToday(await res.json());
    } catch {
      // keep showing what we have
    }
  }, []);

  // Malas chanted moments ago may still be on their way to the server
  useEffect(() => {
    syncNow().finally(refresh);
  }, [syncNow, refresh]);

  const seva = today.sevas.find((s) => s.id === "deep_daan");
  const event = today.event;
  if (!seva || !event) return null;

  const left = Math.max(0, seva.limit - seva.used);
  const capReached = seva.limit >= 11 && seva.used >= 11;

  async function lightDiya() {
    if (!seva || !event || left <= 0 || sending.current) return;
    sending.current = true;
    setError(null);
    // Light it right away; the server confirms (or corrects) a moment later
    setToday((t) => ({
      ...t,
      sevas: t.sevas.map((s) => (s.id === "deep_daan" ? { ...s, used: s.used + 1 } : s)),
      event: t.event && { ...t.event, myDiyas: t.event.myDiyas + 1, totalDiyas: t.event.totalDiyas + 1 },
    }));
    setFreshKey((k) => k + 1);
    playChime(settings.sound);
    vibrate(settings.haptics, 15);

    const opId = crypto.randomUUID();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/seva/offer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opId, seva: "deep_daan", count: 1 }),
        });
        if (res.status === 402) {
          window.location.href = "/";
          return;
        }
        const data = await res.json();
        if (data.today) setToday(data.today);
        if (!res.ok && data.error === "over_limit") setError("Aaj ke sab deep jal chuke hain.");
        else if (!res.ok && data.error === "not_now") setError("Deep daan abhi band hai.");
        else if (!res.ok) throw new Error(data.error);
        break;
      } catch {
        if (attempt === 2) {
          setError("Deep nahi jal paya. Internet check karke dobara koshish kijiye.");
          await refresh();
        } else {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }
    sending.current = false;
  }

  let sakhiLine: React.ReactNode;
  if (seva.limit === 0) {
    sakhiLine = (
      <>
        Radhe Radhe! Kartik maas mein Yamuna ji ke ghat par deep daan ki parampara hai. Ek mala poori kijiye, aur
        apna pehla deep jalaiye.
      </>
    );
  } else if (left > 0) {
    sakhiLine = (
      <>
        Aapke paas aaj <strong>{left}</strong> {left === 1 ? "deep hai" : "deep hain"}. Ek-ek karke Radha Rani ke naam
        se jalaiye.
      </>
    );
  } else if (capReached) {
    sakhiLine = <>Aaj ke gyarah deep poore hue. Kal phir milte hain. Radhe Radhe!</>;
  } else {
    sakhiLine = <>Aaj ke sab deep jal gaye. Har nayi mala se ek aur deep milega.</>;
  }

  const communityDiyas = Math.max(0, event.totalDiyas - event.myDiyas);

  return (
    <main className="flex min-h-svh shrink-0 flex-col bg-[#0e0a1d] text-[#f5e6c8]">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-5">
        <Link href="/" className="text-sm text-[#b8a0b5] hover:text-[#f5e6c8]">
          ← Back
        </Link>
        <span className="text-xs text-[#b8a0b5]">{formatRange(event.start, event.end)}</span>
      </header>

      <div className="mx-auto w-full max-w-md px-5 pt-3 text-center">
        <h1 className="font-deva text-3xl text-[#f5d76e]">{event.hindiName}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[#b8a0b5]">{event.name}</p>
      </div>

      <div className="mx-auto mt-4 w-full max-w-md shrink-0 overflow-hidden sm:rounded-3xl">
        <GhatScene communityDiyas={communityDiyas} myDiyas={event.myDiyas} freshKey={freshKey} />
      </div>

      <div className="mx-auto w-full max-w-md space-y-4 px-5 py-5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-2xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
            <div className="text-2xl font-semibold tabular-nums">{event.totalDiyas.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-[#b8a0b5]">deep is Kartik mein</div>
          </div>
          <div className="rounded-2xl bg-white/5 px-3 py-3 ring-1 ring-white/10">
            <div className="text-2xl font-semibold tabular-nums">{event.myDiyas.toLocaleString("en-IN")}</div>
            <div className="text-[11px] text-[#b8a0b5]">aapke deep</div>
          </div>
        </div>

        <SakhiBubble tone="dark">{sakhiLine}</SakhiBubble>

        {seva.limit === 0 ? (
          <Link
            href="/"
            className="block w-full rounded-xl bg-[#f2799f] px-4 py-3 text-center text-base font-medium text-[#1a1033]"
          >
            Jaap karein →
          </Link>
        ) : (
          <button
            type="button"
            onClick={lightDiya}
            disabled={left <= 0}
            className="w-full rounded-xl bg-[#f5d76e] px-4 py-3 text-base font-semibold text-[#1a1033] shadow-[0_10px_40px_-10px_rgba(245,215,110,0.6)] transition active:scale-[0.98] disabled:opacity-40"
          >
            🪔 Deep jalaiye{left > 0 ? ` (${left})` : ""}
          </button>
        )}
        {error && <p className="text-center text-sm text-[#f2799f]">{error}</p>}

        <p className="text-center text-xs text-[#b8a0b5]">
          Har mala se ek deep · din mein 11 tak · aaj {today.register.devotees.toLocaleString("en-IN")}{" "}
          {today.register.devotees === 1 ? "bhakt ne" : "bhakton ne"} seva ki
        </p>
      </div>
    </main>
  );
}
