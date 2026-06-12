"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Sheet from "./Sheet";
import { useJaapCount, DEFAULT_SETTINGS } from "@/lib/useJaapCount";
import type { JaapSettings } from "@/lib/useJaapCount";

type Props = { open: boolean; onClose: () => void };

const NAAM_PRESETS: Array<{ naam: string; transliteration: string }> = [
  { naam: "राधे राधे", transliteration: "Radhe Radhe" },
  { naam: "राधे", transliteration: "Radhe" },
  { naam: "राधा", transliteration: "Radha" },
  { naam: "राधे कृष्ण", transliteration: "Radhe Krishna" },
  { naam: "हरे राम हरे कृष्ण", transliteration: "Hare Ram Hare Krishna" },
];

export default function SettingsSheet({ open, onClose }: Props) {
  const { settings: s, updateSettings, resetAll } = useJaapCount();
  const { data: session } = useSession();
  const [confirmReset, setConfirmReset] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);
  const [allowRecommendations, setAllowRecommendations] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <Section title="Naam">
          <div className="grid grid-cols-1 gap-2">
            {NAAM_PRESETS.map((p) => {
              const active = p.naam === s.naam;
              return (
                <button
                  key={p.naam}
                  type="button"
                  onClick={() => updateSettings({ naam: p.naam, transliteration: p.transliteration })}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 text-left ring-1 transition ${
                    active
                      ? "bg-primary/10 ring-primary text-foreground"
                      : "bg-surface ring-ring/40 hover:bg-ring/20"
                  }`}
                >
                  <span className="font-deva text-2xl text-primary">{p.naam}</span>
                  <span className="text-xs text-muted">{p.transliteration}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Custom naam (Devanagari)">
              <input
                type="text"
                value={s.naam}
                onChange={(e) => updateSettings({ naam: e.target.value })}
                className="font-deva w-full rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-2 text-lg text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label="Transliteration">
              <input
                type="text"
                value={s.transliteration}
                onChange={(e) => updateSettings({ transliteration: e.target.value })}
                className="w-full rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </div>
        </Section>

        <Section title="Counting">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Beads per mala">
              <input
                type="number"
                min={1}
                max={1080}
                value={s.beadsPerMala}
                onChange={(e) =>
                  updateSettings({ beadsPerMala: clamp(parseInt(e.target.value || "0", 10), 1, 1080) })
                }
                className="w-full rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-2 text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-1 flex gap-1">
                {[27, 54, 108].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateSettings({ beadsPerMala: n })}
                    className="text-[11px] rounded-full bg-ring/40 hover:bg-ring/60 px-2 py-0.5"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Daily mala goal">
              <input
                type="number"
                min={1}
                max={1080}
                value={s.malaGoal}
                onChange={(e) =>
                  updateSettings({ malaGoal: clamp(parseInt(e.target.value || "0", 10), 1, 1080) })
                }
                className="w-full rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-2 text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="mt-1 text-[11px] text-muted">
                = {(s.malaGoal * s.beadsPerMala).toLocaleString()} naam / day
              </div>
            </Field>
          </div>
        </Section>

        <Section title="Feedback">
          <Toggle
            label="Haptic vibration on tap"
            on={s.haptics}
            onChange={(v) => updateSettings({ haptics: v })}
          />
          <Toggle
            label="Bell sound on mala complete"
            on={s.sound}
            onChange={(v) => updateSettings({ sound: v })}
          />
        </Section>

        <Section title="Theme">
          <div className="grid grid-cols-3 gap-2">
            {(["lotus", "dark", "auto"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateSettings({ theme: t })}
                className={`rounded-xl px-3 py-2 text-sm ring-1 transition capitalize ${
                  s.theme === t
                    ? "bg-primary/10 ring-primary text-foreground"
                    : "bg-surface ring-ring/40 hover:bg-ring/20"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        {session?.user?.id && (
          <>
            <Section title="Profile">
              <Field label="Username">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Choose username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="flex-1 rounded-lg bg-surface ring-1 ring-ring/40 px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    disabled={usernameLoading || !username}
                    onClick={async () => {
                      setUsernameLoading(true);
                      try {
                        const r = await fetch("/api/user/profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ username }),
                        });
                        if (r.ok) {
                          setUsername("");
                        }
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setUsernameLoading(false);
                      }
                    }}
                    className="rounded-lg bg-primary px-3 py-2 text-white disabled:bg-muted"
                  >
                    {usernameLoading ? "..." : "Set"}
                  </button>
                </div>
              </Field>
            </Section>

            <Section title="Privacy">
              <Toggle
                label="Appear in recommendations"
                on={allowRecommendations}
                onChange={async (v) => {
                  setRecommendationsLoading(true);
                  setAllowRecommendations(v);
                  try {
                    await fetch("/api/user/profile", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ allowRecommendations: v }),
                    });
                  } catch (e) {
                    console.error(e);
                    setAllowRecommendations(!v);
                  } finally {
                    setRecommendationsLoading(false);
                  }
                }}
              />
            </Section>
          </>
        )}

        <Section title="Reset">
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              Reset all counters and history…
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">This cannot be undone.</span>
              <button
                type="button"
                onClick={() => {
                  resetAll();
                  setConfirmReset(false);
                  onClose();
                }}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
              >
                Yes, reset
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="text-sm text-muted"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="mt-3 text-[11px] text-muted">
            Defaults: {DEFAULT_SETTINGS.naam} · {DEFAULT_SETTINGS.beadsPerMala} beads · goal {DEFAULT_SETTINGS.malaGoal} malas
          </div>
        </Section>
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs uppercase tracking-[0.25em] text-muted mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 ring-1 ring-ring/40"
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          on ? "bg-primary" : "bg-ring/60"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            on ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}
