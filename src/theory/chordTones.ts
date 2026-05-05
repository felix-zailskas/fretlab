import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import { FRET_COUNT } from "./constants";
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import { isInPositionWindow, type PositionId } from "./positions";
import { getIntervalRole, type DiatonicChord, type DiatonicTriad } from "./scales";
import type { NoteDisplayRole, NoteMarker } from "./types";

// Roles the Legend can toggle off (demoted to 'scale' when their toggle is
// disabled). Both NoteMapView and ScalePositionsView read from this single set.
export const HIGHLIGHTABLE: ReadonlySet<NoteDisplayRole> = new Set<NoteDisplayRole>([
  "root",
  "third",
  "fifth",
  "seventh",
]);

// Resolves the visual role of an in-key note given an optional chord context.
// - With a chord: returns the chord-relative role ('root'/'third'/'fifth'/
//   'seventh'), or 'scale' if the note is in-key but not a chord tone.
// - Without a chord: returns 'scale'. Deselecting the chord card is the
//   user-facing "clear highlights" shortcut — every in-key note falls back to
//   the plain scale role, and Legend toggles have nothing to demote.
// Caller is responsible for filtering out-of-key notes upstream.
export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | DiatonicTriad | null,
): NoteDisplayRole {
  if (!chord) return "scale";
  const noteIdx = getNoteIndex(note);
  if (noteIdx === getNoteIndex(chord.notes[0])) return "root";
  if (noteIdx === getNoteIndex(chord.notes[1])) return "third";
  if (noteIdx === getNoteIndex(chord.notes[2])) return "fifth";
  if (chord.notes.length === 4 && noteIdx === getNoteIndex(chord.notes[3])) {
    return "seventh";
  }
  return "scale";
}

export type BuildChordToneMarkersInput = {
  key: string;
  chord: DiatonicChord | DiatonicTriad | null;
  accidentalStyle: AccidentalStyle;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: Set<HighlightableRole>;
};

// Pure function: given the Chord-Tones view's full input, returns the
// NoteMarker[] that the Fretboard should render. Mirrors the pipeline
// described in the spec under "Marker Computation".
//
// Returns [] when:
// - key is the "All Notes" sentinel (the chord-tones concept requires a key)
// - positions is empty (the view's identity is the box; no box, no markers)
//
// A fret is "in window" if it falls in ANY of the selected positions. When
// showContext=true, in-key notes outside the union of windows render with
// role 'muted' (faint context); when false, they're dropped entirely.
export function buildChordToneMarkers({
  key,
  chord,
  accidentalStyle,
  positions,
  showContext,
  enabledHighlights,
}: BuildChordToneMarkersInput): NoteMarker[] {
  if (key === ALL_NOTES_KEY) return [];
  if (positions.length === 0) return [];

  const result: NoteMarker[] = [];

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
    const openString = STANDARD_TUNING[stringIndex];
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const note = getNoteAtFret(openString, fret);
      const interval = getIntervalRole(key, note);
      if (interval === null) continue; // out of key — drop entirely

      const inWindow = positions.some((p) => isInPositionWindow(key, p, fret));
      if (!inWindow && !showContext) continue; // hide outside-position notes

      let role = roleFromChordTone(note, chord);
      if (
        HIGHLIGHTABLE.has(role) &&
        !enabledHighlights.has(role as HighlightableRole)
      ) {
        role = "scale"; // Legend toggle off → demote
      }
      if (!inWindow) {
        role = "muted"; // outside-window context override
      }

      result.push({
        string: stringIndex,
        fret,
        note: getDisplayName(note, key, accidentalStyle),
        role,
      });
    }
  }

  return result;
}
