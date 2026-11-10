import type { ChordRef } from "./harmony";
import {
  DEFAULT_PREVIEW_BEATS,
  PREVIEW_BEAT_OPTIONS,
  TIME_SIGNATURE_PRESETS,
  snapSlotLength,
  type TimeSignature,
} from "./meter";

export const PROGRESSION_STORAGE_KEY = "fretlab:progression:v1";
export const BPM_MIN = 30;
export const BPM_MAX = 300;

export type ProgressionSlot = { id: string; ref: ChordRef; bars: number };

export type StoredProgression = {
  version: 1;
  slots: ProgressionSlot[];
  timeSignature: TimeSignature;
  bpm: number;
  click: boolean;
  loop: boolean;
  // Beats of next-chord preview before each change; 0 is off.
  preview: number;
};

export const DEFAULT_PROGRESSION: StoredProgression = {
  version: 1,
  slots: [],
  timeSignature: { beats: 4, unit: 4 },
  bpm: 90,
  click: false,
  loop: true,
  preview: DEFAULT_PREVIEW_BEATS,
};

const TIERS: readonly string[] = ["secondary", "diatonic", "borrowed"];

export function clampBpm(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_PROGRESSION.bpm;
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChordRef(value: unknown): value is ChordRef {
  if (!isObject(value)) return false;
  if (typeof value.tier !== "string" || !TIERS.includes(value.tier)) return false;
  const degree = value.degree;
  return (
    typeof degree === "number" && Number.isInteger(degree) && degree >= 1 && degree <= 7
  );
}

function isSlot(value: unknown): value is ProgressionSlot {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || value.id === "") return false;
  if (!isChordRef(value.ref)) return false;
  return typeof value.bars === "number" && Number.isFinite(value.bars);
}

function isTimeSignature(value: unknown): value is TimeSignature {
  if (!isObject(value)) return false;
  return TIME_SIGNATURE_PRESETS.some(
    (p) => p.beats === value.beats && p.unit === value.unit,
  );
}

function isStoredProgression(value: unknown): value is StoredProgression {
  if (!isObject(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.slots) || !value.slots.every(isSlot)) return false;
  // dnd-kit requires unique ids; duplicates would break reordering.
  const ids = value.slots.map((s: ProgressionSlot) => s.id);
  if (new Set(ids).size !== ids.length) return false;
  if (!isTimeSignature(value.timeSignature)) return false;
  if (typeof value.bpm !== "number" || !Number.isFinite(value.bpm)) return false;
  if (value.preview !== undefined && !isStoredPreview(value.preview)) return false;
  // A stored "visible" flag from before the lane was always shown is ignored.
  return typeof value.click === "boolean" && typeof value.loop === "boolean";
}

// Earlier versions stored the preview as "off" | "beat" | "bar"; a missing
// value predates the preview.
const LEGACY_PREVIEWS: readonly unknown[] = ["off", "beat", "bar"];

function isStoredPreview(value: unknown): boolean {
  return (
    PREVIEW_BEAT_OPTIONS.includes(value as number) || LEGACY_PREVIEWS.includes(value)
  );
}

function previewBeats(value: unknown, sig: TimeSignature): number {
  if (typeof value === "number") return value;
  if (value === "off") return 0;
  if (value === "bar") return sig.beats;
  return DEFAULT_PREVIEW_BEATS;
}

function normalize(state: StoredProgression): StoredProgression {
  // Rebuilt field by field so keys from older versions (e.g. "visible")
  // don't ride along.
  return {
    version: state.version,
    timeSignature: state.timeSignature,
    click: state.click,
    loop: state.loop,
    preview: previewBeats(state.preview, state.timeSignature),
    bpm: clampBpm(state.bpm),
    slots: state.slots.map((s) => ({
      ...s,
      bars: snapSlotLength(s.bars, state.timeSignature),
    })),
  };
}

export function loadProgression(): StoredProgression {
  if (typeof window === "undefined") return DEFAULT_PROGRESSION;
  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (raw === null) return DEFAULT_PROGRESSION;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredProgression(parsed)) return DEFAULT_PROGRESSION;
    return normalize(parsed);
  } catch (err) {
    console.warn("[progressionStorage] failed to load:", err);
    return DEFAULT_PROGRESSION;
  }
}

export function saveProgression(state: StoredProgression): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[progressionStorage] failed to save:", err);
  }
}
