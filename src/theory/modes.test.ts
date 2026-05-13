import { describe, it, expect } from "vitest";
import {
  getModalScaleNotes,
  parentMajorOf,
  getModalIntervalRole,
  getCharacteristicNotes,
  getCharacteristicNoteIndexSet,
  getModalDiatonicTriads,
  getModalDiatonicChords,
  naturalAccidentalForKeyMode,
  MODES,
  MODE_INTERVALS,
  MODE_DEGREE_LABELS,
  type Mode,
} from "./modes";
import { CHROMATIC_SCALE, getNoteIndex } from "./notes";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

// Test helper — converts a spelled note (e.g. "B#", "Cbb") to its pitch class.
function spelledPitch(note: string): number {
  const letter = note[0] as (typeof LETTERS)[number];
  const accidentals = note.slice(1);
  const letterPitch: Record<(typeof LETTERS)[number], number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let pitch = letterPitch[letter];
  for (const ch of accidentals) {
    if (ch === "#") pitch += 1;
    else if (ch === "b") pitch -= 1;
  }
  return ((pitch % 12) + 12) % 12;
}
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
    expect(getModalScaleNotes("C", "dorian")).toEqual([
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
    expect(getModalScaleNotes("C", "phrygian")).toEqual([
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
    expect(getModalScaleNotes("C", "lydian")).toEqual([
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
    expect(getModalScaleNotes("C", "mixolydian")).toEqual([
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
    expect(getModalScaleNotes("C", "aeolian")).toEqual([
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
    expect(getModalScaleNotes("C", "locrian")).toEqual([
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
    expect(getCharacteristicNotes("C", "phrygian")).toEqual(["Db"]);
  });

  it("returns the ♯4 for Lydian (F# with sharp spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "lydian")).toEqual(["F#"]);
  });

  it("returns the ♭7 for Mixolydian (Bb with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "mixolydian")).toEqual(["Bb"]);
  });

  it("returns the ♭5 for Locrian (Gb with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "locrian")).toEqual(["Gb"]);
  });
});

describe("getCharacteristicNoteIndexSet", () => {
  it("returns an empty set for Ionian", () => {
    expect(getCharacteristicNoteIndexSet("C", "ionian").size).toBe(0);
  });

  it("returns the natural-6 chromatic index for C Dorian", () => {
    // C Dorian's ♮6 is A; getNoteIndex('A') === 9
    const set = getCharacteristicNoteIndexSet("C", "dorian");
    expect(set.has(9)).toBe(true);
    expect(set.size).toBe(1);
  });

  it("returns the ♭2 index for C Phrygian", () => {
    // Db = C# = chromatic index 1
    const set = getCharacteristicNoteIndexSet("C", "phrygian");
    expect(set.has(1)).toBe(true);
  });
});

describe("getModalDiatonicTriads", () => {
  it("C Dorian triads (i, ii, ♭III, IV, v, vi°, ♭VII)", () => {
    const triads = getModalDiatonicTriads("C", "dorian");
    expect(triads.map((t) => t.symbol)).toEqual([
      "Cm",
      "Dm",
      "Eb",
      "F",
      "Gm",
      "A°",
      "Bb",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "i",
      "ii",
      "♭III",
      "IV",
      "v",
      "vi°",
      "♭VII",
    ]);
    expect(triads.map((t) => t.quality)).toEqual([
      "min",
      "min",
      "maj",
      "maj",
      "min",
      "dim",
      "maj",
    ]);
  });

  it("C Phrygian triad qualities (i, ♭II, ♭III, iv, v°, ♭VI, ♭vii)", () => {
    const triads = getModalDiatonicTriads("C", "phrygian");
    expect(triads.map((t) => t.quality)).toEqual([
      "min",
      "maj",
      "maj",
      "min",
      "dim",
      "maj",
      "min",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "i",
      "♭II",
      "♭III",
      "iv",
      "v°",
      "♭VI",
      "♭vii",
    ]);
  });

  it("C Lydian triad qualities (I, II, iii, ♯iv°, V, vi, vii)", () => {
    const triads = getModalDiatonicTriads("C", "lydian");
    expect(triads.map((t) => t.quality)).toEqual([
      "maj",
      "maj",
      "min",
      "dim",
      "maj",
      "min",
      "min",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "I",
      "II",
      "iii",
      "♯iv°",
      "V",
      "vi",
      "vii",
    ]);
  });

  it("C Locrian triad qualities (i°, ♭II, ♭iii, iv, ♭V, ♭VI, ♭vii)", () => {
    const triads = getModalDiatonicTriads("C", "locrian");
    expect(triads.map((t) => t.quality)).toEqual([
      "dim",
      "maj",
      "min",
      "min",
      "maj",
      "maj",
      "min",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "i°",
      "♭II",
      "♭iii",
      "iv",
      "♭V",
      "♭VI",
      "♭vii",
    ]);
  });
});

describe("getModalDiatonicChords", () => {
  it("C Dorian sevenths (i7, ii7, ♭IIImaj7, IV7, v7, viø7, ♭VIImaj7)", () => {
    const chords = getModalDiatonicChords("C", "dorian");
    expect(chords.map((c) => c.symbol)).toEqual([
      "Cm7",
      "Dm7",
      "Ebmaj7",
      "F7",
      "Gm7",
      "Am7b5",
      "Bbmaj7",
    ]);
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "i7",
      "ii7",
      "♭IIImaj7",
      "IV7",
      "v7",
      "viø7",
      "♭VIImaj7",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "m7",
      "m7",
      "maj7",
      "7",
      "m7",
      "m7b5",
      "maj7",
    ]);
  });

  it("C Lydian sevenths qualities (maj7, 7, m7, m7b5, maj7, m7, m7)", () => {
    const chords = getModalDiatonicChords("C", "lydian");
    expect(chords.map((c) => c.quality)).toEqual([
      "maj7",
      "7",
      "m7",
      "m7b5",
      "maj7",
      "m7",
      "m7",
    ]);
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "Imaj7",
      "II7",
      "iii7",
      "♯ivø7",
      "Vmaj7",
      "vi7",
      "vii7",
    ]);
  });

  it("C Mixolydian sevenths (I7, ii7, iiiø7, IVmaj7, v7, vi7, ♭VIImaj7)", () => {
    const chords = getModalDiatonicChords("C", "mixolydian");
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "I7",
      "ii7",
      "iiiø7",
      "IVmaj7",
      "v7",
      "vi7",
      "♭VIImaj7",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "7",
      "m7",
      "m7b5",
      "maj7",
      "m7",
      "m7",
      "maj7",
    ]);
  });

  it("C Locrian sevenths (iø7, ♭IImaj7, ♭iii7, iv7, ♭Vmaj7, ♭VI7, ♭vii7)", () => {
    const chords = getModalDiatonicChords("C", "locrian");
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "iø7",
      "♭IImaj7",
      "♭iii7",
      "iv7",
      "♭Vmaj7",
      "♭VI7",
      "♭vii7",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "m7b5",
      "maj7",
      "m7",
      "m7",
      "maj7",
      "7",
      "m7",
    ]);
  });
});

