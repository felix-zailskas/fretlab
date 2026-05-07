import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import { roleFromChordTone, HIGHLIGHTABLE } from "../theory/chordTones";
import {
  STANDARD_TUNING,
  getNoteAtFret,
  getNoteIndex,
  getDisplayName,
  type AccidentalStyle,
} from "../theory/notes";
import { type DiatonicChord, type DiatonicTriad } from "../theory/scales";
import {
  getCharacteristicNotes,
  getModalIntervalRole,
  type Mode,
} from "../theory/modes";
import type { NoteMarker, NoteDisplayRole } from "../theory/types";

type NoteMapViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
  // Optional — defaults to 'ionian', preserving today's behavior. Phase D
  // wires App.tsx to pass this explicitly from global state.
  mode?: Mode;
};

export function NoteMapView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
  startFret,
  endFret,
  mode = "ionian",
}: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = [];
    const showAll = selectedKey === ALL_NOTES_KEY;

    const characteristicSet = showAll
      ? new Set<number>()
      : new Set(
          getCharacteristicNotes(selectedKey, mode, accidentalStyle).map((n) =>
            getNoteIndex(n),
          ),
        );

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex];
      for (let fret = startFret; fret <= endFret; fret++) {
        const note = getNoteAtFret(openString, fret);

        let role: NoteDisplayRole;
        if (showAll) {
          role = "scale";
        } else {
          if (getModalIntervalRole(selectedKey, mode, note) === null) continue;
          role = roleFromChordTone(note, selectedChord);
          if (
            HIGHLIGHTABLE.has(role) &&
            !enabledHighlights.has(role as HighlightableRole)
          ) {
            role = "scale";
          }
        }

        const isCharacteristic = characteristicSet.has(getNoteIndex(note));

        result.push({
          string: stringIndex,
          fret,
          note: getDisplayName(note, selectedKey, accidentalStyle),
          role,
          ...(isCharacteristic ? { isCharacteristic: true } : {}),
        });
      }
    }

    return result;
  }, [
    selectedKey,
    accidentalStyle,
    enabledHighlights,
    selectedChord,
    startFret,
    endFret,
    mode,
  ]);

  return <Fretboard markers={markers} startFret={startFret} endFret={endFret} />;
}
