import { describe, it, expect } from "vitest";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindow,
  isInPositionWindow,
  type PositionId,
} from "./positions";
import { FRET_COUNT } from "./constants";

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

describe("getPositionWindow", () => {
  it("returns the C-major windows unchanged for key=C", () => {
    expect(getPositionWindow("C", "P1")).toEqual([0, 3]);
    expect(getPositionWindow("C", "P2")).toEqual([2, 5]);
    expect(getPositionWindow("C", "P3")).toEqual([4, 8]);
    expect(getPositionWindow("C", "P4")).toEqual([7, 10]);
    expect(getPositionWindow("C", "P5")).toEqual([9, 13]);
  });

  it("shifts windows by the key offset when they fit within FRET_COUNT", () => {
    // D major = +2: P1 [0,3] -> [2,5], P2 [2,5] -> [4,7], P5 [9,13] -> [11,15].
    expect(getPositionWindow("D", "P1")).toEqual([2, 5]);
    expect(getPositionWindow("D", "P5")).toEqual([11, 15]);
  });

  it("wraps -12 when a window does not fully fit (G major P4: [14,17] -> [2,5])", () => {
    expect(getPositionWindow("G", "P4")).toEqual([2, 5]);
  });

  it("wraps -12 even when only the high edge is past the neck (B major P3: [15,19] -> [3,7])", () => {
    expect(getPositionWindow("B", "P3")).toEqual([3, 7]);
  });

  it("wraps -12 for fully-off windows (G major P5: [16,20] -> [4,8])", () => {
    expect(getPositionWindow("G", "P5")).toEqual([4, 8]);
  });

  it("wraps -12 for A major P5 ([18,22] -> [6,10])", () => {
    expect(getPositionWindow("A", "P5")).toEqual([6, 10]);
  });

  it("wraps -12 for B major P5 ([20,24] -> [8,12])", () => {
    expect(getPositionWindow("B", "P5")).toEqual([8, 12]);
  });

  it("wraps Gb major P5 ([15,19] -> [3,7]) — exposes the lower neck", () => {
    // Gb major (offset 6): P1 [6,9] and P2 [8,11] live mid-neck, so without
    // wrapping P5 down the lower neck would be entirely empty.
    expect(getPositionWindow("Gb", "P5")).toEqual([3, 7]);
  });

  it("produces a window with 0 <= low <= high <= FRET_COUNT for every (key, position) pair", () => {
    for (const key of ALL_KEYS) {
      for (const position of ALL_POSITIONS) {
        const [low, high] = getPositionWindow(key, position);
        expect(
          low >= 0 && low <= high && high <= FRET_COUNT,
          `key=${key} pos=${position} window=[${low},${high}]`,
        ).toBe(true);
      }
    }
  });
});

describe("isInPositionWindow", () => {
  it("returns true at both edges of the window and false just outside", () => {
    // C major P3 = [4, 8]
    expect(isInPositionWindow("C", "P3", 4)).toBe(true);
    expect(isInPositionWindow("C", "P3", 8)).toBe(true);
    expect(isInPositionWindow("C", "P3", 5)).toBe(true);
    expect(isInPositionWindow("C", "P3", 3)).toBe(false);
    expect(isInPositionWindow("C", "P3", 9)).toBe(false);
  });

  it("reflects the wrap rule (G major P5 wraps to [4, 8])", () => {
    expect(isInPositionWindow("G", "P5", 4)).toBe(true);
    expect(isInPositionWindow("G", "P5", 8)).toBe(true);
    expect(isInPositionWindow("G", "P5", 16)).toBe(false); // outside the rendered range
  });
});

describe("computeOverlapZones", () => {
  it("returns the shared frets for two adjacent positions in C major", () => {
    // C major: P1 [0,3], P2 [2,5] → overlap [2,3].
    const overlaps = computeOverlapZones("C", ["P1", "P2"]);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].low).toBe(2);
    expect(overlaps[0].high).toBe(3);
  });

  it("returns no overlap for non-adjacent positions in C major", () => {
    // C major: P1 [0,3], P3 [4,8] → no shared frets.
    const overlaps = computeOverlapZones("C", ["P1", "P3"]);
    expect(overlaps).toEqual([]);
  });

  it("returns multiple overlap zones for three sequential positions", () => {
    // C major: P1 [0,3], P2 [2,5], P3 [4,8].
    // Pairs that overlap: P1∩P2 = [2,3], P2∩P3 = [4,5]. P1∩P3 is empty.
    const overlaps = computeOverlapZones("C", ["P1", "P2", "P3"]);
    expect(overlaps).toHaveLength(2);
    const ranges = overlaps.map((o) => [o.low, o.high]).sort();
    expect(ranges).toEqual([
      [2, 3],
      [4, 5],
    ]);
  });

  it("returns no overlap for a single selected position", () => {
    expect(computeOverlapZones("C", ["P3"])).toEqual([]);
  });

  it("returns no overlap for an empty selection", () => {
    expect(computeOverlapZones("C", [])).toEqual([]);
  });

  it("produces a stable id for each pair (independent of input order)", () => {
    const a = computeOverlapZones("C", ["P1", "P2"]);
    const b = computeOverlapZones("C", ["P2", "P1"]);
    expect(a.map((o) => o.id).sort()).toEqual(b.map((o) => o.id).sort());
  });
});
