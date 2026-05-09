import { describe, it, expect } from "vitest";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
  isInPositionWindow,
  type PositionId,
} from "./positions";
import { DEFAULT_END_FRET } from "./constants";
import { TUNINGS } from "./tuning";

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
    expect(
      getPositionWindows("C", "P1", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([
      [0, 3],
      [12, 15],
    ]);
    expect(
      getPositionWindows("C", "P2", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[2, 5]]);
    expect(
      getPositionWindows("C", "P3", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[4, 8]]);
    expect(
      getPositionWindows("C", "P4", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[7, 10]]);
    expect(
      getPositionWindows("C", "P5", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[9, 13]]);
  });

  it("emits the wrapped octave when the natural window is past endFret (G major P4)", () => {
    expect(
      getPositionWindows("G", "P4", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[2, 5]]);
  });

  it("emits the wrapped octave when only the high edge spills (B major P3)", () => {
    expect(
      getPositionWindows("B", "P3", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[3, 7]]);
  });

  it("emits the wrapped octave when the entire window is off-board (G major P5)", () => {
    expect(
      getPositionWindows("G", "P5", 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([[4, 8]]);
  });

  it("produces only fully-fitting windows for every (key, position) pair in [0, DEFAULT_END_FRET]", () => {
    for (const key of ALL_KEYS) {
      for (const position of ALL_POSITIONS) {
        const windows = getPositionWindows(
          key,
          position,
          0,
          DEFAULT_END_FRET,
          TUNINGS.standard,
        );
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
    expect(getPositionWindows("C", "P1", 0, 24, TUNINGS.standard)).toEqual([
      [0, 3],
      [12, 15],
    ]);
  });

  it("emits a single octave of C major P1 in [0, 11] (octave-up doesn't fit)", () => {
    expect(getPositionWindows("C", "P1", 0, 11, TUNINGS.standard)).toEqual([[0, 3]]);
  });

  it("emits one octave of C major P5 in [0, 24] (octave-up [21, 25] doesn't fit fully)", () => {
    expect(getPositionWindows("C", "P5", 0, 24, TUNINGS.standard)).toEqual([[9, 13]]);
  });

  it("returns [] when no octave fits fully (C major P1 in [5, 11])", () => {
    expect(getPositionWindows("C", "P1", 5, 11, TUNINGS.standard)).toEqual([]);
  });
});

describe("isInPositionWindow", () => {
  it("returns true for frets inside any visible octave window", () => {
    expect(
      isInPositionWindow("C", "P3", 4, 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toBe(true);
    expect(
      isInPositionWindow("C", "P3", 8, 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toBe(true);
    expect(
      isInPositionWindow("C", "P3", 5, 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toBe(true);
    expect(
      isInPositionWindow("C", "P3", 3, 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toBe(false);
    expect(
      isInPositionWindow("C", "P3", 9, 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toBe(false);
  });

  it("returns true for frets in the upper octave when both fit", () => {
    expect(isInPositionWindow("C", "P1", 0, 0, 24, TUNINGS.standard)).toBe(true);
    expect(isInPositionWindow("C", "P1", 13, 0, 24, TUNINGS.standard)).toBe(true);
    expect(isInPositionWindow("C", "P1", 7, 0, 24, TUNINGS.standard)).toBe(false);
  });

  it("returns false when no octave fits", () => {
    expect(isInPositionWindow("C", "P1", 5, 5, 11, TUNINGS.standard)).toBe(false);
  });
});

describe("computeOverlapZones", () => {
  it("returns the shared frets for two adjacent positions in C major default range", () => {
    const overlaps = computeOverlapZones(
      "C",
      ["P1", "P2"],
      0,
      DEFAULT_END_FRET,
      TUNINGS.standard,
    );
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].low).toBe(2);
    expect(overlaps[0].high).toBe(3);
  });

  it("returns no overlap for non-adjacent positions in C major default range", () => {
    const overlaps = computeOverlapZones(
      "C",
      ["P1", "P3"],
      0,
      DEFAULT_END_FRET,
      TUNINGS.standard,
    );
    expect(overlaps).toEqual([]);
  });

  it("returns multiple overlap zones for three sequential positions", () => {
    const overlaps = computeOverlapZones(
      "C",
      ["P1", "P2", "P3"],
      0,
      DEFAULT_END_FRET,
      TUNINGS.standard,
    );
    expect(overlaps).toHaveLength(2);
    const ranges = overlaps.map((o) => [o.low, o.high]).sort();
    expect(ranges).toEqual([
      [2, 3],
      [4, 5],
    ]);
  });

  it("considers all (octave × position) pairs in a wide range", () => {
    const overlaps = computeOverlapZones("C", ["P1", "P3"], 0, 24, TUNINGS.standard);
    expect(overlaps).toEqual([]);
  });

  it("returns no overlap for a single selected position", () => {
    expect(
      computeOverlapZones("C", ["P3"], 0, DEFAULT_END_FRET, TUNINGS.standard),
    ).toEqual([]);
  });

  it("returns no overlap for an empty selection", () => {
    expect(computeOverlapZones("C", [], 0, DEFAULT_END_FRET, TUNINGS.standard)).toEqual(
      [],
    );
  });

  it("produces a stable id for each pair (independent of input order)", () => {
    const a = computeOverlapZones(
      "C",
      ["P1", "P2"],
      0,
      DEFAULT_END_FRET,
      TUNINGS.standard,
    );
    const b = computeOverlapZones(
      "C",
      ["P2", "P1"],
      0,
      DEFAULT_END_FRET,
      TUNINGS.standard,
    );
    expect(a.map((o) => o.id).sort()).toEqual(b.map((o) => o.id).sort());
  });

  it("emits unique ids when multiple (octave × octave) pairs overlap", () => {
    // C major in [0, 24]: P1 = [[0, 3], [12, 15]], P2 = [[2, 5], [14, 17]].
    // Two overlap zones: [2, 3] and [14, 15] — both must have distinct ids.
    const overlaps = computeOverlapZones("C", ["P1", "P2"], 0, 24, TUNINGS.standard);
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
    const a = computeOverlapZones("C", ["P1", "P2"], 0, 24, TUNINGS.standard);
    const b = computeOverlapZones("C", ["P2", "P1"], 0, 24, TUNINGS.standard);
    expect(a.map((o) => o.id).sort()).toEqual(b.map((o) => o.id).sort());
  });
});

// CAGED windows are anchored to standard tuning's open-string layout. In a
// step-down CAGED-compatible tuning, every window must shift up by the
// tuning's drop in semitones — otherwise the box no longer marks where the
// named shape (C/A/G/E/D) actually lives on the fretboard. Regression test
// for the bug where boxes rendered at standard's anchors regardless of
// tuning, putting the labeled shape at the wrong fret position.
describe("getPositionWindows — CAGED-compatible step-down tunings", () => {
  it("Eb Standard (offset +1): C major P1 sits at frets 1-4", () => {
    expect(getPositionWindows("C", "P1", 0, 24, TUNINGS["eb-standard"])).toEqual([
      [1, 4],
      [13, 16],
    ]);
  });

  it("D Standard (offset +2): C major P1 sits at frets 2-5", () => {
    expect(getPositionWindows("C", "P1", 0, 24, TUNINGS["d-standard"])).toEqual([
      [2, 5],
      [14, 17],
    ]);
  });

  it("C# Standard (offset +3): C major P1 sits at frets 3-6", () => {
    expect(getPositionWindows("C", "P1", 0, 24, TUNINGS["csharp-standard"])).toEqual([
      [3, 6],
      [15, 18],
    ]);
  });

  it("C# Standard: C major P2 (A shape) sits at frets 5-8", () => {
    // Standard puts P2 at [2,5]; +3 tuning offset → [5,8]. Reproduces the
    // user-reported bug where the A-shape box was at the wrong place.
    expect(getPositionWindows("C", "P2", 0, 24, TUNINGS["csharp-standard"])).toEqual([
      [5, 8],
      [17, 20],
    ]);
  });

  it("C# Standard: C major P4 (E shape) sits at frets 10-13", () => {
    expect(getPositionWindows("C", "P4", 0, 24, TUNINGS["csharp-standard"])).toEqual([
      [10, 13],
    ]);
  });

  it("Standard tuning is the no-op identity: no shift applied", () => {
    expect(getPositionWindows("C", "P2", 0, 24, TUNINGS.standard)).toEqual([
      [2, 5],
      [14, 17],
    ]);
  });

  it("D Standard + key G major: keyOffset (7) + tuningOffset (2) compose", () => {
    // Standard G major P1: [0+7, 3+7] = [7, 10]. D Standard adds +2 → [9, 12].
    // The +12 octave [21, 24] also fits inside [0, 24] and is emitted.
    expect(getPositionWindows("G", "P1", 0, 24, TUNINGS["d-standard"])).toEqual([
      [9, 12],
      [21, 24],
    ]);
  });
});

describe("isInPositionWindow — step-down tuning shift", () => {
  it("C# Standard: C major P1 includes fret 3 (in shifted box) but not fret 0", () => {
    expect(isInPositionWindow("C", "P1", 3, 0, 24, TUNINGS["csharp-standard"])).toBe(
      true,
    );
    expect(isInPositionWindow("C", "P1", 0, 0, 24, TUNINGS["csharp-standard"])).toBe(
      false,
    );
  });
});
