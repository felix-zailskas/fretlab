import { ALL_NOTES_KEY } from "../components/KeySelector";
import {
  buildDiatonicSpellingMap,
  getNoteAtFret,
  getNoteIndex,
  type ChromaticNote,
} from "./notes";
import type { Tuning } from "./tuning";
import type {
  TriadQuality,
  ChordQuality,
  DiatonicTriad,
  DiatonicChord,
} from "./scales";
import {
  getCharacteristicNoteIndexSet,
  MODE_INTERVALS,
  type Mode as ModalMode,
} from "./modes";
import type { NoteMarker } from "./types";

// String numbering follows standard guitar nomenclature: string 1 = high E,
// string 6 = low E. The marker pipeline (buildChordShapeMarkers, see follow-up
// task) converts to the codebase's 0-indexed-low-E convention when emitting
// NoteMarker[].
export type StringSet = "1-2-3" | "2-3-4" | "3-4-5" | "4-5-6";
// 7th-chord string sets cover three layouts:
//   adjacent 4 strings — for close & drop-2 voicings
//   skipped-mid (one inner gap) — for drop-3
//   skipped-mid-between-pairs — for drop-2&4
// The id is the literal list of string numbers (1=high E … 6=low E) in pitch order.
export type SeventhStringSet =
  | "1-2-3-4"
  | "2-3-4-5"
  | "3-4-5-6"
  | "6-4-3-2"
  | "5-3-2-1"
  | "6-5-3-2"
  | "5-4-2-1";
export type Inversion = "root" | "first" | "second";
export type SeventhInversion = Inversion | "third";
export type ChordShapesMode = "triads" | "sevenths";
// Voicing systems: how a 4-note close-position chord gets rearranged for guitar.
//   close      — 1-3-5-7 stacked within an octave
//   drop2      — 2nd note from top dropped an octave
//   drop3      — 3rd note from top dropped an octave (skipped string set)
//   drop2-4    — both 2nd and 4th notes from top dropped an octave (very wide)
export type VoicingSystem = "close" | "drop2" | "drop3" | "drop2-4";

// One note's placement within a shape, expressed relative to the chord's root
// fret on the shape's anchor string.
export type ShapePosition = {
  string: number; // 1..6 (1=high E, 6=low E)
  fretOffset: number; // offset from the root's fret on its anchor string
  role: "root" | "third" | "fifth" | "seventh";
};

export type TriadShape = {
  rootString: number;
  positions: ShapePosition[]; // exactly 3 entries (root, third, fifth)
};

export type SeventhShape = {
  rootString: number;
  positions: ShapePosition[]; // exactly 4 entries (root, third, fifth, seventh)
};

// Triad shape vocabulary. 4 string sets × 3 inversions × 3 qualities = 36 entries.
//
// Convention reminders:
// - Root position: root note has the lowest pitch in the trio (sits on the
//   lowest-pitch string of the string set).
// - 1st inversion: third has the lowest pitch (root sits on the highest-pitch
//   string of the string set).
// - 2nd inversion: fifth has the lowest pitch (root sits on the middle string).
// - Adjacent string pitch offsets at the same fret: 6→5 = +5 semitones,
//   5→4 = +5, 4→3 = +5, 3→2 = +4 (B-string oddity), 2→1 = +5.
export const TRIAD_SHAPES: Record<
  StringSet,
  Record<Inversion, Record<TriadQuality, TriadShape>>
