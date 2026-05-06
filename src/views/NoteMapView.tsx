import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import { DEFAULT_END_FRET } from "../theory/constants";
import { roleFromChordTone, HIGHLIGHTABLE } from "../theory/chordTones";
import {
  STANDARD_TUNING,
  getNoteAtFret,
  getDisplayName,
  type AccidentalStyle,
} from "../theory/notes";
import {
  getIntervalRole,
  type DiatonicChord,
  type DiatonicTriad,
} from "../theory/scales";
import type { NoteMarker, NoteDisplayRole } from "../theory/types";

type NoteMapViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
};

export function NoteMapView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = [];
    const showAll = selectedKey === ALL_NOTES_KEY;

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex];
      for (let fret = 0; fret <= DEFAULT_END_FRET; fret++) {
        const note = getNoteAtFret(openString, fret);

        let role: NoteDisplayRole;
        if (showAll) {
          role = "scale";
        } else {
          if (getIntervalRole(selectedKey, note) === null) continue;
          role = roleFromChordTone(note, selectedChord);
          if (
            HIGHLIGHTABLE.has(role) &&
            !enabledHighlights.has(role as HighlightableRole)
          ) {
            role = "scale";
          }
        }

        result.push({
          string: stringIndex,
          fret,
          note: getDisplayName(note, selectedKey, accidentalStyle),
          role,
        });
      }
    }

    return result;
  }, [selectedKey, accidentalStyle, enabledHighlights, selectedChord]);

  return <Fretboard markers={markers} fretCount={DEFAULT_END_FRET} />;
}
