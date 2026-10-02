import type { UserSettings } from "./kv/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD form. */
export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

const THEMES = ["lotus", "dark", "auto"] as const;

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

export type SettingsInput = Omit<UserSettings, "userId" | "updatedAt">;

/** Returns the valid subset of a settings patch, or an error message. */
export function parseSettingsPatch(
  body: unknown
): { patch: Partial<SettingsInput> } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Expected a JSON object" };
  const input = body as Record<string, unknown>;
  const patch: Partial<SettingsInput> = {};

  if ("naam" in input) {
    if (!isText(input.naam, 60)) return { error: "naam must be 1-60 characters" };
    patch.naam = input.naam;
  }
  if ("transliteration" in input) {
    if (!isText(input.transliteration, 60)) return { error: "transliteration must be 1-60 characters" };
    patch.transliteration = input.transliteration;
  }
  if ("beadsPerMala" in input) {
    if (!isIntInRange(input.beadsPerMala, 1, 1080)) return { error: "beadsPerMala must be 1-1080" };
    patch.beadsPerMala = input.beadsPerMala;
  }
  if ("malaGoal" in input) {
    if (!isIntInRange(input.malaGoal, 1, 1080)) return { error: "malaGoal must be 1-1080" };
    patch.malaGoal = input.malaGoal;
  }
  if ("haptics" in input) {
    if (typeof input.haptics !== "boolean") return { error: "haptics must be a boolean" };
    patch.haptics = input.haptics;
  }
  if ("sound" in input) {
    if (typeof input.sound !== "boolean") return { error: "sound must be a boolean" };
    patch.sound = input.sound;
  }
  if ("theme" in input) {
    if (!THEMES.includes(input.theme as (typeof THEMES)[number])) {
      return { error: "theme must be lotus, dark or auto" };
    }
    patch.theme = input.theme as (typeof THEMES)[number];
  }
  return { patch };
}
