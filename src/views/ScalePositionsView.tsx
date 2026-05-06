import { useCallback, useMemo, useState } from "react";
import {
  Fretboard,
  type OverlapZone,
  type PositionWindow,
} from "../components/Fretboard/Fretboard";
import { PositionToggles } from "../components/PositionToggles";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import { DEFAULT_END_FRET } from "../theory/constants";
import { buildChordToneMarkers } from "../theory/chordTones";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
  type PositionId,
} from "../theory/positions";
import type { AccidentalStyle } from "../theory/notes";
import type { DiatonicChord, DiatonicTriad } from "../theory/scales";

type ScalePositionsViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
};

// Wider, neutral phrasing — the view serves both pure scale-position study
// and chord-tone targeting.
const EMPTY_KEY_MESSAGE = "Select a key to view scale positions.";

const DEFAULT_POSITIONS: PositionId[] = ["P1"];

export function ScalePositionsView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: ScalePositionsViewProps) {
  const [selectedPositions, setSelectedPositions] = useState<Set<PositionId>>(
    () => new Set(DEFAULT_POSITIONS),
  );
  const [showContext, setShowContext] = useState(false);

  const togglePosition = useCallback((position: PositionId) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });
  }, []);

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
      getPositionWindows(selectedKey, p.id, 0, DEFAULT_END_FRET).map(
        ([low, high], octaveIndex) => ({
          id: `${p.id}-${octaveIndex}`,
          low,
          high,
          label: `${p.id} — ${p.shape}`,
        }),
      ),
    );
  }, [selectedKey, selectedPositions]);

  const overlapZones = useMemo<OverlapZone[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return computeOverlapZones(selectedKey, positionsArray, 0, DEFAULT_END_FRET);
  }, [selectedKey, positionsArray]);

  const markers = useMemo(
    () =>
      buildChordToneMarkers({
        key: selectedKey,
        chord: selectedChord,
        accidentalStyle,
        positions: positionsArray,
        showContext,
        enabledHighlights,
      }),
    [
      selectedKey,
      selectedChord,
      accidentalStyle,
      positionsArray,
      showContext,
      enabledHighlights,
    ],
  );

  if (selectedKey === ALL_NOTES_KEY) {
    return <div className="text-fg-faint text-center py-20">{EMPTY_KEY_MESSAGE}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6">
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
      <div className="relative">
        <Fretboard
          markers={markers}
          fretCount={DEFAULT_END_FRET}
          positionWindows={positionWindows}
          overlapZones={overlapZones}
        />
        {selectedPositions.size === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-white pointer-events-none">
            Toggle a position to begin.
          </div>
        )}
      </div>
    </div>
  );
}
