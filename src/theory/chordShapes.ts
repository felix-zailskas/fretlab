import { ALL_NOTES_KEY } from "../components/KeySelector";
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import type {
  TriadQuality,
  ChordQuality,
  DiatonicTriad,
  DiatonicChord,
} from "./scales";
import type { NoteMarker } from "./types";

// String numbering follows standard guitar nomenclature: string 1 = high E,
// string 6 = low E. The marker pipeline (buildChordShapeMarkers, see follow-up
// task) converts to the codebase's 0-indexed-low-E convention when emitting
// NoteMarker[].
export type StringSet = "1-2-3" | "2-3-4" | "3-4-5" | "4-5-6";
export type RootString = "6th" | "5th";
export type Inversion = "root" | "first" | "second";
export type ChordShapesMode = "triads" | "shells";

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

export type ShellShape = {
  rootString: number;
  positions: ShapePosition[]; // exactly 3 entries (root, third, seventh)
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

// Shell shape vocabulary. 2 root strings × 4 chord qualities = 8 entries.
//
// 6th-string-root layout: R on string 6, 7 on string 4, 3 on string 3.
// 5th-string-root layout: R on string 5, 7 on string 3, 3 on string 2.
//
// Quality differences come from whether the third is M3 or m3 and whether the
// seventh is M7 or m7. m7 and m7b5 share the same R-♭3-♭7 layout — the
// difference between them lives in the (omitted) 5th, so the shells are
// visually identical. The display surfaces this by labelling the chord with
// the correct symbol (e.g., Bm7b5 vs. a hypothetical Bm7) while reusing the
// same fingering data.
export const SHELL_SHAPES: Record<RootString, Record<ChordQuality, ShellShape>> = {
  "6th": {
    maj7: {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    },
    m7: {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 0, role: "seventh" },
        { string: 3, fretOffset: 0, role: "third" },
      ],
    },
    "7": {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 0, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    },
    m7b5: {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 0, role: "seventh" },
        { string: 3, fretOffset: 0, role: "third" },
      ],
    },
  },
  "5th": {
    maj7: {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 1, role: "seventh" },
        { string: 2, fretOffset: 2, role: "third" },
      ],
    },
    m7: {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 0, role: "seventh" },
        { string: 2, fretOffset: 1, role: "third" },
      ],
    },
    "7": {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 0, role: "seventh" },
        { string: 2, fretOffset: 2, role: "third" },
      ],
    },
    m7b5: {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 0, role: "seventh" },
        { string: 2, fretOffset: 1, role: "third" },
      ],
    },
  },
};

export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      chord: DiatonicTriad;
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversions: ReadonlyArray<Inversion>;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "shells";
      chord: DiatonicChord;
      key: string;
      accidentalStyle: AccidentalStyle;
      rootStrings: ReadonlyArray<RootString>;
      startFret: number;
      endFret: number;
    };

// Convert a 1..6 (high-E-first) shape-string index to the codebase's 0..5
// (low-E-first) marker-string index used by the Fretboard renderer and
// STANDARD_TUNING.
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
function placeChordOnCombo(
  chord: { quality: string; notes: readonly string[] },
  shape: TriadShape | ShellShape,
  key: string,
  accidentalStyle: AccidentalStyle,
  startFret: number,
  endFret: number,
): NoteMarker[] {
  const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
  const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
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
      const openNote = STANDARD_TUNING[markerString];
      result.push({
        string: markerString,
        fret: absFret,
        note: getDisplayName(getNoteAtFret(openNote, absFret), key, accidentalStyle),
        role: p.role,
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
            input.key,
            input.accidentalStyle,
            input.startFret,
            input.endFret,
          ),
        );
      }
    }
    return result;
  }

  // shells
  if (input.rootStrings.length === 0) return [];
  const result: NoteMarker[] = [];
  for (const rootString of input.rootStrings) {
    const shape = (SHELL_SHAPES[rootString] as Record<string, ShellShape>)[
      input.chord.quality
    ];
    if (!shape) continue;
    result.push(
      ...placeChordOnCombo(
        input.chord,
        shape,
        input.key,
        input.accidentalStyle,
        input.startFret,
        input.endFret,
      ),
    );
  }
  return result;
}
