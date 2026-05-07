import { describe, it, expect } from "vitest";
import { getModalScaleNotes } from "./modes";

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
