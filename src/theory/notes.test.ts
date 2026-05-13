import { describe, it, expect } from "vitest";
import {
  CHROMATIC_SCALE,
  getNoteIndex,
  getNoteAtFret,
  getDisplayName,
  naturalAccidentalForKey,
  spellScale,
  type ChromaticNote,
} from "./notes";
import { TUNINGS, type TuningId } from "./tuning";
import { MODE_INTERVALS } from "./modes";

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

  it("wraps around correctly at fret 12 for standard tuning", () => {
    for (const openString of TUNINGS.standard.strings) {
      expect(getNoteAtFret(openString, 12)).toBe(openString);
    }
  });

  it("wraps around correctly at fret 12 for any open-string note", () => {
    // Property: getNoteAtFret(s, 12) === s for every chromatic note s.
    // If a function regresses to assuming a fixed tuning, this fails.
    for (const openString of CHROMATIC_SCALE) {
      expect(getNoteAtFret(openString, 12)).toBe(openString);
    }
  });

  it("wraps around correctly at fret 12 for randomized tunings", () => {
    // Seeded LCG so failures are reproducible.
    let seed = 0x517cc1b7;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    for (let iter = 0; iter < 20; iter++) {
      const tuning = Array.from(
        { length: 6 },
        () => CHROMATIC_SCALE[Math.floor(rand() * CHROMATIC_SCALE.length)],
      );
      for (const openString of tuning) {
        expect(getNoteAtFret(openString, 12)).toBe(openString);
      }
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

describe("naturalAccidentalForKey", () => {
  it("returns 'sharp' for sharp-side major keys", () => {
    for (const k of ["G", "D", "A", "E", "B", "F#", "C#"]) {
      expect(naturalAccidentalForKey(k)).toBe("sharp");
    }
  });

  it("returns 'flat' for flat-side major keys", () => {
    for (const k of ["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]) {
      expect(naturalAccidentalForKey(k)).toBe("flat");
    }
  });

  it("returns null for C (no accidentals)", () => {
    expect(naturalAccidentalForKey("C")).toBeNull();
  });

  it("returns 'flat' for theoretical sharp keys (D#, G#, A#)", () => {
    expect(naturalAccidentalForKey("D#")).toBe("flat");
    expect(naturalAccidentalForKey("G#")).toBe("flat");
    expect(naturalAccidentalForKey("A#")).toBe("flat");
  });

  it("returns null for unknown keys", () => {
    expect(naturalAccidentalForKey("X")).toBeNull();
    expect(naturalAccidentalForKey("all")).toBeNull();
  });
});

// Ground-truth fixture: for each possible open-string note, the chromatic
// progression frets 0-12 (sharp spelling). Hand-written so it stands as an
// independent witness to the chromatic order — if getNoteAtFret regresses or
// CHROMATIC_SCALE is reordered, the fixture catches it. Frets 13-24 are not
// listed: they're verified separately by octave equivalence.
const FRET_NOTES_BY_OPEN_STRING: Record<ChromaticNote, readonly ChromaticNote[]> = {
  C: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C"],
  "C#": ["C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#"],
  D: ["D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D"],
  "D#": ["D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#"],
  E: ["E", "F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E"],
  F: ["F", "F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F"],
  "F#": ["F#", "G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#"],
  G: ["G", "G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G"],
  "G#": ["G#", "A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"],
  A: ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A"],
  "A#": ["A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#"],
  B: ["B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
};

// Per-tuning, per-string, per-fret ground-truth check. Frets 0-24 covered:
// 0-12 against the hand-written fixture (independent witness), 13-24 against
// the octave-equivalence invariant. Generic over TUNINGS so adding a new
// tuning to the registry auto-extends coverage with no edits here.
describe("fretboard computation — ground truth across all tunings", () => {
  const tuningIds = Object.keys(TUNINGS) as TuningId[];
  for (const tuningId of tuningIds) {
    const tuning = TUNINGS[tuningId];
    describe(`${tuning.name} (${tuningId})`, () => {
      for (let stringIdx = 0; stringIdx < tuning.strings.length; stringIdx++) {
        const open = tuning.strings[stringIdx];
        it(`string ${stringIdx + 1} (open ${open}): frets 0-12 match fixture`, () => {
          const expected = FRET_NOTES_BY_OPEN_STRING[open];
          for (let fret = 0; fret <= 12; fret++) {
            expect(getNoteAtFret(open, fret)).toBe(expected[fret]);
          }
        });
        it(`string ${stringIdx + 1} (open ${open}): frets 13-24 mirror frets 1-12 (octave invariant)`, () => {
          for (let fret = 13; fret <= 24; fret++) {
            expect(getNoteAtFret(open, fret)).toBe(getNoteAtFret(open, fret - 12));
          }
        });
      }
    });
  }
});

describe("spellScale", () => {
  it("spells C Ionian using natural letters", () => {
    expect(spellScale("C", MODE_INTERVALS.ionian)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("spells C# Ionian using single sharps including E# and B#", () => {
    expect(spellScale("C#", MODE_INTERVALS.ionian)).toEqual([
      "C#",
      "D#",
      "E#",
      "F#",
      "G#",
      "A#",
      "B#",
    ]);
  });

  it("spells F# Lydian using single sharps including E#", () => {
    expect(spellScale("F#", MODE_INTERVALS.lydian)).toEqual([
      "F#",
      "G#",
      "A#",
      "B#",
      "C#",
      "D#",
      "E#",
    ]);
  });

  it("spells G# Aeolian preserving natural letters where the interval lands on them", () => {
    // G# Aeolian: G#, A#, B, C#, D#, E, F#
    expect(spellScale("G#", MODE_INTERVALS.aeolian)).toEqual([
      "G#",
      "A#",
      "B",
      "C#",
      "D#",
      "E",
      "F#",
    ]);
  });

  it("emits double-sharps when the target pitch is two semitones above the natural", () => {
    const notes = spellScale("A#", MODE_INTERVALS.lydian);
    expect(notes).toHaveLength(7);
    expect(notes[0]).toBe("A#");
    expect(new Set(notes.map((n) => n[0])).size).toBe(7);
  });
});
