import { useCallback, useMemo, useState } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { type HighlightableRole } from "../components/Legend";
import { StringSetToggles } from "../components/StringSetToggles";
import { type ChordRowMode } from "../components/DiatonicChords";
import {
  buildChordShapeMarkers,
  type ChordShapesMode,
  type Inversion,
  type RootString,
  type StringSet,
} from "../theory/chordShapes";
import type { AccidentalStyle } from "../theory/notes";
import type { DiatonicTriad, DiatonicChord } from "../theory/scales";

type ChordShapesViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  startFret: number;
  endFret: number;
  selectedChord: DiatonicTriad | DiatonicChord | null;
  chordRowMode: ChordRowMode;
  onChordRowModeChange: (mode: ChordRowMode) => void;
  enabledHighlights: Set<HighlightableRole>;
};

const STRING_SET_OPTIONS: ReadonlyArray<{ id: StringSet; label: string }> = [
  { id: "1-2-3", label: "1-2-3" },
  { id: "2-3-4", label: "2-3-4" },
  { id: "3-4-5", label: "3-4-5" },
  { id: "4-5-6", label: "4-5-6" },
];

const ROOT_STRING_OPTIONS: ReadonlyArray<{ id: RootString; label: string }> = [
  { id: "6th", label: "6th-string-root" },
  { id: "5th", label: "5th-string-root" },
];

const INVERSION_OPTIONS: ReadonlyArray<{ id: Inversion; label: string }> = [
  { id: "root", label: "Root" },
  { id: "first", label: "1st Inversion" },
  { id: "second", label: "2nd Inversion" },
];

export function ChordShapesView({
  selectedKey,
  accidentalStyle,
  startFret,
  endFret,
  selectedChord,
  chordRowMode,
  onChordRowModeChange,
  enabledHighlights,
}: ChordShapesViewProps) {
  const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
    () => new Set<StringSet>(["1-2-3"]),
  );
  const [selectedRootStrings, setSelectedRootStrings] = useState<Set<RootString>>(
    () => new Set<RootString>(["6th"]),
  );
  const [selectedInversions, setSelectedInversions] = useState<Set<Inversion>>(
    () => new Set<Inversion>(["root"]),
  );

  const toggleStringSet = useCallback((id: StringSet) => {
    setSelectedStringSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleRootString = useCallback((id: RootString) => {
    setSelectedRootStrings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleInversion = useCallback((id: Inversion) => {
    setSelectedInversions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const mode: ChordShapesMode = chordRowMode;

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
      chord: selectedChord as DiatonicChord,
      key: selectedKey,
      accidentalStyle,
      rootStrings: Array.from(selectedRootStrings),
      startFret,
      endFret,
    });
  }, [
    mode,
    selectedChord,
    selectedKey,
    accidentalStyle,
    selectedStringSets,
    selectedRootStrings,
    selectedInversions,
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
      : selectedRootStrings.size === 0
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
      <SubSelectorRow
        mode={mode}
        selectedStringSets={selectedStringSets}
        selectedRootStrings={selectedRootStrings}
        selectedInversions={selectedInversions}
        onToggleStringSet={toggleStringSet}
        onToggleRootString={toggleRootString}
        onToggleInversion={toggleInversion}
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

type SubSelectorRowProps = {
  mode: ChordShapesMode;
  selectedStringSets: Set<StringSet>;
  selectedRootStrings: Set<RootString>;
  selectedInversions: Set<Inversion>;
  onToggleStringSet: (id: StringSet) => void;
  onToggleRootString: (id: RootString) => void;
  onToggleInversion: (id: Inversion) => void;
};

function SubSelectorRow({
  mode,
  selectedStringSets,
  selectedRootStrings,
  selectedInversions,
  onToggleStringSet,
  onToggleRootString,
  onToggleInversion,
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
        options={ROOT_STRING_OPTIONS}
        selected={selectedRootStrings}
        onToggle={onToggleRootString}
        ariaLabel="Root strings"
      />
    </div>
  );
}
