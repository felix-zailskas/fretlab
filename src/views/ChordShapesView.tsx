import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import type { RegionToggle } from "../components/Fretboard/RegionToggles";
import type { SymbolKind } from "../components/legend/SymbolKey";
import { ALL_NOTES_KEY } from "../theory/notes";
import { Legend } from "../components/Legend";
import type { HighlightableRole } from "../theory/types";
import {
  buildCagedPlacements,
  CAGED_GRIPS,
  CAGED_SHAPE_ORDER,
  dedupeMarkers,
  type CagedQuality,
} from "../theory/cagedShapes";
import {
  buildChordShapeMarkers,
  type ChordShapesMode,
  type SeventhStringSet,
} from "../theory/chordShapes";
import type { Tuning } from "../theory/tuning";
import { triadOf, type ChordRowMode, type ChordToneSource } from "../theory/harmony";
import { type Mode } from "../theory/modes";
import { type ChordShapesControls } from "./useChordShapesState";
import { ChordShapesSubModes } from "./ChordShapesSubModes";
import { STRING_SET_BY_POSITION } from "./chordShapesStringSets";
import { ViewFrame, type ViewChrome } from "./ViewFrame";

type ChordShapesViewProps = {
  chrome: ViewChrome;
  tuning: Tuning;
  selectedKey: string;
  startFret: number;
  endFret: number;
  selectedChord: ChordToneSource | null;
  chordRowMode: ChordRowMode;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: Set<HighlightableRole>;
  controls: ChordShapesControls;
  modalMode: Mode;
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
};

const INVERSION_SYMBOLS: readonly SymbolKind[] = [
  "stringGroup",
  "characteristic",
  "outsideKey",
  "hiddenString",
];
const CAGED_SYMBOLS: readonly SymbolKind[] = [
  "shape",
  "barre",
  "notPlayed",
  "characteristic",
  "outsideKey",
  "hiddenString",
];

