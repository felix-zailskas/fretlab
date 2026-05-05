import { describe, it, expect } from "vitest";
import {
  getMajorScaleNotes,
  getIntervalRole,
  getDiatonicChords,
  getDiatonicTriads,
  MAJOR_SCALE_INTERVALS,
  MAJOR_SCALE_STEPS,
} from "./scales";

describe("MAJOR_SCALE_INTERVALS", () => {
  it("has correct semitone pattern", () => {
    expect(MAJOR_SCALE_INTERVALS).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
});

describe("getMajorScaleNotes", () => {
  it("returns C major scale", () => {
    expect(getMajorScaleNotes("C")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("returns G major scale", () => {
    expect(getMajorScaleNotes("G")).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
  });

  it("returns D major scale", () => {
    expect(getMajorScaleNotes("D")).toEqual(["D", "E", "F#", "G", "A", "B", "C#"]);
  });

  it("returns F major scale (flat key)", () => {
    expect(getMajorScaleNotes("F")).toEqual(["F", "G", "A", "Bb", "C", "D", "E"]);
  });

  it("returns Bb major scale", () => {
    expect(getMajorScaleNotes("Bb")).toEqual(["Bb", "C", "D", "Eb", "F", "G", "A"]);
  });

  it("returns Eb major scale", () => {
    expect(getMajorScaleNotes("Eb")).toEqual(["Eb", "F", "G", "Ab", "Bb", "C", "D"]);
  });

  it("returns Ab major scale", () => {
    expect(getMajorScaleNotes("Ab")).toEqual(["Ab", "Bb", "C", "Db", "Eb", "F", "G"]);
  });

  it("returns all 12 major scales with 7 notes each", () => {
    const keys = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    for (const key of keys) {
      const scale = getMajorScaleNotes(key);
      expect(scale).toHaveLength(7);
      expect(scale[0]).toBe(key);
    }
  });

  it("respects sharp accidentalStyle for a flat-keyed scale", () => {
    expect(getMajorScaleNotes("F", "sharp")).toEqual([
      "F",
      "G",
      "A",
      "A#",
      "C",
      "D",
      "E",
    ]);
  });

  it("respects flat accidentalStyle for a sharp-keyed scale", () => {
    expect(getMajorScaleNotes("G", "flat")).toEqual([
      "G",
      "A",
      "B",
      "C",
      "D",
      "E",
      "Gb",
    ]);
  });
});

describe("MAJOR_SCALE_STEPS", () => {
  it("matches the W W H W W W H pattern", () => {
    expect(MAJOR_SCALE_STEPS).toEqual([
      "whole",
      "whole",
      "half",
      "whole",
      "whole",
      "whole",
      "half",
    ]);
  });
});

describe("getDiatonicChords", () => {
  it("returns the 7 diatonic seventh chords for C major", () => {
    const chords = getDiatonicChords("C");
    expect(chords).toHaveLength(7);
    expect(chords[0]).toMatchObject({
      romanNumeral: "Imaj7",
      quality: "maj7",
      symbol: "Cmaj7",
      notes: ["C", "E", "G", "B"],
    });
    expect(chords[1]).toMatchObject({
      romanNumeral: "ii7",
      quality: "m7",
      symbol: "Dm7",
      notes: ["D", "F", "A", "C"],
    });
    expect(chords[4]).toMatchObject({
      romanNumeral: "V7",
      quality: "7",
      symbol: "G7",
      notes: ["G", "B", "D", "F"],
    });
    expect(chords[5]).toMatchObject({
      romanNumeral: "vi7",
      quality: "m7",
      symbol: "Am7",
      notes: ["A", "C", "E", "G"],
    });
    expect(chords[6]).toMatchObject({
      romanNumeral: "viiø7",
      quality: "m7b5",
      symbol: "Bm7b5",
      notes: ["B", "D", "F", "A"],
    });
  });

  it("returns correct seventh chords for G major (sharps)", () => {
    const chords = getDiatonicChords("G");
    expect(chords[0].symbol).toBe("Gmaj7");
    expect(chords[0].notes).toEqual(["G", "B", "D", "F#"]);
    expect(chords[4].symbol).toBe("D7");
    expect(chords[6].symbol).toBe("F#m7b5");
    expect(chords[6].notes).toEqual(["F#", "A", "C", "E"]);
  });

  it("returns correct seventh chords for F major (flats)", () => {
    const chords = getDiatonicChords("F");
    expect(chords[0].symbol).toBe("Fmaj7");
    expect(chords[3].symbol).toBe("Bbmaj7");
    expect(chords[3].notes).toEqual(["Bb", "D", "F", "A"]);
    expect(chords[4].symbol).toBe("C7");
    expect(chords[6].symbol).toBe("Em7b5");
  });

  it("respects accidentalStyle override", () => {
    const chords = getDiatonicChords("F", "sharp");
    expect(chords[3].symbol).toBe("A#maj7");
    expect(chords[3].notes).toEqual(["A#", "D", "F", "A"]);
  });
});

describe("getIntervalRole", () => {
  it("identifies root in C major", () => {
    expect(getIntervalRole("C", "C")).toBe("root");
  });

  it("identifies all intervals in C major", () => {
    expect(getIntervalRole("C", "C")).toBe("root");
    expect(getIntervalRole("C", "D")).toBe("second");
    expect(getIntervalRole("C", "E")).toBe("third");
    expect(getIntervalRole("C", "F")).toBe("fourth");
    expect(getIntervalRole("C", "G")).toBe("fifth");
    expect(getIntervalRole("C", "A")).toBe("sixth");
    expect(getIntervalRole("C", "B")).toBe("seventh");
  });

  it("identifies intervals in G major", () => {
    expect(getIntervalRole("G", "G")).toBe("root");
    expect(getIntervalRole("G", "B")).toBe("third");
    expect(getIntervalRole("G", "D")).toBe("fifth");
    expect(getIntervalRole("G", "F#")).toBe("seventh");
  });

  it("returns null for notes outside the scale", () => {
    expect(getIntervalRole("C", "C#")).toBeNull();
    expect(getIntervalRole("C", "Eb")).toBeNull();
    expect(getIntervalRole("G", "Bb")).toBeNull();
  });

  it("handles enharmonic equivalents", () => {
    // F# in G major = seventh, should also work if passed as Gb
    expect(getIntervalRole("G", "Gb")).toBe("seventh");
  });
});

describe("getDiatonicTriads", () => {
  it("returns the 7 diatonic triads for C major", () => {
    const triads = getDiatonicTriads("C");
    expect(triads).toHaveLength(7);
    expect(triads[0]).toMatchObject({
      degree: 1,
      romanNumeral: "I",
      quality: "maj",
      symbol: "C",
      notes: ["C", "E", "G"],
    });
    expect(triads[1]).toMatchObject({
      degree: 2,
      romanNumeral: "ii",
      quality: "min",
      symbol: "Dm",
      notes: ["D", "F", "A"],
    });
    expect(triads[2]).toMatchObject({
      degree: 3,
      romanNumeral: "iii",
      quality: "min",
      symbol: "Em",
      notes: ["E", "G", "B"],
    });
    expect(triads[3]).toMatchObject({
      degree: 4,
      romanNumeral: "IV",
      quality: "maj",
      symbol: "F",
      notes: ["F", "A", "C"],
    });
    expect(triads[4]).toMatchObject({
      degree: 5,
      romanNumeral: "V",
      quality: "maj",
      symbol: "G",
      notes: ["G", "B", "D"],
    });
    expect(triads[5]).toMatchObject({
      degree: 6,
      romanNumeral: "vi",
      quality: "min",
      symbol: "Am",
      notes: ["A", "C", "E"],
    });
    expect(triads[6]).toMatchObject({
      degree: 7,
      romanNumeral: "vii°",
      quality: "dim",
      symbol: "B°",
      notes: ["B", "D", "F"],
    });
  });

  it("returns correct triads for G major (sharps)", () => {
    const triads = getDiatonicTriads("G");
    expect(triads[0].symbol).toBe("G");
    expect(triads[0].notes).toEqual(["G", "B", "D"]);
    expect(triads[4].symbol).toBe("D");
    expect(triads[6].symbol).toBe("F#°");
    expect(triads[6].notes).toEqual(["F#", "A", "C"]);
  });

  it("returns correct triads for F major (flats)", () => {
    const triads = getDiatonicTriads("F");
    expect(triads[0].symbol).toBe("F");
    expect(triads[3].symbol).toBe("Bb");
    expect(triads[3].notes).toEqual(["Bb", "D", "F"]);
    expect(triads[6].symbol).toBe("E°");
    expect(triads[6].notes).toEqual(["E", "G", "Bb"]);
  });

  it("respects accidentalStyle override (sharp on a flat-keyed scale)", () => {
    const triads = getDiatonicTriads("F", "sharp");
    expect(triads[3].symbol).toBe("A#");
    expect(triads[3].notes).toEqual(["A#", "D", "F"]);
  });

  it("respects accidentalStyle override (flat on a sharp-keyed scale)", () => {
    const triads = getDiatonicTriads("G", "flat");
    expect(triads[6].symbol).toBe("Gb°");
    expect(triads[6].notes).toEqual(["Gb", "A", "C"]);
  });
});
