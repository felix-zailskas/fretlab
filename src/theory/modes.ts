import {
  CHROMATIC_SCALE,
  getNoteIndex,
  naturalAccidentalForKey,
  spellScale,
  type AccidentalStyle,
  type ChromaticNote,
} from "./notes";
import type {
  ChordQuality,
  DiatonicChord,
  DiatonicTriad,
  ScaleStep,
  TriadQuality,
} from "./scales";
import type { IntervalRole } from "./types";

const INTERVAL_NAMES: IntervalRole[] = [
  "root",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
];

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

export function getModalScaleNotes(key: string, mode: Mode): string[] {
  return spellScale(key as ChromaticNote, MODE_INTERVALS[mode]);
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

// Returns the natural accidental preference for a (key, mode) pair, derived
// from the parent major scale. Returns null when the parent is C major
// (no preference) — callers should preserve the current style in that case.
export function naturalAccidentalForKeyMode(
  key: string,
  mode: Mode,
): AccidentalStyle | null {
  // parentMajorOf returns the input verbatim for Ionian; for non-Ionian it
  // returns the sharp-form chromatic name. Either way, naturalAccidentalForKey
  // handles both forms.
  return naturalAccidentalForKey(parentMajorOf(key, mode));
}

export function getModalIntervalRole(
  key: string,
  mode: Mode,
  note: string,
): IntervalRole | null {
  const semitones = (getNoteIndex(note) - getNoteIndex(key) + 12) % 12;
  const intervals = MODE_INTERVALS[mode];
  const idx = intervals.indexOf(semitones as (typeof intervals)[number]);
  if (idx === -1) return null;
  return INTERVAL_NAMES[idx];
}

export function getCharacteristicNotes(key: string, mode: Mode): string[] {
  const scale = getModalScaleNotes(key, mode);
  return CHARACTERISTIC_DEGREES[mode].map((degreeIdx) => scale[degreeIdx]);
}

// Returns a Set of chromatic note-indices (0-11) for the (key, mode)'s
// characteristic notes — convenient for marker pipelines that test "is
// this note characteristic?" once per fret.
export function getCharacteristicNoteIndexSet(
  key: string,
  mode: Mode,
): ReadonlySet<number> {
  return new Set(getCharacteristicNotes(key, mode).map((n) => getNoteIndex(n)));
}

// Modal degree-prefix derived from the same-root major scale's degree label.
// Ionian: '1','2',… → '', Dorian: '1','2','♭3','4',… → '','','♭','',…
function modalDegreePrefix(mode: Mode, position: number): string {
  const label = MODE_DEGREE_LABELS[mode][position];
  if (label.startsWith("♭")) return "♭";
  if (label.startsWith("♯")) return "♯";
  return "";
}

const TRIAD_BASE_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

const TRIAD_QUALITY_SUFFIX: Record<TriadQuality, string> = {
  maj: "",
  min: "m",
  dim: "°",
};

// Determines triad quality from three semitone-offset pitches above the root.
function triadQualityFromIntervals(
  thirdSemitones: number,
  fifthSemitones: number,
): TriadQuality {
  if (thirdSemitones === 4 && fifthSemitones === 7) return "maj";
  if (thirdSemitones === 3 && fifthSemitones === 7) return "min";
  if (thirdSemitones === 3 && fifthSemitones === 6) return "dim";
  // The 7 modes of the major scale never produce other triad qualities.
  // If a future mode (e.g. harmonic / melodic minor parents — see
  // docs/design/2026-05-07-modal-parent-scales-extension.md) introduces
  // augmented triads (4/8) or other patterns, throw loudly so the test
  // suite surfaces the gap rather than silently mislabeling the chord.
  throw new Error(
    `triadQualityFromIntervals: unsupported pattern third=${thirdSemitones}, fifth=${fifthSemitones}`,
  );
}

function buildTriadRomanNumeral(
  mode: Mode,
  position: number,
  quality: TriadQuality,
): string {
  const prefix = modalDegreePrefix(mode, position);
  const base = TRIAD_BASE_NUMERALS[position];
  const numeral = quality === "maj" ? base : base.toLowerCase();
  const suffix = quality === "dim" ? "°" : "";
  return `${prefix}${numeral}${suffix}`;
}

export function getModalDiatonicTriads(key: string, mode: Mode): DiatonicTriad[] {
  const scale = getModalScaleNotes(key, mode);
  const intervals = MODE_INTERVALS[mode];
  return scale.map((root, i) => {
    const thirdInterval = intervals[(i + 2) % 7] - intervals[i];
    const fifthInterval = intervals[(i + 4) % 7] - intervals[i];
    // (i+2) and (i+4) wrap into the next octave for high positions; normalize
    // into [0, 11] so triadQualityFromIntervals can compare against canonical
    // semitone targets (maj=4/7, min=3/7, dim=3/6).
    const third = ((thirdInterval % 12) + 12) % 12;
    const fifth = ((fifthInterval % 12) + 12) % 12;
    const quality = triadQualityFromIntervals(third, fifth);
    return {
      degree: i + 1,
      romanNumeral: buildTriadRomanNumeral(mode, i, quality),
      quality,
      symbol: root + TRIAD_QUALITY_SUFFIX[quality],
      notes: [root, scale[(i + 2) % 7], scale[(i + 4) % 7]],
    };
  });
}

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj7: "maj7",
  m7: "m7",
  "7": "7",
  m7b5: "m7b5",
};

