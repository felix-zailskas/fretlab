import type { SeventhStringSet, VoicingSystem } from "../theory/chordShapes";
import type { SeventhStringPosition } from "./useChordShapesState";

// Each system's mapping from position → its concrete string-set id. drop-3 and
// drop-2&4 only have the lower two positions; the user's selection of "high"
// silently produces no markers in those systems until they pick low or mid.
export const STRING_SET_BY_POSITION: Record<
  VoicingSystem,
  Partial<Record<SeventhStringPosition, SeventhStringSet>>
> = {
  close: { low: "3-4-5-6", mid: "2-3-4-5", high: "1-2-3-4" },
  drop2: { low: "3-4-5-6", mid: "2-3-4-5", high: "1-2-3-4" },
  drop3: { low: "6-4-3-2", mid: "5-3-2-1" },
  "drop2-4": { low: "6-5-3-2", mid: "5-4-2-1" },
};
