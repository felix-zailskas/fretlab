# Open Tunings — Design

## Goal

Add support for non-standard tunings to Fretlab, starting with **Open G**
(D-G-D-G-B-D). Design the data model and state plumbing so that adding
further presets (Open D, DADGAD, Drop D, etc.) and eventually
user-defined custom tunings is a small, localized change rather than a
refactor.

## Scope

### In scope (this PR)

- Tuning data model (`Tuning`, `TuningId`, preset registry).
- Per-tuning view-support map.
- Open G preset.
- Tuning selector UI in the top-bar preferences row.
- NoteMap renders correctly under any tuning.
- ScalePositions and ChordShapes are gated behind standard tuning, with
  disabled tabs and explanatory tooltips.
- Tightening `selectedView` to a `ViewId` type throughout the app.
- Random-tuning property tests proving NoteMap's theory layer is fully
  tuning-agnostic.

### Out of scope (explicit non-goals)

- Custom (per-string user-defined) tunings.
- Additional preset tunings beyond Open G.
- Persistence of tuning across sessions (matches existing global-prefs
  behavior — none persist).
- Pedagogy specific to alternate tunings (open-tuning chord shapes,
  slide positions). Would be a new view, not modifications to existing
  ones.
- 7-string / bass / other string-count support. `Tuning.strings` is
  fixed at length 6.
- A general `Note` type unifying sharp and flat spellings (`ChromaticNote`
  is sharp-only by construction).

## Background

### What's tuning-agnostic, what isn't

| View              | Tuning-agnostic? | Why                                                                |
|-------------------|------------------|--------------------------------------------------------------------|
| **NoteMap**       | Yes              | Renders notes at frets given the open-string note. Pure mapping.   |
| **ScalePositions**| No               | Built on the CAGED system — a standard-tuning shape pedagogy.      |
| **ChordShapes**   | No               | Built on drop-2/drop-3/close voicing systems — jazz pedagogy tied to standard tuning's specific intervals (4ths + the B-string major-3rd oddity). |

In open and altered tunings, chord and scale vocabularies are
fundamentally different (slide positions, partial barres, single-barre
I-chords). They're not the same shapes transposed. Generalizing
ScalePositions or ChordShapes to non-standard tunings would mean
designing new pedagogical content, which is its own project.

NoteMap is the one view where "see your scale on this neck" is the same
task regardless of tuning, and is exactly what someone exploring a new
tuning needs first.

### Why the data model still needs to be general from day one

Even though only NoteMap supports non-standard tunings in this PR, the
*state* (`tuningId`, the `Tuning` object) lives at App level and is
plumbed through the theory layer. Adding a future tuning-aware view —
or supporting Drop D in ScalePositions (where most CAGED shapes still
work) — should be a wiring change, not a refactor.

## Data model

### `ChromaticNote` type (new export from `src/theory/notes.ts`)

```ts
export type ChromaticNote = (typeof CHROMATIC_SCALE)[number];
// → "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B"
```

Used by `Tuning.strings` to prevent typos at the type level. Also used
to tighten `getNoteAtFret`'s return type (it always returns a value
from `CHROMATIC_SCALE`). Not propagated further: most existing `string`
note parameters in the codebase intentionally accept flat spellings
(`"Bb"`, `"Eb"`), which `ChromaticNote` does not include.

### `ViewId` type (new file `src/views/types.ts`)

```ts
export type ViewId = "note-map" | "scale-positions" | "chord-shapes";
```

Replaces stringly-typed `selectedView` in `App.tsx` and `ViewSelector.tsx`.
Required by the design (the tuning module's `VIEWS_BY_TUNING` map is
keyed by `ViewId`), and a healthy cleanup independently — the
`selectedView` switch in `App.tsx` becomes exhaustive, so adding a 4th
view in the future is a compile error until handled.

### Tuning module (new file `src/theory/tuning.ts`)

