"use client";

import { useState } from "react";
import Sheet from "./Sheet";
import { useJaap } from "@/lib/state";

type Props = { open: boolean; onClose: () => void };

const QUICK = [27, 54, 108, 216, 1080];

export default function AddJaapsSheet({ open, onClose }: Props) {
  const { state, addJaaps } = useJaap();
  const beadsPerMala = state.settings.beadsPerMala;
  const [value, setValue] = useState("");

  const amount = Math.max(0, Math.floor(Number(value) || 0));
  const total = state.currentBead + amount;
  const malasFromAdd = Math.floor(total / beadsPerMala);

  function submit() {
    if (amount <= 0) return;
    addJaaps(amount);
    setValue("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add jaaps">
      <div className="space-y-5">
        <label className="block">
          <span className="text-xs text-muted">Number of jaaps (naam) to add</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="e.g. 500"
            className="mt-1 w-full rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-3 text-2xl text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          {QUICK.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setValue(String((Number(value) || 0) + n))}
              className="rounded-full bg-ring/40 hover:bg-ring/60 px-3 py-1 text-sm tabular-nums transition"
            >
              +{n}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-surface ring-1 ring-ring/40 px-4 py-3 text-sm text-muted">
          {amount > 0 ? (
            <>
              Adds <span className="text-foreground font-medium tabular-nums">{amount.toLocaleString()}</span> naam
              {malasFromAdd > 0 && (
                <>
                  {" "}→{" "}
                  <span className="text-primary font-medium tabular-nums">
                    +{malasFromAdd.toLocaleString()} mala{malasFromAdd === 1 ? "" : "s"}
                  </span>
                </>
              )}
              <span className="block mt-1 text-[11px]">
                Lifetime malas: {state.lifetimeMalas.toLocaleString()} →{" "}
                {(state.lifetimeMalas + malasFromAdd).toLocaleString()} ({beadsPerMala}/mala)
              </span>
            </>
          ) : (
            <>Enter a number to add to your totals.</>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={amount <= 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Add jaaps
          </button>
        </div>
      </div>
    </Sheet>
  );
}
