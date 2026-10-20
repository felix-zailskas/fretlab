import { describe, it, expect } from "vitest";
import {
  borrowSourceMode,
  CHORD_TIERS,
  getChordMap,
  QUALITY_INTERVALS,
  resolveChordRef,
  sameChordRef,
  toggleChordRef,
  type ChordRowMode,
  type MapChord,
} from "./harmony";
import { getModalDiatonicTriads, MODE_INTERVALS, MODES } from "./modes";
import { CHROMATIC_SCALE, FLAT_KEYS, getNoteIndex } from "./notes";
import { ALL_NOTES_KEY } from "../components/KeySelector";

// Every key KeySelector can produce: the sharp-style list is CHROMATIC_SCALE,
// the flat-style list adds the FLAT_KEYS spellings (F is shared).
const OFFERED_KEYS: readonly string[] = [
  ...new Set([...CHROMATIC_SCALE, ...FLAT_KEYS]),
];
const ROW_MODES: readonly ChordRowMode[] = ["triads", "sevenths"];
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];

function lettersStackedInThirds(chord: MapChord): boolean {
  const rootIdx = LETTERS.indexOf(chord.notes[0][0]);
  return chord.notes.every((n, i) => n[0] === LETTERS[(rootIdx + 2 * i) % 7]);
}

describe("QUALITY_INTERVALS", () => {
  it("starts every quality on the root", () => {
    for (const intervals of Object.values(QUALITY_INTERVALS)) {
      expect(intervals[0]).toBe(0);
    }
  });
});

describe("borrowSourceMode", () => {
  for (const mode of MODES) {
    it(`${mode} borrows from the parallel mode with the opposite third`, () => {
      const expected = MODE_INTERVALS[mode][2] === 4 ? "aeolian" : "ionian";
      expect(borrowSourceMode(mode)).toBe(expected);
    });
  }
});

describe("getChordMap — structure across every key × mode × row mode", () => {
  for (const key of OFFERED_KEYS) {
    for (const mode of MODES) {
      for (const rowMode of ROW_MODES) {
        describe(`${key} ${mode} ${rowMode}`, () => {
          const map = getChordMap(key, mode, rowMode);
          const triads = getModalDiatonicTriads(key, mode);

          it("has 7 entries in every tier", () => {
            for (const tier of CHORD_TIERS) expect(map[tier]).toHaveLength(7);
          });

          it("stacks every chord's letters in thirds", () => {
            for (const tier of CHORD_TIERS) {
              for (const chord of map[tier]) {
                if (chord) expect(lettersStackedInThirds(chord)).toBe(true);
              }
            }
          });

          it("gives every chord the pitch classes of its quality", () => {
            for (const tier of CHORD_TIERS) {
              for (const chord of map[tier]) {
                if (!chord) continue;
                const root = getNoteIndex(chord.notes[0]);
                expect(chord.notes.map(getNoteIndex)).toEqual(
                  QUALITY_INTERVALS[chord.quality].map((iv) => (root + iv) % 12),
                );
              }
            }
          });

          it("omits secondary dominants exactly for degree 1 and diminished targets", () => {
            const missing = map.secondary.flatMap((c, i) => (c ? [] : [i + 1]));
            const expected = triads
              .filter((t) => t.degree === 1 || t.quality === "dim")
              .map((t) => t.degree);
            expect(missing).toEqual(expected);
          });

          it("roots each secondary dominant 7 semitones above its target", () => {
            map.secondary.forEach((chord, i) => {
              if (!chord) return;
              const target = getNoteIndex(map.diatonic[i]!.notes[0]);
              expect((getNoteIndex(chord.notes[0]) - target + 12) % 12).toBe(7);
            });
          });

          it("never repeats its column's diatonic chord in the borrowed tier", () => {
            map.borrowed.forEach((chord, i) => {
              if (!chord) return;
              const own = map.diatonic[i]!;
              const same =
                getNoteIndex(chord.notes[0]) === getNoteIndex(own.notes[0]) &&
                chord.quality === own.quality;
              expect(same).toBe(false);
            });
          });

          it("stamps each chord's ref with its tier and column", () => {
            for (const tier of CHORD_TIERS) {
              map[tier].forEach((chord, i) => {
                if (chord) expect(chord.ref).toEqual({ tier, degree: i + 1 });
              });
            }
          });
        });
      }
    }
  }
});

