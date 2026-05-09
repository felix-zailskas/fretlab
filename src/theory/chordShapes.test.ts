import { describe, it, expect } from "vitest";
import {
  TRIAD_SHAPES,
  SEVENTH_SHAPES,
  STRING_SETS_BY_SYSTEM,
  VOICING_SYSTEM_ORDER,
  type StringSet,
  type SeventhStringSet,
  type Inversion,
  type SeventhInversion,
  type VoicingSystem,
} from "./chordShapes";
import type { TriadQuality, ChordQuality } from "./scales";

const STRING_SETS: StringSet[] = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];
const INVERSIONS: Inversion[] = ["root", "first", "second"];
const TRIAD_QUALITIES: TriadQuality[] = ["maj", "min", "dim"];
const SEVENTH_INVERSIONS_LIST: SeventhInversion[] = [
  "root",
  "first",
  "second",
  "third",
];
const CHORD_QUALITIES: ChordQuality[] = ["maj7", "m7", "7", "m7b5"];

// Which string holds the root for each (system, string set, inversion).
// Derived from the low-to-high voicing stack and the string list of the set:
// the rootString is whichever string of the set holds the root note in the
// final low → high arrangement.
//
// Stacks (low → high) per system:
//   close:    R-3-5-7 / 3-5-7-R / 5-7-R-3 / 7-R-3-5
//   drop2:    R-5-7-3 / 3-7-R-5 / 5-R-3-7 / 7-3-5-R
//   drop3:    R-7-3-5 / 3-R-5-7 / 5-3-7-R / 7-5-R-3
//   drop2-4:  R-5-3-7 / 3-7-5-R / 5-R-7-3 / 7-3-R-5
const EXPECTED_ROOT_STRING: Record<
  VoicingSystem,
  Partial<Record<SeventhStringSet, Record<SeventhInversion, number>>>
