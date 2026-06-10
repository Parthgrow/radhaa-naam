"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useJaap } from "@/lib/state";
import SettingsSheet from "./SettingsSheet";
import HistorySheet from "./HistorySheet";
import AddJaapsSheet from "./AddJaapsSheet";
import UserProfile from "./UserProfile";

export default function TopBar() {
  const { resetBead } = useJaap();
  const { data: session } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <header className="w-full px-5 pt-5 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LotusIcon />
          <span className="text-sm font-semibold tracking-wide text-foreground">
            Radhe Radhe
          </span>
        </div>
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => setAddOpen(true)} label="Add jaaps">
            <PlusIcon />
          </IconBtn>
          <IconBtn onClick={() => setHistoryOpen(true)} label="History">
            <CalendarIcon />
          </IconBtn>
          <IconBtn onClick={resetBead} label="Reset current bead">
            <RefreshIcon />
          </IconBtn>
          <IconBtn onClick={() => setSettingsOpen(true)} label="Settings">
            <GearIcon />
          </IconBtn>
          {session && <UserProfile email={session.user?.email} name={session.user?.name} />}
        </div>
      </header>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <AddJaapsSheet open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}

function IconBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-full p-2 text-muted hover:text-foreground hover:bg-ring/30 transition"
    >
      {children}
    </button>
  );
}

function LotusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c0 4 2 6 2 9 0-3 2-5 5-5-1 4-3 6-7 6-4 0-6-2-7-6 3 0 5 2 5 5 0-3 2-5 2-9z"
        fill="var(--primary)"
        opacity="0.85"
      />
      <circle cx="12" cy="18" r="1.4" fill="var(--accent)" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm8.94 5l1.06-.7-1-1.7-1.27.18a8.05 8.05 0 0 0-.7-1.21l.5-1.18-1.47-1.47-1.18.5a8.05 8.05 0 0 0-1.21-.7L15.7 3l-1.7-1-.7 1.06-.6 1.12c-.43-.07-.86-.07-1.4 0l-.6-1.12L9 3l-1.7 1 .03 1.42a8.05 8.05 0 0 0-1.21.7l-1.18-.5L3.47 7.1l.5 1.18a8.05 8.05 0 0 0-.7 1.21l-1.27-.18-1 1.7L2.06 12l1.06.7-.18 1.27 1 1.7 1.18-.18a8.05 8.05 0 0 0 .7 1.21l-.5 1.18 1.47 1.47 1.18-.5a8.05 8.05 0 0 0 1.21.7L9 21l1.7 1 .7-1.06.6-1.12c.43.07.86.07 1.4 0l.6 1.12.7 1.06 1.7-1-.03-1.42a8.05 8.05 0 0 0 1.21-.7l1.18.5 1.47-1.47-.5-1.18a8.05 8.05 0 0 0 .7-1.21l1.27.18 1-1.7L20.94 13z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 10h17M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
