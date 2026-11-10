import type { DisabledRoles } from "./components/Legend";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AccidentalToggle } from "./components/AccidentalToggle";
import { ThemeToggle } from "./components/ThemeToggle";
import { FretRangeControl } from "./components/FretRangeControl";
import { KeySelector } from "./components/KeySelector";
import { ALL_NOTES_KEY } from "./theory/notes";
import { ModeSelector } from "./components/ModeSelector";
import { ViewSelector } from "./components/ViewSelector";
import { TuningSelector } from "./components/TuningSelector";
import { UnavailableInTuning } from "./components/UnavailableInTuning";
import { CustomTuningModal } from "./components/CustomTuningModal";
import type { HighlightableRole } from "./theory/types";
import { ScaleDisplay } from "./components/ScaleDisplay";
import { AboutModal } from "./components/AboutModal";
import { ChordMap } from "./components/ChordMap";
import { ChordGrid } from "./components/ChordGrid";
import { ProgressionLane } from "./components/ProgressionLane";
import { PlayerTransport } from "./components/PlayerTransport";
import { SettingsMenu, SettingsRow } from "./components/SettingsMenu";
import type { ViewChrome } from "./views/ViewFrame";
import { useProgressionPlayer } from "./useProgressionPlayer";
import { ChordShapesView } from "./views/ChordShapesView";
import { NoteMapView } from "./views/NoteMapView";
import { ScalePositionsView } from "./views/ScalePositionsView";
import { isPentatonicAvailable } from "./theory/pentatonic";
import { MODE_NAMES, type Mode } from "./theory/modes";
import { useChordShapesState } from "./views/useChordShapesState";
import { useScalePositionsState } from "./views/useScalePositionsState";
import type { ViewId } from "./views/types";
import {
  DEFAULT_END_FRET,
  DEFAULT_END_FRET_MOBILE,
  MOBILE_BREAKPOINT,
} from "./theory/constants";
import {
  getTuning,
  tuningSupportsView,
  type AnyTuningId,
  type CustomTuning,
  type CustomTuningId,
} from "./theory/tuning";
import {
  loadCustomTunings,
  saveCustomTunings,
  type StoredState,
} from "./theory/customTuningStorage";
import {
  resolveChordRef,
  showsSeventh,
  toggleChordRef,
  type ChordRef,
  type ChordRowMode,
} from "./theory/harmony";
import { tonalReducer } from "./tonalReducer";

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ["root", "third", "fifth", "seventh"];

// Chord Shapes voices only triads in triads mode, so its 7th role is inert.
// Why the 7th highlight is off, shown on the disabled button.
const TRIADS_DISABLED_ROLES: DisabledRoles = new Map([
  ["seventh", "Triad shapes have no 7th. Switch the chord map to Sevenths to see it."],
]);
const NO_SEVENTH_ROLES: DisabledRoles = new Map([
  [
    "seventh",
    "Triads have no 7th. Switch the chord map to Sevenths, or pick a secondary dominant.",
  ],
]);

