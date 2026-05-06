import { describe, it, expect } from "vitest";
import {
  TRIAD_SHAPES,
  SEVENTH_SHAPES,
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

describe("SEVENTH_SHAPES — structure", () => {
  it("has all 2 root strings, 4 chord qualities (8 entries)", () => {
    let count = 0;
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SEVENTH_SHAPES[rs][q];
        expect(shape).toBeDefined();
        count++;
      }
    }
    expect(count).toBe(8);
  });

  it("each shape has exactly 4 positions with roles root/third/fifth/seventh", () => {
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SEVENTH_SHAPES[rs][q];
        expect(shape.positions).toHaveLength(4);
        const roles = shape.positions.map((p) => p.role).sort();
        expect(roles).toEqual(["fifth", "root", "seventh", "third"]);
      }
    }
  });

  it("the position with role=root has fretOffset 0 and string === rootString", () => {
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SEVENTH_SHAPES[rs][q];
        const root = shape.positions.find((p) => p.role === "root")!;
        expect(root.fretOffset).toBe(0);
        expect(root.string).toBe(shape.rootString);
      }
    }
  });

  it("6th-string-root has rootString 6; 5th has rootString 5", () => {
    for (const q of CHORD_QUALITIES) {
      expect(SEVENTH_SHAPES["6th"][q].rootString).toBe(6);
      expect(SEVENTH_SHAPES["5th"][q].rootString).toBe(5);
    }
  });

  it("spot-check: 6th-string-root maj7 is the standard E-shape barre", () => {
    expect(SEVENTH_SHAPES["6th"]["maj7"]).toEqual({
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 5, fretOffset: 2, role: "fifth" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    });
  });

  it("m7 and m7b5 differ only in the fifth (P5 vs d5)", () => {
    for (const rs of ROOT_STRINGS) {
      const m7 = SEVENTH_SHAPES[rs]["m7"];
      const m7b5 = SEVENTH_SHAPES[rs]["m7b5"];
      const nonFifth = (s: typeof m7) => s.positions.filter((p) => p.role !== "fifth");
      expect(nonFifth(m7)).toEqual(nonFifth(m7b5));
      const m7Fifth = m7.positions.find((p) => p.role === "fifth")!;
      const m7b5Fifth = m7b5.positions.find((p) => p.role === "fifth")!;
      // d5 sits one fret below P5.
      expect(m7b5Fifth.fretOffset).toBe(m7Fifth.fretOffset - 1);
    }
  });
});

import { buildChordShapeMarkers } from "./chordShapes";
import { getDiatonicTriads, getDiatonicChords } from "./scales";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { DEFAULT_END_FRET } from "./constants";

