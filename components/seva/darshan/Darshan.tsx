"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SevaToday } from "@/lib/seva/types";
import { POSHAK_COLORS } from "@/lib/seva/schedule";
import type { BhogItem, SevaId } from "@/lib/seva/sevas";
import { useSevaToday } from "@/lib/seva/useSevaToday";
import { useJaapCount } from "@/lib/useJaapCount";
import { playBell, playLullaby, playShankh, vibrate } from "@/lib/sounds";
import DarshanScene from "./DarshanScene";
import BhogPicker from "./BhogPicker";
import SevaList from "./SevaList";
import SakhiBubble from "../SakhiBubble";
import { AARTI_ROUNDS, useAarti } from "./useAarti";

type Mode = "idle" | "bhog-choose" | "bhog-offering";

const LIGHT_TITLE = { dawn: "Subah ka darshan", day: "Darshan", evening: "Sandhya darshan", night: "Raat ka darshan" } as const;

export default function Darshan({ initial }: { initial: SevaToday }) {
  const { settings } = useJaapCount();
  const { today, offer, error } = useSevaToday(initial);
  const [mode, setMode] = useState<Mode>("idle");
  const [moment, setMoment] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const stopLullaby = useRef<() => void>(() => {});
  const poshak = POSHAK_COLORS[today.weekday] ?? POSHAK_COLORS[0];

  const onAartiDone = useCallback(() => {
    offer("aarti").then((ok) => ok && setMoment("Aarti sampann hui. Radhe Radhe 🙏"));
  }, [offer]);
  const aarti = useAarti(sceneRef, { sound: settings.sound, haptics: settings.haptics, onDone: onAartiDone });

  useEffect(() => () => stopLullaby.current(), []);

  function wake() {
    setMoment(null);
    playShankh(settings.sound);
    playBell(settings.sound);
    vibrate(settings.haptics, [20, 60, 40]);
    offer("wake").then((ok) => ok && setMoment("Radha Rani jaag gayi hain. Radhe Radhe 🙏"));
  }

  function sleep() {
    aarti.stop();
    setMode("idle");
    setMoment(null);
    stopLullaby.current();
    stopLullaby.current = playLullaby(settings.sound);
    offer("sleep").then((ok) => ok && setMoment("Radha Rani vishram kar rahi hain. Radhe Radhe 🌙"));
  }

  function offerBhog(item: BhogItem) {
    setMode("bhog-offering");
    setMoment(null);
    const sent = offer("bhog", item);
    [0, 1300, 2600].forEach((ms) => setTimeout(() => playBell(settings.sound), 600 + ms));
    setTimeout(async () => {
      const ok = await sent;
      setMode("idle");
      if (ok) setMoment("Bhog arpit hua. Prasad paaiye 🙏");
    }, 4600);
  }

  function pick(id: SevaId) {
    stopLullaby.current();
    setMoment(null);
    if (id === "wake") wake();
    else if (id === "sleep") sleep();
    else if (id === "aarti") aarti.start();
    else if (id === "bhog") setMode("bhog-choose");
  }

  const busy = mode !== "idle" || aarti.active;
  const curtainOpen = today.awake && mode !== "bhog-offering" ? 1 : 0;

  let sakhi: string;
  if (moment) sakhi = moment;
  else if (aarti.active) sakhi = "Ungli se thali ko Radha Rani ke charon or ghumaiye, saat baar.";
  else if (mode === "bhog-choose") sakhi = "Kya arpit karenge? Jitna chahein, utna bhog lagaiye.";
  else if (mode === "bhog-offering") sakhi = "Pat band hai. Radha Rani bhog paa rahi hain...";
  else if (!today.awake) sakhi = "Radha Rani vishram kar rahi hain. Jab chahein, unhe jagaiye.";
  else sakhi = `Radha Rani jaagi hain, aaj ${poshak.hindi} poshak mein. Aap kya seva karna chahenge?`;

  return (
    <main className="flex min-h-svh shrink-0 flex-col">
      <header className="mx-auto flex w-full max-w-md items-center justify-between px-5 pt-5">
        <Link href="/" className="text-sm text-muted hover:text-foreground">
          ← Back
        </Link>
        <span className="text-xs uppercase tracking-[0.2em] text-muted">
          {today.awake ? LIGHT_TITLE[today.light] : "Vishram"}
        </span>
      </header>
      <h1 className="mt-2 text-center font-deva text-3xl text-primary">श्री राधा रानी</h1>

      <div
        ref={sceneRef}
        className="relative mx-auto mt-3 w-full max-w-md shrink-0 overflow-hidden sm:rounded-3xl"
        {...aarti.handlers}
      >
        <DarshanScene
          phase={today.light}
          weekday={today.weekday}
          bhog={mode === "bhog-offering" ? null : today.bhog}
          curtainOpen={curtainOpen}
          aartiAngle={aarti.active ? aarti.angle : null}
        />
        {aarti.active && (
          <div className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-sm font-medium text-white">
            {aarti.rounds} / {AARTI_ROUNDS}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-md space-y-3 px-5 py-4">
        <SakhiBubble>{sakhi}</SakhiBubble>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        {aarti.active && (
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <button
              type="button"
              onClick={aarti.tapRound}
              disabled={aarti.rounds >= AARTI_ROUNDS}
              className="w-full rounded-xl bg-primary px-4 py-3 text-base font-medium text-white transition active:scale-[0.98] disabled:opacity-40"
            >
              🪔 Aarti ghumaiye
            </button>
            <button type="button" onClick={aarti.stop} className="px-3 text-sm text-muted">
              Band karein
            </button>
          </div>
        )}

        {mode === "bhog-choose" && <BhogPicker onPick={offerBhog} onCancel={() => setMode("idle")} />}

        {!aarti.active && mode !== "bhog-choose" && <SevaList awake={today.awake} busy={busy} onPick={pick} />}

        <p className="text-center text-xs text-muted">
          Aaj: {today.register.devotees.toLocaleString("en-IN")} bhakt · {today.register.wake.toLocaleString("en-IN")} jagaran ·{" "}
          {today.register.aarti.toLocaleString("en-IN")} aarti · {today.register.bhog.toLocaleString("en-IN")} bhog
        </p>
      </div>
    </main>
  );
}
