import type { CagedShape } from "../theory/positions";
import type { VoicingSystem } from "../theory/chordShapes";

// Hand-written wording for the search pages. Facts (notes, frets) are
// computed in pages.ts from src/theory; only words live here.

export const SCALE_NAMES: Record<
  string,
  { title: string; text: string; isBox: boolean }
> = {
  "minor-pentatonic": {
    title: "Minor Pentatonic",
    text: "minor pentatonic",
    isBox: true,
  },
  "major-pentatonic": {
    title: "Major Pentatonic",
    text: "major pentatonic",
    isBox: true,
  },
  ionian: { title: "Major Scale", text: "major scale", isBox: false },
  dorian: { title: "Dorian Mode", text: "Dorian mode", isBox: false },
  phrygian: { title: "Phrygian Mode", text: "Phrygian mode", isBox: false },
  lydian: { title: "Lydian Mode", text: "Lydian mode", isBox: false },
  mixolydian: { title: "Mixolydian Mode", text: "Mixolydian mode", isBox: false },
  aeolian: { title: "Natural Minor Scale", text: "natural minor scale", isBox: false },
  locrian: { title: "Locrian Mode", text: "Locrian mode", isBox: false },
};

// Where the tonic sits in each shape, the way teachers describe it.
export const SHAPE_ROOTS: Record<CagedShape, { string: number; text: string }> = {
  E: { string: 6, text: "root on the 6th string under the index finger" },
  D: { string: 4, text: "root on the 4th string" },
  C: { string: 5, text: "root on the 5th string under the ring finger" },
  A: { string: 5, text: "root on the 5th string under the index finger" },
  G: { string: 6, text: "root on the 6th string under the pinky" },
};

export const TRIAD_NAMES: Record<string, string> = {
  major: "Major",
  minor: "Minor",
  diminished: "Diminished",
};

export const SEVENTH_NAMES: Record<string, { title: string; text: string }> = {
  maj7: { title: "Maj7", text: "major 7th" },
  m7: { title: "m7", text: "minor 7th" },
  "7": { title: "Dominant 7", text: "dominant 7th" },
  m7b5: { title: "m7b5", text: "half-diminished (m7♭5)" },
};

export const VOICING_NAMES: Record<VoicingSystem, { title: string; how: string }> = {
  close: {
    title: "Close",
    how: "close voicings stack the four notes in thirds within one octave",
  },
  drop2: {
    title: "Drop 2",
    how: "drop 2 takes the second-highest note of a close voicing down an octave, giving grips on four adjacent strings",
  },
  drop3: {
    title: "Drop 3",
    how: "drop 3 takes the third-highest note down an octave, so the grip skips one string",
  },
  "drop2-4": {
    title: "Drop 2&4",
    how: "drop 2&4 takes the second- and fourth-highest notes down an octave, spreading the grip over a skipped string",
  },
};

export const SITE = "https://fretlab.studio";
export const BRAND = " | Fretlab";
