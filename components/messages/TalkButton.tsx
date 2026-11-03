/** The floating button, bottom-right: tap to write to Radha Rani. */
export default function TalkButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Radha Rani se kahiye"
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[var(--shadow)] transition hover:opacity-90 active:scale-95"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3c0 4 2 6 2 9 0-3 2-5 5-5-1 4-3 6-7 6-4 0-6-2-7-6 3 0 5 2 5 5 0-3 2-5 2-9z" fill="currentColor" opacity="0.95" />
        <path d="M5 20h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
