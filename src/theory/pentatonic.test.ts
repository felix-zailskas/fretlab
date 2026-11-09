import { describe, it, expect } from "vitest";
import {
  PENTATONIC_DROPPED_DEGREES,
  getPentatonicPitchClasses,
  isPentatonicAvailable,
} from "./pentatonic";
import { MODES, MODE_INTERVALS, type Mode } from "./modes";
import { CHROMATIC_SCALE, getNoteIndex } from "./notes";

const pcs = (notes: string[]) => new Set(notes.map(getNoteIndex));
const pentatonicModes = Object.keys(PENTATONIC_DROPPED_DEGREES) as Mode[];

describe("getPentatonicPitchClasses", () => {
  for (const mode of pentatonicModes) {
    for (const key of CHROMATIC_SCALE) {
      it(`${key} ${mode} has 5 pitch classes inside the 7-note mode`, () => {
        const penta = getPentatonicPitchClasses(key, mode);
        const root = getNoteIndex(key);
        const full = new Set(MODE_INTERVALS[mode].map((i) => (root + i) % 12));
        expect(penta.size).toBe(5);
        for (const pc of penta) expect(full.has(pc)).toBe(true);
      });
    }
  }

  it("C ionian is C major pentatonic (C D E G A)", () => {
    expect(getPentatonicPitchClasses("C", "ionian")).toEqual(
      pcs(["C", "D", "E", "G", "A"]),
    );
  });

  it("A aeolian is A minor pentatonic (A C D E G)", () => {
    expect(getPentatonicPitchClasses("A", "aeolian")).toEqual(
      pcs(["A", "C", "D", "E", "G"]),
    );
  });

  it("returns an empty set for modes without a pentatonic", () => {
    expect(getPentatonicPitchClasses("D", "dorian").size).toBe(0);
  });
});

describe("isPentatonicAvailable", () => {
  for (const mode of MODES) {
    it(`${mode} → ${mode === "ionian" || mode === "aeolian"}`, () => {
      expect(isPentatonicAvailable(mode)).toBe(mode === "ionian" || mode === "aeolian");
    });
  }
});
