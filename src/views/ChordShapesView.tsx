import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { type HighlightableRole } from "../components/Legend";
import { StringSetToggles } from "../components/StringSetToggles";
import { type ChordRowMode } from "../components/DiatonicChords";
import {
  buildChordShapeMarkers,
  VOICING_SYSTEM_ORDER,
  type ChordShapesMode,
  type Inversion,
  type SeventhInversion,
  type SeventhStringSet,
  type StringSet,
  type VoicingSystem,
} from "../theory/chordShapes";
import type { AccidentalStyle } from "../theory/notes";
import type { DiatonicTriad, DiatonicChord } from "../theory/scales";
import {
  type ChordShapesControls,
  type SeventhStringPosition,
} from "./useChordShapesState";

type ChordShapesViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  startFret: number;
  endFret: number;
  selectedChord: DiatonicTriad | DiatonicChord | null;
  chordRowMode: ChordRowMode;
  onChordRowModeChange: (mode: ChordRowMode) => void;
  enabledHighlights: Set<HighlightableRole>;
  controls: ChordShapesControls;
};

const STRING_SET_OPTIONS: ReadonlyArray<{ id: StringSet; label: string }> = [
  { id: "1-2-3", label: "1-2-3" },
  { id: "2-3-4", label: "2-3-4" },
  { id: "3-4-5", label: "3-4-5" },
  { id: "4-5-6", label: "4-5-6" },
];

const INVERSION_OPTIONS: ReadonlyArray<{ id: Inversion; label: string }> = [
  { id: "root", label: "Root" },
  { id: "first", label: "1st Inversion" },
  { id: "second", label: "2nd Inversion" },
];

const SEVENTH_INVERSION_OPTIONS: ReadonlyArray<{
  id: SeventhInversion;
  label: string;
}> = [
  { id: "root", label: "Root" },
  { id: "first", label: "1st Inversion" },
  { id: "second", label: "2nd Inversion" },
  { id: "third", label: "3rd Inversion" },
];

const VOICING_SYSTEM_LABELS: Record<VoicingSystem, string> = {
  close: "Close",
  drop2: "Drop 2",
  drop3: "Drop 3",
  "drop2-4": "Drop 2&4",
};

const POSITION_ORDER: SeventhStringPosition[] = ["low", "mid", "high"];

// Each system's mapping from position → its concrete string-set id. drop-3 and
// drop-2&4 only have the lower two positions; the user's selection of "high"
// silently produces no markers in those systems until they pick low or mid.
const STRING_SET_BY_POSITION: Record<
  VoicingSystem,
  Partial<Record<SeventhStringPosition, SeventhStringSet>>
> = {
  close: { low: "3-4-5-6", mid: "2-3-4-5", high: "1-2-3-4" },
  drop2: { low: "3-4-5-6", mid: "2-3-4-5", high: "1-2-3-4" },
  drop3: { low: "6-4-3-2", mid: "5-3-2-1" },
  "drop2-4": { low: "6-5-3-2", mid: "5-4-2-1" },
};

