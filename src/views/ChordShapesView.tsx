import { useCallback, useMemo, useState } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { Legend } from "../components/Legend";
import { StringSetToggles } from "../components/StringSetToggles";
import { InversionPicker } from "../components/InversionPicker";
import { DEFAULT_END_FRET } from "../theory/constants";
import {
  buildChordShapeMarkers,
  type ChordShapesMode,
  type Inversion,
  type RootString,
  type StringSet,
} from "../theory/chordShapes";
import type { AccidentalStyle } from "../theory/notes";

type ChordShapesViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
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

export function ChordShapesView({
  selectedKey,
  accidentalStyle,
}: ChordShapesViewProps) {
  const [mode, setMode] = useState<ChordShapesMode>("triads");
  const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
    () => new Set<StringSet>(["1-2-3"]),
  );
  const [selectedRootStrings, setSelectedRootStrings] = useState<Set<RootString>>(
    () => new Set<RootString>(["6th"]),
  );
  const [inversion, setInversion] = useState<Inversion>("root");

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

  const markers = useMemo(() => {
    if (mode === "triads") {
      return buildChordShapeMarkers({
        mode: "triads",
        key: selectedKey,
        accidentalStyle,
        stringSets: Array.from(selectedStringSets),
        inversion,
      });
    }
    return buildChordShapeMarkers({
      mode: "shells",
      key: selectedKey,
      accidentalStyle,
      rootStrings: Array.from(selectedRootStrings),
    });
  }, [
    mode,
    selectedKey,
    accidentalStyle,
    selectedStringSets,
    selectedRootStrings,
    inversion,
  ]);

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord shapes.
      </div>
    );
  }

  const activeSubSelectorEmpty =
    mode === "triads" ? selectedStringSets.size === 0 : selectedRootStrings.size === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="inline-flex rounded overflow-hidden border border-line"
          role="radiogroup"
          aria-label="Mode"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === "triads"}
            onClick={() => setMode("triads")}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "triads"
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            Triads
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "shells"}
            onClick={() => setMode("shells")}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "shells"
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            Shells
          </button>
        </div>

        {mode === "triads" ? (
          <StringSetToggles
            options={STRING_SET_OPTIONS}
            selected={selectedStringSets}
            onToggle={toggleStringSet}
            ariaLabel="String groups"
          />
        ) : (
          <StringSetToggles
            options={ROOT_STRING_OPTIONS}
            selected={selectedRootStrings}
            onToggle={toggleRootString}
            ariaLabel="Root strings"
          />
        )}

        {mode === "triads" && (
          <InversionPicker inversion={inversion} onChange={setInversion} />
        )}
      </div>

      {activeSubSelectorEmpty ? (
        <div className="text-fg-faint text-center py-20">
          Select a string set to begin.
        </div>
      ) : (
        <Fretboard markers={markers} fretCount={DEFAULT_END_FRET} />
      )}

      <Legend readOnly />
    </div>
  );
}