```ts
import type { ChromaticNote } from "./notes";
import type { ViewId } from "../views/types";

export type TuningId = "standard" | "open-g";

export type Tuning = {
  id: TuningId;
  name: string;
  strings: readonly [
    ChromaticNote, ChromaticNote, ChromaticNote,
    ChromaticNote, ChromaticNote, ChromaticNote,
  ]; // low-pitch → high-pitch
};

// Single source of truth for all preset tunings. Keyed by TuningId so
// the type system enforces every id has a definition and vice-versa.
export const TUNINGS: Record<TuningId, Tuning> = {
  standard: { id: "standard", name: "Standard", strings: ["E", "A", "D", "G", "B", "E"] },
  "open-g":  { id: "open-g",  name: "Open G",   strings: ["D", "G", "D", "G", "B", "D"] },
};

// Per-tuning view support. Adding a new tuning = add a row here.
// Adding a new view = touch each row's set. Compiler enforces both.
export const VIEWS_BY_TUNING: Record<TuningId, ReadonlySet<ViewId>> = {
  standard: new Set<ViewId>(["note-map", "scale-positions", "chord-shapes"]),
  "open-g": new Set<ViewId>(["note-map"]),
};

export function tuningSupportsView(tuningId: TuningId, view: ViewId): boolean {
  return VIEWS_BY_TUNING[tuningId].has(view);
}
```

Design points:

- `STANDARD_TUNING` (the `readonly string[]` constant in `notes.ts`) is
  **deleted**. Every consumer migrates to `TUNINGS.standard.strings` or
  receives a `Tuning` via prop.
- `TUNINGS` and `VIEWS_BY_TUNING` are both `Record<TuningId, ...>`, so
  the compiler enforces exhaustive coverage when `TuningId` extends.
- `tuningSupportsView` is the only predicate. No per-tuning
  `isStandardTuning` / `isOpenG` proliferation.

### Future custom tunings

When custom tunings ship, `TuningId` extends with a `"custom"` member,
`VIEWS_BY_TUNING.custom` defaults to `note-map`-only, and custom
`Tuning` objects are constructed at runtime with user-chosen string
notes. No structural change to the design above.

## State and wiring

### App-level state

Tuning is a standalone `useState<TuningId>` at `App.tsx`, parallel to
`fretRange` and `themeMode`. It does **not** go into `tonalReducer` —
the reducer handles tonal-center concerns (key/mode/accidental) that
interact with each other. Tuning is independent.

```ts
const [tuningId, setTuningIdRaw] = useState<TuningId>("standard");

// Wrapped setter: if switching to a tuning that doesn't support the
// active view, fall back to note-map. Co-locating this with the setter
// keeps it explicit (no useEffect spooky action) and avoids a transient
// frame where a disabled tab is selected.
const setTuningId = useCallback((nextId: TuningId) => {
  setTuningIdRaw(nextId);
  if (!tuningSupportsView(nextId, selectedView)) {
    setSelectedView("note-map");
  }
}, [selectedView]);
```

### Threading

- NoteMap receives `tuning: Tuning` as a prop, replacing the implicit
  `STANDARD_TUNING` import.
- ScalePositions and ChordShapes do not change in this PR. They're
  gated at the App level; when reachable, they're guaranteed to be on
  standard tuning.
- The theory-layer helper `getChordTonePositions` (in `chordTones.ts`)
  gains a `tuning: Tuning` parameter. All call sites pass it
  explicitly. This keeps the theory layer pure — no module-level
  coupling to a specific tuning.

### Persistence

Out of scope. Existing global preferences (key, theme, fret range,
accidental) don't persist across reloads either; tuning matches that
behavior. Adding persistence is a separate concern that should cover
all of them together.

## UI

### `TuningSelector` (new component)

Compact dropdown rendered in the top-bar preferences group, between
`ThemeToggle` and `FretRangeControl`. Lists every entry in `TUNINGS` by
`name`, current selection bolded. Mobile-friendly hit target
(`pointer-coarse:py-3`, mirroring `ViewSelector`).

### `ViewSelector` (modified)

Receives a new `disabledViews: ReadonlySet<ViewId>` prop, derived from
the inversion of `VIEWS_BY_TUNING[tuningId]`. Disabled tabs render
with:

- Reduced opacity.
- `disabled` on the underlying `<button>`.
- `aria-disabled="true"`.
- `title` attribute carrying the explanation:
  - ScalePositions: *"Available in standard tuning only — uses the CAGED system."*
  - ChordShapes: *"Available in standard tuning only — uses jazz voicing systems."*

### Auto-fallback behavior