> = {
  "1-2-3": {
    root: {
      maj: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: 0, role: "third" },
          { string: 1, fretOffset: -2, role: "fifth" },
        ],
      },
      min: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: -1, role: "third" },
          { string: 1, fretOffset: -2, role: "fifth" },
        ],
      },
      dim: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: -1, role: "third" },
          { string: 1, fretOffset: -3, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 1,
        positions: [
          { string: 1, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: 1, role: "third" },
        ],
      },
      min: {
        rootString: 1,
        positions: [
          { string: 1, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: 0, role: "third" },
        ],
      },
      dim: {
        rootString: 1,
        positions: [
          { string: 1, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: -1, role: "fifth" },
          { string: 3, fretOffset: 0, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 1, fretOffset: -1, role: "third" },
        ],
      },
      min: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 1, fretOffset: -2, role: "third" },
        ],
      },
      dim: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "fifth" },
          { string: 1, fretOffset: -2, role: "third" },
        ],
      },
    },
  },
  "2-3-4": {
    root: {
      maj: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "third" },
          { string: 2, fretOffset: -2, role: "fifth" },
        ],
      },
      min: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "third" },
          { string: 2, fretOffset: -2, role: "fifth" },
        ],
      },
      dim: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "third" },
          { string: 2, fretOffset: -3, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 4, fretOffset: 1, role: "third" },
        ],
      },
      min: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 4, fretOffset: 0, role: "third" },
        ],
      },
      dim: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "fifth" },
          { string: 4, fretOffset: 0, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 2, fretOffset: 0, role: "third" },
        ],
      },
      min: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 2, fretOffset: -1, role: "third" },
        ],
      },
      dim: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -1, role: "fifth" },
          { string: 2, fretOffset: -1, role: "third" },
        ],
      },
    },
  },
  "3-4-5": {
    root: {
      maj: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -1, role: "third" },
          { string: 3, fretOffset: -3, role: "fifth" },
        ],
      },
      min: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -2, role: "third" },
          { string: 3, fretOffset: -3, role: "fifth" },
        ],
      },
      dim: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -2, role: "third" },
          { string: 3, fretOffset: -4, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 5, fretOffset: 2, role: "third" },
        ],
      },
      min: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 5, fretOffset: 1, role: "third" },
        ],
      },
      dim: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -1, role: "fifth" },
          { string: 5, fretOffset: 1, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: -1, role: "third" },
        ],
      },
      min: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: -2, role: "third" },
        ],
      },
      dim: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -1, role: "fifth" },
          { string: 3, fretOffset: -2, role: "third" },
        ],
      },
    },
  },
  "4-5-6": {
    root: {
      maj: {
        rootString: 6,
        positions: [
          { string: 6, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -1, role: "third" },
          { string: 4, fretOffset: -3, role: "fifth" },
        ],
      },
      min: {
        rootString: 6,
        positions: [
          { string: 6, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -2, role: "third" },
          { string: 4, fretOffset: -3, role: "fifth" },
        ],
      },
      dim: {
        rootString: 6,
        positions: [
          { string: 6, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -2, role: "third" },
          { string: 4, fretOffset: -4, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 6, fretOffset: 2, role: "third" },
        ],
      },
      min: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 6, fretOffset: 1, role: "third" },
        ],
      },
      dim: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -1, role: "fifth" },
          { string: 6, fretOffset: 1, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 6, fretOffset: 0, role: "fifth" },
          { string: 4, fretOffset: -1, role: "third" },
        ],
      },
      min: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 6, fretOffset: 0, role: "fifth" },
          { string: 4, fretOffset: -2, role: "third" },
        ],
      },
      dim: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 6, fretOffset: -1, role: "fifth" },
          { string: 4, fretOffset: -2, role: "third" },
        ],
      },
    },
  },
};

// Four 7th-chord voicing systems generated from a single algorithm:
//   1. Take the close-position pitches for the requested close inversion.
//   2. Drop the listed indices (counted from the top, 1-indexed) by an octave.
//   3. Re-sort low → high; the lowest pitch becomes the new bass.
//
// Inversions are named by which chord tone is in the bass — root pos = R bass,
// 1st = 3 in bass, 2nd = 5 in bass, 3rd = 7 in bass — regardless of which
// close source produced the voicing. CLOSE_INV_BY_INVERSION maps a desired
// bass to the close inversion that drops to it.
//
// Spot-checked combinations include the standard E-shape and A-shape barres
// (drop-2 root pos on 3-4-5-6 and 2-3-4-5), close-position root on 1-2-3-4
// (4-fret stairstep), drop-3 root on 6-4-3-2 (string-skipped 8-9-9-8 Cmaj7).
const QUALITY_INTERVALS: Record<ChordQuality, [number, number, number]> = {
  maj7: [4, 7, 11],
  m7: [3, 7, 10],
  "7": [4, 7, 10],
  m7b5: [3, 6, 10],
};

// String list (low-pitch → high-pitch, 1=high E … 6=low E) plus cumulative
// semitone offsets from the lowest string. The +4 step on the 3→2 transition
// is the B-string oddity; every other adjacent pair is +5.
const STRING_SET_DATA: Record<
  SeventhStringSet,
  {
    strings: [number, number, number, number];
    tunings: [number, number, number, number];
  }
