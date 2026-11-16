import type { CagedShape, PositionId } from "../theory/positions";
import type { ScaleType } from "../theory/pentatonic";
import type {
  Inversion,
  SeventhInversion,
  StringSet,
  VoicingSystem,
} from "../theory/chordShapes";
import type { ChordRef, ChordRowMode } from "../theory/harmony";
import { naturalAccidentalForKeyMode, type Mode } from "../theory/modes";
import { ALL_NOTES_KEY, type AccidentalStyle } from "../theory/notes";
import type { HighlightableRole } from "../theory/types";
import type { ViewId } from "../views/types";
import type { SeventhStringPosition, VoicingStyle } from "../views/useChordShapesState";

// Everything a share link can carry: the state that decides what the board
// shows. Device-level settings (tuning, theme, progression, accidental
// preference) stay out of it.
export type ShareState = {
  view: ViewId;
  key: string; // the app's spelling: "C", "C#", "Db", or ALL_NOTES_KEY
  mode: Mode;
  chord: ChordRef | null;
  rowMode: ChordRowMode;
  highlights: ReadonlySet<HighlightableRole>;
  strings: ReadonlySet<number>; // 0 = low E
  frets: { start: number; end: number } | null; // null = device default
  positions: ReadonlySet<PositionId>;
  scaleType: ScaleType;
  showContext: boolean;
  stringSets: ReadonlySet<StringSet>;
  inversions: ReadonlySet<Inversion>;
  voicing: VoicingSystem;
  seventhPositions: ReadonlySet<SeventhStringPosition>;
  seventhInversions: ReadonlySet<SeventhInversion>;
  voicingStyle: VoicingStyle;
  cagedShapes: ReadonlySet<CagedShape>;
};

// Mirrors the app's own defaults (App.tsx, useScalePositionsState,
// useChordShapesState); the URL omits any field equal to these.
export const DEFAULT_SHARE_STATE: ShareState = {
  view: "note-map",
  key: "C",
  mode: "ionian",
  chord: { tier: "diatonic", degree: 1 },
  rowMode: "triads",
  highlights: new Set(["root", "third", "fifth", "seventh"]),
  strings: new Set([0, 1, 2, 3, 4, 5]),
  frets: null,
  positions: new Set(["P1"]),
  scaleType: "full",
  showContext: false,
  stringSets: new Set(["1-2-3"]),
  inversions: new Set(["root", "first", "second"]),
  voicing: "drop2",
  seventhPositions: new Set(["low"]),
  seventhInversions: new Set(["root"]),
  voicingStyle: "inversions",
  cagedShapes: new Set(["E", "A"]),
};

// The key's spelling decides ♭ or ♯; naturals take the key's own preference.
export function accidentalForKey(key: string, mode: Mode): AccidentalStyle {
  if (key === ALL_NOTES_KEY) return "sharp";
  if (key.length === 2 && key.endsWith("b")) return "flat";
  if (key.endsWith("#")) return "sharp";
  return naturalAccidentalForKeyMode(key, mode) ?? "sharp";
}
