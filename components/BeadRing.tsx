"use client";

type Props = {
  current: number;
  total: number;
  size?: number;
  /** trigger a pulse animation when this number changes */
  pulseKey?: number;
  /** trigger a mala-completion burst when this number changes */
  burstKey?: number;
};

export default function BeadRing({
  current,
  total,
  size = 220,
  pulseKey,
  burstKey,
}: Props) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? current / total : 0;
  const offset = c * (1 - pct);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={burstKey !== undefined ? "animate-mala" : ""}
        key={`burst-${burstKey}`}
      >
        <defs>
          <linearGradient id="bead-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring)"
          strokeWidth={stroke}
          opacity="0.35"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#bead-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 280ms ease-out" }}
        />
      </svg>
      <div
        key={`pulse-${pulseKey}`}
        className={`absolute inset-0 flex flex-col items-center justify-center ${
          pulseKey !== undefined ? "animate-bead" : ""
        }`}
      >
        <span className="text-5xl font-semibold text-foreground tabular-nums">
          {current}
        </span>
        <span className="text-sm text-muted mt-1">of {total}</span>
      </div>
    </div>
  );
}
