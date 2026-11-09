import {
  ALL_NOTES_KEY,
  buildDiatonicSpellingMap,
  getNoteIndex,
  type ChromaticNote,
} from "./notes";
import type { Tuning } from "./tuning";
import type { TriadQuality, ChordQuality } from "./scales";
import {
  getCharacteristicNoteIndexSet,
  MODE_INTERVALS,
  type Mode as ModalMode,
} from "./modes";
import type { NoteMarker } from "./types";
import { QUALITY_INTERVALS, type ChordToneSource } from "./harmony";
import { placeShapeClusters, type ShapePosition } from "./chordShapes";
import type { CagedShape } from "./positions";

export type CagedQuality = TriadQuality | ChordQuality;

export type CagedGrip = {
  rootString: number; // 1..6 (1=high E, 6=low E)
  positions: ShapePosition[];
};

// Strings use the marker convention (0 = low E).
export type Barre = { fret: number; stringLow: number; stringHigh: number };

export type CagedPlacement = {
  id: string;
  shape: CagedShape;
  markers: NoteMarker[];
  low: number;
  high: number;
  barre: Barre | null;
  unplayedStrings: number[];
};

// Canonical CAGED order, matching the toggle row and Scale Positions.
export const CAGED_SHAPE_ORDER: readonly CagedShape[] = ["C", "A", "G", "E", "D"];

// Grips in their open-chord (or lowest common) form, written the way chord
// charts write them: low E string first, null = string not played. `root` is
// the chord root of the grip as written. Shape geometry and roles are derived
// from standard tuning below, so the table only states what a chord chart
// would. Grips that aren't commonly taught are left out rather than invented
// (no dim triad grips; no G-shape m7, C/G-shape m7b5).
type GripSource = { root: string; frets: ReadonlyArray<number | null> };
const x = null;
const GRIP_SOURCES: Record<CagedQuality, Partial<Record<CagedShape, GripSource>>> = {
  maj: {
    C: { root: "C", frets: [x, 3, 2, 0, 1, 0] },
    A: { root: "A", frets: [x, 0, 2, 2, 2, 0] },
    G: { root: "G", frets: [3, 2, 0, 0, 0, 3] },
    E: { root: "E", frets: [0, 2, 2, 1, 0, 0] },
    D: { root: "D", frets: [x, x, 0, 2, 3, 2] },
  },
  min: {
    C: { root: "C", frets: [x, 3, 1, 0, 1, 3] },
    A: { root: "A", frets: [x, 0, 2, 2, 1, 0] },
    G: { root: "G", frets: [3, 1, 0, 0, 3, 3] },
    E: { root: "E", frets: [0, 2, 2, 0, 0, 0] },
    D: { root: "D", frets: [x, x, 0, 2, 3, 1] },
  },
  dim: {},
  "7": {
    C: { root: "C", frets: [x, 3, 2, 3, 1, 0] },
    A: { root: "A", frets: [x, 0, 2, 0, 2, 0] },
    G: { root: "G", frets: [3, 2, 0, 0, 0, 1] },
    E: { root: "E", frets: [0, 2, 0, 1, 0, 0] },
    D: { root: "D", frets: [x, x, 0, 2, 1, 2] },
  },
  m7: {
    C: { root: "C", frets: [x, 3, 1, 3, 1, 3] },
    A: { root: "A", frets: [x, 0, 2, 0, 1, 0] },
    E: { root: "E", frets: [0, 2, 0, 0, 0, 0] },
    D: { root: "D", frets: [x, x, 0, 2, 1, 1] },
  },
  maj7: {
    C: { root: "C", frets: [x, 3, 2, 0, 0, 0] },
    A: { root: "A", frets: [x, 0, 2, 1, 2, 0] },
    G: { root: "G", frets: [3, 2, 0, 0, 0, 2] },
    E: { root: "E", frets: [0, x, 1, 1, 0, x] },
    D: { root: "D", frets: [x, x, 0, 2, 2, 2] },
  },
  m7b5: {
    A: { root: "B", frets: [x, 2, 3, 2, 3, x] },
    E: { root: "F#", frets: [2, x, 2, 2, 1, x] },
    D: { root: "D", frets: [x, x, 0, 1, 1, 1] },
  },
};

const STANDARD_OPEN = ["E", "A", "D", "G", "B", "E"]; // low → high
const ROLES = ["root", "third", "fifth", "seventh"] as const;