describe("naturalAccidentalForKeyMode", () => {
  it("D Lydian's parent (A major) prefers sharps", () => {
    expect(naturalAccidentalForKeyMode("D", "lydian")).toBe("sharp");
  });

  it("D Phrygian's parent (Bb major) prefers flats", () => {
    expect(naturalAccidentalForKeyMode("D", "phrygian")).toBe("flat");
  });

  it("D Dorian's parent (C major) is neutral — returns null", () => {
    expect(naturalAccidentalForKeyMode("D", "dorian")).toBeNull();
  });

  it("Ionian preserves the input key's preference", () => {
    expect(naturalAccidentalForKeyMode("F", "ionian")).toBe("flat");
    expect(naturalAccidentalForKeyMode("G", "ionian")).toBe("sharp");
    expect(naturalAccidentalForKeyMode("C", "ionian")).toBeNull();
  });

  it("F Lydian's parent (C major) is neutral", () => {
    expect(naturalAccidentalForKeyMode("F", "lydian")).toBeNull();
  });
});

describe("getModalScaleNotes — structural correctness across all 84 scales", () => {
  for (const root of CHROMATIC_SCALE) {
    for (const mode of MODES) {
      it(`${root} ${mode}: 7 notes, 7 distinct letters, correct pitches`, () => {
        const notes = getModalScaleNotes(root, mode);
        const rootPitch = getNoteIndex(root);
        const rootLetterIdx = LETTERS.indexOf(root[0] as (typeof LETTERS)[number]);

        expect(notes).toHaveLength(7);

        const letters = notes.map((n) => n[0]);
        const expectedLetters = Array.from(
          { length: 7 },
          (_, i) => LETTERS[(rootLetterIdx + i) % 7],
        );
        expect(letters).toEqual(expectedLetters);

        const pitches = notes.map(spelledPitch);
        const expectedPitches = MODE_INTERVALS[mode].map((iv) => (rootPitch + iv) % 12);
        expect(pitches).toEqual(expectedPitches);
      });
    }
  }
});

describe("getModalScaleNotes — canonical pinned spellings", () => {
  it.each([
    ["C#", "ionian", ["C#", "D#", "E#", "F#", "G#", "A#", "B#"]],
    ["F#", "ionian", ["F#", "G#", "A#", "B", "C#", "D#", "E#"]],
    ["F#", "lydian", ["F#", "G#", "A#", "B#", "C#", "D#", "E#"]],
    ["E", "phrygian", ["E", "F", "G", "A", "B", "C", "D"]],
    ["G#", "aeolian", ["G#", "A#", "B", "C#", "D#", "E", "F#"]],
    ["D#", "dorian", ["D#", "E#", "F#", "G#", "A#", "B#", "C#"]],
    ["B", "ionian", ["B", "C#", "D#", "E", "F#", "G#", "A#"]],
    ["A#", "phrygian", ["A#", "B", "C#", "D#", "E#", "F#", "G#"]],
  ] as const)("%s %s spells correctly", (root, mode, expected) => {
    expect(getModalScaleNotes(root, mode as Mode)).toEqual(expected);
  });
});

describe("MODE_DEGREE_LABELS agrees with MODE_INTERVALS", () => {
  const INTERVAL_TO_LABEL: Record<number, string> = {
    0: "1",
    1: "♭2",
    2: "2",
    3: "♭3",
    4: "3",
    5: "4",
    6: "♭5",
    7: "5",
    8: "♭6",
    9: "6",
    10: "♭7",
    11: "7",
  };
  // Lydian is the one mode whose 4 is sharp rather than flat. INTERVAL_TO_LABEL
  // can't distinguish ♯4 from ♭5 from interval alone, so patch position 3 for
  // Lydian.
  const expectedLabel = (mode: string, interval: number, position: number) => {
    if (mode === "lydian" && position === 3) return "♯4";
    return INTERVAL_TO_LABEL[interval];
  };

  for (const mode of MODES) {
    it(`${mode}`, () => {
      const derived = MODE_INTERVALS[mode].map((iv, i) => expectedLabel(mode, iv, i));
      expect(MODE_DEGREE_LABELS[mode]).toEqual(derived);
    });
  }
});
