import { describe, it, expect } from "vitest";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
  isInPositionWindow,
  type PositionId,
} from "./positions";
import { DEFAULT_END_FRET } from "./constants";

const ALL_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const ALL_POSITIONS: PositionId[] = ["P1", "P2", "P3", "P4", "P5"];

describe("CAGED_POSITIONS", () => {
  it("declares the 5 CAGED positions in the spec-defined order", () => {
    expect(CAGED_POSITIONS).toHaveLength(5);
    expect(CAGED_POSITIONS.map((p) => p.id)).toEqual(["P1", "P2", "P3", "P4", "P5"]);
    expect(CAGED_POSITIONS.map((p) => p.shape)).toEqual(["C", "A", "G", "E", "D"]);
    expect(CAGED_POSITIONS.map((p) => p.cMajorWindow)).toEqual([
      [0, 3],
      [2, 5],
      [4, 8],
      [7, 10],
      [9, 13],
    ]);
  });
});

describe("getPositionWindows — default range [0, DEFAULT_END_FRET]", () => {
  it("returns the fully-fitting octaves for each C-major position", () => {
    // P1 [0, 3] also fits as [12, 15] within [0, 15]; the others have only
    // one octave fitting (their +12 octaves spill past 15).
    expect(getPositionWindows("C", "P1", 0, DEFAULT_END_FRET)).toEqual([
      [0, 3],
      [12, 15],
    ]);
    expect(getPositionWindows("C", "P2", 0, DEFAULT_END_FRET)).toEqual([[2, 5]]);
    expect(getPositionWindows("C", "P3", 0, DEFAULT_END_FRET)).toEqual([[4, 8]]);
    expect(getPositionWindows("C", "P4", 0, DEFAULT_END_FRET)).toEqual([[7, 10]]);
    expect(getPositionWindows("C", "P5", 0, DEFAULT_END_FRET)).toEqual([[9, 13]]);
  });

  it("emits the wrapped octave when the natural window is past endFret (G major P4)", () => {
    expect(getPositionWindows("G", "P4", 0, DEFAULT_END_FRET)).toEqual([[2, 5]]);
  });

  it("emits the wrapped octave when only the high edge spills (B major P3)", () => {
    expect(getPositionWindows("B", "P3", 0, DEFAULT_END_FRET)).toEqual([[3, 7]]);
  });

  it("emits the wrapped octave when the entire window is off-board (G major P5)", () => {
    expect(getPositionWindows("G", "P5", 0, DEFAULT_END_FRET)).toEqual([[4, 8]]);
  });

  it("produces only fully-fitting windows for every (key, position) pair in [0, DEFAULT_END_FRET]", () => {
    for (const key of ALL_KEYS) {
      for (const position of ALL_POSITIONS) {
        const windows = getPositionWindows(key, position, 0, DEFAULT_END_FRET);
        expect(windows.length).toBeGreaterThan(0);
        for (const [low, high] of windows) {
          expect(
            low >= 0 && low <= high && high <= DEFAULT_END_FRET,
            `key=${key} pos=${position} window=[${low},${high}]`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("getPositionWindows — wider and narrower ranges", () => {
  it("emits two octaves of C major P1 in [0, 24]", () => {
    expect(getPositionWindows("C", "P1", 0, 24)).toEqual([
      [0, 3],
      [12, 15],
    ]);
  });

  it("emits a single octave of C major P1 in [0, 11] (octave-up doesn't fit)", () => {
    expect(getPositionWindows("C", "P1", 0, 11)).toEqual([[0, 3]]);
  });

  it("emits one octave of C major P5 in [0, 24] (octave-up [21, 25] doesn't fit fully)", () => {
    expect(getPositionWindows("C", "P5", 0, 24)).toEqual([[9, 13]]);
  });

  it("returns [] when no octave fits fully (C major P1 in [5, 11])", () => {
    expect(getPositionWindows("C", "P1", 5, 11)).toEqual([]);
  });
});

describe("isInPositionWindow", () => {
  it("returns true for frets inside any visible octave window", () => {
    expect(isInPositionWindow("C", "P3", 4, 0, DEFAULT_END_FRET)).toBe(true);
    expect(isInPositionWindow("C", "P3", 8, 0, DEFAULT_END_FRET)).toBe(true);
    expect(isInPositionWindow("C", "P3", 5, 0, DEFAULT_END_FRET)).toBe(true);
    expect(isInPositionWindow("C", "P3", 3, 0, DEFAULT_END_FRET)).toBe(false);
    expect(isInPositionWindow("C", "P3", 9, 0, DEFAULT_END_FRET)).toBe(false);
  });

  it("returns true for frets in the upper octave when both fit", () => {
    expect(isInPositionWindow("C", "P1", 0, 0, 24)).toBe(true);
    expect(isInPositionWindow("C", "P1", 13, 0, 24)).toBe(true);
    expect(isInPositionWindow("C", "P1", 7, 0, 24)).toBe(false);
  });

  it("returns false when no octave fits", () => {
    expect(isInPositionWindow("C", "P1", 5, 5, 11)).toBe(false);
  });
});

describe("computeOverlapZones", () => {
  it("returns the shared frets for two adjacent positions in C major default range", () => {
    const overlaps = computeOverlapZones("C", ["P1", "P2"], 0, DEFAULT_END_FRET);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].low).toBe(2);
    expect(overlaps[0].high).toBe(3);
  });

  it("returns no overlap for non-adjacent positions in C major default range", () => {
    const overlaps = computeOverlapZones("C", ["P1", "P3"], 0, DEFAULT_END_FRET);
    expect(overlaps).toEqual([]);
  });

  it("returns multiple overlap zones for three sequential positions", () => {
    const overlaps = computeOverlapZones("C", ["P1", "P2", "P3"], 0, DEFAULT_END_FRET);
    expect(overlaps).toHaveLength(2);
    const ranges = overlaps.map((o) => [o.low, o.high]).sort();
    expect(ranges).toEqual([
      [2, 3],
      [4, 5],
    ]);
  });

  it("considers all (octave × position) pairs in a wide range", () => {
    const overlaps = computeOverlapZones("C", ["P1", "P3"], 0, 24);
    expect(overlaps).toEqual([]);
  });

  it("returns no overlap for a single selected position", () => {
    expect(computeOverlapZones("C", ["P3"], 0, DEFAULT_END_FRET)).toEqual([]);
  });

  it("returns no overlap for an empty selection", () => {
    expect(computeOverlapZones("C", [], 0, DEFAULT_END_FRET)).toEqual([]);
  });

  it("produces a stable id for each pair (independent of input order)", () => {
    const a = computeOverlapZones("C", ["P1", "P2"], 0, DEFAULT_END_FRET);
    const b = computeOverlapZones("C", ["P2", "P1"], 0, DEFAULT_END_FRET);
    expect(a.map((o) => o.id).sort()).toEqual(b.map((o) => o.id).sort());
  });

  it("emits unique ids when multiple (octave × octave) pairs overlap", () => {
    // C major in [0, 24]: P1 = [[0, 3], [12, 15]], P2 = [[2, 5], [14, 17]].
    // Two overlap zones: [2, 3] and [14, 15] — both must have distinct ids.
    const overlaps = computeOverlapZones("C", ["P1", "P2"], 0, 24);
    expect(overlaps).toHaveLength(2);
    const ids = new Set(overlaps.map((o) => o.id));
    expect(ids.size).toBe(2);
    const ranges = overlaps.map((o) => [o.low, o.high]).sort((x, y) => x[0] - y[0]);
    expect(ranges).toEqual([
      [2, 3],
      [14, 15],
    ]);
  });

  it("produces order-independent ids even with multi-octave positions", () => {
    const a = computeOverlapZones("C", ["P1", "P2"], 0, 24);
    const b = computeOverlapZones("C", ["P2", "P1"], 0, 24);
    expect(a.map((o) => o.id).sort()).toEqual(b.map((o) => o.id).sort());
  });
});