function toGrip(quality: CagedQuality, src: GripSource): CagedGrip {
  const intervals: readonly number[] = QUALITY_INTERVALS[quality];
  const rootPc = getNoteIndex(src.root);
  const lowest = src.frets.findIndex((f) => f !== null);
  const rootFret = src.frets[lowest]!;
  const positions: ShapePosition[] = [];
  src.frets.forEach((fret, i) => {
    if (fret === null) return;
    const semis = (getNoteIndex(STANDARD_OPEN[i]) + fret - rootPc + 12) % 12;
    const roleIdx = intervals.indexOf(semis);
    if (roleIdx === -1) {
      throw new Error(
        `CAGED grip ${src.root}${quality}: string ${6 - i} isn't a chord tone`,
      );
    }
    positions.push({
      string: 6 - i,
      fretOffset: fret - rootFret,
      role: ROLES[roleIdx],
    });
  });
  return { rootString: 6 - lowest, positions };
}

export const CAGED_GRIPS: Record<
  CagedQuality,
  Partial<Record<CagedShape, CagedGrip>>
> = (() => {
  const result = {} as Record<CagedQuality, Partial<Record<CagedShape, CagedGrip>>>;
  for (const quality of Object.keys(GRIP_SOURCES) as CagedQuality[]) {
    result[quality] = {};
    for (const shape of CAGED_SHAPE_ORDER) {
      const src = GRIP_SOURCES[quality][shape];
      if (src) result[quality][shape] = toGrip(quality, src);
    }
  }
  return result;
})();

// The barre is the lowest fretted fret when at least two strings sit on it,
// spanning the outermost of those strings. No barre for open placements, or
// when the span would cross a string the grip doesn't play (e.g. 1x221x).
export function deriveBarre(
  markers: ReadonlyArray<NoteMarker>,
  unplayedStrings: ReadonlyArray<number>,
): Barre | null {
  const minFret = Math.min(...markers.map((m) => m.fret));
  if (minFret === 0) return null;
  const strings = markers.filter((m) => m.fret === minFret).map((m) => m.string);
  if (strings.length < 2) return null;
  const stringLow = Math.min(...strings);
  const stringHigh = Math.max(...strings);
  if (unplayedStrings.some((s) => s > stringLow && s < stringHigh)) return null;
  return { fret: minFret, stringLow, stringHigh };
}

export type BuildCagedPlacementsInput = {
  tuning: Tuning;
  modalMode?: ModalMode;
  chord: ChordToneSource;
  key: string;
  shapes: ReadonlyArray<CagedShape>;
  enabledStrings?: ReadonlySet<number>;
  startFret: number;
  endFret: number;
};

// Every fitting placement of each requested shape's grip for the chord's
// quality, in canonical C-A-G-E-D order then ascending fret. Shapes without a
// grip for the quality contribute nothing.
export function buildCagedPlacements(
  input: BuildCagedPlacementsInput,
): CagedPlacement[] {
  if (input.key === ALL_NOTES_KEY) return [];
  const grips = CAGED_GRIPS[input.chord.quality as CagedQuality];
  if (!grips) return [];

  const enabledStrings = input.enabledStrings ?? new Set([0, 1, 2, 3, 4, 5]);
  const modalMode = input.modalMode ?? "ionian";
  const characteristicSet = getCharacteristicNoteIndexSet(input.key, modalMode);
  const spellingMap = buildDiatonicSpellingMap(
    input.key as ChromaticNote,
    MODE_INTERVALS[modalMode],
  );

  const result: CagedPlacement[] = [];
  for (const shape of CAGED_SHAPE_ORDER) {
    if (!input.shapes.includes(shape)) continue;
    const grip = grips[shape];
    if (!grip) continue;
    const played = new Set(grip.positions.map((p) => 6 - p.string));
    const unplayedStrings = [0, 1, 2, 3, 4, 5].filter((s) => !played.has(s));
    const clusters = placeShapeClusters(
      input.chord,
      grip,
      input.tuning,
      spellingMap,
      input.startFret,
      input.endFret,
      characteristicSet,
      enabledStrings,
    );
    for (const markers of clusters) {
      const frets = markers.map((m) => m.fret);
      const low = Math.min(...frets);
      result.push({
        id: `${shape}-${low}`,
        shape,
        markers,
        low,
        high: Math.max(...frets),
        barre: deriveBarre(markers, unplayedStrings),
        unplayedStrings,
      });
    }
  }
  return result;
}

// Overlapping shapes (e.g. D- and E-shape near the nut) share notes; render
// each string/fret once.
export function dedupeMarkers(placements: ReadonlyArray<CagedPlacement>): NoteMarker[] {
  const seen = new Map<string, NoteMarker>();
  for (const p of placements) {
    for (const m of p.markers) {
      const key = `${m.string}-${m.fret}`;
      if (!seen.has(key)) seen.set(key, m);
    }
  }
  return [...seen.values()];
}
