import Link from "next/link";
import { phaseAt, type DarshanPhase } from "@/lib/seva/schedule";
import { istNow } from "@/lib/seva/time";

const LINES: Record<DarshanPhase, string> = {
  mangala: "🪔 Mangala aarti ka samay",
  day: "🌸 Shri Radha Rani ke darshan",
  sandhya: "🪔 Sandhya aarti ka samay",
  shayan: "🌙 Shayan seva ka samay",
  closed: "🙏 Darshan subah 5 baje",
};

/** Home-screen entry to darshan, worded for the time of day in Vrindavan. */
export default function DarshanBanner() {
  const phase = phaseAt(istNow().minutes);
  return (
    <div className="mx-auto mt-2 w-full max-w-md px-5">
      <Link
        href="/darshan"
        className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-xs text-foreground ring-1 ring-primary/30 transition hover:bg-primary/10"
      >
        <span>{LINES[phase]}</span>
        <span className="font-medium text-primary">Darshan →</span>
      </Link>
    </div>
  );
}
