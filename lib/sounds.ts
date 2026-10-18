"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** Soft temple bell — synthesized so we don't ship audio files. */
export function playBell(enabled: boolean) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;

  const partials: Array<[number, number, number]> = [
    // [freq, gain, decay seconds]
    [660, 0.18, 2.6],
    [990, 0.10, 2.0],
    [1320, 0.06, 1.6],
    [1980, 0.03, 1.0],
  ];

  for (const [freq, gain, decay] of partials) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gain, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(g).connect(ac.destination);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  }
}

export function vibrate(enabled: boolean, pattern: number | number[]) {
  if (!enabled) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // ignore
  }
}

/** A small, bright chime for lighting a diya. */
export function playChime(enabled: boolean) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const notes: Array<[number, number]> = [
    [1318.5, 0], // E6
    [1760, 0.09], // A6
  ];
  for (const [freq, delay] of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + delay);
    g.gain.setValueAtTime(0, now + delay);
    g.gain.linearRampToValueAtTime(0.08, now + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.2);
    osc.connect(g).connect(ac.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 1.3);
  }
}
