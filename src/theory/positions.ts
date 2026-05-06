import { DEFAULT_END_FRET, MAX_FRET } from "./constants";
import { getNoteIndex } from "./notes";

export type PositionId = "P1" | "P2" | "P3" | "P4" | "P5";
export type CagedShape = "E" | "D" | "C" | "A" | "G";

export type FretWindow = readonly [low: number, high: number];

type PositionDef = {
  id: PositionId;
  shape: CagedShape;
  cMajorWindow: FretWindow;
};

// Anchored to C major. Shapes follow the canonical CAGED order ascending the
// neck from the open position in C major: C → A → G → E → D (then C again
// one octave up). Each shape's window is the fret span where its barre form
// sits for C major, derived by adding the shape's relative offset to its
// barre fret. Other keys are derived from these by getPositionWindows.
export const CAGED_POSITIONS: ReadonlyArray<PositionDef> = [
  { id: "P1", shape: "C", cMajorWindow: [0, 3] },
  { id: "P2", shape: "A", cMajorWindow: [2, 5] },
  { id: "P3", shape: "G", cMajorWindow: [4, 8] },
  { id: "P4", shape: "E", cMajorWindow: [7, 10] },
  { id: "P5", shape: "D", cMajorWindow: [9, 13] },
];

const C_INDEX = getNoteIndex("C");

function getKeyOffset(key: string): number {
  const idx = getNoteIndex(key);
  return (idx - C_INDEX + 12) % 12;
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
): FretWindow[] {
  const { cMajorWindow } = lookup(position);
  const offset = getKeyOffset(key);
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
): boolean {
  return getPositionWindows(key, position, startFret, endFret).some(
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
// position pair.
export function computeOverlapZones(
  key: string,
  positions: ReadonlyArray<PositionId>,
  startFret: number,
  endFret: number,
): OverlapZone[] {
  if (positions.length < 2) return [];

  const result: OverlapZone[] = [];
  for (let i = 0; i < positions.length; i++) {
    const aWindows = getPositionWindows(key, positions[i], startFret, endFret);
    for (let j = i + 1; j < positions.length; j++) {
      const bWindows = getPositionWindows(key, positions[j], startFret, endFret);
      for (const [aLow, aHigh] of aWindows) {
        for (const [bLow, bHigh] of bWindows) {
          const low = Math.max(aLow, bLow);
          const high = Math.min(aHigh, bHigh);
          if (low > high) continue;
          const [a, b] = [positions[i], positions[j]].sort();
          result.push({ id: `${a}-${b}`, low, high });
        }
      }
    }
  }
  return result;
}

// Re-export so callers needing the absolute UI ceiling can pull it from
// this module alongside the position helpers.
export { MAX_FRET, DEFAULT_END_FRET };
