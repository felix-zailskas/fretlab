import { useMemo } from "react";
import {
  Fretboard,
  type OverlapZone,
  type PositionWindow,
} from "../components/Fretboard/Fretboard";
import { PositionToggles } from "../components/PositionToggles";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { Legend, type HighlightableRole } from "../components/Legend";
import { buildChordToneMarkers } from "../theory/chordTones";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
} from "../theory/positions";
import type { AccidentalStyle } from "../theory/notes";
import type { DiatonicChord, DiatonicTriad } from "../theory/scales";
import { parentMajorOf, type Mode } from "../theory/modes";
import { type ScalePositionsControls } from "./useScalePositionsState";

type ScalePositionsViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
  controls: ScalePositionsControls;
  // Optional — defaults to 'ionian', preserving today's behavior. Phase D's
  // App.tsx wiring passes this explicitly from global state.
  mode?: Mode;
};

// Wider, neutral phrasing — the view serves both pure scale-position study
// and chord-tone targeting.
const EMPTY_KEY_MESSAGE = "Select a key to view scale positions.";

export function ScalePositionsView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  onToggleRole,
  selectedChord,
  startFret,
  endFret,
  controls,
  mode = "ionian",
}: ScalePositionsViewProps) {
  const { selectedPositions, togglePosition, showContext, setShowContext } = controls;

  // CAGED windows are anchored to the parent major scale: when mode is
  // non-Ionian, position math runs on parentKey rather than selectedKey, so
  // the boxes frame fret regions where the modal scale actually lays.
  const parentKey = useMemo(
    () =>
      selectedKey === ALL_NOTES_KEY ? selectedKey : parentMajorOf(selectedKey, mode),
    [selectedKey, mode],
  );

  const positionsArray = useMemo(
    () =>
      // Iterate in canonical CAGED_POSITIONS order so the resulting list is
      // deterministic regardless of toggle-click order.
      CAGED_POSITIONS.map((p) => p.id).filter((id) => selectedPositions.has(id)),
    [selectedPositions],
  );

  const positionWindows = useMemo<PositionWindow[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return CAGED_POSITIONS.filter((p) => selectedPositions.has(p.id)).flatMap((p) =>
      getPositionWindows(parentKey, p.id, startFret, endFret).map(
        ([low, high], octaveIndex) => ({
          id: `${p.id}-${octaveIndex}`,
          low,
          high,
          // Drop the C/A/G/E/D shape suffix in non-Ionian modes — the shape
          // names refer to major-scale fingering patterns and are misleading
          // in modal context. Just the position number remains useful.
          label: mode === "ionian" ? `${p.id} — ${p.shape}` : `${p.id}`,
        }),
      ),
    );
  }, [selectedKey, parentKey, selectedPositions, startFret, endFret, mode]);

  const overlapZones = useMemo<OverlapZone[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return computeOverlapZones(parentKey, positionsArray, startFret, endFret);
  }, [selectedKey, parentKey, positionsArray, startFret, endFret]);

  const markers = useMemo(
    () =>
      buildChordToneMarkers({
        key: selectedKey,
        chord: selectedChord,
        accidentalStyle,
        positions: positionsArray,
        showContext,
        enabledHighlights,
        startFret,
        endFret,
        mode,
      }),
    [
      selectedKey,
      selectedChord,
      accidentalStyle,
      positionsArray,
      showContext,
      enabledHighlights,
      startFret,
      endFret,
      mode,
    ],
  );

  if (selectedKey === ALL_NOTES_KEY) {
    return <div className="text-fg-faint text-center py-20">{EMPTY_KEY_MESSAGE}</div>;
  }

  return (
    <div className="space-y-4">
      <Fretboard
        markers={markers}
        startFret={startFret}
        endFret={endFret}
        positionWindows={positionWindows}
        overlapZones={overlapZones}
        emptyMessage={
          selectedPositions.size === 0 ? "Toggle a position to begin." : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 min-h-9 max-[1319px]:min-h-20">
        <Legend enabledRoles={enabledHighlights} onToggleRole={onToggleRole} />
        <span aria-hidden="true" className="w-px h-6 bg-line self-center" />
        <PositionToggles selected={selectedPositions} onToggle={togglePosition} />
        <label className="inline-flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
          />
          Show context notes
        </label>
      </div>
    </div>
  );
}
