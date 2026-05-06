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

import { buildChordShapeMarkers } from "./chordShapes";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { DEFAULT_END_FRET } from "./constants";

describe("buildChordShapeMarkers", () => {
  it("returns [] when key is ALL_NOTES_KEY (triads)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        stringSets: ["1-2-3"],
        inversion: "root",
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when key is ALL_NOTES_KEY (shells)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "shells",
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        rootStrings: ["6th"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when stringSets is empty (triads)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        key: "C",
        accidentalStyle: "sharp",
        stringSets: [],
        inversion: "root",
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when rootStrings is empty (shells)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "shells",
        key: "C",
        accidentalStyle: "sharp",
        rootStrings: [],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("C major Triads, [1-2-3], root inv → 6 chords (vii° drops past fret 15)", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversion: "root",
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // 6 chords × 3 markers = 18 markers (vii° = B° at fret 16+ doesn't fit).
    expect(markers).toHaveLength(18);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(0);
      expect(m.fret).toBeLessThanOrEqual(15);
    }

    // Marker convention: 0 = low E, 5 = high E. Shape's string 3 (G) → marker 3.
    // I (C maj root pos): root C on G string fret 5.
    const iRoot = markers.find(
      (m) => m.string === 3 && m.fret === 5 && m.role === "root",
    );
    expect(iRoot).toBeDefined();
    expect(iRoot!.note).toBe("C");

    // ii (Dm root pos): root D on G string fret 7.
    const iiRoot = markers.find(
      (m) => m.string === 3 && m.fret === 7 && m.role === "root",
    );
    expect(iiRoot).toBeDefined();

    // vii° should not appear: no marker on the G string at fret 16.
    const viiRoot = markers.find((m) => m.string === 3 && m.fret === 16);
    expect(viiRoot).toBeUndefined();

    // Strict ascending order on string 3 (the rootString for root inv on 1-2-3).
    const rootMarkers = markers
      .filter((m) => m.role === "root" && m.string === 3)
      .map((m) => m.fret);
    expect(rootMarkers).toEqual([5, 7, 9, 10, 12, 14]);
  });

  it("C major Triads, [1-2-3, 4-5-6], root inv → markers from both string sets", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversion: "root",
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // 1-2-3 contributes 6 chords × 3 = 18; 4-5-6 contributes 5 chords × 3 = 15
    // (in C major, root pos on 4-5-6 fits I-V; vi at fret 17 drops, vii° at 19 drops).
    expect(markers).toHaveLength(33);
    // 4-5-6 root inv has rootString 6 (low E). Marker convention: string 0.
    const fromLowE = markers.filter((m) => m.string === 0);
    expect(fromLowE.length).toBeGreaterThan(0);
    // 1-2-3 root inv has rootString 3 (G). Marker convention: string 3.
    const fromG = markers.filter((m) => m.string === 3 && m.role === "root");
    expect(fromG.length).toBe(6); // I..vi
  });

  it("C major Triads, [4-5-6], root inv → 5 chords (vi, vii° drop)", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversion: "root",
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(15); // 5 chords × 3 markers
    // Roots on low E string (marker.string = 0): C(8), D(10), E(12), F(13), G(15).
    const rootFrets = markers
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).toEqual([8, 10, 12, 13, 15]);
  });

  it("F major Shells, [6th] → 7 chords × 3 markers, V (C7) root at fret 8 on low E", () => {
    const markers = buildChordShapeMarkers({
      mode: "shells",
      key: "F",
      accidentalStyle: "flat",
      rootStrings: ["6th"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(21); // 7 chords × 3 markers
    // V in F major is C7. Lowest C on low E above the previous chord (Bb at
    // fret 6): C is at fret 8.
    const v = markers.find((m) => m.role === "root" && m.string === 0 && m.fret === 8);
    expect(v).toBeDefined();
    // Roots ascend: F(1), Gm(3), Am(5), Bb(6), C(8), Dm(10), Em(12).
    const rootFrets = markers
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).toEqual([1, 3, 5, 6, 8, 10, 12]);
  });

  it("respects accidentalStyle in marker note labels", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "D",
      accidentalStyle: "flat",
      stringSets: ["1-2-3"],
      inversion: "root",
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // iii in D major = F#m. With flat style, F# becomes Gb.
    // Ascending placement on string 3 (G): I=D@7, ii=Em@9, iii=F#m@11, IV=G@12,
    // V=A@14; vi/vii° drop. So F# at fret 11 is in the output.
    const iiiRoot = markers.find(
      (m) => m.role === "root" && m.fret === 11 && m.string === 3,
    );
    expect(iiiRoot).toBeDefined();
    expect(iiiRoot!.note).toBe("Gb");
  });

  it("output ordering: markers grouped by string-set, then by ascending degree", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversion: "root",
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // First group of 18 markers should be from 1-2-3 (rootString=3, marker.string=3
    // for the root markers); the next 15 from 4-5-6 (rootString=6, marker.string=0).
    const firstGroupRoots = markers.slice(0, 18).filter((m) => m.role === "root");
    const secondGroupRoots = markers.slice(18).filter((m) => m.role === "root");
    expect(firstGroupRoots.every((m) => m.string === 3)).toBe(true);
    expect(secondGroupRoots.every((m) => m.string === 0)).toBe(true);
  });
});

describe("buildChordShapeMarkers — explicit range", () => {
  it("drops a chord whose only fitting placement falls below startFret", () => {
    // C major Triads, [4-5-6], root inv. With range [0, 15] the I (C)
    // chord's root sits at fret 8 on low E. With startFret=10, that
    // placement is below the visible range and the chord drops.
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversion: "root",
      startFret: 10,
      endFret: 15,
    });
    // I (C@8) drops; ii (D@10), iii (E@12), IV (F@13), V (G@15) still fit.
    const rootFrets = markers
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).not.toContain(8);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(10);
      expect(m.fret).toBeLessThanOrEqual(15);
    }
  });

  it("emits more chords when the range extends past 15", () => {
    // C major Triads, [4-5-6], root inv. In [0, 15] only I..V fit (vi at
    // 17 and vii° at 19 drop). In [0, 24] vi and vii° fit too.
    const wide = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversion: "root",
      startFret: 0,
      endFret: 24,
    });
    // Roots on low E: C(8), D(10), E(12), F(13), G(15), A(17), B(19).
    const rootFrets = wide
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).toEqual([8, 10, 12, 13, 15, 17, 19]);
  });
});
