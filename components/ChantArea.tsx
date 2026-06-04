"use client";

import { useEffect, useRef, useState } from "react";
import { useJaap } from "@/lib/state";
import { playBell, vibrate } from "@/lib/sounds";
import BeadRing from "./BeadRing";

export default function ChantArea() {
  const { state, count, undo, malaJustCompleted } = useJaap();
  const [pulseKey, setPulseKey] = useState(0);
  const [burstKey, setBurstKey] = useState<number | undefined>(undefined);
  const [showFloat, setShowFloat] = useState<{ id: number } | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const lastMalaSeen = useRef(malaJustCompleted);

  // Trigger burst + bell when a mala completes
  useEffect(() => {
    if (malaJustCompleted !== lastMalaSeen.current && malaJustCompleted > 0) {
      lastMalaSeen.current = malaJustCompleted;
      setBurstKey(malaJustCompleted);
      playBell(state.settings.sound);
      vibrate(state.settings.haptics, [20, 60, 40]);
    }
  }, [malaJustCompleted, state.settings.sound, state.settings.haptics]);

  function handleCount() {
    count();
    setPulseKey((k) => k + 1);
    setShowFloat({ id: Date.now() });
    vibrate(state.settings.haptics, 10);
  }

  function onPointerDown() {
    longPressFired.current = false;
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      undo();
      vibrate(state.settings.haptics, [10, 40, 10]);
    }, 550);
  }

  function onPointerUp() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressFired.current) {
      handleCount();
    }
  }

  function onPointerCancel() {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressFired.current = false;
  }

  // Keyboard support — space / enter / arrow-up = count, backspace = undo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // ignore when typing in inputs
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (e.key === " " || e.key === "Enter" || e.key === "ArrowUp") {
        e.preventDefault();
        handleCount();
      } else if (e.key === "Backspace" || e.key === "ArrowDown") {
        e.preventDefault();
        undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.settings.haptics]);

  return (
    <button
      type="button"
      aria-label="Tap to chant"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      className="relative flex w-full flex-1 flex-col items-center justify-center gap-8 px-6 py-10 text-center outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-3xl"
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="text-xs uppercase tracking-[0.35em] text-muted">
          ॥ jaap ॥
        </div>
        <div className="font-deva text-5xl sm:text-6xl text-primary leading-none drop-shadow-sm">
          {state.settings.naam}
        </div>
        <div className="text-base text-muted tracking-wide">
          {state.settings.transliteration}
        </div>
      </div>

      <div className="relative">
        <BeadRing
          current={state.currentBead}
          total={state.settings.beadsPerMala}
          pulseKey={pulseKey}
          burstKey={burstKey}
        />
        {showFloat && (
          <span
            key={showFloat.id}
            className="font-deva pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-2xl text-primary animate-float"
          >
            {state.settings.naam}
          </span>
        )}
      </div>

      <p className="text-xs text-muted max-w-xs">
        Tap anywhere to chant · long-press to undo · space / enter on keyboard
      </p>
    </button>
  );
}
