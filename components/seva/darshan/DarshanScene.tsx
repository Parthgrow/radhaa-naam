"use client";

import { memo } from "react";
import type { LightPhase } from "@/lib/seva/schedule";
import { POSHAK_COLORS } from "@/lib/seva/schedule";
import type { BhogItem } from "@/lib/seva/sevas";

/**
 * Placeholder darshan of Shri Radha Rani, drawn in SVG until the commissioned
 * artwork arrives. Each function below is one layer from the artist brief
 * (background, simhasan, Radha Rani, poshak, jewellery,
 * bhog, lamps, curtain). All share one 720 × 1080 canvas, the brief's
 * 2160 × 3240 at a third, so a layer can later be swapped for the artist's
 * PNG (<image href=… width={W} height={H} />) without touching the others.
 */
export const W = 720;
export const H = 1080;
/** Centre of Radha Rani, used by the aarti circling */
export const CENTER = { x: 360, y: 520 };

const GOLD = "#d4a13a";
const GOLD_LIGHT = "#f3d27a";
const SKIN = "#f3d3b0";

type Palette = { inner: [string, string]; wall: string; tint: string | null; lampsLit: boolean };

const PHASE_PALETTE: Record<LightPhase, Palette> = {
  dawn: { inner: ["#fde3e8", "#f7c39f"], wall: "#e3a7b8", tint: "rgba(120,80,160,0.10)", lampsLit: true },
  day: { inner: ["#fff7ec", "#ffe6cf"], wall: "#f0c6d3", tint: null, lampsLit: false },
  evening: { inner: ["#ffd6ad", "#f2a07a"], wall: "#cf7f98", tint: "rgba(255,140,60,0.08)", lampsLit: true },
  night: { inner: ["#463566", "#2a1d48"], wall: "#2a1d45", tint: "rgba(20,10,50,0.30)", lampsLit: true },
};

function Background({ phase }: { phase: LightPhase }) {
  const p = PHASE_PALETTE[phase];
  return (
    <g>
      <defs>
        <linearGradient id="inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.inner[0]} />
          <stop offset="1" stopColor={p.inner[1]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={p.wall} />
      {/* wall motifs */}
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 2 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={c === 0 ? 40 : 680} cy={180 + r * 140} r={9} fill={GOLD} opacity={0.35} />
        ))
      )}
      {/* sanctum: a scalloped arch */}
      <path
        d="M110 1080 L110 300 Q110 170 200 150 Q230 105 280 120 Q320 70 360 90 Q400 70 440 120 Q490 105 520 150 Q610 170 610 300 L610 1080 Z"
        fill="url(#inner)"
        stroke={GOLD}
        strokeWidth={10}
      />
      {/* pillars */}
      <rect x={72} y={140} width={40} height={940} fill={GOLD} opacity={0.85} />
      <rect x={608} y={140} width={40} height={940} fill={GOLD} opacity={0.85} />
      <rect x={66} y={130} width={52} height={22} rx={6} fill={GOLD_LIGHT} />
      <rect x={602} y={130} width={52} height={22} rx={6} fill={GOLD_LIGHT} />
    </g>
  );
}

function Prabha() {
  return (
    <g>
      <defs>
        <radialGradient id="prabha">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.95" />
          <stop offset="0.6" stopColor={GOLD_LIGHT} stopOpacity="0.45" />
          <stop offset="1" stopColor={GOLD_LIGHT} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx={360} cy={335} r={175} fill="url(#prabha)" />
      <circle cx={360} cy={335} r={120} fill="none" stroke={GOLD} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" />
    </g>
  );
}

function Simhasan() {
  return (
    <g>
      {/* back rest */}
      <path d="M206 790 L206 420 Q206 230 360 220 Q514 230 514 420 L514 790 Z" fill="#f6d2dd" stroke={GOLD} strokeWidth={12} />
      <path d="M232 790 L232 425 Q232 258 360 248 Q488 258 488 425 L488 790" fill="none" stroke={GOLD_LIGHT} strokeWidth={3} strokeDasharray="1 9" strokeLinecap="round" />
      {/* cushion and seat */}
      <rect x={196} y={768} width={328} height={50} rx={22} fill="#c2185b" />
      <rect x={196} y={768} width={328} height={50} rx={22} fill="none" stroke={GOLD} strokeWidth={4} />
      {/* base steps */}
      <rect x={176} y={818} width={368} height={44} rx={6} fill={GOLD} />
      <rect x={146} y={862} width={428} height={40} rx={6} fill="#b8862a" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} cx={206 + i * 62} cy={840} r={6} fill={GOLD_LIGHT} />
      ))}
    </g>
  );
}

