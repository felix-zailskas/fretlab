import { describe, it, expect } from "vitest";
import { getNoteIndex, getNoteAtFret, getDisplayName, STANDARD_TUNING } from "./notes";

describe("getNoteIndex", () => {
  it("returns correct index for natural notes", () => {
    expect(getNoteIndex("C")).toBe(0);
    expect(getNoteIndex("D")).toBe(2);
    expect(getNoteIndex("E")).toBe(4);
    expect(getNoteIndex("F")).toBe(5);
    expect(getNoteIndex("G")).toBe(7);
    expect(getNoteIndex("A")).toBe(9);
    expect(getNoteIndex("B")).toBe(11);
  });

  it("returns correct index for sharp notes", () => {
    expect(getNoteIndex("C#")).toBe(1);
    expect(getNoteIndex("F#")).toBe(6);
  });

  it("returns correct index for flat notes", () => {
    expect(getNoteIndex("Db")).toBe(1);
    expect(getNoteIndex("Eb")).toBe(3);
    expect(getNoteIndex("Gb")).toBe(6);
    expect(getNoteIndex("Ab")).toBe(8);
    expect(getNoteIndex("Bb")).toBe(10);
  });
});

describe("getNoteAtFret", () => {
  it("returns open string notes for fret 0", () => {
    expect(getNoteAtFret("E", 0)).toBe("E");
    expect(getNoteAtFret("A", 0)).toBe("A");
    expect(getNoteAtFret("D", 0)).toBe("D");
    expect(getNoteAtFret("G", 0)).toBe("G");
    expect(getNoteAtFret("B", 0)).toBe("B");
  });

  it("calculates notes correctly on the low E string", () => {
    expect(getNoteAtFret("E", 1)).toBe("F");
    expect(getNoteAtFret("E", 2)).toBe("F#");
    expect(getNoteAtFret("E", 3)).toBe("G");
    expect(getNoteAtFret("E", 5)).toBe("A");
    expect(getNoteAtFret("E", 7)).toBe("B");
    expect(getNoteAtFret("E", 12)).toBe("E");
  });

  it("calculates notes correctly on the A string", () => {
    expect(getNoteAtFret("A", 2)).toBe("B");
    expect(getNoteAtFret("A", 3)).toBe("C");
    expect(getNoteAtFret("A", 5)).toBe("D");
    expect(getNoteAtFret("A", 7)).toBe("E");
    expect(getNoteAtFret("A", 12)).toBe("A");
  });

  it("calculates notes correctly on the B string", () => {
    expect(getNoteAtFret("B", 1)).toBe("C");
    expect(getNoteAtFret("B", 3)).toBe("D");
    expect(getNoteAtFret("B", 5)).toBe("E");
  });

  it("wraps around correctly at fret 12", () => {
    // Fret 12 = same note as open string
    for (const openString of STANDARD_TUNING) {
      expect(getNoteAtFret(openString, 12)).toBe(openString);
    }
  });
});

describe("getDisplayName", () => {
  it("returns sharp names for sharp keys", () => {
    expect(getDisplayName("C#", "C")).toBe("C#");
    expect(getDisplayName("F#", "G")).toBe("F#");
    expect(getDisplayName("G#", "A")).toBe("G#");
  });

  it("returns flat names for flat keys", () => {
    expect(getDisplayName("C#", "F")).toBe("Db");
    expect(getDisplayName("D#", "Bb")).toBe("Eb");
    expect(getDisplayName("G#", "Eb")).toBe("Ab");
    expect(getDisplayName("A#", "F")).toBe("Bb");
  });

  it("returns natural notes unchanged regardless of key", () => {
    expect(getDisplayName("C", "F")).toBe("C");
    expect(getDisplayName("E", "G")).toBe("E");
    expect(getDisplayName("C", "C")).toBe("C");
  });

  it("handles flat input notes in sharp keys", () => {
    // If someone passes 'Db' but key is 'G' (sharp key), return 'C#'
    expect(getDisplayName("Db", "G")).toBe("C#");
    expect(getDisplayName("Gb", "D")).toBe("F#");
  });

  it('forces sharps when accidentalStyle="sharp" overrides a flat key', () => {
    expect(getDisplayName("C#", "F", "sharp")).toBe("C#");
    expect(getDisplayName("Db", "F", "sharp")).toBe("C#");
    expect(getDisplayName("Bb", "F", "sharp")).toBe("A#");
  });

  it('forces flats when accidentalStyle="flat" overrides a sharp key', () => {
    expect(getDisplayName("C#", "G", "flat")).toBe("Db");
    expect(getDisplayName("F#", "D", "flat")).toBe("Gb");
    expect(getDisplayName("A#", "C", "flat")).toBe("Bb");
  });

  it("falls back to per-key inference when accidentalStyle is undefined", () => {
    expect(getDisplayName("C#", "F")).toBe("Db");
    expect(getDisplayName("C#", "G")).toBe("C#");
  });
});