If the user is on ScalePositions or ChordShapes and selects Open G, the
view auto-switches to NoteMap (handled by the wrapped `setTuningId` in
App). Switching back to standard does not auto-restore the previous
view — the user re-selects.

## Testing

### New tests

`tuning.test.ts`:

- `TUNINGS` has an entry for every `TuningId` (TS-enforced; assert at
  runtime as belt-and-suspenders).
- `tuningSupportsView` truth table for every (tuning × view) pair.
- Invariant: `tuningSupportsView("standard", v)` is `true` for every
  `ViewId`.

`chordTones.test.ts` — additions:

- Fixed exotic-tuning fixtures: e.g., `["C","C","C","C","C","C"]`
  (all-unison), `["C","D","E","F","G","A"]` (whole-step ladder).
  Asserts the function doesn't rely on standard tuning's interval
  pattern.
- Randomized-tuning property test: a small loop (~20 iterations,
  fixed seed for reproducibility) generating a random 6-note tuning
  from `CHROMATIC_SCALE`, then asserting the universal invariant: for
  every returned `(string, fret)` position,
  `getNoteAtFret(tuning.strings[stringIdx], fret)` enharmonically
  equals the queried chord tone. If a helper silently regresses to
  using a hardcoded `STANDARD_TUNING`, the random tuning produces wrong
  positions and the invariant fails.

`notes.test.ts` — additions:

- Migrate the existing octave-at-fret-12 loop from `STANDARD_TUNING` to
  `TUNINGS.standard.strings`.
- Apply randomization: for any 6-note tuning, `getNoteAtFret(s, 12) === s`
  (enharmonic) for every string `s`.

### Tests unchanged

`chordShapes.test.ts`, `positions.test.ts`, `modes.test.ts`, and the
core (non-tuning-related) parts of `chordTones.test.ts` are untouched.
They cover theory-layer logic that is and remains standard-tuning-bound.

### Manual verification (no React component test framework in repo)

The repo has no `.test.tsx` files; introducing one is out of scope for
this PR. Component behavior is verified manually in the dev server
against a checklist:

- Switch to Open G while on ChordShapes → view falls back to NoteMap.
- Switch to Open G while on NoteMap → fretboard re-renders with
  D-G-D-G-B-D.
- Open G active → ScalePositions and ChordShapes tabs are visibly
  disabled, unclickable, tooltips show on hover.
- Switch back to standard → tabs re-enabled.
- Open G + NoteMap + key=G major → highlighted G/B/D notes appear on
  open strings (sanity check).

## Implementation order

Each step ends with a green build (lint, typecheck, tests).

1. **Add types, no behavior change.** Create `src/views/types.ts`
   (`ViewId`), export `ChromaticNote` from `notes.ts`. Migrate
   `App.tsx` and `ViewSelector.tsx` to use `ViewId`. Convert the
   `selectedView` branch in `App.tsx` to an exhaustive switch. Tighten
   `getNoteAtFret` return type to `ChromaticNote`.

2. **Create the tuning module.** Add `src/theory/tuning.ts` with
   `Tuning`, `TuningId`, `TUNINGS`, `VIEWS_BY_TUNING`,
   `tuningSupportsView`. Add `tuning.test.ts`. Nothing imports from it
   yet.

3. **Generalize the theory layer.** Give `getChordTonePositions` a
   `tuning: Tuning` parameter; update its caller to pass
   `TUNINGS.standard`. Add random-tuning property tests. Migrate
   `notes.test.ts` to `TUNINGS.standard.strings`. Delete
   `STANDARD_TUNING` from `notes.ts`. (The deletion is type-safe:
   stale imports become compile errors.)

4. **Wire tuning state into App.** Add `tuningId` state, `setTuningId`
   with auto-fallback, pass `TUNINGS[tuningId]` to `NoteMapView`. No
   UI yet; default is `"standard"`.

5. **Add UI.** Build `TuningSelector` component, render in top bar
   between `ThemeToggle` and `FretRangeControl`. Add `disabledViews`
   prop to `ViewSelector` and render disabled tabs with reduced
   opacity, `aria-disabled`, and `title`.

6. **Manual verification.** Run the checklist. Run lint, prettier,
   tests. Open PR.
