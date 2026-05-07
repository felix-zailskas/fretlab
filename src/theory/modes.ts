import {
  CHROMATIC_SCALE,
  getDisplayName,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import type { ScaleStep } from "./scales";

export type Mode =
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian";

export const MODES: readonly Mode[] = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
] as const;

// Each mode's interval-from-tonic in semitones (7 entries, ascending).
export const MODE_INTERVALS: Record<
  Mode,
  readonly [number, number, number, number, number, number, number]
> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

// Degree labels carrying modal accidentals — consumed by ScaleDisplay so the
// pill row visually telegraphs the mode's relation to same-root major.
export const MODE_DEGREE_LABELS: Record<Mode, readonly string[]> = {
  ionian: ["1", "2", "3", "4", "5", "6", "7"],
  dorian: ["1", "2", "♭3", "4", "5", "6", "♭7"],
  phrygian: ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"],
  lydian: ["1", "2", "3", "♯4", "5", "6", "7"],
  mixolydian: ["1", "2", "3", "4", "5", "6", "♭7"],
  aeolian: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
  locrian: ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"],
};

// Step pattern (whole/half) per mode. Mirrors MAJOR_SCALE_STEPS' 7-entry
// shape (the 7th entry wraps to the octave).
export const MODE_STEPS: Record<Mode, readonly ScaleStep[]> = {
  ionian: ["whole", "whole", "half", "whole", "whole", "whole", "half"],
  dorian: ["whole", "half", "whole", "whole", "whole", "half", "whole"],
  phrygian: ["half", "whole", "whole", "whole", "half", "whole", "whole"],
  lydian: ["whole", "whole", "whole", "half", "whole", "whole", "half"],
  mixolydian: ["whole", "whole", "half", "whole", "whole", "half", "whole"],
  aeolian: ["whole", "half", "whole", "whole", "half", "whole", "whole"],
  locrian: ["half", "whole", "whole", "half", "whole", "whole", "whole"],
};

// Indices (0-6 within MODE_INTERVALS) of each mode's characteristic tone(s).
// Ionian and Aeolian are the references — empty arrays.
export const CHARACTERISTIC_DEGREES: Record<Mode, readonly number[]> = {
  ionian: [],
  dorian: [5], // ♮6 vs Aeolian
  phrygian: [1], // ♭2 vs Aeolian
  lydian: [3], // ♯4 vs Ionian
  mixolydian: [6], // ♭7 vs Ionian
  aeolian: [],
  locrian: [4], // ♭5 vs Phrygian
};

// Semitone offset from a mode's tonic to its parent major's tonic.
// Used by Scale Positions to anchor CAGED windows in non-Ionian modes.
export const PARENT_MAJOR_OFFSET: Record<Mode, number> = {
  ionian: 0,
  dorian: -2,
  phrygian: -4,
  lydian: -5,
  mixolydian: -7,
  aeolian: -9,
  locrian: -11,
};

export function getModalScaleNotes(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): string[] {
  const rootIndex = getNoteIndex(key);
  return MODE_INTERVALS[mode].map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    const sharpName = CHROMATIC_SCALE[noteIndex];
    return getDisplayName(sharpName, key, accidentalStyle);
  });
}

// Returns the tonic of the parent major scale for (modal-tonic, mode).
//
// Ionian short-circuits to the input — Ionian's parent IS its tonic, so we
// preserve the caller's spelling (e.g. "Bb" stays "Bb" rather than becoming
// "A#"). For non-Ionian modes the function returns the sharp-form note from
// CHROMATIC_SCALE; callers that need flat spelling should pipe through
// getDisplayName themselves. Internal users (Scale Positions' window math)
// only need note-index-equivalent input, so sharp-form is fine for them.
export function parentMajorOf(tonic: string, mode: Mode): string {
  if (mode === "ionian") return tonic;
  const tonicIdx = getNoteIndex(tonic);
  const parentIdx = (tonicIdx + PARENT_MAJOR_OFFSET[mode] + 12) % 12;
  return CHROMATIC_SCALE[parentIdx];
}
