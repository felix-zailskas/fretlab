import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { Legend, type HighlightableRole } from "../components/Legend";
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
import type { Tuning } from "../theory/tuning";
import type { DiatonicTriad, DiatonicChord } from "../theory/scales";
import { type Mode } from "../theory/modes";
import {
  type ChordShapesControls,
  type SeventhStringPosition,
} from "./useChordShapesState";

type ChordShapesViewProps = {
  tuning: Tuning;
  selectedKey: string;
  startFret: number;
  endFret: number;
  selectedChord: DiatonicTriad | DiatonicChord | null;
  chordRowMode: ChordRowMode;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: Set<HighlightableRole>;
  controls: ChordShapesControls;
  modalMode: Mode;
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
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
        tuning,
        modalMode,
        chord: selectedChord as DiatonicTriad,
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
      chord: selectedChord as DiatonicChord,
      key: selectedKey,
      stringSets: activeSeventhStringSets,
      inversions: Array.from(selectedSeventhInversions),
      enabledStrings,
      startFret,
      endFret,
    });
  }, [
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
    ? mode === "triads"
      ? selectedStringSets.size === 0 || selectedInversions.size === 0
      : activeSeventhStringSets.length === 0 || selectedSeventhInversions.size === 0
    : false;

  const fretboardMessage =
    selectedKey === ALL_NOTES_KEY
      ? "Select a key to view chord shapes."
      : !selectedChord
        ? "Select a chord to view shapes."
        : activeSubSelectorEmpty
          ? "Select a string set to begin."
          : undefined;

  return (
    <div className="space-y-2 md:space-y-4">
      <Fretboard
        markers={visibleMarkers}
        startFret={startFret}
        endFret={endFret}
        emptyMessage={fretboardMessage}
        tuning={tuning}
        enabledStrings={enabledStrings}
        onToggleString={onToggleString}
      />
      <div className="flex flex-wrap items-center gap-x-3 md:gap-x-6 gap-y-2 md:gap-y-3 min-h-9 md:max-[1319px]:min-h-20">
        <Legend
          enabledRoles={enabledHighlights}
          onToggleRole={onToggleRole}
          disabledRoles={disabledRoles}
        />
        <span aria-hidden="true" className="w-px h-6 bg-line self-center" />
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
      </div>
    </div>
  );
}

type VoicingSystemSelectorProps = {
  selected: VoicingSystem;
  onChange: (system: VoicingSystem) => void;
};

function VoicingSystemSelector({ selected, onChange }: VoicingSystemSelectorProps) {
  return (
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
