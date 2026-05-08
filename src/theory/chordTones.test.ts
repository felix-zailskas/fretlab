import { describe, it, expect } from "vitest";
import { roleFromChordTone, HIGHLIGHTABLE, buildChordToneMarkers } from "./chordTones";
import { DEFAULT_END_FRET } from "./constants";
import { getModalDiatonicChords, getModalDiatonicTriads } from "./modes";
import type { HighlightableRole } from "../components/Legend";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { TUNINGS } from "./tuning";
import type { Tuning } from "./tuning";
import { CHROMATIC_SCALE, getNoteAtFret, getNoteIndex } from "./notes";

describe("roleFromChordTone", () => {
  it('returns "scale" for any in-key note when no chord is given', () => {
    // Deselecting the chord card is the user-facing "clear highlights"
    // shortcut. Every in-key note falls back to the plain scale role,
    // regardless of which scale degree it is.
    for (const note of ["C", "D", "E", "F", "G", "A", "B"]) {
      expect(roleFromChordTone(note, null)).toBe("scale");
    }
  });

  it("maps to chord-relative roles when a chord is given (G major, ii = Am7)", () => {
    // ii in G major is Am7: A C E G — A=root, C=third, E=fifth, G=seventh.
    const chords = getModalDiatonicChords("G", "ionian");
    const am7 = chords[1]; // ii
    expect(am7.symbol.toLowerCase()).toContain("a");

    expect(roleFromChordTone("A", am7)).toBe("root");
    expect(roleFromChordTone("C", am7)).toBe("third");
    expect(roleFromChordTone("E", am7)).toBe("fifth");
    expect(roleFromChordTone("G", am7)).toBe("seventh");
  });

  it('returns "scale" for in-key notes that are not chord tones', () => {
    // In G major over Am7, D is in the G major scale but not in Am7.
    const am7 = getModalDiatonicChords("G", "ionian")[1];
    expect(roleFromChordTone("D", am7)).toBe("scale");
  });

  it("handles enharmonic equivalence (sharp vs flat input)", () => {
    // V7 in F major is C7 = C E G Bb. Bb and A# are enharmonic — both should
    // resolve as the chord's seventh.
    const c7 = getModalDiatonicChords("F", "ionian")[4];
    expect(roleFromChordTone("Bb", c7)).toBe("seventh");
    expect(roleFromChordTone("A#", c7)).toBe("seventh");
  });
});

describe("HIGHLIGHTABLE", () => {
  it("contains exactly the four chord-tone roles", () => {
    expect(HIGHLIGHTABLE.has("root")).toBe(true);
    expect(HIGHLIGHTABLE.has("third")).toBe(true);
    expect(HIGHLIGHTABLE.has("fifth")).toBe(true);
    expect(HIGHLIGHTABLE.has("seventh")).toBe(true);
    expect(HIGHLIGHTABLE.has("scale")).toBe(false);
    expect(HIGHLIGHTABLE.has("muted")).toBe(false);
  });
});

