import { describe, it, expect } from "vitest";
import { getModalScaleNotes, parentMajorOf } from "./modes";

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
