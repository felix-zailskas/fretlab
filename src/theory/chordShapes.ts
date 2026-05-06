import { ALL_NOTES_KEY } from "../components/KeySelector";
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import { getDiatonicTriads, getDiatonicChords } from "./scales";
import type { TriadQuality, ChordQuality } from "./scales";
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
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversion: Inversion;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "shells";
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
  // Walk every octave of the target note that fits inside [startFret, endFret].
  for (let candidate = baseFret; candidate <= endFret; candidate += 12) {
    if (candidate >= startFret) result.push(candidate);
  }
  return result;
}

type ChordSource = {
  quality: string;
  notes: readonly string[];
};

type ShapeLookup = (quality: string) => TriadShape | ShellShape | undefined;

// Walk the 7 diatonic chords in degree order, placing each on the given
// shape's anchor string using the ascending root rule. Returns NoteMarker[]
// in degree-ascending order. Drops chords whose shape doesn't fit cleanly.
function placeChordsOnAnchor(
  chords: ReadonlyArray<ChordSource>,
  shapeLookup: ShapeLookup,
  key: string,
  accidentalStyle: AccidentalStyle,
  startFret: number,
  endFret: number,
): NoteMarker[] {
  const result: NoteMarker[] = [];
  let previousFret = startFret - 1;

  for (const chord of chords) {
    const shape = shapeLookup(chord.quality);
    if (!shape) continue;

    const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
    const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
    const rootNote = chord.notes[0];

    const candidateRootFrets = getRootFrets(
      rootNote,
      openAnchorNote,
      startFret,
      endFret,
    );

    for (const candidate of candidateRootFrets) {
      if (candidate <= previousFret) continue;

      const allFit = shape.positions.every((p) => {
        const absFret = candidate + p.fretOffset;
        return absFret >= startFret && absFret <= endFret;
      });
      if (!allFit) continue;

      // Place the cluster.
      for (const p of shape.positions) {
        const absFret = candidate + p.fretOffset;
        const markerString = shapeStringToMarkerString(p.string);
        const openNote = STANDARD_TUNING[markerString];
        const noteAtFret = getNoteAtFret(openNote, absFret);
        result.push({
          string: markerString,
          fret: absFret,
          note: getDisplayName(noteAtFret, key, accidentalStyle),
          role: p.role,
        });
      }
      previousFret = candidate;
      break;
    }
  }

  return result;
}

// Pure: given the Chord Shapes view's full input, returns the NoteMarker[]
// the Fretboard should render. Returns [] for ALL_NOTES_KEY or when the
// active sub-selector set is empty. Drops chords whose shape doesn't fit
// inside [startFret, endFret] per the cap-at-fits rule.
export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[] {
  if (input.key === ALL_NOTES_KEY) return [];

  if (input.mode === "triads") {
    if (input.stringSets.length === 0) return [];
    const triads = getDiatonicTriads(input.key, input.accidentalStyle);
    const result: NoteMarker[] = [];
    for (const stringSet of input.stringSets) {
      // The cast to Record<string, TriadShape> sidesteps a TS narrowing
      // issue where indexing a Record<TriadQuality, …> with a plain string
      // fails. The runtime call site always passes a TriadQuality.
      const lookup: ShapeLookup = (q) =>
        (TRIAD_SHAPES[stringSet][input.inversion] as Record<string, TriadShape>)[q];
      result.push(
        ...placeChordsOnAnchor(
          triads,
          lookup,
          input.key,
          input.accidentalStyle,
          input.startFret,
          input.endFret,
        ),
      );
    }
    return result;
  }

  // shells mode
  if (input.rootStrings.length === 0) return [];
  const chords = getDiatonicChords(input.key, input.accidentalStyle);
  const result: NoteMarker[] = [];
  for (const rootString of input.rootStrings) {
    const lookup: ShapeLookup = (q) =>
      (SHELL_SHAPES[rootString] as Record<string, ShellShape>)[q];
    result.push(
      ...placeChordsOnAnchor(
        chords,
        lookup,
        input.key,
        input.accidentalStyle,
        input.startFret,
        input.endFret,
      ),
    );
  }
  return result;
}
