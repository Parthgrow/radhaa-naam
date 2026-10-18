import Link from "next/link";
import { activeEvent } from "@/lib/seva/events";
import { istNow } from "@/lib/seva/time";

/** On the home screen while a seva event (Kartik deep daan) is running. */
export default function EventBanner() {
  const event = activeEvent(istNow().date);
  if (!event) return null;
  return (
    <div className="mx-auto mt-2 w-full max-w-md px-5">
      <Link
        href="/deep-daan"
        className="flex items-center justify-between rounded-xl bg-[#1a1033] px-4 py-2.5 text-xs text-[#f5e6c8] shadow-[var(--shadow)] transition hover:opacity-95"
      >
        <span>
          🪔 <span className="font-deva">{event.hindiName}</span> · har mala se ek deep
        </span>
        <span className="font-medium text-[#f5d76e]">Deep jalaiye →</span>
      </Link>
    </div>
  );
}