describe("getChordMap — hand-checked chords", () => {
  it("C Ionian sevenths: V7/ii is A7 = A C# E G", () => {
    const chord = getChordMap("C", "ionian", "sevenths").secondary[1];
    expect(chord).toMatchObject({
      romanNumeral: "V7/ii",
      symbol: "A7",
      quality: "7",
      notes: ["A", "C#", "E", "G"],
    });
  });

  it("C Ionian triads: ♭VI is Ab = Ab C Eb", () => {
    const chord = getChordMap("C", "ionian", "triads").borrowed[5];
    expect(chord).toMatchObject({
      romanNumeral: "♭VI",
      symbol: "Ab",
      notes: ["Ab", "C", "Eb"],
    });
  });

  it("A Aeolian triads: borrowed IV is D = D F# A", () => {
    const chord = getChordMap("A", "aeolian", "triads").borrowed[3];
    expect(chord).toMatchObject({ romanNumeral: "IV", notes: ["D", "F#", "A"] });
  });

  it("C Ionian triads: V/V is D = D F# A", () => {
    const chord = getChordMap("C", "ionian", "triads").secondary[4];
    expect(chord).toMatchObject({
      romanNumeral: "V/V",
      symbol: "D",
      quality: "maj",
      notes: ["D", "F#", "A"],
    });
  });

  it("C Ionian triads: V/IV is still shown although it equals the I chord", () => {
    expect(getChordMap("C", "ionian", "triads").secondary[3]?.symbol).toBe("C");
  });

  it("C Dorian triads: borrowed columns 2 and 4 are empty (Dm and F are shared)", () => {
    const borrowed = getChordMap("C", "dorian", "triads").borrowed;
    expect(borrowed.map((c) => c?.symbol ?? null)).toEqual([
      "C",
      null,
      "Em",
      null,
      "G",
      "Am",
      "B°",
    ]);
  });

  it("A# Lydian: V7/vii respells D##7 from its enharmonic E", () => {
    const chord = getChordMap("A#", "lydian", "sevenths").secondary[6];
    expect(chord?.notes).toEqual(["E", "G#", "B", "D"]);
  });
});

describe("resolveChordRef", () => {
  it("returns the map chord for a ref", () => {
    expect(
      resolveChordRef({ tier: "secondary", degree: 2 }, "C", "ionian", "sevenths")
        ?.symbol,
    ).toBe("A7");
  });

  it("returns null for an empty cell", () => {
    expect(
      resolveChordRef({ tier: "secondary", degree: 1 }, "C", "ionian", "triads"),
    ).toBeNull();
  });

  it("returns null for the All key", () => {
    expect(
      resolveChordRef(
        { tier: "diatonic", degree: 1 },
        ALL_NOTES_KEY,
        "ionian",
        "triads",
      ),
    ).toBeNull();
  });

  it("returns null for a degree outside 1-7", () => {
    expect(
      resolveChordRef({ tier: "diatonic", degree: 8 }, "C", "ionian", "triads"),
    ).toBeNull();
  });
});

describe("sameChordRef / toggleChordRef", () => {
  it("treats refs with equal tier and degree as the same", () => {
    expect(
      sameChordRef({ tier: "borrowed", degree: 6 }, { tier: "borrowed", degree: 6 }),
    ).toBe(true);
  });

  it("distinguishes refs in different tiers", () => {
    expect(
      sameChordRef({ tier: "diatonic", degree: 5 }, { tier: "secondary", degree: 5 }),
    ).toBe(false);
  });

  it("selects a new ref", () => {
    expect(toggleChordRef(null, { tier: "diatonic", degree: 2 })).toEqual({
      tier: "diatonic",
      degree: 2,
    });
  });

  it("clears the selection when the selected ref is picked again", () => {
    expect(
      toggleChordRef({ tier: "diatonic", degree: 2 }, { tier: "diatonic", degree: 2 }),
    ).toBeNull();
  });
});