export function ChordShapesView({
  selectedKey,
  accidentalStyle,
  startFret,
  endFret,
  selectedChord,
  chordRowMode,
  onChordRowModeChange,
  enabledHighlights,
  controls,
}: ChordShapesViewProps) {
  const {
    selectedStringSets,
    toggleStringSet,
    selectedInversions,
    toggleInversion,
    selectedVoicingSystem,
    setSelectedVoicingSystem,
    selectedSeventhPositions,
    toggleSeventhPosition,
    selectedSeventhInversions,
    toggleSeventhInversion,
  } = controls;

  const mode: ChordShapesMode = chordRowMode;

  // Toggle row labels show the system's literal string-set id, but the click
  // toggles the underlying position so the choice persists across systems.
  const seventhPositionOptions = useMemo<
    ReadonlyArray<{ id: SeventhStringPosition; label: string }>
  >(() => {
    const map = STRING_SET_BY_POSITION[selectedVoicingSystem];
    return POSITION_ORDER.filter((p) => map[p] !== undefined).map((p) => ({
      id: p,
      label: map[p]!,
    }));
  }, [selectedVoicingSystem]);

  const activeSeventhStringSets = useMemo<SeventhStringSet[]>(() => {
    const map = STRING_SET_BY_POSITION[selectedVoicingSystem];
    return Array.from(selectedSeventhPositions)
      .map((p) => map[p])
      .filter((s): s is SeventhStringSet => s !== undefined);
  }, [selectedSeventhPositions, selectedVoicingSystem]);

  const markers = useMemo(() => {
    if (!selectedChord) return [];
    if (mode === "triads") {
      return buildChordShapeMarkers({
        mode: "triads",
        chord: selectedChord as DiatonicTriad,
        key: selectedKey,
        accidentalStyle,
        stringSets: Array.from(selectedStringSets),
        inversions: Array.from(selectedInversions),
        startFret,
        endFret,
      });
    }
    return buildChordShapeMarkers({
      mode: "sevenths",
      voicingSystem: selectedVoicingSystem,
      chord: selectedChord as DiatonicChord,
      key: selectedKey,
      accidentalStyle,
      stringSets: activeSeventhStringSets,
      inversions: Array.from(selectedSeventhInversions),
      startFret,
      endFret,
    });
  }, [
    mode,
    selectedChord,
    selectedKey,
    accidentalStyle,
    selectedStringSets,
    selectedInversions,
    selectedVoicingSystem,
    activeSeventhStringSets,
    selectedSeventhInversions,
    startFret,
    endFret,
  ]);

  // Dim unselected roles to the muted treatment instead of removing them.
  // The reference signal stays on the fretboard while the focus is on the
  // role(s) the user actually wants to study.
  const visibleMarkers = useMemo(
    () =>
      markers.map((m) =>
        enabledHighlights.has(m.role as HighlightableRole)
          ? m
          : { ...m, role: "muted" as const },
      ),
    [markers, enabledHighlights],
  );

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord shapes.
      </div>
    );
  }

  const activeSubSelectorEmpty = selectedChord
    ? mode === "triads"
      ? selectedStringSets.size === 0 || selectedInversions.size === 0
      : activeSeventhStringSets.length === 0 || selectedSeventhInversions.size === 0
    : false;

  const fretboardMessage = !selectedChord
    ? "Select a chord to view shapes."
    : activeSubSelectorEmpty
      ? "Select a string set to begin."
      : undefined;

  return (
    <div className="space-y-4">
      <ShapeHeader
        chordRowMode={chordRowMode}
        onChordRowModeChange={onChordRowModeChange}
        selectedChord={selectedChord}
      />
      {mode === "sevenths" ? (
        <VoicingSystemSelector
          selected={selectedVoicingSystem}
          onChange={setSelectedVoicingSystem}
        />
      ) : null}
      <SubSelectorRow
        mode={mode}
        selectedStringSets={selectedStringSets}
        selectedSeventhPositions={selectedSeventhPositions}
        selectedInversions={selectedInversions}
        selectedSeventhInversions={selectedSeventhInversions}
        seventhPositionOptions={seventhPositionOptions}
        onToggleStringSet={toggleStringSet}
        onToggleSeventhPosition={toggleSeventhPosition}
        onToggleInversion={toggleInversion}
        onToggleSeventhInversion={toggleSeventhInversion}
      />
      <Fretboard
        markers={visibleMarkers}
        startFret={startFret}
        endFret={endFret}
        emptyMessage={fretboardMessage}
      />
    </div>
  );
}

type ShapeHeaderProps = {
  chordRowMode: ChordRowMode;
  onChordRowModeChange: (mode: ChordRowMode) => void;
  selectedChord: DiatonicTriad | DiatonicChord | null;
};

