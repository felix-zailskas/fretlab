import { useCallback, useMemo } from "react";
import { previewTargets } from "../theory/chordPreview";
import type { DisabledRoles } from "../components/Legend";
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
  disabledRoles?: DisabledRoles;
  selectedChord: ChordToneSource | null;
  // The progression's next chord while it is being previewed.
  previewChord?: ChordToneSource | null;
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
  previewChord = null,
  startFret,
  endFret,
  enabledStrings,
  onToggleString,
  mode = "ionian",
}: NoteMapViewProps) {
  const markersFor = useCallback(
    (chord: ChordToneSource | null) =>
      buildNoteMapMarkers({
        tuning,
        key: selectedKey,
        mode,
        accidentalStyle,
        chord,
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
      enabledHighlights,
      enabledStrings,
      startFret,
      endFret,
    ],
  );
  const markers = useMemo(() => markersFor(selectedChord), [markersFor, selectedChord]);
  const previewMarkers = useMemo(
    () => (previewChord ? previewTargets(markers, markersFor(previewChord)) : []),
    [markersFor, markers, previewChord],
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
        previewMarkers={previewMarkers}
        startFret={startFret}
        endFret={endFret}
        tuning={tuning}
        enabledStrings={enabledStrings}
        onToggleString={onToggleString}
      />
    </ViewFrame>
  );
}