> = {
  // adjacent — close & drop-2
  "1-2-3-4": { strings: [4, 3, 2, 1], tunings: [0, 5, 9, 14] },
  "2-3-4-5": { strings: [5, 4, 3, 2], tunings: [0, 5, 10, 14] },
  "3-4-5-6": { strings: [6, 5, 4, 3], tunings: [0, 5, 10, 15] },
  // drop-3: bass + 3 upper strings, skipping one inner string
  "6-4-3-2": { strings: [6, 4, 3, 2], tunings: [0, 10, 15, 19] },
  "5-3-2-1": { strings: [5, 3, 2, 1], tunings: [0, 10, 14, 19] },
  // drop-2&4: bass-pair, skip, upper-pair
  "6-5-3-2": { strings: [6, 5, 3, 2], tunings: [0, 5, 15, 19] },
  "5-4-2-1": { strings: [5, 4, 2, 1], tunings: [0, 5, 14, 19] },
};

export const STRING_SETS_BY_SYSTEM: Record<VoicingSystem, SeventhStringSet[]> = {
  close: ["1-2-3-4", "2-3-4-5", "3-4-5-6"],
  drop2: ["1-2-3-4", "2-3-4-5", "3-4-5-6"],
  drop3: ["6-4-3-2", "5-3-2-1"],
  "drop2-4": ["6-5-3-2", "5-4-2-1"],
};

// Which top-down (1-indexed) positions get dropped by an octave, per system.
const DROP_INDICES: Record<VoicingSystem, number[]> = {
  close: [],
  drop2: [2],
  drop3: [3],
  "drop2-4": [2, 4],
};

// Maps the desired bass note (named by inversion) to the close-position
// inversion that, after applying the drops, produces that bass.
//
// Derivation, for each system:
//   close (no drops): bass is the original close-inv bass — identity.
//   drop-2: drop the 2nd-from-top of close root (=5) → 5 in bass; close 1st
//     drops 7 → 7 bass; close 2nd drops 1 → R bass; close 3rd drops 3 → 3 bass.
//   drop-3: drop the 3rd-from-top of close root (=3) → 3 bass; close 1st
//     drops 5 → 5 bass; close 2nd drops 7 → 7 bass; close 3rd drops 1 → R bass.
//   drop-2&4: bass is the originally-bottom note (4th from top) dropped an
//     octave below itself, which keeps the same chord tone in the bass — so
//     identity, like close.
const CLOSE_INV_BY_INVERSION: Record<
  VoicingSystem,
  Record<SeventhInversion, 0 | 1 | 2 | 3>
> = {
  close: { root: 0, first: 1, second: 2, third: 3 },
  drop2: { root: 2, first: 3, second: 0, third: 1 },
  drop3: { root: 3, first: 0, second: 1, third: 2 },
  "drop2-4": { root: 0, first: 1, second: 2, third: 3 },
};

// Close-position pitches above the bass for each close inversion, paired with
// the chord-tone role on each pitch (low → high).
function closeVoicingWithRoles(
  closeInv: 0 | 1 | 2 | 3,
  p3: number,
  p5: number,
  p7: number,
): { pitch: number; role: ShapePosition["role"] }[] {
  switch (closeInv) {
    case 0: // 1-3-5-7
      return [
        { pitch: 0, role: "root" },
        { pitch: p3, role: "third" },
        { pitch: p5, role: "fifth" },
        { pitch: p7, role: "seventh" },
      ];
    case 1: // 3-5-7-1
      return [
        { pitch: 0, role: "third" },
        { pitch: p5 - p3, role: "fifth" },
        { pitch: p7 - p3, role: "seventh" },
        { pitch: 12 - p3, role: "root" },
      ];
    case 2: // 5-7-1-3
      return [
        { pitch: 0, role: "fifth" },
        { pitch: p7 - p5, role: "seventh" },
        { pitch: 12 - p5, role: "root" },
        { pitch: p3 + 12 - p5, role: "third" },
      ];
    case 3: // 7-1-3-5
      return [
        { pitch: 0, role: "seventh" },
        { pitch: 12 - p7, role: "root" },
        { pitch: p3 + 12 - p7, role: "third" },
        { pitch: p5 + 12 - p7, role: "fifth" },
      ];
  }
}

