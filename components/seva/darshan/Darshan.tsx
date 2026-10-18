"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SevaToday } from "@/lib/seva/types";
import { POSHAK_COLORS, type DarshanPhase } from "@/lib/seva/schedule";
import { BHOG_ITEMS, BHOG_SEVAS, type BhogTier, type SevaId } from "@/lib/seva/sevas";
import { useSevaToday } from "@/lib/seva/useSevaToday";
import { useJaapCount } from "@/lib/useJaapCount";
import { playBell, playLullaby, playShankh, vibrate } from "@/lib/sounds";
import DarshanScene, { CENTER, H, W } from "./DarshanScene";
import SakhiBubble from "../SakhiBubble";

const AARTI_ROUNDS = 7;
const TWO_PI = Math.PI * 2;

const PHASE_TITLE: Record<DarshanPhase, string> = {
  mangala: "Mangala darshan",
  day: "Shringar darshan",
  sandhya: "Sandhya darshan",
  shayan: "Shayan",
  closed: "Darshan band",
};

type Mode = "idle" | "aarti" | "bhog-choose" | "bhog-offering" | "shayan";

function garlandLevel(petals: number): 0 | 1 | 2 | 3 {
  if (petals >= 11) return 3;
  if (petals >= 5) return 2;
  if (petals >= 1) return 1;
  return 0;
}

