import { TUNINGS, type AnyTuningId, type CustomTuning } from "./tuning";

export const STORAGE_KEY = "fretlab:custom-tunings:v1";

export type StoredState = {
  version: 1;
  tunings: CustomTuning[];
  selectedTuningId: AnyTuningId | null;
};

const DEFAULTS: StoredState = {
  version: 1,
  tunings: [],
  selectedTuningId: null,
};

function isStoredState(value: unknown): value is StoredState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<StoredState>;
  if (v.version !== 1) return false;
  if (!Array.isArray(v.tunings)) return false;
  if (
    v.selectedTuningId !== null &&
    v.selectedTuningId !== undefined &&
    typeof v.selectedTuningId !== "string"
  ) {
    return false;
  }
  return true;
}

function normalizeSelected(state: StoredState): StoredState {
  if (state.selectedTuningId === null) return state;
  if (state.selectedTuningId in TUNINGS) return state;
  const isKnownCustom = state.tunings.some((t) => t.id === state.selectedTuningId);
  if (isKnownCustom) return state;
  return { ...state, selectedTuningId: "standard" };
}

export function loadCustomTunings(): StoredState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (!isStoredState(parsed)) return DEFAULTS;
    return normalizeSelected(parsed);
  } catch (err) {
    console.warn("[customTuningStorage] failed to load:", err);
    return DEFAULTS;
  }
}

export function saveCustomTunings(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[customTuningStorage] failed to save:", err);
  }
}
