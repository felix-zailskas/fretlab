import { useCallback, useMemo } from "react";
import { previewTargets } from "../theory/chordPreview";
import type { DisabledRoles } from "../components/Legend";
import {
  Fretboard,
  type OverlapZone,
  type PositionWindow,
} from "../components/Fretboard/Fretboard";
import { ScaleTypeToggle } from "../components/ScaleTypeToggle";
import { isPentatonicAvailable } from "../theory/pentatonic";
import { ALL_NOTES_KEY } from "../theory/notes";
import { Legend } from "../components/Legend";
import type { HighlightableRole } from "../theory/types";
import { buildChordToneMarkers } from "../theory/chordTones";
import type { Tuning } from "../theory/tuning";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
} from "../theory/positions";
import type { ChordToneSource } from "../theory/harmony";
import { parentMajorOf, type Mode } from "../theory/modes";
import { type ScalePositionsControls } from "./useScalePositionsState";
import type { RegionToggle } from "../components/Fretboard/RegionToggles";
import type { SymbolKind } from "../components/legend/SymbolKey";
import { ViewFrame, type ViewChrome } from "./ViewFrame";

type ScalePositionsViewProps = {
  chrome: ViewChrome;
  tuning: Tuning;
  selectedKey: string;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: DisabledRoles;
  selectedChord: ChordToneSource | null;
  // The progression's next chord while it is being previewed.
  previewChord?: ChordToneSource | null;
  startFret: number;
  endFret: number;
  controls: ScalePositionsControls;
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
  // Optional — defaults to 'ionian', preserving today's behavior. Phase D's
  // App.tsx wiring passes this explicitly from global state.
  mode?: Mode;
};

// Wider, neutral phrasing — the view serves both pure scale-position study
// and chord-tone targeting.
const EMPTY_KEY_MESSAGE = "Select a key to view scale positions.";

export function ScalePositionsView({
  chrome,
  tuning,
  selectedKey,
  enabledHighlights,
  onToggleRole,
  disabledRoles,
  selectedChord,
  previewChord = null,
  startFret,
  endFret,
  controls,
  enabledStrings,
  onToggleString,
  mode = "ionian",
}: ScalePositionsViewProps) {
  const {
    selectedPositions,
    togglePosition,
    showContext,
    setShowContext,
    scaleType,
    setScaleType,
  } = controls;
  const pentatonicAvailable = isPentatonicAvailable(mode);
  const showPentatonic = pentatonicAvailable && scaleType === "pentatonic";

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
      getPositionWindows(parentKey, p.id, startFret, endFret, tuning).map(
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
  }, [tuning, selectedKey, parentKey, selectedPositions, startFret, endFret, mode]);

  // Every position gets a clickable label above the board, over its first
  // on-screen window; positions that don't fit the fret range are pinned to
  // the strip's edge so they stay reachable.
  const regionToggles = useMemo<RegionToggle[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return CAGED_POSITIONS.map((p) => {
      const [first] = getPositionWindows(parentKey, p.id, startFret, endFret, tuning);
      return {
        id: p.id,
        label: p.id,
        sub: mode === "ionian" ? p.shape : undefined,
        ariaLabel: `Position ${p.id.slice(1)}${mode === "ionian" ? ` (${p.shape} shape)` : ""}`,
        on: selectedPositions.has(p.id),
        low: first?.[0],
        high: first?.[1],
        onToggle: () => togglePosition(p.id),
      };
    });
  }, [
    selectedKey,
    parentKey,
    startFret,
    endFret,
    tuning,
    mode,
    selectedPositions,
    togglePosition,
  ]);

  const overlapZones = useMemo<OverlapZone[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return computeOverlapZones(parentKey, positionsArray, startFret, endFret, tuning);
  }, [tuning, selectedKey, parentKey, positionsArray, startFret, endFret]);

  const markersFor = useCallback(
    (chord: ChordToneSource | null) =>
      buildChordToneMarkers({
        tuning,
        key: selectedKey,
        chord,
        positions: positionsArray,
        showContext,
        enabledHighlights,
        enabledStrings,
        startFret,
        endFret,
        mode,
        scaleType,
      }),
    [
      tuning,
      selectedKey,
      positionsArray,
      showContext,
      enabledHighlights,
      enabledStrings,
      startFret,
      endFret,
      mode,
      scaleType,
    ],
  );
  const markers = useMemo(() => markersFor(selectedChord), [markersFor, selectedChord]);
  const previewMarkers = useMemo(
    () => (previewChord ? previewTargets(markers, markersFor(previewChord)) : []),
    [markersFor, markers, previewChord],
  );

  // No early return for ALL_NOTES_KEY — keep the fretboard mounted so the
  // page layout (and the fretboard's vertical position) doesn't shift when
  // the user toggles between a real key and All. The empty-state message
  // surfaces inside the Fretboard via the emptyMessage prop instead.
  const fretboardEmptyMessage =
    selectedKey === ALL_NOTES_KEY
      ? EMPTY_KEY_MESSAGE
      : selectedPositions.size === 0
        ? "Toggle a position to begin."
        : undefined;

  const symbols: SymbolKind[] = [
    "context",
    "position",
    "characteristic",
    "outsideKey",
    ...(showPentatonic ? (["nonPentatonic"] as const) : []),
    "hiddenString",
  ];

  return (
    <ViewFrame
      chrome={chrome}
      symbols={symbols}
      subModes={
        <>
          <ScaleTypeToggle
            value={pentatonicAvailable ? scaleType : "full"}
            onChange={setScaleType}
            disabled={!pentatonicAvailable}
          />
          <label className="inline-flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showContext}
              onChange={(e) => setShowContext(e.target.checked)}
            />
            Context notes
          </label>
        </>
      }
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
        positionWindows={positionWindows}
        overlapZones={overlapZones}
        regionToggles={regionToggles}
        emptyMessage={fretboardEmptyMessage}
        tuning={tuning}
        enabledStrings={enabledStrings}
        onToggleString={onToggleString}
      />
    </ViewFrame>
  );
}