function seventhQualityFromIntervals(
  thirdSemitones: number,
  fifthSemitones: number,
  seventhSemitones: number,
): ChordQuality {
  // Compare to canonical chord-stack semitone signatures:
  //   maj7 = (4, 7, 11), m7 = (3, 7, 10), 7 = (4, 7, 10), m7b5 = (3, 6, 10).
  if (thirdSemitones === 4 && fifthSemitones === 7 && seventhSemitones === 11)
    return "maj7";
  if (thirdSemitones === 3 && fifthSemitones === 7 && seventhSemitones === 10)
    return "m7";
  if (thirdSemitones === 4 && fifthSemitones === 7 && seventhSemitones === 10)
    return "7";
  if (thirdSemitones === 3 && fifthSemitones === 6 && seventhSemitones === 10)
    return "m7b5";
  // Mirrors triadQualityFromIntervals's defensive throw — surfaces unsupported
  // patterns loudly when future modes (harmonic/melodic minor parents) land.
  throw new Error(
    `seventhQualityFromIntervals: unsupported pattern third=${thirdSemitones}, fifth=${fifthSemitones}, seventh=${seventhSemitones}`,
  );
}

const QUALITY_TO_TRIAD: Record<ChordQuality, TriadQuality> = {
  maj7: "maj",
  m7: "min",
  "7": "maj",
  m7b5: "dim",
};

function buildSeventhRomanNumeral(
  mode: Mode,
  position: number,
  quality: ChordQuality,
): string {
  const prefix = modalDegreePrefix(mode, position);
  const base = TRIAD_BASE_NUMERALS[position];
  // Case follows the *triad* quality of the stack — half-diminished is still
  // a minor-quality triad with a flat 5, so it stays lowercase.
  const triadQuality = QUALITY_TO_TRIAD[quality];
  const numeral = triadQuality === "maj" ? base : base.toLowerCase();
  // Suffix encoding:
  //   maj7  → "maj7"
  //   m7    → "7"        (the minor-case numeral already implies m)
  //   7     → "7"
  //   m7b5  → "ø7"       (the half-dim glyph; lowercase numeral implies minor)
  let suffix: string;
  switch (quality) {
    case "maj7":
      suffix = "maj7";
      break;
    case "m7b5":
      suffix = "ø7";
      break;
    case "m7":
    case "7":
      suffix = "7";
      break;
  }
  return `${prefix}${numeral}${suffix}`;
}

export function getModalDiatonicChords(key: string, mode: Mode): DiatonicChord[] {
  const scale = getModalScaleNotes(key, mode);
  const intervals = MODE_INTERVALS[mode];
  return scale.map((root, i) => {
    const third = (((intervals[(i + 2) % 7] - intervals[i]) % 12) + 12) % 12;
    const fifth = (((intervals[(i + 4) % 7] - intervals[i]) % 12) + 12) % 12;
    const seventh = (((intervals[(i + 6) % 7] - intervals[i]) % 12) + 12) % 12;
    const quality = seventhQualityFromIntervals(third, fifth, seventh);
    return {
      degree: i + 1,
      romanNumeral: buildSeventhRomanNumeral(mode, i, quality),
      quality,
      symbol: root + QUALITY_SUFFIX[quality],
      notes: [root, scale[(i + 2) % 7], scale[(i + 4) % 7], scale[(i + 6) % 7]],
    };
  });
}
