import { describe, it, expect } from "vitest";
import {
  TRIAD_SHAPES,
  SHELL_SHAPES,
  type StringSet,
  type RootString,
  type Inversion,
} from "./chordShapes";
import type { TriadQuality, ChordQuality } from "./scales";

const STRING_SETS: StringSet[] = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];
const INVERSIONS: Inversion[] = ["root", "first", "second"];
const TRIAD_QUALITIES: TriadQuality[] = ["maj", "min", "dim"];
const ROOT_STRINGS: RootString[] = ["6th", "5th"];
const CHORD_QUALITIES: ChordQuality[] = ["maj7", "m7", "7", "m7b5"];

describe("TRIAD_SHAPES — structure", () => {
  it("has all 4 string sets, 3 inversions, 3 qualities (36 entries)", () => {
    let count = 0;
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          expect(shape).toBeDefined();
          count++;
        }
      }
    }
    expect(count).toBe(36);
  });

  it("each shape has exactly 3 positions on unique strings", () => {
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          expect(shape.positions).toHaveLength(3);
          const strings = shape.positions.map((p) => p.string);
          expect(new Set(strings).size).toBe(3);
        }
      }
    }
  });

  it("each shape has exactly one of root/third/fifth", () => {
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          const roles = shape.positions.map((p) => p.role).sort();
          expect(roles).toEqual(["fifth", "root", "third"]);
        }
      }
    }
  });

  it("the position with role=root has fretOffset 0 and string === rootString", () => {
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          const root = shape.positions.find((p) => p.role === "root")!;
          expect(root.fretOffset).toBe(0);
          expect(root.string).toBe(shape.rootString);
        }
      }
    }
  });

  it("rootString is one of the 3 strings in the string set", () => {
    const stringsInSet: Record<StringSet, number[]> = {
      "1-2-3": [1, 2, 3],
      "2-3-4": [2, 3, 4],
      "3-4-5": [3, 4, 5],
      "4-5-6": [4, 5, 6],
    };
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          expect(stringsInSet[stringSet]).toContain(shape.rootString);
        }
      }
    }
  });

  it("spot-check: 1-2-3 root major matches expected", () => {
    expect(TRIAD_SHAPES["1-2-3"]["root"]["maj"]).toEqual({
      rootString: 3,
      positions: [
        { string: 3, fretOffset: 0, role: "root" },
        { string: 2, fretOffset: 0, role: "third" },
        { string: 1, fretOffset: -2, role: "fifth" },
      ],
    });
  });

  it("spot-check: 2-3-4 second-inversion major has all-zero offsets (barre)", () => {
    const shape = TRIAD_SHAPES["2-3-4"]["second"]["maj"];
    expect(shape.rootString).toBe(3);
    expect(shape.positions.every((p) => p.fretOffset === 0)).toBe(true);
  });
});

describe("SHELL_SHAPES — structure", () => {
  it("has all 2 root strings, 4 chord qualities (8 entries)", () => {
    let count = 0;
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SHELL_SHAPES[rs][q];
        expect(shape).toBeDefined();
        count++;
      }
    }
    expect(count).toBe(8);
  });

  it("each shape has exactly 3 positions with role root/third/seventh", () => {
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SHELL_SHAPES[rs][q];
        expect(shape.positions).toHaveLength(3);
        const roles = shape.positions.map((p) => p.role).sort();
        expect(roles).toEqual(["root", "seventh", "third"]);
      }
    }
  });

  it("the position with role=root has fretOffset 0 and string === rootString", () => {
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SHELL_SHAPES[rs][q];
        const root = shape.positions.find((p) => p.role === "root")!;
        expect(root.fretOffset).toBe(0);
        expect(root.string).toBe(shape.rootString);
      }
    }
  });

  it("6th-string-root has rootString 6; 5th has rootString 5", () => {
    for (const q of CHORD_QUALITIES) {
      expect(SHELL_SHAPES["6th"][q].rootString).toBe(6);
      expect(SHELL_SHAPES["5th"][q].rootString).toBe(5);
    }
  });

  it("spot-check: 6th-string-root maj7 matches expected", () => {
    expect(SHELL_SHAPES["6th"]["maj7"]).toEqual({
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    });
  });

  it("m7 and m7b5 shells are identical (both R-♭3-♭7); difference is harmonic, not visual", () => {
    for (const rs of ROOT_STRINGS) {
      expect(SHELL_SHAPES[rs]["m7"]).toEqual(SHELL_SHAPES[rs]["m7b5"]);
    }
  });
});
