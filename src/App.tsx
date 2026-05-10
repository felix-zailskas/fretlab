import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { AccidentalToggle } from "./components/AccidentalToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { FretRangeControl } from "./components/FretRangeControl";
import { KeySelector, ALL_NOTES_KEY } from "./components/KeySelector";
import { ModeSelector } from "./components/ModeSelector";
import { ViewSelector } from "./components/ViewSelector";
import { TuningSelector } from "./components/TuningSelector";
import { UnavailableInTuning } from "./components/UnavailableInTuning";
import { type HighlightableRole } from "./components/Legend";
import { ScaleDisplay } from "./components/ScaleDisplay";
import { AboutModal } from "./components/AboutModal";
import { DiatonicChords, type ChordRowMode } from "./components/DiatonicChords";
import { ChordShapesView } from "./views/ChordShapesView";
import { NoteMapView } from "./views/NoteMapView";
import { ScalePositionsView } from "./views/ScalePositionsView";
import { useChordShapesState } from "./views/useChordShapesState";
import { useScalePositionsState } from "./views/useScalePositionsState";
import type { ViewId } from "./views/types";
import {
  DEFAULT_END_FRET,
  DEFAULT_END_FRET_MOBILE,
  MOBILE_BREAKPOINT,
} from "./theory/constants";
import { TUNINGS, tuningSupportsView, type TuningId } from "./theory/tuning";
import { getModalDiatonicChords, getModalDiatonicTriads } from "./theory/modes";
import { tonalReducer } from "./tonalReducer";

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ["root", "third", "fifth", "seventh"];