describe("buildChordToneMarkers", () => {
  // Reusable inputs: C major, ii (Dm7), default Legend (all four roles on).
  const cMajor_ii = () => getModalDiatonicChords("C", "ionian")[1];
  const allRoles: Set<HighlightableRole> = new Set([
    "root",
    "third",
    "fifth",
    "seventh",
  ]);

  it("returns an empty list when key is ALL_NOTES_KEY", () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: ALL_NOTES_KEY,
      chord: null,
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toEqual([]);
  });

  it("returns an empty list when positions is empty", () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: [],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toEqual([]);
  });

  it("with positions=[P1] and showContext=false, every marker is in a P1 octave window", () => {
    // C major P1 fits twice within [0, DEFAULT_END_FRET=15]: [0, 3] and
    // [12, 15]. Every marker must land in one of those octave windows.
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      const inLow = m.fret >= 0 && m.fret <= 3;
      const inHigh = m.fret >= 12 && m.fret <= 15;
      expect(inLow || inHigh).toBe(true);
    }
  });

  it("with positions=[P1] and chord=Dm7 in C, marks D=root, F=third, A=fifth, C=seventh", () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // String index convention: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E.
    // Pick one representative cell for each chord tone within [0,3]:
    // - D: D string (idx 2) open
    // - F: low E (idx 0) + fret 1
    // - A: A string (idx 1) open
    // - C: A string (idx 1) + fret 3
    const find = (string: number, fret: number) =>
      markers.find((m) => m.string === string && m.fret === fret);

    expect(find(2, 0)?.role).toBe("root"); // D string open = D
    expect(find(0, 1)?.role).toBe("third"); // low E + 1 = F
    expect(find(1, 0)?.role).toBe("fifth"); // A string open = A
    expect(find(1, 3)?.role).toBe("seventh"); // A string + 3 = C
  });

  it('non-chord scale tones in the position are role "scale"', () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // E is a C-major scale tone but not in Dm7 (D F A C).
    // E appears on the low E string at fret 0.
    const e = markers.find((m) => m.string === 0 && m.fret === 0);
    expect(e?.role).toBe("scale");
  });

  it('with showContext=true, at least one outside-window marker exists with role "muted"', () => {
    // C major P1 fits as [0, 3] and [12, 15] within [0, 15]. The "outside"
    // region (where context-only muted markers should render) is the gap
    // [4, 11] between those octave windows.
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: true,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    const outside = markers.filter((m) => m.fret > 3 && m.fret < 12);
    expect(outside.length).toBeGreaterThan(0);
    for (const m of outside) {
      expect(m.role).toBe("muted");
    }
  });

  it('demotes a chord-tone role to "scale" when the Legend toggles it off', () => {
    const without5: Set<HighlightableRole> = new Set(["root", "third", "seventh"]);
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: without5,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // A string open = A, which would be 'fifth' of Dm7. With fifth toggled off,
    // it should demote to 'scale'.
    const a = markers.find((m) => m.string === 1 && m.fret === 0);
    expect(a?.role).toBe("scale");
  });

  it("with positions=[P1, P2], renders markers across the union of both windows", () => {
    // C major within [0, 15]: P1 fits as [0, 3] and [12, 15]; P2 fits as
    // [2, 5] (its +12 octave [14, 17] spills past 15). Union of all
    // octave windows = [0, 5] ∪ [12, 15]. Should see markers at fret 4
    // (in P2 only) and fret 1 (in P1 only).
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1", "P2"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    for (const m of markers) {
      const inLowUnion = m.fret >= 0 && m.fret <= 5;
      const inHighP1 = m.fret >= 12 && m.fret <= 15;
      expect(inLowUnion || inHighP1).toBe(true);
    }
    expect(markers.some((m) => m.fret === 4)).toBe(true); // P2-only territory
    expect(markers.some((m) => m.fret === 1)).toBe(true); // P1-only territory
  });

  it('with chord=null, every in-window in-key marker renders as "scale" (no chord-tone highlights)', () => {
    // Deselecting the chord card sets chord to null. The view's intent is
    // "clear highlights, just show me the box" — so no R/3/5/7 lights up,
    // even on the major scale's 1/3/5/7 frets.
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: null,
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.role).toBe("scale");
    }
  });

  it("with all 5 positions selected, renders markers spanning the full neck", () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii(),
      accidentalStyle: "sharp",
      positions: ["P1", "P2", "P3", "P4", "P5"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    const maxFret = Math.max(...markers.map((m) => m.fret));
    expect(maxFret).toBeGreaterThan(10); // covers higher-neck cells
  });
});

describe("roleFromChordTone with triads", () => {
  it("resolves root/third/fifth correctly for a triad input (C major, ii = Dm)", () => {
    const triad = getModalDiatonicTriads("C", "ionian")[1]; // ii = Dm — notes [D, F, A]
    expect(roleFromChordTone("D", triad)).toBe("root");
    expect(roleFromChordTone("F", triad)).toBe("third");
    expect(roleFromChordTone("A", triad)).toBe("fifth");
  });

  it('never returns "seventh" for a triad input', () => {
    // C is the seventh of Dm7 in sevenths mode, but is not a chord tone of
    // the Dm triad. Should fall back to 'scale'.
    const triad = getModalDiatonicTriads("C", "ionian")[1];
    expect(roleFromChordTone("C", triad)).toBe("scale");
  });

  it('returns "scale" for in-key non-chord-tone notes (E in Dm triad, C major)', () => {
    const triad = getModalDiatonicTriads("C", "ionian")[1];
    expect(roleFromChordTone("E", triad)).toBe("scale");
  });

  it("handles enharmonic equivalence in triad mode (F# triad in G major, Gb)", () => {
    // vii° in G is F#° = F# A C. F# and Gb are enharmonic — Gb input should
    // resolve as the chord's root, mirroring the existing flat/sharp handling
    // for sevenths.
    const triad = getModalDiatonicTriads("G", "ionian")[6];
    expect(roleFromChordTone("F#", triad)).toBe("root");
    expect(roleFromChordTone("Gb", triad)).toBe("root");
  });
});