function ShapeHeader({
  chordRowMode,
  onChordRowModeChange,
  selectedChord,
}: ShapeHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pb-3 border-b border-line">
      <span className="text-xs uppercase tracking-wide text-fg-muted">Showing</span>
      <div
        className="inline-flex rounded overflow-hidden border border-line"
        role="radiogroup"
        aria-label="Chord-shape language"
      >
        <button
          type="button"
          role="radio"
          aria-checked={chordRowMode === "triads"}
          onClick={() => onChordRowModeChange("triads")}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
            chordRowMode === "triads"
              ? "bg-surface-active text-fg-emphasis"
              : "bg-surface text-fg-muted hover:bg-surface-raised"
          }`}
        >
          Triad shapes
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={chordRowMode === "sevenths"}
          onClick={() => onChordRowModeChange("sevenths")}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
            chordRowMode === "sevenths"
              ? "bg-surface-active text-fg-emphasis"
              : "bg-surface text-fg-muted hover:bg-surface-raised"
          }`}
        >
          7th chord shapes
        </button>
      </div>
      {selectedChord ? (
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-fg-primary">{selectedChord.symbol}</span>
          <span className="text-fg-muted">{selectedChord.notes.join(" • ")}</span>
        </div>
      ) : (
        <span className="text-sm text-fg-faint italic">no chord selected</span>
      )}
    </div>
  );
}

type VoicingSystemSelectorProps = {
  selected: VoicingSystem;
  onChange: (system: VoicingSystem) => void;
};

function VoicingSystemSelector({ selected, onChange }: VoicingSystemSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs uppercase tracking-wide text-fg-muted">Voicing</span>
      <div
        className="inline-flex rounded overflow-hidden border border-line"
        role="radiogroup"
        aria-label="Voicing system"
      >
        {VOICING_SYSTEM_ORDER.map((system) => (
          <button
            key={system}
            type="button"
            role="radio"
            aria-checked={selected === system}
            onClick={() => onChange(system)}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              selected === system
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            {VOICING_SYSTEM_LABELS[system]}
          </button>
        ))}
      </div>
    </div>
  );
}

type SubSelectorRowProps = {
  mode: ChordShapesMode;
  selectedStringSets: Set<StringSet>;
  selectedSeventhPositions: Set<SeventhStringPosition>;
  selectedInversions: Set<Inversion>;
  selectedSeventhInversions: Set<SeventhInversion>;
  seventhPositionOptions: ReadonlyArray<{
    id: SeventhStringPosition;
    label: string;
  }>;
  onToggleStringSet: (id: StringSet) => void;
  onToggleSeventhPosition: (id: SeventhStringPosition) => void;
  onToggleInversion: (id: Inversion) => void;
  onToggleSeventhInversion: (id: SeventhInversion) => void;
};

function SubSelectorRow({
  mode,
  selectedStringSets,
  selectedSeventhPositions,
  selectedInversions,
  selectedSeventhInversions,
  seventhPositionOptions,
  onToggleStringSet,
  onToggleSeventhPosition,
  onToggleInversion,
  onToggleSeventhInversion,
}: SubSelectorRowProps) {
  if (mode === "triads") {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <StringSetToggles
          options={STRING_SET_OPTIONS}
          selected={selectedStringSets}
          onToggle={onToggleStringSet}
          ariaLabel="String groups"
        />
        <StringSetToggles
          options={INVERSION_OPTIONS}
          selected={selectedInversions}
          onToggle={onToggleInversion}
          ariaLabel="Inversions"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <StringSetToggles
        options={seventhPositionOptions}
        selected={selectedSeventhPositions}
        onToggle={onToggleSeventhPosition}
        ariaLabel="String groups"
      />
      <StringSetToggles
        options={SEVENTH_INVERSION_OPTIONS}
        selected={selectedSeventhInversions}
        onToggle={onToggleSeventhInversion}
        ariaLabel="Inversions"
      />
    </div>
  );
}