describe("buildChordShapeMarkers — chord-centric", () => {
  it("returns [] when key is ALL_NOTES_KEY (triads)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        chord,
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        stringSets: ["1-2-3"],
        inversions: ["root"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when key is ALL_NOTES_KEY (sevenths)", () => {
    const chord = getDiatonicChords("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "sevenths",
        chord,
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        rootStrings: ["6th"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when stringSets is empty (triads)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        stringSets: [],
        inversions: ["root"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when inversions is empty (triads)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        stringSets: ["1-2-3"],
        inversions: [],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when rootStrings is empty (sevenths)", () => {
    const chord = getDiatonicChords("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "sevenths",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        rootStrings: [],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("C major I (Triads), [1-2-3], all inversions → 12 markers (two-octave in 2nd inv)", () => {
    // root inv: C on G-string (marker 3) at fret 5 → 1 placement × 3 = 3
    // first inv: C on high-E (marker 5) at fret 8 → 1 × 3 = 3
    // second inv: C on B-string (marker 4) at frets 1 and 13 → 2 × 3 = 6
    const chord = getDiatonicTriads("C", "sharp")[0]; // C major (I)
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversions: ["root", "first", "second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(12);
    // Second inversion root (B-string = marker 4) appears at fret 1 and 13.
    const secondInvRoots = markers
      .filter((m) => m.role === "root" && m.string === 4)
      .map((m) => m.fret);
    expect(secondInvRoots).toEqual([1, 13]);
  });

  it("C major I (Triads), [1-2-3], inversions=[root,second] → 9 markers (first inv absent)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversions: ["root", "second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // root(3) + second(6) = 9; first inv root was at str=5, fret=8 — must be absent.
    expect(markers).toHaveLength(9);
    expect(
      markers.find((m) => m.string === 5 && m.fret === 8 && m.role === "root"),
    ).toBeUndefined();
  });

  it("C major I (Triads), [1-2-3, 4-5-6], all inversions → 24 markers, ordered by stringSet then inversion", () => {
    // 1-2-3: root@str3f5, first@str5f8, second@str4f1, second@str4f13 → 12 markers
    // 4-5-6: root@str0f8, first@str2f10, second@str1f3, second@str1f15 → 12 markers
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversions: ["root", "first", "second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(24);
    // First 12 from 1-2-3 (shape strings 1,2,3 → marker strings 5,4,3; all ≥ 3).
    expect(markers.slice(0, 12).every((m) => m.string >= 3)).toBe(true);
    // Next 12 from 4-5-6 (shape strings 4,5,6 → marker strings 2,1,0; all ≤ 2).
    expect(markers.slice(12).every((m) => m.string <= 2)).toBe(true);
    // Canonical inversion order within 1-2-3: root → first → second (asc fret per combo).
    const first12Roots = markers
      .slice(0, 12)
      .filter((m) => m.role === "root")
      .map((m) => ({ string: m.string, fret: m.fret }));
    expect(first12Roots).toEqual([
      { string: 3, fret: 5 }, // root inv
      { string: 5, fret: 8 }, // first inv
      { string: 4, fret: 1 }, // second inv, low octave
      { string: 4, fret: 13 }, // second inv, high octave
    ]);
  });

  it("F major V (Sevenths), [6th] → C7 4-note voicing rooted at fret 8 on low E", () => {
    const chord = getDiatonicChords("F", "flat")[4]; // V = C7
    const markers = buildChordShapeMarkers({
      mode: "sevenths",
      chord,
      key: "F",
      accidentalStyle: "flat",
      rootStrings: ["6th"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(4); // 1 placement × 4 markers (R-5-7-3)
    const root = markers.find((m) => m.role === "root");
    expect(root).toEqual({ string: 0, fret: 8, note: "C", role: "root" });
    // Standard E-shape C7 voicing.
    const fifth = markers.find((m) => m.role === "fifth");
    expect(fifth).toEqual({ string: 1, fret: 10, note: "G", role: "fifth" });
    const seventh = markers.find((m) => m.role === "seventh");
    expect(seventh).toEqual({ string: 2, fret: 8, note: "Bb", role: "seventh" });
    const third = markers.find((m) => m.role === "third");
    expect(third).toEqual({ string: 3, fret: 9, note: "E", role: "third" });
  });

  it("cap-at-fits: combos outside fret range produce no markers; others unaffected", () => {
    // C major I, [1-2-3, 4-5-6], root inv, endFret=5.
    // 1-2-3/root: C on G-string (marker 3) at fret 5 → fits [0,5] → 3 markers.
    // 4-5-6/root: C on low E at fret 8 → 8 > 5 → 0 markers.
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 5,
    });
    expect(markers).toHaveLength(3); // only 1-2-3/root contributed
    expect(markers.every((m) => m.string >= 3)).toBe(true); // all from 1-2-3
    expect(markers.every((m) => m.fret <= 5)).toBe(true);
  });

  it("two-octave emission: both root-fret candidates emitted when both fit", () => {
    // 2nd inv on 1-2-3: rootString=2 (B, marker 4). C on B: fret 1 and fret 13.
    // Shape offsets [0,-1,-1] → frets [1,0,0] and [13,12,12]; both sets in [0,15].
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversions: ["second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(6); // 2 placements × 3 markers
    const rootFrets = markers.filter((m) => m.role === "root").map((m) => m.fret);
    expect(rootFrets).toEqual([1, 13]);
  });

  it("accidental style: F# in D major shown as Gb with flat style", () => {
    // D major iii = F#m. With flat accidentalStyle, root displays as Gb.
    // Root pos on 1-2-3: Gb on G-string (marker 3) at fret 11.
    const chord = getDiatonicTriads("D", "flat")[2]; // iii = Gbm
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "D",
      accidentalStyle: "flat",
      stringSets: ["1-2-3"],
      inversions: ["root"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    const rootMarker = markers.find(
      (m) => m.role === "root" && m.string === 3 && m.fret === 11,
    );
    expect(rootMarker).toBeDefined();
    expect(rootMarker!.note).toBe("Gb");
  });
});
