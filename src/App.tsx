import { useCallback, useMemo, useState } from "react";
import { AccidentalToggle } from "./components/AccidentalToggle";
import { FretRangeControl } from "./components/FretRangeControl";
import { KeySelector, ALL_NOTES_KEY } from "./components/KeySelector";
import { ModeSelector } from "./components/ModeSelector";
import { ViewSelector } from "./components/ViewSelector";
import { Legend, type HighlightableRole } from "./components/Legend";
import { ScaleDisplay } from "./components/ScaleDisplay";
import { DiatonicChords, type ChordRowMode } from "./components/DiatonicChords";
import { ChordShapesView } from "./views/ChordShapesView";
import { NoteMapView } from "./views/NoteMapView";
import { ScalePositionsView } from "./views/ScalePositionsView";
import { useChordShapesState } from "./views/useChordShapesState";
import { useScalePositionsState } from "./views/useScalePositionsState";
import type { AccidentalStyle } from "./theory/notes";
import { DEFAULT_END_FRET } from "./theory/constants";
import {
  getModalDiatonicChords,
  getModalDiatonicTriads,
  type Mode,
} from "./theory/modes";

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ["root", "third", "fifth", "seventh"];

const ENHARMONIC_KEY_SWAP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

function App() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [mode, setMode] = useState<Mode>("ionian");
  const [selectedView, setSelectedView] = useState("note-map");
  const [accidentalStyle, setAccidentalStyle] = useState<AccidentalStyle>("flat");
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  );
  const [selectedChordDegree, setSelectedChordDegree] = useState<number | null>(1);
  const [chordRowMode, setChordRowMode] = useState<ChordRowMode>("triads");
  const [startFret, setStartFret] = useState(0);
  const [endFret, setEndFret] = useState(DEFAULT_END_FRET);

  // Per-view selector state, lifted here so it survives tab switches. Each
  // view's hook bundles its own useState calls + handlers.
  const chordShapesControls = useChordShapesState();
  const scalePositionsControls = useScalePositionsState();

  const handleFretRangeChange = useCallback((start: number, end: number) => {
    setStartFret(start);
    setEndFret(end);
  }, []);

  // Selected chord is computed against the (key, mode) pair so the chord
  // row's chord set reflects the modal scale's harmony. selectedChordDegree
  // persists across mode changes — the user's "I'm focused on the IV chord"
  // intent stays anchored to degree 4 even when the chord's symbol changes.
  const selectedChord = useMemo(() => {
    if (selectedChordDegree === null || selectedKey === ALL_NOTES_KEY) return null;
    const chords =
      chordRowMode === "sevenths"
        ? getModalDiatonicChords(selectedKey, mode, accidentalStyle)
        : getModalDiatonicTriads(selectedKey, mode, accidentalStyle);
    return chords[selectedChordDegree - 1] ?? null;
  }, [selectedChordDegree, chordRowMode, selectedKey, mode, accidentalStyle]);

  const handleChordSelect = useCallback((degree: number) => {
    setSelectedChordDegree((prev) => (prev === degree ? null : degree));
  }, []);

  const toggleHighlight = useCallback((role: HighlightableRole) => {
    setEnabledHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }, []);

  const handleAccidentalChange = useCallback((next: AccidentalStyle) => {
    setAccidentalStyle((prev) => {
      if (prev !== next) {
        // Swap the selected key to its enharmonic equivalent so we stay on the same scale.
        setSelectedKey((prevKey) =>
          prevKey === ALL_NOTES_KEY
            ? prevKey
            : (ENHARMONIC_KEY_SWAP[prevKey] ?? prevKey),
        );
      }
      return next;
    });
  }, []);

  const isAllNotesKey = selectedKey === ALL_NOTES_KEY;

  return (
    <div className="min-h-screen bg-surface text-fg-primary">
      <header className="max-w-[90rem] mx-auto">
        {/* Top bar: title + global preferences (sharp/flat, fret range) */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-line">
          <h1 className="text-xl font-bold">Fretlab</h1>
          <div className="flex items-center gap-4">
            <AccidentalToggle
              accidentalStyle={accidentalStyle}
              onChange={handleAccidentalChange}
            />
            <FretRangeControl
              startFret={startFret}
              endFret={endFret}
              onChange={handleFretRangeChange}
            />
          </div>
        </div>

        {/* Focal-control row: tonal-center selectors */}
        <div className="px-4 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">
                Key
              </label>
              <KeySelector
                selectedKey={selectedKey}
                accidentalStyle={accidentalStyle}
                onKeyChange={setSelectedKey}
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">
                Mode
              </label>
              <ModeSelector
                mode={mode}
                onModeChange={setMode}
                disabled={isAllNotesKey}
              />
            </div>
          </div>
          <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
          <ScaleDisplay
            selectedKey={selectedKey}
            accidentalStyle={accidentalStyle}
            selectedChord={selectedChord}
            enabledRoles={enabledHighlights}
            mode={mode}
          />
        </div>
      </header>

      <main className="max-w-[90rem] mx-auto px-4 pb-4">
        {selectedView === "note-map" && (
          <>
            <NoteMapView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={enabledHighlights}
              selectedChord={selectedChord}
              startFret={startFret}
              endFret={endFret}
              mode={mode}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
              mode={chordRowMode}
              onModeChange={setChordRowMode}
              modalMode={mode}
            />
          </>
        )}
        {selectedView === "scale-positions" && (
          <>
            <ScalePositionsView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={enabledHighlights}
              selectedChord={selectedChord}
              startFret={startFret}
              endFret={endFret}
              controls={scalePositionsControls}
              mode={mode}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
              mode={chordRowMode}
              onModeChange={setChordRowMode}
              modalMode={mode}
            />
          </>
        )}
        {selectedView === "chord-shapes" && (
          <>
            <ChordShapesView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              startFret={startFret}
              endFret={endFret}
              selectedChord={selectedChord}
              chordRowMode={chordRowMode}
              onChordRowModeChange={setChordRowMode}
              enabledHighlights={enabledHighlights}
              controls={chordShapesControls}
              modalMode={mode}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
              mode={chordRowMode}
              onModeChange={setChordRowMode}
              modalMode={mode}
            />
          </>
        )}
        {selectedView !== "note-map" &&
          selectedView !== "scale-positions" &&
          selectedView !== "chord-shapes" && (
            <div className="text-fg-faint text-center py-20">Coming soon</div>
          )}
      </main>
    </div>
  );
}

export default App;
