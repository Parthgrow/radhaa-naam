import Link from "next/link";

/** Home-screen entry to darshan, worded by whether Radha Rani is awake. */
export default function DarshanBanner({ awake }: { awake: boolean | null }) {
  const line =
    awake === null ? "🌸 Shri Radha Rani ke darshan" : awake ? "🌸 Radha Rani jaagi hain" : "🌙 Radha Rani vishram kar rahi hain";
  const action = awake === false ? "Jagaiye →" : "Seva →";
  return (
    <div className="mx-auto mt-2 w-full max-w-md px-5">
      <Link
        href="/darshan"
        className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-xs text-foreground ring-1 ring-primary/30 transition hover:bg-primary/10"
      >
        <span>{line}</span>
        <span className="font-medium text-primary">{action}</span>
      </Link>
    </div>
  );
}
