import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { Legend } from "../components/Legend";
import type { HighlightableRole } from "../theory/types";
import { buildNoteMapMarkers } from "../theory/chordTones";
import type { ChordToneSource } from "../theory/harmony";
import type { AccidentalStyle } from "../theory/notes";
import type { Tuning } from "../theory/tuning";
import type { Mode } from "../theory/modes";
import { ViewFrame, type ViewChrome } from "./ViewFrame";

const SYMBOLS = ["scale", "characteristic", "outsideKey", "hiddenString"] as const;

type NoteMapViewProps = {
  chrome: ViewChrome;
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
  chrome,
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
    <ViewFrame
      chrome={chrome}
      symbols={SYMBOLS}
      highlight={
        <Legend
          enabledRoles={enabledHighlights}
          onToggleRole={onToggleRole}
          disabledRoles={disabledRoles}
        />
      }
    >
      <Fretboard
        markers={markers}
        startFret={startFret}
        endFret={endFret}
        tuning={tuning}
        enabledStrings={enabledStrings}
        onToggleString={onToggleString}
      />
    </ViewFrame>
  );
}