function makeSeventhShape(
  system: VoicingSystem,
  stringSetId: SeventhStringSet,
  inv: SeventhInversion,
  quality: ChordQuality,
): SeventhShape {
  const [p3, p5, p7] = QUALITY_INTERVALS[quality];
  const closeInv = CLOSE_INV_BY_INVERSION[system][inv];
  const close = closeVoicingWithRoles(closeInv, p3, p5, p7);

  for (const dropIdx of DROP_INDICES[system]) {
    const i = close.length - dropIdx;
    close[i] = { pitch: close[i].pitch - 12, role: close[i].role };
  }

  close.sort((a, b) => a.pitch - b.pitch);
  const bassPitch = close[0].pitch;
  const pitches = close.map((c) => c.pitch - bassPitch);
  const roles = close.map((c) => c.role);

  const rootIdx = roles.indexOf("root");
  const { strings, tunings } = STRING_SET_DATA[stringSetId];
  const rootPitch = pitches[rootIdx];
  const rootTuning = tunings[rootIdx];

  return {
    rootString: strings[rootIdx],
    positions: pitches.map((pitch, j) => ({
      string: strings[j],
      fretOffset: pitch - rootPitch - (tunings[j] - rootTuning),
      role: roles[j],
    })),
  };
}

const SEVENTH_QUALITIES: ChordQuality[] = ["maj7", "m7", "7", "m7b5"];
export const VOICING_SYSTEM_ORDER: VoicingSystem[] = [
  "close",
  "drop2",
  "drop3",
  "drop2-4",
];
export const SEVENTH_INVERSION_ORDER: SeventhInversion[] = [
  "root",
  "first",
  "second",
  "third",
];

// SEVENTH_SHAPES is partial along the string-set axis: each system only
// populates its own valid string sets (3 for close/drop2, 2 for drop3/drop2-4).
export const SEVENTH_SHAPES: Record<
  VoicingSystem,
  Partial<
    Record<
      SeventhStringSet,
      Record<SeventhInversion, Record<ChordQuality, SeventhShape>>
    >
  >
> = (() => {
  const result = {} as Record<
    VoicingSystem,
    Partial<
      Record<
        SeventhStringSet,
        Record<SeventhInversion, Record<ChordQuality, SeventhShape>>
      >
    >
  >;
  for (const system of VOICING_SYSTEM_ORDER) {
    result[system] = {};
    for (const ss of STRING_SETS_BY_SYSTEM[system]) {
      const perStringSet = {} as Record<
        SeventhInversion,
        Record<ChordQuality, SeventhShape>
      >;
      for (const inv of SEVENTH_INVERSION_ORDER) {
        const perInversion = {} as Record<ChordQuality, SeventhShape>;
        for (const q of SEVENTH_QUALITIES) {
          perInversion[q] = makeSeventhShape(system, ss, inv, q);
        }
        perStringSet[inv] = perInversion;
      }
      result[system][ss] = perStringSet;
    }
  }
  return result;
})();

export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      tuning: Tuning;
      modalMode?: ModalMode;
      chord: DiatonicTriad;
      key: string;
      stringSets: ReadonlyArray<StringSet>;
      inversions: ReadonlyArray<Inversion>;
      enabledStrings?: ReadonlySet<number>;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "sevenths";
      tuning: Tuning;
      modalMode?: ModalMode;
      voicingSystem: VoicingSystem;
      chord: DiatonicChord;
      key: string;
      stringSets: ReadonlyArray<SeventhStringSet>;
      inversions: ReadonlyArray<SeventhInversion>;
      enabledStrings?: ReadonlySet<number>;
      startFret: number;
      endFret: number;
    };

// Convert a 1..6 (high-E-first) shape-string index to the codebase's 0..5
// (low-E-first) marker-string index used by the Fretboard renderer and
// Tuning.strings.
function shapeStringToMarkerString(shapeString: number): number {
  return 6 - shapeString;
}

// Returns the playable frets for a target note on a given open string,
// inside [startFret, endFret]. A note repeats every 12 frets.
function getRootFrets(
  targetNote: string,
  openStringNote: string,
  startFret: number,
  endFret: number,
): number[] {
  const baseFret = (getNoteIndex(targetNote) - getNoteIndex(openStringNote) + 12) % 12;
  const result: number[] = [];
  for (let candidate = baseFret; candidate <= endFret; candidate += 12) {
    if (candidate >= startFret) result.push(candidate);
  }
  return result;
}

