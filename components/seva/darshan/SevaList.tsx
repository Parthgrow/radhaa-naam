import { SEVAS, SEVA_ORDER, availability, type SevaId } from "@/lib/seva/sevas";

/**
 * The list of sevas to choose from. What each one needs is read from the
 * registry, so adding a seva there adds it here.
 */
export default function SevaList({
  awake,
  busy,
  onPick,
}: {
  awake: boolean;
  busy: boolean;
  onPick: (id: SevaId) => void;
}) {
  return (
    <ul className="space-y-2" aria-label="Seva">
      {SEVA_ORDER.map((id) => {
        const seva = SEVAS[id];
        const { available, reason } = availability(seva, awake);
        const enabled = available && !busy;
        return (
          <li key={id}>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onPick(id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left ring-1 transition active:scale-[0.99] ${
                available
                  ? "bg-surface ring-ring/40 hover:bg-ring/20"
                  : "bg-surface/50 ring-ring/20 opacity-60"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {seva.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-medium text-foreground">
                  {seva.name} <span className="font-deva text-sm text-primary">{seva.hindi}</span>
                </span>
                <span className="block text-xs text-muted">{available ? seva.description : reason}</span>
              </span>
              {available && <span className="text-sm text-primary">→</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
