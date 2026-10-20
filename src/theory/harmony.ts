import {
  getModalDiatonicChords,
  getModalDiatonicTriads,
  MODE_INTERVALS,
  QUALITY_TO_TRIAD,
  type Mode,
} from "./modes";
import {
  ALL_NOTES_KEY,
  CHROMATIC_SCALE,
  getNoteIndex,
  spellChord,
  type SpelledNote,
} from "./notes";
import type { ChordQuality, TriadQuality } from "./scales";

export type ChordRowMode = "triads" | "sevenths";

export type ChordTier = "secondary" | "diatonic" | "borrowed";

// degree is 1-7. For the secondary tier it is the degree of the target chord
// (V7/ii has degree 2).
export type ChordRef = { tier: ChordTier; degree: number };

export type MapChord = {
  ref: ChordRef;
  romanNumeral: string; // "V7/ii", "♭VI", "iv"
  symbol: string; // "A7", "Ab", "Fm"
  quality: TriadQuality | ChordQuality;
  notes: readonly SpelledNote[];
};

// The part of a chord that marker pipelines need. MapChord, DiatonicChord and
// DiatonicTriad all satisfy it.
export type ChordToneSource = Pick<MapChord, "quality" | "notes">;

// Always 7 entries per tier; null renders as an empty cell.
export type ChordMap = Record<ChordTier, (MapChord | null)[]>;

export const CHORD_TIERS: readonly ChordTier[] = ["secondary", "diatonic", "borrowed"];

// Semitones above the root for each chord tone, root first. The single
// source of truth for chord construction (chordShapes.ts imports it).
export const QUALITY_INTERVALS: {
  readonly [Q in TriadQuality]: readonly [number, number, number];
} & {
  readonly [Q in ChordQuality]: readonly [number, number, number, number];
} = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  "7": [0, 4, 7, 10],
  m7b5: [0, 3, 6, 10],
};

// Modes with a major third borrow from the parallel Aeolian; modes with a
// minor third borrow from the parallel Ionian. Derived from the mode's third
// rather than hand-listed.
export function borrowSourceMode(mode: Mode): Mode {
  return MODE_INTERVALS[mode][2] === 4 ? "aeolian" : "ionian";
}

function diatonicChords(key: string, mode: Mode, rowMode: ChordRowMode) {
  return rowMode === "sevenths"
    ? getModalDiatonicChords(key, mode)
    : getModalDiatonicTriads(key, mode);
}

// Spells a chord on `root`; when a letter-correct spelling would need a
// triple accidental (e.g. D##7 in A# Lydian), respells from the sharp-form
// enharmonic root instead (E7).
function spellChordOrEnharmonic(
  root: SpelledNote,
  intervals: readonly number[],
): SpelledNote[] {
  try {
    return spellChord(root, intervals);
  } catch {
    return spellChord(CHROMATIC_SCALE[getNoteIndex(root)], intervals);
  }
}

// Root a perfect fifth above `target`, on the letter 4 steps up when that
// spelling stays within double accidentals; otherwise falls back to
// respelling from the enharmonic root.
function fifthAbove(target: SpelledNote): SpelledNote {
  return spellChordOrEnharmonic(target, QUALITY_INTERVALS.maj)[2];
}

// Secondary dominants are always dominant 7ths, regardless of row mode: the
// b7 is what separates V7/IV (C7 in C major) from the diatonic I.
function buildSecondaryTier(key: string, mode: Mode): (MapChord | null)[] {
  const targets = getModalDiatonicTriads(key, mode);
  return targets.map((target) => {
    if (target.degree === 1 || target.quality === "dim") return null;
    const notes = spellChordOrEnharmonic(
      fifthAbove(target.notes[0]),
      QUALITY_INTERVALS["7"],
    );
    return {
      ref: { tier: "secondary", degree: target.degree },
      romanNumeral: `V7/${target.romanNumeral}`,
      symbol: `${notes[0]}7`,
      quality: "7",
      notes,
    };
  });
}

export function getChordMap(key: string, mode: Mode, rowMode: ChordRowMode): ChordMap {
  const diatonic: MapChord[] = diatonicChords(key, mode, rowMode).map((c) => ({
    ref: { tier: "diatonic", degree: c.degree },
    romanNumeral: c.romanNumeral,
    symbol: c.symbol,
    quality: c.quality,
    notes: c.notes,
  }));

  const borrowed = diatonicChords(key, borrowSourceMode(mode), rowMode).map(
    (c, i): MapChord | null => {
      const own = diatonic[i];
      const sameRoot = getNoteIndex(c.notes[0]) === getNoteIndex(own.notes[0]);
      if (sameRoot && c.quality === own.quality) return null;
      return {
        ref: { tier: "borrowed", degree: c.degree },
        romanNumeral: c.romanNumeral,
        symbol: c.symbol,
        quality: c.quality,
        notes: c.notes,
      };
    },
  );

  return {
    secondary: buildSecondaryTier(key, mode),
    diatonic,
    borrowed,
  };
}

export function resolveChordRef(
  ref: ChordRef,
  key: string,
  mode: Mode,
  rowMode: ChordRowMode,
): MapChord | null {
  if (key === ALL_NOTES_KEY) return null;
  if (!Number.isInteger(ref.degree) || ref.degree < 1 || ref.degree > 7) return null;
  return getChordMap(key, mode, rowMode)[ref.tier][ref.degree - 1] ?? null;
}

export function sameChordRef(a: ChordRef | null, b: ChordRef | null): boolean {
  if (a === null || b === null) return a === b;
  return a.tier === b.tier && a.degree === b.degree;
}

// Click/keyboard selection rule: picking the selected chord again clears it.
export function toggleChordRef(prev: ChordRef | null, next: ChordRef): ChordRef | null {
  return sameChordRef(prev, next) ? null : next;
}

// Reduces a seventh chord to its triad (first three notes); a triad is
// returned unchanged.
export function triadOf(chord: ChordToneSource): ChordToneSource {
  if (chord.notes.length < 4) return chord;
  return {
    quality: QUALITY_TO_TRIAD[chord.quality as ChordQuality],
    notes: chord.notes.slice(0, 3),
  };
}

// Whether the 7th role is meaningful: always in sevenths mode, and in triads
// mode only when the selected chord has a 7th (a secondary dominant).
export function showsSeventh(
  rowMode: ChordRowMode,
  chord: ChordToneSource | null,
): boolean {
  return rowMode === "sevenths" || (chord?.notes.length ?? 0) === 4;
}