/** The odhni: a soft shape draped over head and shoulders, seen from behind the face. */
const ODHNI =
  "M360 248 C298 248 276 296 278 352 C280 414 254 456 244 526 C238 572 248 606 262 630 L458 630 " +
  "C472 606 482 572 476 526 C466 456 440 414 442 352 C444 296 422 248 360 248 Z";

/** One of the joined palms (left); mirrored for the right. */
const PALM_LEFT = "M358 532 C346 528 336 512 338 490 C340 470 348 456 356 456 C359 456 360 460 360 466 L360 532 Z";

function RadhaRani({ weekday }: { weekday: number }) {
  const c = POSHAK_COLORS[weekday] ?? POSHAK_COLORS[0];
  const mirror = "translate(720 0) scale(-1 1)";
  return (
    <g>
      {/* lehenga */}
      <path d="M306 528 Q360 540 414 528 L508 798 Q360 832 212 798 Z" fill={c.main} />
      <path d="M220 784 Q360 818 500 784" fill="none" stroke={GOLD} strokeWidth={14} />
      <path d="M244 738 Q360 766 476 738" fill="none" stroke={GOLD_LIGHT} strokeWidth={4} strokeDasharray="3 8" strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${334 + i * 13} 548 L${286 + i * 37} 784`} stroke={c.dark} strokeWidth={2} opacity={0.3} />
      ))}
      {/* feet with alta and payal */}
      {[332, 388].map((x) => (
        <g key={x}>
          <path d={`M${x - 18} 812 Q${x} 796 ${x + 18} 812 Q${x} 822 ${x - 18} 812 Z`} fill={SKIN} stroke="#c62d42" strokeWidth={2.5} />
          <path d={`M${x - 14} 806 Q${x} 798 ${x + 14} 806`} fill="none" stroke={GOLD} strokeWidth={2} strokeDasharray="1 4" strokeLinecap="round" />
        </g>
      ))}
      {/* odhni behind the face */}
      <path d={ODHNI} fill={c.light} />
      <path d={ODHNI} fill="none" stroke={GOLD} strokeWidth={7} strokeLinejoin="round" />
      <path d="M296 400 Q330 392 360 408 Q390 392 424 400" fill="none" stroke={c.main} strokeWidth={3} opacity={0.5} />
      {/* choli */}
      <path d="M322 410 Q360 396 398 410 L410 532 Q360 546 310 532 Z" fill={c.dark} />
      <path d="M314 524 Q360 538 406 524" fill="none" stroke={GOLD} strokeWidth={4} />
      {/* neck */}
      <rect x={346} y={380} width={28} height={40} rx={10} fill={SKIN} />
      {/* hair */}
      <path d="M360 284 C334 284 316 302 313 330 C314 348 316 360 318 372 L326 372 C326 342 338 314 360 302 C382 314 394 342 394 372 L402 372 C404 360 406 348 407 330 C404 302 386 284 360 284 Z" fill="#2b1a17" />
      {/* face */}
      <ellipse cx={360} cy={340} rx={41} ry={50} fill={SKIN} />
      <path d="M319 322 Q360 282 401 322 Q388 296 360 292 Q332 296 319 322 Z" fill="#2b1a17" />
      {/* serene, downcast eyes */}
      <path d="M328 323 q 13 -6 26 -1" stroke="#5a2a1a" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M366 322 q 13 -5 26 1" stroke="#5a2a1a" strokeWidth={2} fill="none" strokeLinecap="round" />
      <path d="M330 338 q 11 8 24 0" stroke="#3a0d20" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <path d="M366 338 q 11 8 24 0" stroke="#3a0d20" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <ellipse cx={360} cy={356} rx={2.5} ry={1.5} fill="#d8a882" />
      <path d="M349 370 q 11 7 22 0" stroke="#c0394f" strokeWidth={3} fill="none" strokeLinecap="round" />
      <ellipse cx={336} cy={356} rx={9} ry={5} fill="#f29aa8" opacity={0.3} />
      <ellipse cx={384} cy={356} rx={9} ry={5} fill="#f29aa8" opacity={0.3} />
      <circle cx={360} cy={308} r={4} fill="#c62d42" />
      {/* joined palms holding a lotus */}
      <g transform="translate(360 444)">
        <path d="M0 16 C-6 4 -6 -8 0 -20 C6 -8 6 4 0 16Z" fill="#f48fb1" />
        <path d="M0 16 C-11 10 -20 0 -22 -11 C-11 -8 -4 2 0 16Z" fill="#f06292" />
        <path d="M0 16 C11 10 20 0 22 -11 C11 -8 4 2 0 16Z" fill="#f06292" />
      </g>
      <path d={PALM_LEFT} fill={SKIN} stroke="#e2b48e" strokeWidth={1.5} />
      <path d={PALM_LEFT} fill={SKIN} stroke="#e2b48e" strokeWidth={1.5} transform={mirror} />
      <path d="M340 526 Q350 534 360 532 M380 526 Q370 534 360 532" fill="none" stroke={GOLD} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}

function Jewellery() {
  return (
    <g>
      {/* maang tikka */}
      <path d="M360 270 L360 288" stroke={GOLD} strokeWidth={2} />
      <path d="M360 286 l5 7 l-5 7 l-5 -7 z" fill={GOLD_LIGHT} stroke={GOLD} strokeWidth={1.5} />
      {/* nath */}
      <circle cx={370} cy={358} r={7} fill="none" stroke={GOLD} strokeWidth={2} />
      <circle cx={375} cy={364} r={2.2} fill="#fff" />
      {/* jhumkas */}
      {[322, 398].map((x) => (
        <g key={x}>
          <path d={`M${x} 360 l0 10`} stroke={GOLD} strokeWidth={2} />
          <path d={`M${x - 9} 378 q9 -12 18 0 z`} fill={GOLD} />
          <circle cx={x} cy={382} r={3} fill={GOLD_LIGHT} />
        </g>
      ))}
      {/* haar */}
      <path d="M326 408 Q360 448 394 408" fill="none" stroke={GOLD} strokeWidth={5} />
      <path d="M332 410 Q360 444 388 410" fill="none" stroke={GOLD_LIGHT} strokeWidth={2.5} strokeDasharray="1 6" strokeLinecap="round" />
      <circle cx={360} cy={428} r={6} fill="#c62d42" stroke={GOLD} strokeWidth={2.5} />
    </g>
  );
}

/** Bhog on a low chowki before the simhasan. */
function Bhog({ item }: { item: BhogItem | null }) {
  if (!item) return null;
  return (
    <g transform="translate(360 930)">
      <rect x={-140} y={0} width={280} height={24} rx={6} fill="#8d5524" />
      <rect x={-124} y={24} width={16} height={34} fill="#6d3f17" />
      <rect x={108} y={24} width={16} height={34} fill="#6d3f17" />
      {item === "makhan_mishri" && (
        <g>
          <ellipse cx={0} cy={-6} rx={46} ry={14} fill="#c0c0c0" />
          <path d="M-40 -8 Q0 -60 40 -8 Z" fill="#fffdf3" />
          {[-16, 0, 14].map((x) => (
            <rect key={x} x={x} y={-30} width={7} height={7} fill="#e8f4ff" transform={`rotate(20 ${x} -30)`} />
          ))}
        </g>
      )}
      {item === "laddoo_phal" && (
        <g>
          <ellipse cx={-50} cy={-4} rx={52} ry={12} fill={GOLD} />
          {[[-74, -14], [-50, -14], [-26, -14], [-62, -32], [-38, -32], [-50, -50]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={12} fill="#f39c12" stroke="#d68910" strokeWidth={1.5} />
          ))}
          <ellipse cx={62} cy={-4} rx={48} ry={11} fill={GOLD} />
          <circle cx={46} cy={-20} r={15} fill="#e53935" />
          <path d="M60 -12 Q90 -50 100 -18" stroke="#fdd835" strokeWidth={12} fill="none" strokeLinecap="round" />
          <circle cx={72} cy={-14} r={11} fill="#ff9800" />
        </g>
      )}
      {item === "thali" && (
        <g>
          <ellipse cx={0} cy={-6} rx={120} ry={26} fill={GOLD} />
          <ellipse cx={0} cy={-10} rx={108} ry={20} fill={GOLD_LIGHT} />
          {[[-60, "#fff4d6"], [-20, "#f4b942"], [20, "#7cb342"], [60, "#fffbe9"]].map(([x, fill]) => (
            <g key={x as number}>
              <ellipse cx={x as number} cy={-14} rx={18} ry={7} fill="#b0b0b0" />
              <ellipse cx={x as number} cy={-16} rx={14} ry={5} fill={fill as string} />
            </g>
          ))}
          {[0, 1, 2].map((i) => (
            <ellipse key={i} cx={-92} cy={-14 - i * 6} rx={18} ry={6} fill="#e8b46a" stroke="#c98f3c" strokeWidth={1} />
          ))}
          {[[88, -18], [100, -30], [76, -30]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={9} fill="#f39c12" />
          ))}
        </g>
      )}
    </g>
  );
}

function Lamps({ lit }: { lit: boolean }) {
  return (
    <g>
      <defs>
        <radialGradient id="lampGlow">
          <stop offset="0" stopColor="#ffcf6b" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffcf6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lampFlame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.5" stopColor="#ffc24a" />
          <stop offset="1" stopColor="#f0762a" />
        </linearGradient>
      </defs>
      {[150, 570].map((x) => (
        <g key={x}>
          <rect x={x - 6} y={760} width={12} height={250} fill="#b8862a" />
          <ellipse cx={x} cy={1010} rx={40} ry={10} fill="#b8862a" />
          <path d={`M${x - 26} 756 Q${x} 782 ${x + 26} 756 Z`} fill={GOLD} />
          {lit && (
            <>
              <circle cx={x} cy={738} r={44} fill="url(#lampGlow)" />
              <path className="diya-flame" d={`M${x} 716 C${x + 6} 728 ${x + 7} 738 ${x} 748 C${x - 7} 738 ${x - 6} 728 ${x} 716Z`} fill="url(#lampFlame)" />
            </>
          )}
        </g>
      ))}
    </g>
  );
}

/** Velvet curtain (pat). open = 1 fully open, 0 closed. */
function Curtain({ open }: { open: number }) {
  const panel = 380;
  const visible = 46 + (panel - 46) * (1 - open);
  return (
    <g>
      <defs>
        <linearGradient id="velvet" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5e0f24" />
          <stop offset="0.5" stopColor="#8e1b3a" />
          <stop offset="1" stopColor="#5e0f24" />
        </linearGradient>
      </defs>
      <g style={{ transition: "transform 1.2s ease-in-out" }} transform={`translate(${visible - panel} 0)`}>
        <rect x={0} y={110} width={panel} height={H} fill="url(#velvet)" />
        <rect x={panel - 14} y={110} width={14} height={H} fill={GOLD} />
        {[60, 140, 220, 300].map((x) => (
          <path key={x} d={`M${x} 110 L${x} ${H}`} stroke="#4a0b1c" strokeWidth={6} opacity={0.5} />
        ))}
      </g>
      <g style={{ transition: "transform 1.2s ease-in-out" }} transform={`translate(${W - visible} 0)`}>
        <rect x={0} y={110} width={panel} height={H} fill="url(#velvet)" />
        <rect x={0} y={110} width={14} height={H} fill={GOLD} />
        {[80, 160, 240, 320].map((x) => (
          <path key={x} d={`M${x} 110 L${x} ${H}`} stroke="#4a0b1c" strokeWidth={6} opacity={0.5} />
        ))}
      </g>
      {/* pelmet with tassels, always in place */}
      <path d={`M0 0 L${W} 0 L${W} 120 ${Array.from({ length: 12 }, (_, i) => `Q${W - i * 60 - 30} 160 ${W - (i + 1) * 60} 120`).join(" ")} Z`} fill="#7a1530" />
      <path d={`M0 112 ${Array.from({ length: 12 }, (_, i) => `Q${i * 60 + 30} 152 ${(i + 1) * 60} 112`).join(" ")}`} fill="none" stroke={GOLD} strokeWidth={5} />
      {Array.from({ length: 13 }, (_, i) => (
        <g key={i}>
          <path d={`M${i * 60} 118 l0 22`} stroke={GOLD} strokeWidth={2} />
          <circle cx={i * 60} cy={144} r={5} fill={GOLD_LIGHT} />
        </g>
      ))}
    </g>
  );
}

/** Aarti thali carried around Radha Rani; angle in radians. */
function AartiThali({ angle }: { angle: number }) {
  const x = CENTER.x + Math.cos(angle) * 230;
  const y = CENTER.y + Math.sin(angle) * 300;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={60} cy={-18} fill="url(#lampGlow)" />
      <ellipse rx={46} ry={13} fill={GOLD} stroke="#a8781f" strokeWidth={2} />
      <ellipse rx={36} ry={9} fill={GOLD_LIGHT} />
      <path d="M-14 -2 Q0 8 14 -2 Q8 -6 0 -6 Q-8 -6 -14 -2Z" fill="#a65a24" />
      <path className="diya-flame" d="M0 -30 C6 -20 7 -12 0 -5 C-7 -12 -6 -20 0 -30Z" fill="url(#lampFlame)" />
    </g>
  );
}

function DarshanScene({
  phase,
  weekday,
  bhog,
  curtainOpen,
  aartiAngle,
}: {
  phase: LightPhase;
  weekday: number;
  bhog: BhogItem | null;
  curtainOpen: number;
  aartiAngle: number | null;
}) {
  const palette = PHASE_PALETTE[phase];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none select-none" role="img" aria-label="Darshan of Shri Radha Rani">
      <Background phase={phase} />
      <Prabha />
      <Simhasan />
      <RadhaRani weekday={weekday} />
      <Jewellery />
      <Lamps lit={palette.lampsLit} />
      <Bhog item={bhog} />
      {palette.tint && <rect width={W} height={H} fill={palette.tint} pointerEvents="none" />}
      {aartiAngle !== null && <AartiThali angle={aartiAngle} />}
      <Curtain open={curtainOpen} />
    </svg>
  );
}

export default memo(DarshanScene);
