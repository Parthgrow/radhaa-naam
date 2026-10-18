"use client";

import { memo, useMemo } from "react";

const W = 360;
const H = 560;
const MAX_COMMUNITY = 140;
const MAX_MINE = 22;

/** Deterministic pseudo-random positions, so diyas don't jump between renders. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Spot = { x: number; y: number; s: number; delay: number };

/** Spots on the water; further away = higher up and smaller. */
function waterSpots(n: number, seed: number, yMin: number, yMax: number): Spot[] {
  const rand = mulberry32(seed);
  return Array.from({ length: n }, () => {
    const depth = rand();
    const y = yMin + depth * (yMax - yMin);
    const s = 0.45 + depth * 0.75;
    return { x: 14 + rand() * (W - 28), y, s, delay: rand() * 1.6 };
  }).sort((a, b) => a.y - b.y);
}

function Diya({ spot, mine, fresh }: { spot: Spot; mine?: boolean; fresh?: boolean }) {
  const { x, y, s, delay } = spot;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {/* The float-in animation lives on an inner group: a CSS transform on the
          outer one would replace its SVG positioning */}
      <g className={fresh ? "diya-new" : undefined}>
      <circle r={mine ? 22 : 15} cy={-6} fill={mine ? "url(#glowMine)" : "url(#glow)"} />
      <ellipse cx={0} cy={9} rx={7} ry={2.2} fill="#f6a93b" opacity={0.25} />
      <path d="M-10 0 Q0 10 10 0 Q6 -2 0 -2 Q-6 -2 -10 0Z" fill={mine ? "#d9822b" : "#a65a24"} />
      <path d="M-10 0 Q0 -3 10 0" stroke="#7a3b14" strokeWidth={0.8} fill="none" />
      <path
        className="diya-flame"
        style={{ animationDelay: `${delay}s` }}
        d="M0 -14 C3 -9 3.5 -5 0 -2 C-3.5 -5 -3 -9 0 -14Z"
        fill="url(#flame)"
      />
      </g>
    </g>
  );
}

/**
 * Yamuna ghat at night during Kartik. Every devotee's diyas float on the water;
 * the viewer's own diyas glow warmer and sit nearer the front.
 */
function GhatScene({
  communityDiyas,
  myDiyas,
  freshKey,
}: {
  communityDiyas: number;
  myDiyas: number;
  /** Changes each time the viewer lights a diya, to animate the newest one */
  freshKey: number;
}) {
  const community = useMemo(() => waterSpots(MAX_COMMUNITY, 7, 318, 470), []);
  const mine = useMemo(() => waterSpots(MAX_MINE, 108, 470, 512), []);
  const stars = useMemo(() => {
    const rand = mulberry32(3);
    return Array.from({ length: 40 }, () => ({ x: rand() * W, y: rand() * 190, r: 0.4 + rand() * 0.9 }));
  }, []);

  const shownCommunity = Math.min(communityDiyas, MAX_COMMUNITY);
  const shownMine = Math.min(myDiyas, MAX_MINE);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Diyas floating on the Yamuna at night">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b0818" />
          <stop offset="0.6" stopColor="#1a1033" />
          <stop offset="1" stopColor="#3b1d4a" />
        </linearGradient>
        <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1640" />
          <stop offset="1" stopColor="#0e0a1d" />
        </linearGradient>
        <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.5" stopColor="#ffc24a" />
          <stop offset="1" stopColor="#f0762a" />
        </linearGradient>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#ffb547" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb547" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glowMine">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ff9f3f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moonGlow">
          <stop offset="0" stopColor="#fff3d6" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky, stars, moon */}
      <rect width={W} height={300} fill="url(#sky)" />
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.r} fill="#f5e6c8" opacity={0.7} />
      ))}
      <circle cx={282} cy={78} r={46} fill="url(#moonGlow)" />
      <circle cx={282} cy={78} r={20} fill="#fbeccb" />

      {/* Far bank: temple shikharas with lit doorways */}
      <path
        d="M0 300 L0 262 L22 262 L22 246 L34 230 L46 246 L46 262 L70 262 L80 236 L92 206 L104 236 L114 262 L140 262 L140 250 L152 236 L164 250 L164 262 L196 262 L206 226 L220 188 L234 226 L244 262 L268 262 L276 244 L286 232 L296 244 L304 262 L330 262 L340 248 L350 240 L360 248 L360 300 Z"
        fill="#140c26"
      />
      {[[92, 248], [220, 240], [34, 254], [286, 254]].map(([x, y], i) => (
        <rect key={i} x={x - 3} y={y} width={6} height={9} rx={3} fill="#f6a93b" opacity={0.85} />
      ))}

      {/* Yamuna */}
      <rect y={300} width={W} height={220} fill="url(#water)" />
      <g className="water-ripple" stroke="#5b3a7a" strokeWidth={0.8} opacity={0.45}>
        {[320, 345, 372, 402, 436, 474].map((y, i) => (
          <path key={y} d={`M${10 + i * 7} ${y} q 40 -3 80 0 t 80 0 t 80 0 t 80 0`} fill="none" />
        ))}
      </g>
      {/* Moon's reflection */}
      <rect x={272} y={304} width={20} height={150} fill="#fbeccb" opacity={0.08} />

      {community.slice(0, shownCommunity).map((spot, i) => (
        <Diya key={`c${i}`} spot={spot} />
      ))}
      {mine.slice(0, shownMine).map((spot, i) => (
        <Diya key={`m${i}-${i === shownMine - 1 ? freshKey : 0}`} spot={spot} mine fresh={i === shownMine - 1 && freshKey > 0} />
      ))}

      {/* Ghat steps in the foreground */}
      <path d="M0 516 L360 516 L360 560 L0 560 Z" fill="#3a2531" />
      <path d="M0 516 L360 516" stroke="#5e3d4d" strokeWidth={2} />
      <path d="M0 536 L360 536" stroke="#2c1b25" strokeWidth={1.5} />
    </svg>
  );
}

export default memo(GhatScene);