function createCustomTuningId(): CustomTuningId {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom:${ts}-${rand}`;
}

function pickCopyName(base: string, customs: readonly CustomTuning[]): string {
  const candidate = `${base} copy`;
  if (!customs.some((c) => c.name === candidate)) return candidate;
  let n = 2;
  while (customs.some((c) => c.name === `${base} copy ${n}`)) n++;
  return `${base} copy ${n}`;
}

function pickNextCustomName(customs: readonly CustomTuning[]): string {
  const usedNumbers = new Set<number>();
  for (const c of customs) {
    const match = c.name.match(/^Custom (\d+)$/);
    if (match) usedNumbers.add(parseInt(match[1], 10));
  }
  let n = 1;
  while (usedNumbers.has(n)) n++;
  return `Custom ${n}`;
}

function App() {
  const [tonal, dispatchTonal] = useReducer(tonalReducer, {
    key: "C",
    mode: "ionian",
    accidentalStyle: "sharp",
  });
  const { key: selectedKey, mode, accidentalStyle } = tonal;
  const [selectedView, setSelectedView] = useState<ViewId>("note-map");
  const [persisted, setPersisted] = useState<StoredState>(loadCustomTunings);
  const customs = persisted.tunings;
  const tuningId: AnyTuningId = persisted.selectedTuningId ?? "standard";
  const tuning = getTuning(tuningId, customs);

  const [modalState, setModalState] = useState<
    null | { mode: "create" } | { mode: "edit"; id: CustomTuningId }
  >(null);

  useEffect(() => {
    saveCustomTunings(persisted);
  }, [persisted]);

  function setTuningId(id: AnyTuningId) {
    setPersisted((prev) => ({ ...prev, selectedTuningId: id }));
  }
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  );
  const [enabledStrings, setEnabledStrings] = useState<ReadonlySet<number>>(
    () => new Set([0, 1, 2, 3, 4, 5]),
  );
  const toggleString = useCallback((stringIndex: number) => {
    setEnabledStrings((prev) => {
      const next = new Set(prev);
      if (next.has(stringIndex)) {
        next.delete(stringIndex);
      } else {
        next.add(stringIndex);
      }
      return next;
    });
  }, []);
  const [selectedChordRef, setSelectedChordRef] = useState<ChordRef | null>({
    tier: "diatonic",
    degree: 1,
  });
  const [chordRowMode, setChordRowMode] = useState<ChordRowMode>("triads");
  const player = useProgressionPlayer({
    selectedKey,
    mode,
    rowMode: chordRowMode,
    onChordChange: setSelectedChordRef,
  });
  const togglePlayback = player.toggle;
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
  const { setScaleType } = scalePositionsControls;

  // Pentatonic exists only in Ionian/Aeolian. Leaving those modes resets the
  // Scale Positions switch to Full, so returning doesn't silently re-enable it.
  // Done here rather than in the view because the view may be unmounted.
  const handleModeChange = useCallback(
    (nextMode: Mode) => {
      if (!isPentatonicAvailable(nextMode)) setScaleType("full");
      dispatchTonal({ type: "set-mode", mode: nextMode });
    },
    [setScaleType],
  );

  useEffect(() => {
    if (themeMode === "auto") {
      delete document.documentElement.dataset.theme;
    } else {
      document.documentElement.dataset.theme = themeMode;
    }
  }, [themeMode]);

  // Keyboard shortcuts: 1-7 select a diatonic chord, t/s toggle chord row mode.
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
        setSelectedChordRef((prev) =>
          toggleChordRef(prev, { tier: "diatonic", degree }),
        );
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

  // Space toggles the progression player. Ignored in form fields and on
  // buttons (a focused button already activates on Space, and dnd-kit's drag
  // handle uses Space to pick up a card), on key repeat (holding Space would
  // flip playback on and off). The transport is always in the header.
  useEffect(() => {
    function handleSpace(e: KeyboardEvent) {
      if (e.key !== " " || e.repeat) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (
        t instanceof HTMLInputElement ||
        t instanceof HTMLTextAreaElement ||
        t instanceof HTMLSelectElement ||
        t instanceof HTMLButtonElement
      ) {
        return;
      }
      e.preventDefault();
      togglePlayback();
    }
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  }, [togglePlayback]);

  const cycleTheme = useCallback(() => {
    setThemeMode((prev) =>
      prev === "auto" ? "light" : prev === "light" ? "dark" : "auto",
    );
  }, []);

  const handleFretRangeChange = useCallback((start: number, end: number) => {
    setStartFret(start);
    setEndFret(end);
  }, []);

  // The selection is a key-relative ChordRef, so "I'm focused on the IV
  // chord" stays anchored to degree 4 across key and mode changes even when
  // the chord's symbol changes.
  const selectedChord = useMemo(
    () =>
      selectedChordRef === null
        ? null
        : resolveChordRef(selectedChordRef, selectedKey, mode, chordRowMode),
    [selectedChordRef, chordRowMode, selectedKey, mode],
  );

  // When a key / mode / row-mode change leaves the ref pointing at an empty
  // cell (e.g. V7/♭VII after switching Mixolydian → Ionian), clear it so the
  // selection doesn't silently reappear later. Adjusting state during render
  // (instead of in an effect) avoids a frame with a stale selection. The All
  // key is skipped: it resolves nothing but shouldn't wipe the selection.
  const [resolvedFor, setResolvedFor] = useState({
    key: selectedKey,
    mode,
    rowMode: chordRowMode,
  });
  if (
    resolvedFor.key !== selectedKey ||
    resolvedFor.mode !== mode ||
    resolvedFor.rowMode !== chordRowMode
  ) {
    setResolvedFor({ key: selectedKey, mode, rowMode: chordRowMode });
    if (selectedKey !== ALL_NOTES_KEY && selectedChordRef !== null && !selectedChord) {
      setSelectedChordRef(null);
    }
  }

  const handleChordSelect = useCallback((ref: ChordRef) => {
    setSelectedChordRef((prev) => toggleChordRef(prev, ref));
  }, []);

  const toggleHighlight = useCallback((role: HighlightableRole) => {
    setEnabledHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }, []);

  // The 7th role is available in sevenths mode, and in triads mode while a
  // secondary dominant (always a 7th chord) is selected.
  const seventhShown = showsSeventh(chordRowMode, selectedChord);

  const effectiveHighlights = useMemo(
    () =>
      seventhShown
        ? enabledHighlights
        : new Set([...enabledHighlights].filter((r) => r !== "seventh")),
    [enabledHighlights, seventhShown],
  );

  const seventhDisabledRoles = seventhShown ? undefined : NO_SEVENTH_ROLES;

  const isAllNotesKey = selectedKey === ALL_NOTES_KEY;

  // The chord map follows every view as a reference; the progression is
  // built in the lane under the header, from the same grid.
  const chordArea = (
    <ChordMap
      selectedKey={selectedKey}
      modalMode={mode}
      rowMode={chordRowMode}
      onRowModeChange={setChordRowMode}
      selectedRef={selectedChordRef}
      onSelect={handleChordSelect}
    />
  );
  const addPicker = !isAllNotesKey && (
    <ChordGrid
      selectedKey={selectedKey}
      modalMode={mode}
      rowMode={chordRowMode}
      selectedRef={null}
      onPick={player.add}
      cardLabel={(chord) => `Add ${chord.symbol} to progression`}
      showResolution={false}
    />
  );

  // Handed to every view: the tabs (which the view extends with its own
  // sub-modes) and the scale summary shown in its legend.
  // The progression's next chord, during the preview window before a change.
  const previewChord =
    player.previewSlot === null
      ? null
      : (player.resolvedSlots[player.previewSlot]?.chord ?? null);
  const showsPreview =
    !isAllNotesKey && player.state.slots.length > 0 && player.state.preview > 0;

  const chrome: ViewChrome = {
    tabs: <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />,
    sharedSymbols: showsPreview ? ["nextChord"] : [],
    scaleName: isAllNotesKey ? "Scale" : `${selectedKey} ${MODE_NAMES[mode]}`,
    scale: isAllNotesKey ? (
      <p className="text-fg-muted text-sm">Pick a key to see scales and chords.</p>
    ) : (
      <ScaleDisplay
        selectedKey={selectedKey}
        selectedChord={selectedChord}
        enabledRoles={enabledHighlights}
        mode={mode}
      />
    ),
  };

  function renderView(): ReactNode {
    if (!tuningSupportsView(tuning, selectedView)) {
      return (
        <div className="space-y-3">
          {chrome.tabs}
          <UnavailableInTuning
            viewId={selectedView}
            tuning={tuning}
            onSwitchToStandard={() => setTuningId("standard")}
            onSwitchToNoteMap={() => setSelectedView("note-map")}
          />
        </div>
      );
    }
    switch (selectedView) {
      case "note-map":
        return (
          <>
            <NoteMapView
              chrome={chrome}
              tuning={tuning}
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={effectiveHighlights}
              onToggleRole={toggleHighlight}
              selectedChord={selectedChord}
              previewChord={previewChord}
              startFret={startFret}
              endFret={endFret}
              mode={mode}
              disabledRoles={seventhDisabledRoles}
              enabledStrings={enabledStrings}
              onToggleString={toggleString}
            />
            {chordArea}
          </>
        );
      case "scale-positions":
        return (
          <>
            <ScalePositionsView
              chrome={chrome}
              tuning={tuning}
              selectedKey={selectedKey}
              enabledHighlights={effectiveHighlights}
              onToggleRole={toggleHighlight}
              selectedChord={selectedChord}
              previewChord={previewChord}
              startFret={startFret}
              endFret={endFret}
              controls={scalePositionsControls}
              mode={mode}
              disabledRoles={seventhDisabledRoles}
              enabledStrings={enabledStrings}
              onToggleString={toggleString}
            />
            {chordArea}
          </>
        );
      case "chord-shapes":
        return (
          <>
            <ChordShapesView
              chrome={chrome}
              tuning={tuning}
              selectedKey={selectedKey}
              startFret={startFret}
              endFret={endFret}
              selectedChord={selectedChord}
              previewChord={previewChord}
              chordRowMode={chordRowMode}
              enabledHighlights={effectiveHighlights}
              onToggleRole={toggleHighlight}
              controls={chordShapesControls}
              modalMode={mode}
              // Triad shapes have no room for a 7th; CAGED voices a secondary
              // dominant as its full dom7 grip, so the 7th stays available.
              disabledRoles={
                chordRowMode === "triads" &&
                chordShapesControls.voicingStyle !== "caged"
                  ? TRIADS_DISABLED_ROLES
                  : seventhDisabledRoles
              }
              enabledStrings={enabledStrings}
              onToggleString={toggleString}
            />
            {chordArea}
          </>
        );
      default: {
        const _exhaustive: never = selectedView;
        return _exhaustive;
      }
    }
  }

  // Hidden announcement for screen readers — narrates the active tonal
  // context whenever key, mode, or the selected chord changes.
  const announcement = useMemo(() => {
    if (selectedKey === ALL_NOTES_KEY) return "Showing all notes";
    const modeName =
      mode === "ionian" ? "major" : mode.charAt(0).toUpperCase() + mode.slice(1);
    const chordPart =
      selectedChord !== null
        ? `, chord ${selectedChord.romanNumeral} ${selectedChord.symbol}`
        : "";
    return `${selectedKey} ${modeName}${chordPart}`;
  }, [selectedKey, mode, selectedChord]);

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
      {/* Header: tonal centre, transport and settings. Sticky from md up so
          play/stop stays reachable while scrolling the chord map. */}
      <header className="md:sticky md:top-0 z-20 bg-surface border-b border-line">
        <div className="max-w-[90rem] mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1">
              <h1 className="text-lg font-bold">Fretlab</h1>
              <button
                onClick={() => setShowAbout(true)}
                title="About Fretlab"
                aria-label="About Fretlab"
                className="p-1.5 pointer-coarse:p-3 rounded text-fg-muted hover:text-fg-secondary hover:bg-surface-raised cursor-pointer inline-flex items-center"
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
            </div>
            <div className="flex items-center gap-3">
              <KeySelector
                selectedKey={selectedKey}
                accidentalStyle={accidentalStyle}
                onKeyChange={(key) => dispatchTonal({ type: "set-key", key })}
              />
              <ModeSelector
                mode={mode}
                onModeChange={handleModeChange}
                disabled={isAllNotesKey}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <PlayerTransport player={player} />
            <SettingsMenu summary={`${tuning.name} · ${startFret}–${endFret}`}>
              <SettingsRow label="Accidentals">
                <AccidentalToggle
                  accidentalStyle={accidentalStyle}
                  onChange={(style) => dispatchTonal({ type: "set-accidental", style })}
                />
              </SettingsRow>
              <SettingsRow label="Theme">
                <ThemeToggle mode={themeMode} onCycle={cycleTheme} />
              </SettingsRow>
              <SettingsRow label="Tuning">
                <TuningSelector
                  tuningId={tuningId}
                  customs={customs}
                  onTuningChange={setTuningId}
                  onOpenCreateModal={() => setModalState({ mode: "create" })}
                  onOpenEditModal={(id) => setModalState({ mode: "edit", id })}
                />
              </SettingsRow>
              <SettingsRow label="Frets">
                <FretRangeControl
                  startFret={startFret}
                  endFret={endFret}
                  onChange={handleFretRangeChange}
                />
              </SettingsRow>
            </SettingsMenu>
          </div>
        </div>
        <div className="max-w-[90rem] mx-auto">
          <ProgressionLane player={player} noKey={isAllNotesKey} picker={addPicker} />
        </div>
      </header>

      <main
        id="main-content"
        tabIndex={-1}
        className="max-w-[90rem] mx-auto px-4 pt-3 pb-4 focus:outline-none"
        // Accepted inline-style exception: the preview rings' fade-in length
        // depends on tempo and chord length at runtime (see .preview-ring).
        style={{ "--preview-ramp": `${player.previewRampSeconds}s` } as CSSProperties}
      >
        {renderView()}
      </main>
      <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
      {modalState !== null && (
        <CustomTuningModal
          mode={modalState.mode}
          initialName={
            modalState.mode === "edit"
              ? (customs.find((c) => c.id === modalState.id)?.name ?? "")
              : pickNextCustomName(customs)
          }
          initialStrings={
            modalState.mode === "edit"
              ? (customs.find((c) => c.id === modalState.id)?.strings ?? tuning.strings)
              : tuning.strings
          }
          onSave={(name, strings) => {
            if (modalState.mode === "create") {
              const newTuning: CustomTuning = {
                id: createCustomTuningId(),
                name,
                strings,
                createdAt: Date.now(),
              };
              setPersisted((prev) => ({
                ...prev,
                tunings: [...prev.tunings, newTuning],
                selectedTuningId: newTuning.id,
              }));
            } else {
              setPersisted((prev) => ({
                ...prev,
                tunings: prev.tunings.map((c) =>
                  c.id === modalState.id ? { ...c, name, strings } : c,
                ),
              }));
            }
            setModalState(null);
          }}
          onSaveCopy={(name, strings) => {
            const copy: CustomTuning = {
              id: createCustomTuningId(),
              name: pickCopyName(name, customs),
              strings,
              createdAt: Date.now(),
            };
            setPersisted((prev) => ({
              ...prev,
              tunings: [...prev.tunings, copy],
              selectedTuningId: copy.id,
            }));
            setModalState(null);
          }}
          onDelete={() => {
            if (modalState.mode !== "edit") return;
            const id = modalState.id;
            setPersisted((prev) => ({
              ...prev,
              tunings: prev.tunings.filter((c) => c.id !== id),
              selectedTuningId:
                prev.selectedTuningId === id ? "standard" : prev.selectedTuningId,
            }));
            setModalState(null);
          }}
          onCancel={() => setModalState(null)}
        />
      )}
    </div>
  );
}

export default App;