> = {
  close: {
    "3-4-5-6": { root: 6, first: 3, second: 4, third: 5 },
    "2-3-4-5": { root: 5, first: 2, second: 3, third: 4 },
    "1-2-3-4": { root: 4, first: 1, second: 2, third: 3 },
  },
  drop2: {
    "3-4-5-6": { root: 6, first: 4, second: 5, third: 3 },
    "2-3-4-5": { root: 5, first: 3, second: 4, third: 2 },
    "1-2-3-4": { root: 4, first: 2, second: 3, third: 1 },
  },
  drop3: {
    "6-4-3-2": { root: 6, first: 4, second: 2, third: 3 },
    "5-3-2-1": { root: 5, first: 3, second: 1, third: 2 },
  },
  "drop2-4": {
    "6-5-3-2": { root: 6, first: 2, second: 5, third: 3 },
    "5-4-2-1": { root: 5, first: 1, second: 4, third: 2 },
  },
};

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
  it("populates the expected per-system × string-set × inversion × quality grid (160 entries total)", () => {
    let count = 0;
    for (const system of VOICING_SYSTEM_ORDER) {
      const systemTable = SEVENTH_SHAPES[system];
      for (const ss of STRING_SETS_BY_SYSTEM[system]) {
        const perStringSet = systemTable[ss];
        expect(perStringSet).toBeDefined();
        for (const inv of SEVENTH_INVERSIONS_LIST) {
          for (const q of CHORD_QUALITIES) {
            const shape = perStringSet![inv][q];
            expect(shape).toBeDefined();
            count++;
          }
        }
      }
    }
    // close: 3 × 4 × 4 = 48; drop2: 48; drop3: 2 × 4 × 4 = 32; drop2-4: 32. Total 160.
    expect(count).toBe(160);
  });

  it("each shape has exactly 4 positions on unique strings", () => {
    for (const system of VOICING_SYSTEM_ORDER) {
      for (const ss of STRING_SETS_BY_SYSTEM[system]) {
        const perStringSet = SEVENTH_SHAPES[system][ss]!;
        for (const inv of SEVENTH_INVERSIONS_LIST) {
          for (const q of CHORD_QUALITIES) {
            const shape = perStringSet[inv][q];
            expect(shape.positions).toHaveLength(4);
            const strings = shape.positions.map((p) => p.string);
            expect(new Set(strings).size).toBe(4);
          }
        }
      }
    }
  });

  it("each shape has exactly one of root/third/fifth/seventh", () => {
    for (const system of VOICING_SYSTEM_ORDER) {
      for (const ss of STRING_SETS_BY_SYSTEM[system]) {
        const perStringSet = SEVENTH_SHAPES[system][ss]!;
        for (const inv of SEVENTH_INVERSIONS_LIST) {
          for (const q of CHORD_QUALITIES) {
            const shape = perStringSet[inv][q];
            const roles = shape.positions.map((p) => p.role).sort();
            expect(roles).toEqual(["fifth", "root", "seventh", "third"]);
          }
        }
      }
    }
  });

  it("the position with role=root has fretOffset 0 and string === rootString", () => {
    for (const system of VOICING_SYSTEM_ORDER) {
      for (const ss of STRING_SETS_BY_SYSTEM[system]) {
        const perStringSet = SEVENTH_SHAPES[system][ss]!;
        for (const inv of SEVENTH_INVERSIONS_LIST) {
          for (const q of CHORD_QUALITIES) {
            const shape = perStringSet[inv][q];
            const root = shape.positions.find((p) => p.role === "root")!;
            expect(root.fretOffset).toBe(0);
            expect(root.string).toBe(shape.rootString);
          }
        }
      }
    }
  });

  it("rootString matches the per-system bass→string mapping for every shape", () => {
    for (const system of VOICING_SYSTEM_ORDER) {
      for (const ss of STRING_SETS_BY_SYSTEM[system]) {
        const perStringSet = SEVENTH_SHAPES[system][ss]!;
        const expected = EXPECTED_ROOT_STRING[system][ss]!;
        for (const inv of SEVENTH_INVERSIONS_LIST) {
          for (const q of CHORD_QUALITIES) {
            expect(perStringSet[inv][q].rootString).toBe(expected[inv]);
          }
        }
      }
    }
  });

  it("m7 and m7b5 differ only in the fifth (P5 vs d5) across every shape", () => {
    for (const system of VOICING_SYSTEM_ORDER) {
      for (const ss of STRING_SETS_BY_SYSTEM[system]) {
        const perStringSet = SEVENTH_SHAPES[system][ss]!;
        for (const inv of SEVENTH_INVERSIONS_LIST) {
          const m7 = perStringSet[inv]["m7"];
          const m7b5 = perStringSet[inv]["m7b5"];
          const nonFifth = (s: typeof m7) =>
            s.positions.filter((p) => p.role !== "fifth");
          expect(nonFifth(m7)).toEqual(nonFifth(m7b5));
          const m7Fifth = m7.positions.find((p) => p.role === "fifth")!;
          const m7b5Fifth = m7b5.positions.find((p) => p.role === "fifth")!;
          expect(m7b5Fifth.fretOffset).toBe(m7Fifth.fretOffset - 1);
        }
      }
    }
  });

  // Drop-2 spot-checks: existing barre voicings reproduced by the generator.
  it("spot-check: drop2 / 3-4-5-6 / root / maj7 is the standard E-shape barre", () => {
    expect(SEVENTH_SHAPES["drop2"]["3-4-5-6"]!["root"]["maj7"]).toEqual({
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 5, fretOffset: 2, role: "fifth" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    });
  });

  it("spot-check: drop2 / 2-3-4-5 / root / maj7 is the standard A-shape barre", () => {
    expect(SEVENTH_SHAPES["drop2"]["2-3-4-5"]!["root"]["maj7"]).toEqual({
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 2, role: "fifth" },
        { string: 3, fretOffset: 1, role: "seventh" },
        { string: 2, fretOffset: 2, role: "third" },
      ],
    });
  });

  // Cmaj7 close root pos on 1-2-3-4: stairstep going from D fret 10 down by
  // one fret per string up to high E fret 7 — the shape the user remembered.
  it("spot-check: close / 1-2-3-4 / root / maj7 is the stairstep close voicing", () => {
    expect(SEVENTH_SHAPES["close"]["1-2-3-4"]!["root"]["maj7"]).toEqual({
      rootString: 4,
      positions: [
        { string: 4, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: -1, role: "third" },
        { string: 2, fretOffset: -2, role: "fifth" },
        { string: 1, fretOffset: -3, role: "seventh" },
      ],
    });
  });

  // Cmaj7 drop-3 root pos on 6-4-3-2: bass C on E fret 8, skip A, then B-E-G
  // on D-G-B at frets 9-9-8 (the standard "open" Cmaj7 drop-3 voicing).
  it("spot-check: drop3 / 6-4-3-2 / root / maj7 is the string-skipped Cmaj7 root voicing", () => {
    expect(SEVENTH_SHAPES["drop3"]["6-4-3-2"]!["root"]["maj7"]).toEqual({
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
        { string: 2, fretOffset: 0, role: "fifth" },
      ],
    });
  });

  // Cmaj7 drop-2&4 root pos on 6-5-3-2: very wide R-5-3-7 stack, skips D
  // string. Cmaj7 with C on E fret 8 → 6:8, 5:10, 3:9, 2:12 (notes C-G-E-B).
  it("spot-check: drop2-4 / 6-5-3-2 / root / maj7 is the wide R-5-3-7 voicing", () => {
    expect(SEVENTH_SHAPES["drop2-4"]["6-5-3-2"]!["root"]["maj7"]).toEqual({
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 5, fretOffset: 2, role: "fifth" },
        { string: 3, fretOffset: 1, role: "third" },
        { string: 2, fretOffset: 4, role: "seventh" },
      ],
    });
  });
});

