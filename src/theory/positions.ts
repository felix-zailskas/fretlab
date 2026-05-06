import { FRET_COUNT } from "./constants";
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
// neck from the open position in C major: C → A → G → E → D (then C again one
// octave up). Each shape's window is the fret span where its barre form sits
// for C major, derived by adding the shape's relative offset to its barre
// fret. Other keys are derived from these by getPositionWindow.
export const CAGED_POSITIONS: ReadonlyArray<PositionDef> = [
  { id: "P1", shape: "C", cMajorWindow: [0, 3] },
  { id: "P2", shape: "A", cMajorWindow: [2, 5] },
  { id: "P3", shape: "G", cMajorWindow: [4, 8] },
  { id: "P4", shape: "E", cMajorWindow: [7, 10] },
  { id: "P5", shape: "D", cMajorWindow: [9, 13] },
];

const C_INDEX = getNoteIndex("C");

function getKeyOffset(key: string): number {
  // 0..11, the chromatic distance from C up to the given key.
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

// Computes the visible fret window for a given key and CAGED position by
// applying the wrap rule: if the natural shifted window fits on the visible
// neck, use it as-is; otherwise wrap by −12 to bring it back into range.
//
// An earlier version had a third "straddle-clip" case that kept partially
// off-board windows at the high end of the neck. In practice that produced
// useless slivers (e.g., Gb major P5 clipped to a single fret at 15) AND
// abandoned the lower neck where the wrapped octave-equivalent would have
// rendered cleanly. The two-case rule below keeps every position fully on
// the visible neck and uses the lower frets when nothing else lives there.
//
// Soundness: the C-major windows are at most 4 frets wide, and key offsets
// are in [0, 11]. When wrapping, the resulting low fret is always ≥ 0 and
// the high fret is always ≤ FRET_COUNT, so the wrap is always valid.
export function getPositionWindow(key: string, position: PositionId): FretWindow {
  const { cMajorWindow } = lookup(position);
  const offset = getKeyOffset(key);
  const naturalLow = cMajorWindow[0] + offset;
  const naturalHigh = cMajorWindow[1] + offset;

  if (naturalHigh <= FRET_COUNT) {
    return [naturalLow, naturalHigh];
  }
  return [naturalLow - 12, naturalHigh - 12];
}

export function isInPositionWindow(
  key: string,
  position: PositionId,
  fret: number,
): boolean {
  const [low, high] = getPositionWindow(key, position);
  return fret >= low && fret <= high;
}

export type OverlapZone = {
  id: string;
  low: number;
  high: number;
};

// Computes pairwise overlaps between selected positions' fret windows. Each
// non-empty intersection is emitted once with a stable id derived from the
// sorted position pair (so id is independent of input order). Returns [] for
// 0 or 1 selected positions.
export function computeOverlapZones(
  key: string,
  positions: ReadonlyArray<PositionId>,
): OverlapZone[] {
  if (positions.length < 2) return [];

  const result: OverlapZone[] = [];
  for (let i = 0; i < positions.length; i++) {
    const [aLow, aHigh] = getPositionWindow(key, positions[i]);
    for (let j = i + 1; j < positions.length; j++) {
      const [bLow, bHigh] = getPositionWindow(key, positions[j]);
      const low = Math.max(aLow, bLow);
      const high = Math.min(aHigh, bHigh);
      if (low > high) continue;
      // Stable id: sort the pair lexicographically so the same id is produced
      // regardless of which order the caller passed the positions in.
      const [a, b] = [positions[i], positions[j]].sort();
      result.push({ id: `${a}-${b}`, low, high });
    }
  }
  return result;
}
