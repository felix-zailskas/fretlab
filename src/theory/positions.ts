import { getNoteIndex } from "./notes";
import type { Mode } from "./modes";
import { parentMajorOf } from "./modes";
import type { Tuning } from "./tuning";

export type PositionId = "P1" | "P2" | "P3" | "P4" | "P5";
export type CagedShape = "E" | "D" | "C" | "A" | "G";

export type FretWindow = readonly [low: number, high: number];

type PositionDef = {
  id: PositionId;
  shape: CagedShape;
  cMajorWindow: FretWindow;
};

// Numbered E-first, the most common convention in guitar material:
// position 1 = E shape, then D, C, A, G going up the neck from it. Each
// shape's window is the fret span where its barre form sits for C major;
// other keys are derived from these by getPositionWindows.
export const CAGED_POSITIONS: ReadonlyArray<PositionDef> = [
  { id: "P1", shape: "E", cMajorWindow: [7, 10] },
  { id: "P2", shape: "D", cMajorWindow: [9, 13] },
  { id: "P3", shape: "C", cMajorWindow: [0, 3] },
  { id: "P4", shape: "A", cMajorWindow: [2, 5] },
  { id: "P5", shape: "G", cMajorWindow: [4, 8] },
];

// The CAGED cycle in the order the shapes follow each other up the neck.
const CAGED_CYCLE: readonly CagedShape[] = ["C", "A", "G", "E", "D"];

// Steps along CAGED_CYCLE from a parent-major box's shape to the form the
// mode's tonic chord takes in that same box (e.g. C major's G-shape box
// holds A minor's E shape: one step for Aeolian).
const TONIC_SHAPE_STEP: Record<Mode, number> = {
  ionian: 0,
  dorian: 4,
  phrygian: 3,
  lydian: 3,
  mixolydian: 2,
  aeolian: 1,
  locrian: 0,
};

export function tonicShapeOf(mode: Mode, parentShape: CagedShape): CagedShape {
  const i = CAGED_CYCLE.indexOf(parentShape);
  return CAGED_CYCLE[(i + TONIC_SHAPE_STEP[mode]) % CAGED_CYCLE.length];
}

export function positionForShape(shape: CagedShape): PositionId {
  return CAGED_POSITIONS.find((p) => p.shape === shape)!.id;
}

// The parent-major position whose box holds the tonic-relative `position`.
export function parentPositionOf(mode: Mode, position: PositionId): PositionId {
  const tonicShape = lookup(position).shape;
  const i = CAGED_CYCLE.indexOf(tonicShape);
  const n = CAGED_CYCLE.length;
  return positionForShape(CAGED_CYCLE[(i - TONIC_SHAPE_STEP[mode] + n) % n]);
}

const C_INDEX = getNoteIndex("C");
const STANDARD_LOW_INDEX = getNoteIndex("E"); // standard tuning's low E

function getKeyOffset(key: string): number {
  const idx = getNoteIndex(key);
  return (idx - C_INDEX + 12) % 12;
}

// Semitone shift the box must apply to compensate for the tuning's open low
// string sitting below standard's E. Eb Standard → +1, D Standard → +2, C#
// Standard → +3. Standard → 0. Hypothetical step-up tunings produce a
// negative offset.
//
// CAGED windows are anchored to standard's open-string layout. To play the
// same SHAPE in a step-down tuning, every fret must move up by the tuning's
// drop in semitones — so the window slides up by that same amount. Calling
// this with a non-CAGED-compatible tuning is not meaningful; the view layer
// gates such tunings out before reaching this code.
function getTuningOffsetFromStandard(tuning: Tuning): number {
  const lowIdx = getNoteIndex(tuning.strings[0]);
  let diff = STANDARD_LOW_INDEX - lowIdx;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}

function lookup(position: PositionId): PositionDef {
  const def = CAGED_POSITIONS.find((p) => p.id === position);
  if (!def) {
    throw new Error(`Unknown position id: ${position}`);
  }
  return def;
}

