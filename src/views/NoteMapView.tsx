import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { Legend, type HighlightableRole } from "../components/Legend";
import { roleFromChordTone, HIGHLIGHTABLE } from "../theory/chordTones";
import {
  getNoteAtFret,
  getNoteIndex,
  getDisplayName,
  type AccidentalStyle,
} from "../theory/notes";
import type { Tuning } from "../theory/tuning";
import { type DiatonicChord, type DiatonicTriad } from "../theory/scales";
import {
  getCharacteristicNoteIndexSet,
  getModalIntervalRole,
  type Mode,
} from "../theory/modes";
import type { NoteMarker, NoteDisplayRole } from "../theory/types";

type NoteMapViewProps = {
  tuning: Tuning;
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
  // Optional — defaults to 'ionian', preserving today's behavior. Phase D
  // wires App.tsx to pass this explicitly from global state.
  mode?: Mode;
};

export function NoteMapView({
  tuning,
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  onToggleRole,
  disabledRoles,
  selectedChord,
  startFret,
  endFret,
  mode = "ionian",
}: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = [];
    const showAll = selectedKey === ALL_NOTES_KEY;

    const characteristicSet = showAll
      ? (new Set<number>() as ReadonlySet<number>)
      : getCharacteristicNoteIndexSet(selectedKey, mode, accidentalStyle);

    for (let stringIndex = 0; stringIndex < tuning.strings.length; stringIndex++) {
      const openString = tuning.strings[stringIndex];
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
    tuning,
    selectedKey,
    accidentalStyle,
    enabledHighlights,
    selectedChord,
    startFret,
    endFret,
    mode,
  ]);

  return (
    <div className="space-y-2 md:space-y-4">
      <Fretboard markers={markers} startFret={startFret} endFret={endFret} />
      {/* min-h reserves the height of the tallest sibling-view controls bar so
          the diatonic chord row sits at the same y on every view. At ≥1320px
          everything fits on one row (~36px); below that, Chord Shapes Sevenths
          wraps to two rows (~80px) and the other views match it. */}
      <div className="flex flex-wrap items-center gap-x-3 md:gap-x-6 gap-y-2 md:gap-y-3 min-h-9 md:max-[1319px]:min-h-20">
        <Legend
          enabledRoles={enabledHighlights}
          onToggleRole={onToggleRole}
          disabledRoles={disabledRoles}
        />
      </div>
    </div>
  );
}
