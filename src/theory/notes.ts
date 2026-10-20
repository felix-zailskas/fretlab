export const CHROMATIC_SCALE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

// 12-tone chromatic note (sharp spelling). Derived from CHROMATIC_SCALE so
// the union stays in sync with the array.
export type ChromaticNote = (typeof CHROMATIC_SCALE)[number];

export const FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb"] as const;

const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const LETTER_PITCH_CLASS: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Resolves any spelled note (chromatic, flat enharmonic, theoretical letter
// names like E#/B#/Cb/Fb, double accidentals like F##/Bbb) to its pitch
// class 0-11. Returns -1 only when the first character isn't a letter.
export function getNoteIndex(note: string): number {
  // Fast path: chromatic sharp-form or single-flat enharmonic.
  const sharpName = FLAT_TO_SHARP[note] ?? note;
  const idx = CHROMATIC_SCALE.indexOf(sharpName as (typeof CHROMATIC_SCALE)[number]);
  if (idx !== -1) return idx;

  // Fallback: parse letter + accidental run for any other spelling.
  const base = LETTER_PITCH_CLASS[note[0]];
  if (base === undefined) return -1;
  let pitch = base;
  for (let i = 1; i < note.length; i++) {
    if (note[i] === "#") pitch += 1;
    else if (note[i] === "b") pitch -= 1;
  }
  return ((pitch % 12) + 12) % 12;
}

export function getNoteAtFret(openString: string, fret: number): ChromaticNote {
  const openIndex = getNoteIndex(openString);
  const noteIndex = (openIndex + fret) % 12;
  return CHROMATIC_SCALE[noteIndex];
}

export type AccidentalStyle = "sharp" | "flat";

// Natural accidental preference for each major-scale tonic.
// Sharp keys (1+ sharps in the signature):  G, D, A, E, B, F#, C#
// Flat keys  (1+ flats  in the signature):  F, Bb, Eb, Ab, Db, Gb, Cb
// Theoretical sharp keys (D#, G#, A#) fall back to the flat enharmonic's
// preference (Eb, Ab, Bb), since those are the keys players actually use.
// C major has no accidentals — returns null (callers preserve current style).
const NATURAL_ACCIDENTAL: Record<string, AccidentalStyle | null> = {
  C: null,
  "C#": "sharp",
  Db: "flat",
  D: "sharp",
  "D#": "flat",
  Eb: "flat",
  E: "sharp",
  F: "flat",
  "F#": "sharp",
  Gb: "flat",
  G: "sharp",
  "G#": "flat",
  Ab: "flat",
  A: "sharp",
  "A#": "flat",
  Bb: "flat",
  B: "sharp",
  Cb: "flat",
};

export function naturalAccidentalForKey(key: string): AccidentalStyle | null {
  return NATURAL_ACCIDENTAL[key] ?? null;
}

export function getDisplayName(
  note: string,
  key: string,
  accidentalStyle?: AccidentalStyle,
): string {
  // Normalize to sharp name first
  const sharpName = FLAT_TO_SHARP[note] ?? note;

  // Natural notes are always returned as-is
  if (!sharpName.includes("#")) {
    return sharpName;
  }

  // Explicit user preference wins over per-key inference
  if (accidentalStyle === "sharp") return sharpName;
  if (accidentalStyle === "flat") return SHARP_TO_FLAT[sharpName] ?? sharpName;

  const isFlatKey = (FLAT_KEYS as readonly string[]).includes(key);
  if (isFlatKey) {
    return SHARP_TO_FLAT[sharpName] ?? sharpName;
  }

  return sharpName;
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
type Letter = (typeof LETTERS)[number];
type Accidental = "" | "#" | "##" | "b" | "bb";

// A letter-correct note name: one of 7 letters plus at most a double
// accidental (35 values). Every scale and chord speller returns this type.
export type SpelledNote = `${Letter}${Accidental}`;

const LETTER_PITCH: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

// Spells `targetPitch` (0-11) on `letter`, adding the accidentals needed.
// Throws when that would take more than a double sharp or double flat.
function spellOnLetter(letter: Letter, targetPitch: number): SpelledNote {
  let delta = (targetPitch - LETTER_PITCH[letter] + 12) % 12;
  if (delta > 6) delta -= 12;
  if (Math.abs(delta) > 2) {
    throw new Error(
      `spellOnLetter: pitch class ${targetPitch} needs more than a double accidental on ${letter}`,
    );
  }
  const accidental = delta >= 0 ? "#".repeat(delta) : "b".repeat(-delta);
  return `${letter}${accidental}` as SpelledNote;
}

/**
 * Spell a diatonic scale using all 7 letter names, with accidentals
 * (#, b, ##, bb) as needed. The root's letter anchors the cycle.
 */
export function spellScale(
  root: SpelledNote,
  intervals: readonly number[],
): SpelledNote[] {
  const rootLetterIdx = LETTERS.indexOf(root[0] as Letter);
  const rootPitch = getNoteIndex(root);
  return intervals.map((interval, i) =>
    spellOnLetter(LETTERS[(rootLetterIdx + i) % 7], (rootPitch + interval) % 12),
  );
}

/**
 * Spell a chord stacked in thirds: chord tone i sits on the letter 2·i steps
 * above the root's letter, with accidentals added until it reaches
 * root + intervals[i]. Throws when a tone would need more than a double
 * accidental.
 */
export function spellChord(
  root: SpelledNote,
  intervals: readonly number[],
): SpelledNote[] {
  const rootLetterIdx = LETTERS.indexOf(root[0] as Letter);
  const rootPitch = getNoteIndex(root);
  return intervals.map((interval, i) =>
    spellOnLetter(LETTERS[(rootLetterIdx + 2 * i) % 7], (rootPitch + interval) % 12),
  );
}

/**
 * Returns a Map from pitch-class (0-11) to the diatonic spelling for that
 * pitch in (root, intervals). Useful for fretboard pipelines that render
 * in-scale notes — look up each marker's chromatic note-index and get the
 * key-and-mode-correct letter+accidentals back.
 */
export function buildDiatonicSpellingMap(
  root: SpelledNote,
  intervals: readonly number[],
): ReadonlyMap<number, SpelledNote> {
  const rootPitch = getNoteIndex(root);
  const spelled = spellScale(root, intervals);
  const map = new Map<number, SpelledNote>();
  intervals.forEach((iv, i) => {
    map.set((rootPitch + iv) % 12, spelled[i]);
  });
  return map;
}

export const ALL_NOTES_KEY = "all";
