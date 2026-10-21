import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { Legend } from "../components/Legend";
import type { HighlightableRole } from "../theory/types";
import { buildNoteMapMarkers } from "../theory/chordTones";
import type { ChordToneSource } from "../theory/harmony";
import type { AccidentalStyle } from "../theory/notes";
import type { Tuning } from "../theory/tuning";
import type { Mode } from "../theory/modes";

type NoteMapViewProps = {
  tuning: Tuning;
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: Set<HighlightableRole>;
  selectedChord: ChordToneSource | null;
  startFret: number;
  endFret: number;
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
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
  enabledStrings,
  onToggleString,
  mode = "ionian",
}: NoteMapViewProps) {
  const markers = useMemo(
    () =>
      buildNoteMapMarkers({
        tuning,
        key: selectedKey,
        mode,
        accidentalStyle,
        chord: selectedChord,
        enabledHighlights,
        enabledStrings,
        startFret,
        endFret,
      }),
    [
      tuning,
      selectedKey,
      mode,
      accidentalStyle,
      selectedChord,
      enabledHighlights,
      enabledStrings,
      startFret,
      endFret,
    ],
  );

  return (
    <div className="space-y-2 md:space-y-4">
      <Fretboard
        markers={markers}
        startFret={startFret}
        endFret={endFret}
        tuning={tuning}
        enabledStrings={enabledStrings}
        onToggleString={onToggleString}
      />
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
