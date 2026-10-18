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

/** Shankh (conch): a swelling, slightly wavering low tone. */
export function playShankh(enabled: boolean) {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.12, now + 0.6);
  master.gain.setValueAtTime(0.12, now + 2.2);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.linearRampToValueAtTime(1400, now + 0.8);
  filter.connect(master).connect(ac.destination);

  const vibrato = ac.createOscillator();
  const vibratoDepth = ac.createGain();
  vibrato.frequency.value = 5;
  vibratoDepth.gain.value = 3;
  vibrato.connect(vibratoDepth);

  for (const [base, type, level] of [
    [233, "sawtooth", 0.6],
    [466, "triangle", 0.35],
  ] as const) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(base * 0.94, now);
    osc.frequency.linearRampToValueAtTime(base, now + 0.5);
    vibratoDepth.connect(osc.frequency);
    g.gain.value = level;
    osc.connect(g).connect(filter);
    osc.start(now);
    osc.stop(now + 3.3);
  }
  vibrato.start(now);
  vibrato.stop(now + 3.3);
}

/**
 * A short, gentle lullaby for shayan (an original melody, so no licensing).
 * Returns a function that fades it out early.
 */
export function playLullaby(enabled: boolean): () => void {
  if (!enabled) return () => {};
  const ac = getCtx();
  if (!ac) return () => {};
  const now = ac.currentTime;
  const master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);

  // Sa Re Ga Pa Dha (major pentatonic on D), slow and descending to rest
  const D = 293.66;
  const n = (semitones: number) => D * Math.pow(2, semitones / 12);
  const melody: Array<[number, number]> = [
    [n(7), 0.8], [n(9), 0.4], [n(7), 0.4], [n(4), 1.2],
    [n(2), 0.8], [n(4), 0.4], [n(7), 0.4], [n(4), 1.2],
    [n(9), 0.8], [n(7), 0.4], [n(4), 0.4], [n(2), 1.2],
    [n(4), 0.8], [n(2), 0.4], [n(0), 0.4], [n(0), 2.0],
  ];
  let t = now + 0.1;
  for (const [freq, dur] of melody) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur * 1.5);
    t += dur * 1.25;
  }
  return () => {
    const at = ac.currentTime;
    master.gain.setValueAtTime(master.gain.value, at);
    master.gain.linearRampToValueAtTime(0, at + 0.6);
  };
}