// Places all fitting occurrences of a single chord's shape on one combo.
// Returns clusters in ascending root-fret order; no coupling between combos.
//
// `tuning` determines both:
// 1. Where the shape anchors (root fret on the anchor string depends on that
//    string's open note).
// 2. The note label at every marker (read off the tuning's open string at
//    that string index).
//
// In CAGED-compatible tunings (those preserving standard's [5,5,5,4,5]
// interval pattern), the *shape geometry* — the relative fret offsets within
// the shape — is unchanged. Only the absolute anchor fret shifts. Calling
// this with a non-CAGED tuning is undefined behavior; the view layer must
// gate on tuningSupportsView.
function placeChordOnCombo(
  chord: { quality: string; notes: readonly string[] },
  shape: TriadShape | SeventhShape,
  tuning: Tuning,
  spellingMap: ReadonlyMap<number, string>,
  startFret: number,
  endFret: number,
  characteristicSet: ReadonlySet<number>,
  enabledStrings: ReadonlySet<number>,
): NoteMarker[] {
  const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
  const openAnchorNote = tuning.strings[anchorMarkerString];
  const candidates = getRootFrets(chord.notes[0], openAnchorNote, startFret, endFret);
  const result: NoteMarker[] = [];

  for (const candidate of candidates) {
    const allFit = shape.positions.every(
      (p) =>
        candidate + p.fretOffset >= startFret && candidate + p.fretOffset <= endFret,
    );
    if (!allFit) continue;

    for (const p of shape.positions) {
      const absFret = candidate + p.fretOffset;
      const markerString = shapeStringToMarkerString(p.string);
      const openNote = tuning.strings[markerString];
      const noteSharp = getNoteAtFret(openNote, absFret);
      const isCharacteristic = characteristicSet.has(getNoteIndex(noteSharp));
      const finalRole = enabledStrings.has(markerString) ? p.role : "muted";
      result.push({
        string: markerString,
        fret: absFret,
        note: spellingMap.get(getNoteIndex(noteSharp)) ?? noteSharp,
        role: finalRole,
        ...(isCharacteristic ? { isCharacteristic: true } : {}),
      });
    }
  }

  return result;
}

// Canonical order ensures stable output regardless of input order of inversions.
const INVERSION_ORDER: Inversion[] = ["root", "first", "second"];

// Pure: given one diatonic chord and the view's sub-selector state, returns
// every NoteMarker the Fretboard should render. Returns [] for ALL_NOTES_KEY
// or when the active sub-selector set is empty. Drops placements whose shape
// doesn't fit inside [startFret, endFret].
export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[] {
  if (input.key === ALL_NOTES_KEY) return [];

  const enabledStrings = input.enabledStrings ?? new Set([0, 1, 2, 3, 4, 5]);
  const modalMode = input.modalMode ?? "ionian";
  const characteristicSet = getCharacteristicNoteIndexSet(input.key, modalMode);
  const spellingMap = buildDiatonicSpellingMap(
    input.key as ChromaticNote,
    MODE_INTERVALS[modalMode],
  );

  if (input.mode === "triads") {
    if (input.stringSets.length === 0 || input.inversions.length === 0) return [];
    const result: NoteMarker[] = [];
    for (const stringSet of input.stringSets) {
      for (const inv of INVERSION_ORDER) {
        if (!input.inversions.includes(inv)) continue;
        const shape = (TRIAD_SHAPES[stringSet][inv] as Record<string, TriadShape>)[
          input.chord.quality
        ];
        if (!shape) continue;
        result.push(
          ...placeChordOnCombo(
            input.chord,
            shape,
            input.tuning,
            spellingMap,
            input.startFret,
            input.endFret,
            characteristicSet,
            enabledStrings,
          ),
        );
      }
    }
    return result;
  }

  // sevenths
  if (input.stringSets.length === 0 || input.inversions.length === 0) return [];
  const result: NoteMarker[] = [];
  const systemTable = SEVENTH_SHAPES[input.voicingSystem];
  for (const stringSet of input.stringSets) {
    const perStringSet = systemTable[stringSet];
    if (!perStringSet) continue; // string set isn't valid for this system
    for (const inv of SEVENTH_INVERSION_ORDER) {
      if (!input.inversions.includes(inv)) continue;
      const shape = (perStringSet[inv] as Record<string, SeventhShape>)[
        input.chord.quality
      ];
      if (!shape) continue;
      result.push(
        ...placeChordOnCombo(
          input.chord,
          shape,
          input.tuning,
          spellingMap,
          input.startFret,
          input.endFret,
          characteristicSet,
          enabledStrings,
        ),
      );
    }
  }
  return result;
}
