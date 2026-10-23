"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import { playBell, playShankh, vibrate } from "@/lib/sounds";
import { CENTER, H, W } from "./DarshanScene";

export const AARTI_ROUNDS = 7;
const TWO_PI = Math.PI * 2;

/**
 * Aarti: circle the thali around Radha Rani seven times by dragging a finger,
 * or tap once per round. Calls `onDone` after the seventh.
 */
export function useAarti(
  sceneRef: RefObject<HTMLDivElement | null>,
  { sound, haptics, onDone }: { sound: boolean; haptics: boolean; onDone: () => void }
) {
  const [active, setActive] = useState(false);
  const [angle, setAngle] = useState(-Math.PI / 2);
  const [rounds, setRounds] = useState(0);
  const drag = useRef<{ last: number; total: number } | null>(null);

  const finishRound = useCallback(
    (n: number) => {
      playBell(sound);
      vibrate(haptics, 12);
      if (n >= AARTI_ROUNDS) {
        drag.current = null;
        playShankh(sound);
        vibrate(haptics, [20, 60, 40]);
        onDone();
        setTimeout(() => setActive(false), 1800);
      }
    },
    [haptics, onDone, sound]
  );

  const angleAt = (e: React.PointerEvent) => {
    const rect = sceneRef.current!.getBoundingClientRect();
    const cx = rect.left + (rect.width * CENTER.x) / W;
    const cy = rect.top + (rect.height * CENTER.y) / H;
    // The thali moves on an ellipse, so scale y to match it
    return Math.atan2((e.clientY - cy) * (230 / 300), e.clientX - cx);
  };

  const start = useCallback(() => {
    setRounds(0);
    setAngle(-Math.PI / 2);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    drag.current = null;
    setActive(false);
  }, []);

  const handlers = {
    onPointerDown(e: React.PointerEvent) {
      if (!active || rounds >= AARTI_ROUNDS) return;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const a = angleAt(e);
      drag.current = { last: a, total: rounds * TWO_PI };
      setAngle(a);
    },
    onPointerMove(e: React.PointerEvent) {
      if (!drag.current) return;
      const a = angleAt(e);
      let delta = a - drag.current.last;
      if (delta > Math.PI) delta -= TWO_PI;
      if (delta < -Math.PI) delta += TWO_PI;
      drag.current.last = a;
      drag.current.total += Math.abs(delta);
      setAngle(a);
      const done = Math.min(AARTI_ROUNDS, Math.floor(drag.current.total / TWO_PI));
      if (done > rounds) {
        setRounds(done);
        finishRound(done);
      }
    },
    onPointerUp() {
      drag.current = null;
    },
    onPointerCancel() {
      drag.current = null;
    },
  };

  /** For those who'd rather tap: one tap carries the thali once around. */
  const tapRound = useCallback(() => {
    if (rounds >= AARTI_ROUNDS) return;
    const began = performance.now();
    const from = angle;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / 700);
      setAngle(from + t * TWO_PI);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const n = rounds + 1;
    setRounds(n);
    finishRound(n);
  }, [angle, finishRound, rounds]);

  return { active, angle, rounds, start, stop, handlers, tapRound };
}