export function ChordShapesView({
  chrome,
  tuning,
  selectedKey,
  startFret,
  endFret,
  selectedChord,
  chordRowMode,
  enabledHighlights,
  onToggleRole,
  disabledRoles,
  controls,
  modalMode,
  enabledStrings,
  onToggleString,
}: ChordShapesViewProps) {
  const {
    selectedStringSets,
    selectedInversions,
    selectedVoicingSystem,
    selectedSeventhPositions,
    selectedSeventhInversions,
    voicingStyle,
    selectedCagedShapes,
    toggleCagedShape,
  } = controls;
  const isCaged = voicingStyle === "caged";
  const mode: ChordShapesMode = chordRowMode;

  const activeSeventhStringSets = useMemo<SeventhStringSet[]>(() => {
    const map = STRING_SET_BY_POSITION[selectedVoicingSystem];
    return Array.from(selectedSeventhPositions)
      .map((p) => map[p])
      .filter((s): s is SeventhStringSet => s !== undefined);
  }, [selectedSeventhPositions, selectedVoicingSystem]);

  // Every shape is placed, so each one's label can sit over it above the
  // board even while it's toggled off. CAGED always voices the chord as
  // selected: a secondary dominant keeps its 7th even in triads mode (its
  // resolution hinges on that 7th).
  const allPlacements = useMemo(() => {
    if (!isCaged || !selectedChord) return [];
    return buildCagedPlacements({
      tuning,
      modalMode,
      chord: selectedChord,
      key: selectedKey,
      shapes: CAGED_SHAPE_ORDER,
      enabledStrings,
      startFret,
      endFret,
    });
  }, [
    isCaged,
    selectedChord,
    tuning,
    modalMode,
    selectedKey,
    enabledStrings,
    startFret,
    endFret,
  ]);

  const cagedPlacements = useMemo(
    () => allPlacements.filter((p) => selectedCagedShapes.has(p.shape)),
    [allPlacements, selectedCagedShapes],
  );

  // One label per shape that has a grip for this chord quality; shapes whose
  // grip doesn't fit the fret range are pinned to the strip's edge.
  const regionToggles = useMemo<RegionToggle[]>(() => {
    if (!isCaged || !selectedChord || selectedKey === ALL_NOTES_KEY) return [];
    const grips = CAGED_GRIPS[selectedChord.quality as CagedQuality] ?? {};
    return CAGED_SHAPE_ORDER.filter((shape) => grips[shape]).map((shape) => {
      const first = allPlacements.find((p) => p.shape === shape);
      return {
        id: shape,
        label: `${shape}-shape`,
        on: selectedCagedShapes.has(shape),
        low: first?.low,
        high: first?.high,
        onToggle: () => toggleCagedShape(shape),
      };
    });
  }, [
    isCaged,
    selectedChord,
    selectedKey,
    allPlacements,
    selectedCagedShapes,
    toggleCagedShape,
  ]);

  const markers = useMemo(() => {
    if (!selectedChord) return [];
    if (isCaged) return dedupeMarkers(cagedPlacements);
    if (mode === "triads") {
      return buildChordShapeMarkers({
        mode: "triads",
        tuning,
        modalMode,
        // Chord Shapes only voices triads; a secondary dominant drops its 7th.
        chord: triadOf(selectedChord),
        key: selectedKey,
        stringSets: Array.from(selectedStringSets),
        inversions: Array.from(selectedInversions),
        enabledStrings,
        startFret,
        endFret,
      });
    }
    return buildChordShapeMarkers({
      mode: "sevenths",
      tuning,
      modalMode,
      voicingSystem: selectedVoicingSystem,
      chord: selectedChord,
      key: selectedKey,
      stringSets: activeSeventhStringSets,
      inversions: Array.from(selectedSeventhInversions),
      enabledStrings,
      startFret,
      endFret,
    });
  }, [
    isCaged,
    cagedPlacements,
    mode,
    tuning,
    modalMode,
    selectedChord,
    selectedKey,
    selectedStringSets,
    selectedInversions,
    selectedVoicingSystem,
    activeSeventhStringSets,
    selectedSeventhInversions,
    enabledStrings,
    startFret,
    endFret,
  ]);

  // Demote unselected roles to plain scale tones instead of removing them —
  // the chord shape stays recognizable while the focus is on the role(s) the
  // user actually wants to study. Matches the Note Map / Scale Positions
  // behavior in chordTones.ts so dimmed chord tones look identical to the
  // surrounding non-highlighted scale notes.
  //
  // "muted" is preserved as-is: it carries different intent (the string is
  // toggled off) and must not be folded into "scale".
  const visibleMarkers = useMemo(
    () =>
      markers.map((m) => {
        if (m.role === "muted") return m;
        return enabledHighlights.has(m.role as HighlightableRole)
          ? m
          : { ...m, role: "scale" as const };
      }),
    [markers, enabledHighlights],
  );

  // No early return for ALL_NOTES_KEY — keep the fretboard mounted so the
  // page layout doesn't shift when the user toggles between a real key and
  // All. The empty-state surfaces via emptyMessage instead.
  const activeSubSelectorEmpty = selectedChord
    ? isCaged
      ? selectedCagedShapes.size === 0
      : mode === "triads"
        ? selectedStringSets.size === 0 || selectedInversions.size === 0
        : activeSeventhStringSets.length === 0 || selectedSeventhInversions.size === 0
    : false;

  const fretboardMessage =
    selectedKey === ALL_NOTES_KEY
      ? "Select a key to view chord shapes."
      : !selectedChord
        ? "Select a chord to view shapes."
        : isCaged && regionToggles.length === 0
          ? "No CAGED shapes for this chord."
          : activeSubSelectorEmpty
            ? isCaged
              ? "Toggle a shape to begin."
              : "Select a string set to begin."
            : undefined;

  const cagedOverlays = useMemo(
    () => ({
      positionWindows: cagedPlacements.map((p) => ({
        id: p.id,
        low: p.low,
        high: p.high,
        label: `${p.shape}-shape`,
      })),
      barres: cagedPlacements.flatMap((p) =>
        p.barre ? [{ id: p.id, ...p.barre }] : [],
      ),
      unplayedStrings: cagedPlacements.flatMap((p) =>
        p.unplayedStrings.map((string) => ({
          id: `${p.id}-${string}`,
          string,
          fret: p.low,
        })),
      ),
      regionToggles,
    }),
    [cagedPlacements, regionToggles],
  );

  return (
    <ViewFrame
      chrome={chrome}
      symbols={isCaged ? CAGED_SYMBOLS : INVERSION_SYMBOLS}
      subModes={<ChordShapesSubModes mode={mode} controls={controls} />}
      highlight={
        <Legend
          enabledRoles={enabledHighlights}
          onToggleRole={onToggleRole}
          disabledRoles={disabledRoles}
        />
      }
    >
      <Fretboard
        markers={visibleMarkers}
        startFret={startFret}
        endFret={endFret}
        emptyMessage={fretboardMessage}
        {...(isCaged ? cagedOverlays : {})}
        tuning={tuning}
        enabledStrings={enabledStrings}
        onToggleString={onToggleString}
      />
    </ViewFrame>
  );
}
