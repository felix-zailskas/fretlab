# Configurable Fret Range

## Goal

Let the user pick the visible fret range (`startFret`, `endFret`) so they can zoom into
a specific stretch of the neck (e.g., 5–12 for box-drilling) or expand to a longer neck
(e.g., 0–24 to see octave-up shapes). Defaults stay `[0, 15]` so the app behaves
identically to today out of the box.

## Why this design

- The marker-generation pipelines (`chordTones`, `chordShapes`, Note Map's loop) and the
  renderer already iterate against `FRET_COUNT`. The single global fret bound is the
  only thing standing between the current single- range neck and a configurable one.
  Most of the work is plumbing.
- Practice patterns vary: solo-position drills want a narrow window; full-neck CAGED
  exploration wants the maximum span; chord-shape ascending wants default 0–15. One
  control covers all three.
- A global control keeps the mental model simple — one neck context applies across every
  view, the same way the key selector does.

## Architecture

```
constants.ts
  ├── DEFAULT_END_FRET = 15  (renamed from FRET_COUNT)
  └── MAX_FRET = 24

App.tsx (state owner)
  ├── [startFret, setStartFret]   default 0
  ├── [endFret,   setEndFret]      default DEFAULT_END_FRET
  ├── <FretRangeControl />          (new) header popover
  └── views                          receive startFret + endFret as props
        ├── NoteMapView
        ├── ScalePositionsView
        └── ChordShapesView (under the chord-centric redesign)
              └── Fretboard           clips render to [startFret, endFret]
```

- **`MAX_FRET = 24`** is the absolute UI ceiling — the longest commonly-built electric
  neck. Bumping it later is a one-line constant change.
- **`DEFAULT_END_FRET = 15`** preserves the "feels like today" default. The rename
  clarifies what the constant means: a default, not a hard ceiling.
- **`FRET_COUNT` is removed everywhere.** Call sites use `DEFAULT_END_FRET` for
  default-prop purposes or thread the user's `endFret` through.
- **Bounds are inclusive.** `startFret = 5, endFret = 12` means notes at frets 5 _and_
  12 are both visible. `startFret = 0` is the only value that exposes the pre-nut "open
  string" zone.

## State threading

`App.tsx` owns `startFret` and `endFret` next to `selectedKey`, `accidentalStyle`, and
chord-row state. Every view receives both as props. Each view passes them into:

1. The marker-generation pipeline it calls.
2. The `<Fretboard>` component it renders.

The range persists across view switches and key changes — it lives in App, not in the
views.

## Marker pipelines

**Contract change:** every marker generator takes `startFret` and `endFret` and emits
only markers inside `[startFret, endFret]`.

- **`chordTones.ts buildChordToneMarkers`** — outer loop becomes
  `for (let fret = startFret; fret <= endFret; fret++)`. Otherwise unchanged.
- **`chordShapes.ts`** — `getRootFrets` returns candidates inside `[startFret, endFret]`
  instead of `[0, FRET_COUNT]`. The cap-at-fits check uses the same range. The
  two-octave-emission case (chord-centric redesign) naturally stays available when both
  candidates fit; narrowing the range drops one or both.
- **`NoteMapView`'s inline iteration** — same range bounds.

The visible range is **the** input that determines which markers exist. There is no
"compute everywhere, hide outside" branch in the pipelines.

## Position windows (Scale Positions)

`getPositionWindow(key, position)` (single window) is replaced by:

```ts
function getPositionWindows(
  key: string,
  position: PositionId,
  startFret: number,
  endFret: number,
): FretWindow[];
```

**Algorithm:**

1. Compute the natural shifted window `(low0, high0) = (cMajorWindow + keyOffset)`.
2. For each octave shift `k ∈ {-1, 0, 1, 2}` (sufficient to cover `[0, MAX_FRET=24]` for
   any cMajorWindow), test `(low0 + 12k, high0 + 12k)`.
3. Emit if **fully inside** `[startFret, endFret]`.

Returned windows carry the same `id` and `label` (`P1 — C`, `P5 — D`, ...) so two
octaves of P5 both render with the same bracket label. Every emitted window is fully on
the visible neck — no clipping, no slivers (matches the existing wrap rule's principle
of "no useless slivers").

**Examples (key=C, MAX_FRET=24):**

- C major P1 with range `[0, 24]` → `[[0, 3], [12, 15]]` (two octaves).
- C major P1 with range `[0, 11]` → `[[0, 3]]` (only the lower octave fits).
- C major P5 with range `[0, 24]` → `[[9, 13]]` (octave-up `[21, 25]` doesn't fit, so
  it's dropped — matches Question 5 / option A).
- C major P1 with range `[5, 11]` → `[]` (no octave fits fully).

**`computeOverlapZones`** updates similarly: pairwise intersection across every
(position, octave) window the user sees. Algorithm structure unchanged; numeric
expectations in tests are refreshed.

## UI control

New component `src/components/FretRangeControl.tsx`. Renders in the header next to the
AccidentalToggle.

**Trigger button:**

```
  Frets: 0–15  ▾
```

The label updates live as values change so the user sees the current range without
opening the popover.

**Popover contents:**

```
  Start fret  [  0 ]  ▲▼
  End fret    [ 15 ]  ▲▼

  [ Reset ]
```

**Behavior:**

- **Live update.** Values commit on input/stepper change; the fretboard re-renders
  immediately. No "Apply" button.
- **Validation.** `startFret ∈ [0, MAX_FRET - 1]`,
  `endFret ∈ [startFret + 1, MAX_FRET]`. Inputs clamp on blur. While the user is typing
  an in-between invalid state (cleared field, partial number), preserve the previous
  valid value rather than crashing.
- **Reset** sets `startFret=0`, `endFret=DEFAULT_END_FRET=15`.
- **Click-outside** dismisses the popover. **Escape** also closes it.
- The popover does not block keyboard interaction with the rest of the page while open —
  it's a lightweight panel, not a modal.

## Renderer changes

`Fretboard.tsx`:

```ts
type FretboardProps = {
  markers: NoteMarker[];
  startFret?: number; // default 0
  endFret?: number; // default DEFAULT_END_FRET
  positionWindows?: ReadonlyArray<PositionWindow>;
  overlapZones?: ReadonlyArray<OverlapZone>;
};
```

- Coordinate math becomes `(absoluteFret - startFret) * fretSpacing`. The number of
  slots drawn is `endFret - startFret` (each slot houses the notes for one fret index).
  Open notes (fret 0) live in the pre-nut zone, only rendered when `startFret === 0`.
- Fret-number labels along the bottom render `startFret..endFret`.
- When `startFret > 0`, the leftmost vertical line acts as a "starting boundary" (the
  fret wire just below `startFret`); there's no pre-nut affordance and no open-string
  markers.
- Markers and position windows received from upstream are already inside the visible
  range; a defensive bounds check keeps a stray marker from drawing off-board.

`FretMarkers.tsx`:

```ts
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOT_FRETS = [12, 24];
```

Component takes `startFret` and `endFret`, renders only inlays inside that range. Inlay
positions are absolute (fret 12 always renders at fret 12, not at "the first inlay");
they don't shift with the visible window.

## Files touched

**New:**

- `src/components/FretRangeControl.tsx`

**Modified:**

- `src/theory/constants.ts` — rename `FRET_COUNT` → `DEFAULT_END_FRET`, add
  `MAX_FRET = 24`.
- `src/theory/chordTones.ts` — pipeline takes `startFret, endFret`.
- `src/theory/chordShapes.ts` — pipeline takes `startFret, endFret`; helpers use the
  range.
- `src/theory/positions.ts` — `getPositionWindow` → `getPositionWindows` (array).
  `computeOverlapZones` updated for the new window-list return.
- `src/theory/chordTones.test.ts`, `chordShapes.test.ts`, `positions.test.ts` — update
  for new APIs and add narrow-range / wide-range cases.
- `src/App.tsx` — add range state; render `<FretRangeControl />`; pass range into views.
- `src/views/NoteMapView.tsx`, `ScalePositionsView.tsx`, `ChordShapesView.tsx` — accept
  `startFret, endFret` props; thread into pipelines and `<Fretboard>`.
- `src/components/Fretboard/Fretboard.tsx` — new prop API; updated coordinate math.
- `src/components/Fretboard/FretMarkers.tsx` — extended inlay vocabulary; range-aware
  rendering.

**Out of scope:**

- Persisting the range across page reloads (localStorage) — defer until users ask.
- Per-view range overrides (e.g., Scale Positions auto-narrowing). Possible v2; v1 is
  global only.
- A "presets" menu (Open / Mid / High / Full) — possible v2.

## Test plan

**Theory (unit tests):**

- `chordTones.test.ts`:
  - All existing tests pass `startFret=0, endFret=15` explicitly.
  - New: narrowed range `[5, 12]` → strictly fewer markers, none outside the range.
- `chordShapes.test.ts`:
  - All existing tests pass `startFret=0, endFret=15` explicitly.
  - New: narrowed range that drops a placement which would otherwise fit at `[0, 15]`.
  - New: wide range `[0, 24]` for a low-rooted chord — both candidate root frets fit,
    both placements emitted.
- `positions.test.ts`:
  - Existing `getPositionWindow` tests rewritten for `getPositionWindows`' array return.
  - New: C major P1 in `[0, 24]` → two octaves `[[0, 3], [12, 15]]`.
  - New: C major P1 in `[0, 11]` → single octave `[[0, 3]]`.
  - New: C major P1 in `[5, 11]` → `[]`.
  - New: keys whose natural window falls between octaves still emit the correct
    visible-octave list (sweep all 12 keys × 5 positions in the default range and assert
    every result is fully inside `[0, 15]`, mirrors today's invariant test).
  - `computeOverlapZones` numeric expectations refreshed for multi-octave windows.

**Manual verification:**

1. Default state: range `[0, 15]` shows the same fretboard as today across all three
   views.
2. Open the popover; set `startFret=5, endFret=12`. Note Map: only frets 5–12 render.
   Scale Positions: positions whose only fitting octaves don't fit inside the range
   disappear (empty-state overlay).
3. Set `endFret=24`. Inlays at 15, 17, 19, 21 visible; double-dot at 24 appears. C major
   Scale Positions: P1 renders twice (`[0, 3]` and `[12, 15]`), both with bracket label
   `P1 — C`.
4. Chord Shapes (post chord-centric redesign): C major I, all inversions, `[1-2-3]`
   string set, range `[0, 24]` — additional octaves of triad shapes appear above
   fret 15.
5. Reset button → `[0, 15]`.
6. Validation: clearing the input keeps the previous value; entering 25 clamps to 24;
   entering startFret > endFret snaps appropriately.
7. Switch views with a non-default range set — range persists.
8. Switch keys with a non-default range set — range persists; visible placements update
   to reflect the new key.