export default function Darshan({ initial }: { initial: SevaToday }) {
  const { settings } = useJaapCount();
  const { today, offer, error } = useSevaToday(initial);
  const [mode, setMode] = useState<Mode>("idle");
  const [moment, setMoment] = useState<string | null>(null);
  const [aartiAngle, setAartiAngle] = useState(-Math.PI / 2);
  const [rounds, setRounds] = useState(0);
  const [petalsFalling, setPetalsFalling] = useState<Array<{ id: number; x: number; drift: number }>>([]);
  const sceneRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ last: number; total: number } | null>(null);
  const stopLullaby = useRef<() => void>(() => {});

  const seva = (id: SevaId) => today.sevas.find((s) => s.id === id)!;
  const aarti = [seva("aarti_mangala"), seva("aarti_sandhya")].find((s) => s.inWindow) ?? null;
  const phool = seva("phool");
  const bhog = BHOG_SEVAS.map(seva).find((s) => s.inWindow) ?? null;
  const shayan = seva("shayan");
  const poshak = POSHAK_COLORS[today.weekday] ?? POSHAK_COLORS[0];

  useEffect(() => () => stopLullaby.current(), []);

  // ---- Aarti: circle the thali around Radha Rani seven times
  const finishRound = useCallback(
    (n: number) => {
      playBell(settings.sound);
      vibrate(settings.haptics, 12);
      if (n >= AARTI_ROUNDS && aarti) {
        drag.current = null;
        playShankh(settings.sound);
        vibrate(settings.haptics, [20, 60, 40]);
        offer(aarti.id).then((ok) => {
          if (ok) setMoment("Aarti sampann hui. Radhe Radhe 🙏");
        });
        setTimeout(() => setMode("idle"), 1800);
      }
    },
    [aarti, offer, settings.haptics, settings.sound]
  );

  function angleAt(e: React.PointerEvent) {
    const rect = sceneRef.current!.getBoundingClientRect();
    const cx = rect.left + (rect.width * CENTER.x) / W;
    const cy = rect.top + (rect.height * CENTER.y) / H;
    // The thali moves on an ellipse, so scale y to match it
    return Math.atan2((e.clientY - cy) * (230 / 300), e.clientX - cx);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (mode !== "aarti" || rounds >= AARTI_ROUNDS) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const a = angleAt(e);
    drag.current = { last: a, total: rounds * TWO_PI };
    setAartiAngle(a);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const a = angleAt(e);
    let delta = a - drag.current.last;
    if (delta > Math.PI) delta -= TWO_PI;
    if (delta < -Math.PI) delta += TWO_PI;
    drag.current.last = a;
    drag.current.total += Math.abs(delta);
    setAartiAngle(a);
    const done = Math.min(AARTI_ROUNDS, Math.floor(drag.current.total / TWO_PI));
    if (done > rounds) {
      setRounds(done);
      finishRound(done);
    }
  }

  function onPointerUp() {
    drag.current = null;
  }

  /** For those who'd rather tap: one tap carries the thali once around. */
  function tapRound() {
    if (rounds >= AARTI_ROUNDS) return;
    const start = aartiAngle;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / 700);
      setAartiAngle(start + t * TWO_PI);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const n = rounds + 1;
    setRounds(n);
    finishRound(n);
  }

  function startAarti() {
    setMoment(null);
    setRounds(0);
    setAartiAngle(-Math.PI / 2);
    setMode("aarti");
  }

  // ---- Phool seva
  function offerPetal() {
    if (!phool.available) return;
    setMoment(null);
    const id = Date.now() + Math.random();
    setPetalsFalling((p) => [...p, { id, x: 35 + Math.random() * 30, drift: (Math.random() - 0.5) * 40 }]);
    setTimeout(() => setPetalsFalling((p) => p.filter((q) => q.id !== id)), 1700);
    vibrate(settings.haptics, 10);
    offer("phool").then((ok) => ok && setMoment("Phool arpit hua 🌸"));
  }

  // ---- Bhog: choose, the curtain closes while the bell rings, then opens
  function offerBhog(tier: BhogTier) {
    if (!bhog) return;
    setMode("bhog-offering");
    setMoment(null);
    const sent = offer(bhog.id, { tier });
    [0, 1300, 2600].forEach((ms) => setTimeout(() => playBell(settings.sound), 600 + ms));
    setTimeout(async () => {
      const ok = await sent;
      setMode("idle");
      if (ok) setMoment("Bhog arpit hua. Prasad paaiye 🙏");
    }, 4600);
  }

  // ---- Shayan: lullaby, the lights dim and the curtain closes for the night
  function startShayan() {
    setMode("shayan");
    setMoment(null);
    stopLullaby.current = playLullaby(settings.sound);
    offer("shayan").then((ok) => {
      if (ok) setMoment("Shubh ratri. Radhe Radhe 🌙");
      setMode("idle");
    });
  }

  const bhogTierShown = bhog?.tier ?? null;
  const curtainOpen =
    today.phase === "closed" || mode === "bhog-offering" || mode === "shayan" || (today.phase === "shayan" && shayan.used > 0)
      ? 0
      : 1;

  let sakhi: string;
  if (moment) sakhi = moment;
  else if (mode === "aarti") sakhi = "Ungli se thali ko Radha Rani ke charon or ghumaiye, saat baar.";
  else if (mode === "bhog-choose") sakhi = "Aaj ke jaap se yeh bhog lagaa sakte hain. Kya arpit karenge?";
  else if (mode === "bhog-offering") sakhi = "Pat band hai. Radha Rani bhog paa rahi hain...";
  else if (today.phase === "closed") sakhi = "Radha Rani vishram kar rahi hain. Mangala darshan subah 5 baje khulenge.";
  else if (today.phase === "shayan")
    sakhi = shayan.used ? "Shubh ratri. Kal mangala darshan mein milte hain." : "Ab Radha Rani ke vishram ka samay hai. Shayan karaiye.";
  else if (aarti?.available)
    sakhi = today.phase === "mangala" ? "Radhe Radhe! Mangala aarti ka samay hai. Aaiye, aarti karein." : "Sandhya ho gayi, deep jal gaye hain. Aaiye, sandhya aarti karein.";
  else if (today.malasToday === 0) sakhi = "Ek mala poori kijiye. Har mala se Radha Rani ke liye ek phool milta hai.";
  else sakhi = `Aaj Radha Rani ne ${poshak.hindi} poshak dharan ki hai. Har mala se ek phool arpit kar sakte hain.`;

  const petalsLeft = Math.max(0, phool.limit - phool.used);
  const btn = "w-full rounded-xl px-4 py-3 text-base font-medium transition active:scale-[0.98] disabled:opacity-40";

  return (
    <main className="flex min-h-svh shrink-0 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-5">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Back
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">{PHASE_TITLE[today.phase]}</span>
      </header>
      <h1 className="mt-2 text-center font-deva text-3xl text-primary">श्री राधा रानी</h1>

      <div
        ref={sceneRef}
        className="relative mx-auto mt-3 w-full max-w-md shrink-0 overflow-hidden sm:rounded-3xl"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <DarshanScene
          phase={today.phase}
          weekday={today.weekday}
          garland={garlandLevel(phool.used)}
          petals={phool.used}
          bhog={mode === "bhog-offering" ? null : bhogTierShown}
          curtainOpen={curtainOpen}
          aartiAngle={mode === "aarti" ? aartiAngle : null}
        />
        {petalsFalling.map((p) => (
          <span
            key={p.id}
            className="petal-fall pointer-events-none absolute top-[12%] h-3 w-5 rounded-[50%] bg-[#e91e63]"
            style={{ left: `${p.x}%`, ["--drift" as string]: `${p.drift}px` }}
          />
        ))}
        {mode === "aarti" && (
          <div className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white">
            {rounds} / {AARTI_ROUNDS}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-md space-y-3 px-5 py-4">
        <SakhiBubble>{sakhi}</SakhiBubble>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        {mode === "aarti" && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button type="button" onClick={tapRound} disabled={rounds >= AARTI_ROUNDS} className={`${btn} bg-primary text-white`}>
              🪔 Aarti ghumaiye
            </button>
            <button type="button" onClick={() => setMode("idle")} className="px-3 text-sm text-muted">
              Band karein
            </button>
          </div>
        )}

        {mode === "bhog-choose" && (
          <div className="space-y-2">
            {([1, 2, 3] as BhogTier[]).map((tier) => {
              const unlocked = today.bhog.unlocked >= tier;
              return (
                <button
                  key={tier}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => offerBhog(tier)}
                  className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left ring-1 ring-ring/40 transition hover:bg-ring/20 disabled:opacity-50"
                >
                  <span>
                    <span className="font-deva text-lg text-primary">{BHOG_ITEMS[tier].hindi}</span>
                    <span className="ml-2 text-sm text-muted">{BHOG_ITEMS[tier].name}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {unlocked ? "Arpit karein →" : `🔒 ${today.bhog.thresholds[tier]} malas`}
                  </span>
                </button>
              );
            })}
            <button type="button" onClick={() => setMode("idle")} className="w-full py-1 text-sm text-muted">
              Baad mein
            </button>
          </div>
        )}

        {mode === "idle" && (
          <div className="space-y-2">
            {aarti?.available && (
              <button type="button" onClick={startAarti} className={`${btn} bg-primary text-white`}>
                🪔 {aarti.name} karein
              </button>
            )}
            {bhog && !bhog.used && (
              <button
                type="button"
                onClick={() => setMode("bhog-choose")}
                disabled={today.bhog.unlocked === 0}
                className={`${btn} bg-[#c89b4d] text-white`}
              >
                🍯 {bhog.name} lagaiye{today.bhog.unlocked === 0 ? " (1 mala ke baad)" : ""}
              </button>
            )}
            {phool.inWindow && (
              <button type="button" onClick={offerPetal} disabled={!phool.available} className={`${btn} bg-surface text-foreground ring-1 ring-ring/40`}>
                🌸 Phool arpit karein {phool.limit > 0 ? `(${petalsLeft})` : "(mala ke baad)"}
              </button>
            )}
            {shayan.available && (
              <button type="button" onClick={startShayan} className={`${btn} bg-[#2a1d48] text-[#f5e6c8]`}>
                🌙 Shayan karaiye
              </button>
            )}
            {today.malasToday === 0 && today.phase !== "closed" && (
              <Link href="/" className="block text-center text-sm font-medium text-primary">
                Jaap karein →
              </Link>
            )}
          </div>
        )}

        <p className="text-center text-xs text-muted">
          Aaj: {today.register.devotees.toLocaleString("en-IN")} bhakt · {today.register.aarti.toLocaleString("en-IN")} aarti ·{" "}
          {today.register.petals.toLocaleString("en-IN")} phool · {today.register.bhog.toLocaleString("en-IN")} bhog
        </p>
        {today.event && (
          <Link href="/deep-daan" className="block text-center text-xs font-medium text-primary">
            🪔 {today.event.name} →
          </Link>
        )}
      </div>
    </main>
  );
}
