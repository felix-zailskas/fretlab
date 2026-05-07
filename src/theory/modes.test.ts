import { describe, it, expect } from "vitest";
import {
  getModalScaleNotes,
  parentMajorOf,
  getModalIntervalRole,
  getCharacteristicNotes,
} from "./modes";
import { getIntervalRole } from "./scales";

describe("getModalScaleNotes", () => {
  it("returns C Ionian (= C major)", () => {
    expect(getModalScaleNotes("C", "ionian")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("returns C Dorian with flat spelling", () => {
    expect(getModalScaleNotes("C", "dorian", "flat")).toEqual([
      "C",
      "D",
      "Eb",
      "F",
      "G",
      "A",
      "Bb",
    ]);
  });

  it("returns C Phrygian with flat spelling", () => {
    expect(getModalScaleNotes("C", "phrygian", "flat")).toEqual([
      "C",
      "Db",
      "Eb",
      "F",
      "G",
      "Ab",
      "Bb",
    ]);
  });

  it("returns C Lydian with sharp spelling", () => {
    expect(getModalScaleNotes("C", "lydian", "sharp")).toEqual([
      "C",
      "D",
      "E",
      "F#",
      "G",
      "A",
      "B",
    ]);
  });

  it("returns C Mixolydian with flat spelling", () => {
    expect(getModalScaleNotes("C", "mixolydian", "flat")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "Bb",
    ]);
  });

  it("returns C Aeolian (= C natural minor) with flat spelling", () => {
    expect(getModalScaleNotes("C", "aeolian", "flat")).toEqual([
      "C",
      "D",
      "Eb",
      "F",
      "G",
      "Ab",
      "Bb",
    ]);
  });

  it("returns C Locrian with flat spelling", () => {
    expect(getModalScaleNotes("C", "locrian", "flat")).toEqual([
      "C",
      "Db",
      "Eb",
      "F",
      "Gb",
      "Ab",
      "Bb",
    ]);
  });

  it("returns D Dorian (parent C major)", () => {
    expect(getModalScaleNotes("D", "dorian")).toEqual([
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
      "C",
    ]);
  });

  it("returns F Lydian (parent C major)", () => {
    expect(getModalScaleNotes("F", "lydian")).toEqual([
      "F",
      "G",
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });

  it("Ionian output equals getMajorScaleNotes for representative keys", async () => {
    const { getMajorScaleNotes } = await import("./scales");
    for (const key of ["C", "G", "D", "F", "Bb", "Eb"]) {
      expect(getModalScaleNotes(key, "ionian")).toEqual(getMajorScaleNotes(key));
    }
  });
});

describe("parentMajorOf", () => {
  it("Ionian is identity for every tonic", () => {
    for (const key of ["C", "D", "F#", "Bb", "Eb"]) {
      expect(parentMajorOf(key, "ionian")).toBe(key);
    }
  });

  it("D Dorian's parent is C major", () => {
    expect(parentMajorOf("D", "dorian")).toBe("C");
  });

  it("E Phrygian's parent is C major", () => {
    expect(parentMajorOf("E", "phrygian")).toBe("C");
  });

  it("F Lydian's parent is C major", () => {
    expect(parentMajorOf("F", "lydian")).toBe("C");
  });

  it("G Mixolydian's parent is C major", () => {
    expect(parentMajorOf("G", "mixolydian")).toBe("C");
  });

  it("A Aeolian's parent is C major", () => {
    expect(parentMajorOf("A", "aeolian")).toBe("C");
  });

  it("B Locrian's parent is C major", () => {
    expect(parentMajorOf("B", "locrian")).toBe("C");
  });

  it("C Dorian's parent is Bb major (returns sharp-form A#)", () => {
    // parentMajorOf returns CHROMATIC_SCALE entries (sharp-form). Callers
    // that need flat spelling apply getDisplayName separately.
    expect(parentMajorOf("C", "dorian")).toBe("A#");
  });
});

describe("getModalIntervalRole", () => {
  it("returns 'root' for the modal tonic", () => {
    expect(getModalIntervalRole("C", "dorian", "C")).toBe("root");
    expect(getModalIntervalRole("D", "phrygian", "D")).toBe("root");
  });

  it("returns 'third' for the modal third (regardless of major/minor quality)", () => {
    // C Dorian: ♭3 = Eb (sharp form D#)
    expect(getModalIntervalRole("C", "dorian", "D#")).toBe("third");
    // C Lydian: 3 = E
    expect(getModalIntervalRole("C", "lydian", "E")).toBe("third");
  });

  it("returns 'seventh' for the modal seventh", () => {
    // C Mixolydian: ♭7 = Bb (sharp form A#)
    expect(getModalIntervalRole("C", "mixolydian", "A#")).toBe("seventh");
  });

  it("returns null for notes not in the mode", () => {
    // C Lydian has F# not F
    expect(getModalIntervalRole("C", "lydian", "F")).toBeNull();
    // C Phrygian has Db not D
    expect(getModalIntervalRole("C", "phrygian", "D")).toBeNull();
  });

  it("Ionian behaves identically to getIntervalRole", () => {
    for (const note of ["C", "D", "E", "F", "G", "A", "B", "C#", "F#"]) {
      expect(getModalIntervalRole("C", "ionian", note)).toBe(
        getIntervalRole("C", note),
      );
    }
  });
});

describe("getCharacteristicNotes", () => {
  it("returns [] for Ionian and Aeolian", () => {
    expect(getCharacteristicNotes("C", "ionian")).toEqual([]);
    expect(getCharacteristicNotes("D", "aeolian")).toEqual([]);
  });

  it("returns the natural 6 for Dorian", () => {
    // C Dorian's ♮6 is A
    expect(getCharacteristicNotes("C", "dorian")).toEqual(["A"]);
    // D Dorian's ♮6 is B
    expect(getCharacteristicNotes("D", "dorian")).toEqual(["B"]);
  });

  it("returns the ♭2 for Phrygian (Db with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "phrygian", "flat")).toEqual(["Db"]);
  });

  it("returns the ♯4 for Lydian (F# with sharp spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "lydian", "sharp")).toEqual(["F#"]);
  });

  it("returns the ♭7 for Mixolydian (Bb with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "mixolydian", "flat")).toEqual(["Bb"]);
  });

  it("returns the ♭5 for Locrian (Gb with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "locrian", "flat")).toEqual(["Gb"]);
  });
});