function App() {
  const [tonal, dispatchTonal] = useReducer(tonalReducer, {
    key: "C",
    mode: "ionian",
    accidentalStyle: "sharp",
  });
  const { key: selectedKey, mode, accidentalStyle } = tonal;
  const [selectedView, setSelectedView] = useState<ViewId>("note-map");
  const [tuningId, setTuningId] = useState<TuningId>("standard");
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  );
  const [selectedChordDegree, setSelectedChordDegree] = useState<number | null>(1);
  const [chordRowMode, setChordRowMode] = useState<ChordRowMode>("triads");
  const [showAbout, setShowAbout] = useState(false);
  const [startFret, setStartFret] = useState(0);
  const [endFret, setEndFret] = useState(() =>
    window.innerWidth < MOBILE_BREAKPOINT ? DEFAULT_END_FRET_MOBILE : DEFAULT_END_FRET,
  );
  const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");

  // Per-view selector state, lifted here so it survives tab switches. Each
  // view's hook bundles its own useState calls + handlers.
  const chordShapesControls = useChordShapesState();
  const scalePositionsControls = useScalePositionsState();

  useEffect(() => {
    if (themeMode === "auto") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = themeMode;
    }
  }, [themeMode]);

  // Keyboard shortcuts: 1-7 select chord degree, t/s toggle chord row mode.
  // Skipped if focus is in an input/textarea so we don't hijack typing.
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key >= "1" && e.key <= "7") {
        const degree = parseInt(e.key, 10);
        setSelectedChordDegree((prev) => (prev === degree ? null : degree));
        return;
      }

      const lower = e.key.toLowerCase();
      if (lower === "t") {
        setChordRowMode("triads");
        return;
      }
      if (lower === "s") {
        setChordRowMode("sevenths");
        return;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const cycleTheme = useCallback(() => {
    setThemeMode((prev) =>
      prev === "auto" ? "light" : prev === "light" ? "dark" : "auto",
    );
  }, []);

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

  const effectiveHighlights = useMemo(
    () =>
      chordRowMode === "triads"
        ? new Set([...enabledHighlights].filter((r) => r !== "seventh"))
        : enabledHighlights,
    [enabledHighlights, chordRowMode],
  );

  const seventhDisabledRoles = useMemo(
    () =>
      chordRowMode === "triads" ? new Set<HighlightableRole>(["seventh"]) : undefined,
    [chordRowMode],
  );

  const isAllNotesKey = selectedKey === ALL_NOTES_KEY;

  function renderView(): ReactNode {
    if (!tuningSupportsView(tuningId, selectedView)) {
      return (
        <UnavailableInTuning
          viewId={selectedView}
          tuningId={tuningId}
          onSwitchToStandard={() => setTuningId("standard")}
        />
      );
    }
    switch (selectedView) {
      case "note-map":
        return (
          <>
            <NoteMapView
              tuning={TUNINGS[tuningId]}
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={effectiveHighlights}
              onToggleRole={toggleHighlight}
              selectedChord={selectedChord}
              startFret={startFret}
              endFret={endFret}
              mode={mode}
              disabledRoles={seventhDisabledRoles}
            />
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
        );
      case "scale-positions":
        return (
          <>
            <ScalePositionsView
              tuning={TUNINGS[tuningId]}
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={effectiveHighlights}
              onToggleRole={toggleHighlight}
              selectedChord={selectedChord}
              startFret={startFret}
              endFret={endFret}
              controls={scalePositionsControls}
              mode={mode}
              disabledRoles={seventhDisabledRoles}
            />
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
        );
      case "chord-shapes":
        return (
          <>
            <ChordShapesView
              tuning={TUNINGS[tuningId]}
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              startFret={startFret}
              endFret={endFret}
              selectedChord={selectedChord}
              chordRowMode={chordRowMode}
              enabledHighlights={effectiveHighlights}
              onToggleRole={toggleHighlight}
              controls={chordShapesControls}
              modalMode={mode}
              disabledRoles={seventhDisabledRoles}
            />
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
        );
      default: {
        const _exhaustive: never = selectedView;
        return _exhaustive;
      }
    }
  }

  // Hidden announcement for screen readers — narrates the active tonal
  // context whenever key, mode, or chord-degree changes.
  const announcement = useMemo(() => {
    if (selectedKey === ALL_NOTES_KEY) return "Showing all notes";
    const modeName =
      mode === "ionian" ? "major" : mode.charAt(0).toUpperCase() + mode.slice(1);
    const chordPart =
      selectedChordDegree !== null ? `, chord degree ${selectedChordDegree}` : "";
    return `${selectedKey} ${modeName}${chordPart}`;
  }, [selectedKey, mode, selectedChordDegree]);

  return (
    <div className="min-h-screen bg-surface text-fg-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-surface-raised focus:text-fg-primary focus:rounded focus:shadow-lg"
      >
        Skip to fretboard
      </a>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <header className="max-w-[90rem] mx-auto">
        {/* Top bar: title + global preferences (sharp/flat, fret range) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 px-4 py-3 border-b border-line">
          <h1 className="text-xl font-bold">Fretlab</h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-4">
            <AccidentalToggle
              accidentalStyle={accidentalStyle}
              onChange={(style) => dispatchTonal({ type: "set-accidental", style })}
            />
            <ThemeToggle mode={themeMode} onCycle={cycleTheme} />
            <button
              onClick={() => setShowAbout(true)}
              title="About Fretlab"
              aria-label="About Fretlab"
              className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer inline-flex items-center"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M7 6.5v3.5M7 4v.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <TuningSelector tuningId={tuningId} onTuningChange={setTuningId} />
            <FretRangeControl
              startFret={startFret}
              endFret={endFret}
              onChange={handleFretRangeChange}
            />
          </div>
        </div>

        {/* Focal-control row: tonal-center selectors */}
        <div className="px-4 pt-4 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4 xl:gap-12">
            <div>
              <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">
                Key
              </label>
              <KeySelector
                selectedKey={selectedKey}
                accidentalStyle={accidentalStyle}
                onKeyChange={(key) => dispatchTonal({ type: "set-key", key })}
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">
                Mode
              </label>
              <ModeSelector
                mode={mode}
                onModeChange={(mode) => dispatchTonal({ type: "set-mode", mode })}
                disabled={isAllNotesKey}
              />
            </div>
          </div>
          {/* min-h reserves the ScaleDisplay's natural height so the fretboard
              doesn't shift up when "All" is selected and only the short hint
              renders on the right. */}
          <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 min-h-[50px]">
            <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
            {isAllNotesKey ? (
              <p className="text-fg-muted text-sm">
                Pick a key above to see scales and chords.
              </p>
            ) : (
              <ScaleDisplay
                selectedKey={selectedKey}
                accidentalStyle={accidentalStyle}
                selectedChord={selectedChord}
                enabledRoles={enabledHighlights}
                mode={mode}
              />
            )}
          </div>
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-[90rem] mx-auto px-4 pb-4 focus:outline-none"
      >
        {renderView()}
      </main>
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
}

export default App;
