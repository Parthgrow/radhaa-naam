/**
 * The sakhi who guides each seva. Until the commissioned artwork arrives she is
 * shown as a small lotus avatar; her words are scripted, not generated.
 */
export default function SakhiBubble({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  /** "dark" for night scenes like deep daan */
  tone?: "light" | "dark";
}) {
  const bubble =
    tone === "dark"
      ? "bg-white/10 text-[#f5e6c8] ring-white/15"
      : "bg-surface text-foreground ring-ring/40";
  return (
    <div className="flex items-start gap-3">
      <div
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3c0 4 2 6 2 9 0-3 2-5 5-5-1 4-3 6-7 6-4 0-6-2-7-6 3 0 5 2 5 5 0-3 2-5 2-9z"
            fill="var(--primary)"
          />
          <circle cx="12" cy="18" r="1.4" fill="var(--accent)" />
        </svg>
      </div>
      <div className={`rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm ring-1 ${bubble}`}>
        <div className="mb-0.5 text-[10px] uppercase tracking-[0.2em] opacity-60">Sakhi</div>
        {children}
      </div>
    </div>
  );
}
