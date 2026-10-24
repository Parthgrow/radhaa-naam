import { BHOG_ITEMS, BHOG_ORDER, type BhogItem } from "@/lib/seva/sevas";

/** Choose what to offer. Every item is free, as often as you like. */
export default function BhogPicker({
  onPick,
  onCancel,
}: {
  onPick: (item: BhogItem) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      {BHOG_ORDER.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onPick(item)}
          className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left ring-1 ring-ring/40 transition hover:bg-ring/20 active:scale-[0.99]"
        >
          <span>
            <span className="font-deva text-lg text-primary">{BHOG_ITEMS[item].hindi}</span>
            <span className="ml-2 text-sm text-muted">{BHOG_ITEMS[item].name}</span>
          </span>
          <span className="text-xs text-muted">Arpit karein →</span>
        </button>
      ))}
      <button type="button" onClick={onCancel} className="w-full py-1 text-sm text-muted">
        Baad mein
      </button>
    </div>
  );
}
