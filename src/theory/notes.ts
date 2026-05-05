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

export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"] as const;

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

export function getNoteIndex(note: string): number {
  const sharpName = FLAT_TO_SHARP[note] ?? note;
  const index = CHROMATIC_SCALE.indexOf(sharpName as (typeof CHROMATIC_SCALE)[number]);
  return index;
}

export function getNoteAtFret(openString: string, fret: number): string {
  const openIndex = getNoteIndex(openString);
  const noteIndex = (openIndex + fret) % 12;
  return CHROMATIC_SCALE[noteIndex];
}

export type AccidentalStyle = "sharp" | "flat";

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
