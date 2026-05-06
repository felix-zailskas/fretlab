import { useCallback, useMemo, useState } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { type HighlightableRole } from "../components/Legend";
import { StringSetToggles } from "../components/StringSetToggles";
import { type ChordRowMode } from "../components/DiatonicChords";
import {
  buildChordShapeMarkers,
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
  { id: "first", label: "1st" },
  { id: "second", label: "2nd" },
];

export function ChordShapesView({
  selectedKey,
  accidentalStyle,
  startFret,
  endFret,
  selectedChord,
  chordRowMode,
  enabledHighlights,
}: ChordShapesViewProps) {
  const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
    () => new Set<StringSet>(["1-2-3"]),
  );
  const [selectedRootStrings, setSelectedRootStrings] = useState<Set<RootString>>(
    () => new Set<RootString>(["6th"]),
  );
  const [selectedInversions, setSelectedInversions] = useState<Set<Inversion>>(
    () => new Set<Inversion>(["root", "first", "second"]),
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

  const mode = chordRowMode === "sevenths" ? "shells" : "triads";

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
      mode: "shells",
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

  const visibleMarkers = useMemo(
    () => markers.filter((m) => enabledHighlights.has(m.role as HighlightableRole)),
    [markers, enabledHighlights],
  );

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord shapes.
      </div>
    );
  }

  if (!selectedChord) {
    return (
      <div className="space-y-4">
        <SubSelectorRow
          mode={mode}
          selectedStringSets={selectedStringSets}
          selectedRootStrings={selectedRootStrings}
          selectedInversions={selectedInversions}
          onToggleStringSet={toggleStringSet}
          onToggleRootString={toggleRootString}
          onToggleInversion={toggleInversion}
        />
        <div className="text-fg-faint text-center py-20">
          Select a chord to view shapes.
        </div>
      </div>
    );
  }

  const activeSubSelectorEmpty =
    mode === "triads"
      ? selectedStringSets.size === 0 || selectedInversions.size === 0
      : selectedRootStrings.size === 0;

  return (
    <div className="space-y-4">
      <SubSelectorRow
        mode={mode}
        selectedStringSets={selectedStringSets}
        selectedRootStrings={selectedRootStrings}
        selectedInversions={selectedInversions}
        onToggleStringSet={toggleStringSet}
        onToggleRootString={toggleRootString}
        onToggleInversion={toggleInversion}
      />
      {activeSubSelectorEmpty ? (
        <div className="text-fg-faint text-center py-20">
          Select a string set to begin.
        </div>
      ) : (
        <Fretboard markers={visibleMarkers} startFret={startFret} endFret={endFret} />
      )}
    </div>
  );
}

type SubSelectorRowProps = {
  mode: "triads" | "shells";
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