describe("buildChordToneMarkers with triads", () => {
  const cMajor_ii_triad = () => getModalDiatonicTriads("C", "ionian")[1]; // Dm — notes [D, F, A]
  const allRoles: Set<HighlightableRole> = new Set([
    "root",
    "third",
    "fifth",
    "seventh",
  ]);

  it('produces no markers with role "seventh" when the chord is a triad', () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii_triad(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.role).not.toBe("seventh");
    }
  });

  it("marks the triad notes correctly (D=root, F=third, A=fifth in C major P1)", () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii_triad(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // String index convention: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E.
    const find = (string: number, fret: number) =>
      markers.find((m) => m.string === string && m.fret === fret);
    expect(find(2, 0)?.role).toBe("root"); // D string open = D
    expect(find(0, 1)?.role).toBe("third"); // low E + 1 = F
    expect(find(1, 0)?.role).toBe("fifth"); // A string open = A
  });

  it("treats C (the would-be seventh) as scale tone in triad mode", () => {
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: cMajor_ii_triad(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // A string + fret 3 = C. In sevenths mode this would be 'seventh' of Dm7;
    // in triads mode it should be 'scale'.
    const c = markers.find((m) => m.string === 1 && m.fret === 3);
    expect(c?.role).toBe("scale");
  });
});

describe("buildChordToneMarkers — narrowed range", () => {
  const allRoles: Set<HighlightableRole> = new Set([
    "root",
    "third",
    "fifth",
    "seventh",
  ]);

  it("emits no markers when the only fitting position window falls outside the range", () => {
    // P1 = C-shape window [0, 3] in C major. With startFret=5, that
    // window is outside the visible range, so no markers.
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: null,
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 5,
      endFret: 12,
    });
    expect(markers).toEqual([]);
  });

  it("only emits markers within [startFret, endFret] when at least one fits", () => {
    // P3 = G-shape window [4, 8] in C major fits inside [4, 8] exactly.
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      chord: null,
      accidentalStyle: "sharp",
      positions: ["P3"],
      showContext: false,
      enabledHighlights: allRoles,
      startFret: 4,
      endFret: 8,
    });
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(4);
      expect(m.fret).toBeLessThanOrEqual(8);
    }
  });
});

describe("buildChordToneMarkers — modal", () => {
  it("mode='ionian' is regression-equivalent to omitting mode", () => {
    const baseInput = {
      tuning: TUNINGS.standard,
      key: "C",
      chord: getModalDiatonicChords("C", "ionian")[0],
      accidentalStyle: "flat" as const,
      positions: ["P1" as const],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"] as const),
      startFret: 0,
      endFret: 12,
    };
    const without = buildChordToneMarkers(baseInput);
    const withIonian = buildChordToneMarkers({ ...baseInput, mode: "ionian" });
    expect(withIonian).toEqual(without);
  });

  it("D Dorian + Dm7 + P1 emits markers in frets 0-3 (parent C major's P1)", () => {
    const dDorianI = getModalDiatonicChords("D", "dorian")[0]; // Dm7
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "D",
      mode: "dorian",
      chord: dDorianI,
      accidentalStyle: "flat",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 0,
      endFret: 12,
    });
    // Every marker should fall inside the parent C-major P1 window (0-3),
    // not D-Ionian's P1 (2-5).
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(0);
      expect(m.fret).toBeLessThanOrEqual(3);
    }
  });

  it("drops out-of-mode notes (C Lydian filters out F)", () => {
    const cLydianI = getModalDiatonicChords("C", "lydian", "sharp")[0]; // Cmaj7
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      mode: "lydian",
      chord: cLydianI,
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: true, // include context so we'd see F if it weren't filtered
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 0,
      endFret: 12,
    });
    // C Lydian has F#, not F. No marker should display "F" (without sharp).
    for (const m of markers) {
      expect(m.note).not.toBe("F");
    }
  });

  it("flags characteristic notes in Dorian (♮6 = A in C Dorian)", () => {
    const cDorianI = getModalDiatonicTriads("C", "dorian", "flat")[0]; // Cm
    const markers = buildChordToneMarkers({
      tuning: TUNINGS.standard,
      key: "C",
      mode: "dorian",
      chord: cDorianI,
      accidentalStyle: "flat",
      positions: ["P1", "P2", "P3", "P4", "P5"],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 0,
      endFret: 12,
    });
    const aMarkers = markers.filter((m) => m.note === "A");
    expect(aMarkers.length).toBeGreaterThan(0);
    for (const m of aMarkers) {
      expect(m.isCharacteristic).toBe(true);
    }
    const cMarkers = markers.filter((m) => m.note === "C");
    for (const m of cMarkers) {
      expect(m.isCharacteristic).toBeFalsy();
    }
  });
});

describe("buildChordToneMarkers — tuning-agnostic invariant", () => {
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
    // buildChordToneMarkers must encode a note consistent with the tuning's
    // open string at that index. Catches any silent regression to a hardcoded
    // tuning.
    const rand = makeRandom(0xc001cafe);
    for (let iter = 0; iter < 20; iter++) {
      const tuning = randomTuning(rand);
      const markers = buildChordToneMarkers({
        tuning,
        key: "C",
        chord: null,
        accidentalStyle: "sharp",
        positions: ["P1", "P2", "P3", "P4", "P5"],
        showContext: true,
        enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
        startFret: 0,
        endFret: 12,
      });
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