// Returns every octave of the given (key, position) box that fits fully
// inside [startFret, endFret]. Octave shifts considered cover [0, MAX_FRET]
// generously plus the wrap below the open position.
//
// The "fully inside" rule preserves the existing wrap-rule's principle of
// "no useless slivers" — a partially-visible window is dropped, not
// clipped. With wider user ranges, multiple octaves can be visible at
// once; with narrower user ranges, a position may yield zero windows
// (surfaces as empty state in the view).
export function getPositionWindows(
  key: string,
  position: PositionId,
  startFret: number,
  endFret: number,
  tuning: Tuning,
): FretWindow[] {
  const { cMajorWindow } = lookup(position);
  const offset = getKeyOffset(key) + getTuningOffsetFromStandard(tuning);
  const naturalLow = cMajorWindow[0] + offset;
  const naturalHigh = cMajorWindow[1] + offset;

  // Octave shifts -1..+2 cover [-12 below open] up to [+24 above],
  // sufficient for any cMajorWindow + key offset combination inside
  // [0, MAX_FRET].
  const result: FretWindow[] = [];
  for (let k = -1; k <= 2; k++) {
    const low = naturalLow + 12 * k;
    const high = naturalHigh + 12 * k;
    if (low >= startFret && high <= endFret) {
      result.push([low, high]);
    }
  }
  return result;
}

// Returns true if `fret` is inside ANY visible octave window for the given
// (key, position) box constrained by [startFret, endFret].
export function isInPositionWindow(
  key: string,
  position: PositionId,
  fret: number,
  startFret: number,
  endFret: number,
  tuning: Tuning,
): boolean {
  return getPositionWindows(key, position, startFret, endFret, tuning).some(
    ([low, high]) => fret >= low && fret <= high,
  );
}

export type OverlapZone = {
  id: string;
  low: number;
  high: number;
};

// Computes pairwise overlaps between selected positions' visible octave
// windows. Each (positionA-octave × positionB-octave) intersection is
// emitted once if non-empty, with a stable id derived from the sorted
// position pair plus the octave indices on each side, so multi-octave
// ranges produce unique ids per (octaveA × octaveB) pair while remaining
// independent of the input order of `positions`.
export function computeOverlapZones(
  key: string,
  positions: ReadonlyArray<PositionId>,
  startFret: number,
  endFret: number,
  tuning: Tuning,
): OverlapZone[] {
  if (positions.length < 2) return [];

  const result: OverlapZone[] = [];
  for (let i = 0; i < positions.length; i++) {
    const aWindows = getPositionWindows(key, positions[i], startFret, endFret, tuning);
    for (let j = i + 1; j < positions.length; j++) {
      const bWindows = getPositionWindows(
        key,
        positions[j],
        startFret,
        endFret,
        tuning,
      );
      aWindows.forEach(([aLow, aHigh], aIdx) => {
        bWindows.forEach(([bLow, bHigh], bIdx) => {
          const low = Math.max(aLow, bLow);
          const high = Math.min(aHigh, bHigh);
          if (low > high) return;
          // Sort the position pair lexicographically and keep the octave
          // indices aligned to that sort, so the id is independent of the
          // input order of `positions` while still distinguishing octaves.
          const swap = positions[i] > positions[j];
          const a = swap ? positions[j] : positions[i];
          const b = swap ? positions[i] : positions[j];
          const aOctave = swap ? bIdx : aIdx;
          const bOctave = swap ? aIdx : bIdx;
          result.push({ id: `${a}-${aOctave}_${b}-${bOctave}`, low, high });
        });
      });
    }
  }
  return result;
}

// Windows for a tonic-relative position of (key, mode): the parent major's
// box in which the mode's tonic chord takes `position`'s shape.
export function getScalePositionWindows(
  key: string,
  mode: Mode,
  position: PositionId,
  startFret: number,
  endFret: number,
  tuning: Tuning,
): FretWindow[] {
  return getPositionWindows(
    parentMajorOf(key, mode),
    parentPositionOf(mode, position),
    startFret,
    endFret,
    tuning,
  );
}