import { buildChordShapeMarkers } from "./chordShapes";
import { TUNINGS } from "./tuning";
import type { Tuning } from "./tuning";
import { getModalDiatonicChords, getModalDiatonicTriads } from "./modes";
import { CHROMATIC_SCALE, getNoteAtFret, getNoteIndex } from "./notes";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { DEFAULT_END_FRET } from "./constants";

describe("buildChordShapeMarkers — chord-centric", () => {
  it("returns [] when key is ALL_NOTES_KEY (triads)", () => {
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        tuning: TUNINGS.standard,
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
    const chord = getModalDiatonicChords("C", "ionian", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        tuning: TUNINGS.standard,
        mode: "sevenths",
        voicingSystem: "drop2",
        chord,
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        stringSets: ["3-4-5-6"],
        inversions: ["root"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when stringSets is empty (triads)", () => {
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        tuning: TUNINGS.standard,
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
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        tuning: TUNINGS.standard,
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

  it("returns [] when stringSets is empty (sevenths)", () => {
    const chord = getModalDiatonicChords("C", "ionian", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        tuning: TUNINGS.standard,
        mode: "sevenths",
        voicingSystem: "drop2",
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

  it("returns [] when inversions is empty (sevenths)", () => {
    const chord = getModalDiatonicChords("C", "ionian", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        tuning: TUNINGS.standard,
        mode: "sevenths",
        voicingSystem: "drop2",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        stringSets: ["3-4-5-6"],
        inversions: [],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("C major I (Triads), [1-2-3], all inversions → 12 markers (two-octave in 2nd inv)", () => {
    // root inv: C on G-string (marker 3) at fret 5 → 1 placement × 3 = 3
    // first inv: C on high-E (marker 5) at fret 8 → 1 × 3 = 3
    // second inv: C on B-string (marker 4) at frets 1 and 13 → 2 × 3 = 6
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0]; // C major (I)
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
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
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
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
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
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

  it("F major V (Sevenths), 3-4-5-6 root → C7 E-shape barre at fret 8 on low E", () => {
    const chord = getModalDiatonicChords("F", "ionian", "flat")[4]; // V = C7
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
      mode: "sevenths",
      voicingSystem: "drop2",
      chord,
      key: "F",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(4); // 1 placement × 4 markers (R-5-7-3)
    const root = markers.find((m) => m.role === "root");
    expect(root).toEqual({ string: 0, fret: 8, note: "C", role: "root" });
    const fifth = markers.find((m) => m.role === "fifth");
    expect(fifth).toEqual({ string: 1, fret: 10, note: "G", role: "fifth" });
    const seventh = markers.find((m) => m.role === "seventh");
    expect(seventh).toEqual({ string: 2, fret: 8, note: "Bb", role: "seventh" });
    const third = markers.find((m) => m.role === "third");
    expect(third).toEqual({ string: 3, fret: 9, note: "E", role: "third" });
  });

  it("C major I (Sevenths), 3-4-5-6, all 4 inversions → 4 placements (16 markers, drop-2 cycle)", () => {
    // Cmaj7 drop-2 on string set 3-4-5-6 cycles through four placements (one
    // root per inversion within fret window [0, 15]):
    //   root pos: C on low E fret 8
    //   1st inv:  C on D string fret 10 (3 in bass at low E fret 12)
    //   2nd inv:  C on A string fret 3 (5 in bass at low E fret 3); next
    //             octave at A fret 15 fails because the seventh sits at +1.
    //   3rd inv:  C on G string fret 5 (7 in bass at low E fret 7)
    const chord = getModalDiatonicChords("C", "ionian", "sharp")[0]; // I = Cmaj7
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
      mode: "sevenths",
      voicingSystem: "drop2",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["3-4-5-6"],
      inversions: ["root", "first", "second", "third"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    const roots = markers
      .filter((m) => m.role === "root")
      .map((m) => ({ string: m.string, fret: m.fret }));
    expect(roots).toEqual([
      { string: 0, fret: 8 }, // root pos
      { string: 2, fret: 10 }, // 1st inv
      { string: 1, fret: 3 }, // 2nd inv
      { string: 3, fret: 5 }, // 3rd inv
    ]);
    expect(markers).toHaveLength(16); // 4 placements × 4 markers
  });

  it("Cmaj7 1st inv on 3-4-5-6 places frets E12 / A14 / D10 / G12 (drop-2 with 3 in bass)", () => {
    const chord = getModalDiatonicChords("C", "ionian", "sharp")[0]; // Cmaj7
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
      mode: "sevenths",
      voicingSystem: "drop2",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["3-4-5-6"],
      inversions: ["first"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // string 0 = low E, ..., string 3 = G
    const byString: Record<number, (typeof markers)[number]> = {};
    for (const m of markers) byString[m.string] = m;
    expect(byString[0]).toEqual({ string: 0, fret: 12, note: "E", role: "third" });
    expect(byString[1]).toEqual({ string: 1, fret: 14, note: "B", role: "seventh" });
    expect(byString[2]).toEqual({ string: 2, fret: 10, note: "C", role: "root" });
    expect(byString[3]).toEqual({ string: 3, fret: 12, note: "G", role: "fifth" });
  });

  it("cap-at-fits: combos outside fret range produce no markers; others unaffected", () => {
    // C major I, [1-2-3, 4-5-6], root inv, endFret=5.
    // 1-2-3/root: C on G-string (marker 3) at fret 5 → fits [0,5] → 3 markers.
    // 4-5-6/root: C on low E at fret 8 → 8 > 5 → 0 markers.
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
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
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0];
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
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
    const chord = getModalDiatonicTriads("D", "ionian", "flat")[2]; // iii = Gbm
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
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

describe("buildChordShapeMarkers — modal", () => {
  it("flags A as characteristic in C Dorian's IV7 (F7) voicings", () => {
    const cDorianIV = getModalDiatonicChords("C", "dorian", "flat")[3]; // F7
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
      mode: "sevenths",
      modalMode: "dorian",
      voicingSystem: "drop2",
      chord: cDorianIV,
      key: "C",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 15,
    });
    // F7 = F-A-C-Eb. The 'A' is C Dorian's characteristic note (♮6).
    const aMarkers = markers.filter((m) => m.note === "A");
    expect(aMarkers.length).toBeGreaterThan(0);
    for (const m of aMarkers) {
      expect(m.isCharacteristic).toBe(true);
    }
    const fMarkers = markers.filter((m) => m.note === "F");
    for (const m of fMarkers) {
      expect(m.isCharacteristic).toBeFalsy();
    }
  });

  it("modalMode='ionian' (default) sets no characteristic flags", () => {
    const cMajorIV = getModalDiatonicChords("C", "ionian")[3]; // Fmaj7
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
      mode: "sevenths",
      voicingSystem: "drop2",
      chord: cMajorIV,
      key: "C",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 15,
    });
    expect(markers.every((m) => !m.isCharacteristic)).toBe(true);
  });

  it("Cm7 in C Dorian has no characteristic chord tones (Cm7 doesn't contain A)", () => {
    const cDorianI = getModalDiatonicChords("C", "dorian", "flat")[0]; // Cm7
    const markers = buildChordShapeMarkers({
      tuning: TUNINGS.standard,
      mode: "sevenths",
      modalMode: "dorian",
      voicingSystem: "drop2",
      chord: cDorianI,
      key: "C",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root", "first", "second", "third"],
      startFret: 0,
      endFret: 15,
    });
    // Cm7 = C-Eb-G-Bb. Dorian's characteristic note is A (♮6) — not in Cm7.
    expect(markers.length).toBeGreaterThan(0); // sanity: voicings exist
    expect(markers.every((m) => !m.isCharacteristic)).toBe(true);
  });
});

describe("buildChordShapeMarkers — tuning-agnostic invariant", () => {
  // Seeded LCG so failures are reproducible.
  function makeRandom(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  function randomTuning(rand: () => number): Tuning {
    const pick = () => CHROMATIC_SCALE[Math.floor(rand() * CHROMATIC_SCALE.length)];
    return {
      id: "standard", // any TuningId; the predicate doesn't read this field
      name: "Random",
      strings: [pick(), pick(), pick(), pick(), pick(), pick()],
    };
  }

  it("every emitted marker maps back to its open-string note via getNoteAtFret", () => {
    // Universal property: regardless of tuning, the (string, fret) returned by
    // buildChordShapeMarkers must encode a note consistent with the tuning's
    // open string at that index. Catches any silent regression to a hardcoded
    // tuning at the call site.
    const rand = makeRandom(0xdeadbeef);
    const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0]; // C major
    for (let iter = 0; iter < 20; iter++) {
      const tuning = randomTuning(rand);
      const markers = buildChordShapeMarkers({
        tuning,
        mode: "triads",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        stringSets: ["1-2-3", "2-3-4", "3-4-5", "4-5-6"],
        inversions: ["root", "first", "second"],
        startFret: 0,
        endFret: 24,
      });
      // The random tuning may place the chord outside the fret range — that's
      // fine; just iterate over whatever markers are returned.
      for (const m of markers) {
        const openString = tuning.strings[m.string];
        const expectedAtFret = getNoteAtFret(openString, m.fret);
        // m.note may be re-spelled (sharp/flat) for display; compare via
        // chromatic index for enharmonic equivalence.
        expect(getNoteIndex(m.note)).toBe(getNoteIndex(expectedAtFret));
      }
    }
  });
});

describe("buildChordShapeMarkers — step-down anchor-fret regression", () => {
  // C major triad, root inversion on string set 4-5-6 should anchor at
  // different frets depending on tuning: the root (C) must fall on the lowest
  // string (index 0 in the 0..5 scheme) at the fret that reaches C from that
  // string's open note.
  //
  //   Standard  (low E):  E  + 8  = C
  //   Eb Standard (D#):   D# + 9  = C
  //   D Standard (D):     D  + 10 = C
  //   C# Standard (C#):   C# + 11 = C

  const chord = getModalDiatonicTriads("C", "ionian", "sharp")[0]; // C major

  function firstRootFret(tuning: Tuning): number {
    const markers = buildChordShapeMarkers({
      tuning,
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 24,
    });
    const rootMarkers = markers.filter((m) => m.role === "root" && m.string === 0);
    expect(rootMarkers.length).toBeGreaterThan(0);
    // Return the lowest-fret root marker.
    return Math.min(...rootMarkers.map((m) => m.fret));
  }

  it("Standard tuning: C major root-inv 4-5-6 anchors at fret 8 on low E", () => {
    expect(firstRootFret(TUNINGS.standard)).toBe(8);
  });

  it("Eb Standard: C major root-inv 4-5-6 anchors at fret 9 on low D#", () => {
    expect(firstRootFret(TUNINGS["eb-standard"])).toBe(9);
  });

  it("D Standard: C major root-inv 4-5-6 anchors at fret 10 on low D", () => {
    expect(firstRootFret(TUNINGS["d-standard"])).toBe(10);
  });

  it("C# Standard: C major root-inv 4-5-6 anchors at fret 11 on low C#", () => {
    expect(firstRootFret(TUNINGS["csharp-standard"])).toBe(11);
  });
});
