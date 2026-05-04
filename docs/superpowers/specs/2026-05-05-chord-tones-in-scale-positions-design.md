# Scale Positions — Design

> Originally specced as **"Chord Tones in Scale Positions"**. Consolidated
> with the planned standalone Scale Positions tab once the multi-position +
> box-annotation implementation made the split redundant — the same data and
> controls serve both practice intents (CAGED-box study and chord-tone
> targeting). The spec filename is preserved for git/history continuity.

## Goal

Implement the consolidated **Scale Positions** view (tab id `scale-positions`),
the highest-practice-value Fretlab view. It answers two questions in one:

- *"What does the C-shape (P3) box look like in this key, and where does it
  overlap with the A-shape (P4)?"* — pure CAGED-box study.
- *"I'm soloing over ii in G in position 3 — which notes do I target?"* —
  chord-tone targeting inside one or more boxes.

A chord is selected → chord-relative R / 3 / 5 / 7 light up. No chord
selected → the major scale's 1 / 3 / 5 / 7 light up (effectively the I-chord
mapping). Same controls, same visualization.

This spec also introduces the **CAGED position model** as shared theory
infrastructure.

## Constraints

- The fretboard renderer stays dumb (consumes `NoteMarker[]` only). All
  computation lives in the theory layer or the view.
- Existing components are reused untouched: `Fretboard`, `KeySelector`,
  `AccidentalToggle`, `DiatonicChords`, `Legend`.
- No state-management library; React `useState` lifted appropriately is
  sufficient.
- View-switching must remain instant (no blocking computation, no animations).

## Architecture

Two layers, mirroring the existing project structure:

**Theory layer (new).** Pure functions, no React, fully unit-testable.
- `src/theory/constants.ts` — exports `FRET_COUNT = 15` as the single source of
  truth for the highest fret rendered. Replaces the inline `FRET_COUNT = 15` in
  `NoteMapView.tsx` and the `fretCount = 15` default in `Fretboard.tsx`.
- `src/theory/positions.ts` — CAGED position model: `getPositionWindow`,
  `isInPositionWindow`, `CAGED_POSITIONS`, plus the `PositionId` type.
- `src/theory/chordTones.ts` — three exports:
  - `roleFromChordTone(note, chord, intervalRole)`, extracted from the inline
    logic currently in `NoteMapView.tsx` (the `chordIndices` block in the
    marker `useMemo`) so `ScalePositionsView` and `NoteMapView` share one
    implementation.
  - `buildChordToneMarkers({ key, chord, accidentalStyle, positions,
    showContext, enabledHighlights })`: the full marker-computation pipeline
    described under **Marker Computation** below, returned as
    `NoteMarker[]`. Pure function. Returns `[]` when `key === ALL_NOTES_KEY`
    or when `positions.length === 0`. The `positions` argument is a
    `ReadonlyArray<PositionId>` — every selected position contributes to the
    visible window; a fret is "in window" if it falls in **any** selected
    position's range.
  - `HIGHLIGHTABLE` set, currently inlined in `NoteMapView.tsx`, hoisted here
    so both views apply the same Legend-toggle demotion logic from a single
    source.

**View layer (new).**
- `src/views/ScalePositionsView.tsx` — composes the inputs into `NoteMarker[]`,
  computes `positionWindows` and `overlapZones`, and
  feeds the existing `Fretboard`. Owns local UI state (selected position, focus
  mode). Reads global state (key, accidental, chord degree, enabled highlights)
  via props.

**Component layer (new).**
- `src/components/PositionToggles.tsx` — independent toggle buttons for
  P1–P5. Each button toggles its position on/off. No "All" option. Styled
  like the existing `Legend` toggles for visual consistency.

**Component layer (modified).**
- `src/components/Fretboard/Fretboard.tsx` — accepts two new optional props:
  - `positionWindows?: ReadonlyArray<{ id: string; low: number; high: number;
    label: string }>` — soft tinted rectangle behind the strings spanning each
    selected position's fret window, with a compact label (e.g., `P1 — E`)
    above it.
  - `overlapZones?: ReadonlyArray<{ id: string; low: number; high: number }>`
    — additional rectangles drawn over the position windows with brighter
    fill and stroke. Reinforces the transition zones between adjacent CAGED
    boxes — they're connected pieces of one continuous map, not islands.

**Wire-up.**
- `App.tsx` adds a route case for `selectedView === 'scale-positions'`
  rendering `ScalePositionsView`. The old `'chord-tones'` tab id is removed
  from `ViewSelector` (the consolidated view replaces both originally-planned
  entries). Other unimplemented tabs remain "Coming soon" placeholders.

## CAGED Position Model

Each position is a fret-window anchored to C major, plus a CAGED shape label for
display. Numbers come straight from the **Scale Positions** section of
`docs/design/2026-05-05-app-vision-and-view-designs.md` (the P1–P5 fret-range
list).

```ts
export type PositionId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
export type CagedShape = 'E' | 'D' | 'C' | 'A' | 'G';

export const CAGED_POSITIONS: ReadonlyArray<{
  id: PositionId;
  shape: CagedShape;
  cMajorWindow: readonly [low: number, high: number];
}> = [
  { id: 'P1', shape: 'E', cMajorWindow: [0, 3]  },
  { id: 'P2', shape: 'D', cMajorWindow: [2, 5]  },
  { id: 'P3', shape: 'C', cMajorWindow: [4, 8]  },
  { id: 'P4', shape: 'A', cMajorWindow: [7, 10] },
  { id: 'P5', shape: 'G', cMajorWindow: [9, 13] },
];
```

A position **contains** a fret cell when (1) the fret falls inside the window
for that key, and (2) the note at that cell is in the major scale of the key.
There is no per-string offset table — every in-key note within the fret window
is part of the box. This gives correct visible results for all 5 standard CAGED
shapes.

### Wrap rule

For each `(key, position)`, compute the natural shifted window
`[low, high] = [c_low + offset, c_high + offset]` where
`offset = chromaticIndex(key) - chromaticIndex('C')` in `[0, 11]`.

1. **`high ≤ FRET_COUNT`** — fits → use as-is.
2. **`low ≤ FRET_COUNT < high`** — straddles → keep the natural window, clip
   the rendered fret-range to `[low, FRET_COUNT]`. The user sees the box at
   its real high-fret location, partially cut off at the end of the visible
   neck.
3. **`low > FRET_COUNT`** — entirely past the end → wrap once by `-12` to
   `[low - 12, high - 12]`.

This rule favors the high neck where possible and only wraps when the box would
otherwise be invisible. Same scale tones either way — wrapping is musically
equivalent.

Worked examples (`FRET_COUNT = 15`):

| Key | Position | Natural | Result | Case |
| --- | -------- | ------- | ------ | ---- |
| C | P5 | `[9, 13]`  | `[9, 13]`  | fits |
| G | P4 | `[14, 17]` | `[14, 15]` | straddle clip |
| G | P5 | `[16, 20]` | `[4, 8]`   | wrap |
| A | P5 | `[18, 22]` | `[6, 10]`  | wrap |
| B | P3 | `[15, 19]` | `[15, 15]` | straddle clip (single fret) |
| B | P5 | `[20, 24]` | `[8, 12]`  | wrap |

### API

```ts
function getPositionWindow(
  key: string,
  position: PositionId,
): readonly [low: number, high: number];

function isInPositionWindow(
  key: string,
  position: PositionId,
  fret: number,
): boolean;
```

## View Layout

Top to bottom on the Chord Tones tab — primary arrangement matches Note Map
(fretboard, then Legend, then chord row) for visual cohesion across views.
View-specific controls sit *inside* `ScalePositionsView` above its fretboard.

1. **Inside the view, above the fretboard:**
   - **Position toggles** (new `PositionToggles`) — P1 / P2 / P3 / P4 / P5,
     each independently toggleable. Default: `P1` only.
   - **Show context notes toggle** — "Show context notes" checkbox. Off by
     default (only chord-tone-bearing positions render). On = also render
     in-key notes outside any selected position with role `'muted'` (faint
     context).
2. **Fretboard** (existing, with new `positionWindows` annotation prop).
   When zero positions are selected, an empty-state message replaces the
   fretboard ("Toggle a position to begin").
3. **Legend** (existing) — R / 3 / 5 / 7 toggles, already wired through
   `enabledHighlights`. Sits below the fretboard, matching Note Map.
4. **Diatonic chord row** (existing `DiatonicChords`) — pick chord degree.
   Sits below the Legend, matching Note Map.

## State

**Global, in `App.tsx`** (already exists):
- `selectedKey`, `accidentalStyle`, `selectedChordDegree`, `enabledHighlights`.

**Local to `ScalePositionsView`:**
- `selectedPositions: Set<PositionId>` — default `new Set(['P1'])`. Multi-select
  via independent toggles; empty set is legal and triggers the empty state.
- `showContext: boolean` — default `false`. When true, in-key notes outside
  the selected positions render with role `'muted'`.

These are tab-local. Switching to another tab and back resets them. Per the
vision doc's fast-switching constraint, that's acceptable; persistence isn't a
goal.

## Marker Computation

The pure function `buildChordToneMarkers` (in `src/theory/chordTones.ts`) is
called from `ScalePositionsView` inside a `useMemo` keyed on every input.
Pseudocode:

```
inputs: key, accidentalStyle, chord, enabledHighlights, positions, showContext

if (key === ALL_NOTES_KEY) return []          // empty-state branch
if (positions.length === 0) return []         // empty-state branch

for each (string = 0..5, fret = 0..FRET_COUNT):
  noteAtFret = getNoteAtFret(STANDARD_TUNING[string], fret)
  intervalRole = getIntervalRole(key, noteAtFret)
  if (intervalRole === null) continue          // out of key — drop entirely

  inWindow = positions.some(p => isInPositionWindow(key, p, fret))
  if (!inWindow && !showContext) continue      // hide outside-position notes

  role = roleFromChordTone(noteAtFret, chord, intervalRole)
        // -> 'root' | 'third' | 'fifth' | 'seventh' | 'scale'

  if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role)) {
    role = 'scale'                             // legend toggle off → demote
  }
  if (!inWindow) {
    role = 'muted'                             // outside-window context override
  }

  push { string, fret, note: getDisplayName(noteAtFret, key, accidentalStyle), role }
```

`roleFromChordTone` is extracted from `NoteMapView.tsx` (the `chordIndices`
block in the marker `useMemo`) into `src/theory/chordTones.ts` and imported by
both views.

## Edge Cases

**`ALL_NOTES_KEY` selected.** The view requires a key. Render an empty state
("Select a key to view scale positions") instead of the fretboard. Matches
the existing pattern in `DiatonicChords.tsx` and `ScaleDisplay.tsx`, which
already hide themselves in this state.

**Zero positions selected.** Render an empty state ("Toggle a position to
begin") instead of the fretboard. The position toggles remain visible above
the message so the user can re-enable a position.

**Position window contains no chord tones.** E.g., B major P3 clips to
`[15, 15]`, and on that single fret the chord's R/3/5 may not appear. The view
just renders the scale tones that do land in the window. No special message —
honest behavior.

**Multiple overlapping position windows.** When two or more selected
positions share frets (e.g., P1 `[0,3]` and P2 `[2,5]` share frets 2–3), the
view computes the overlap range explicitly and emits an `overlapZones` entry
to the Fretboard. The Fretboard renders the overlap with a brighter fill
plus visible border so the transition zone reads clearly — reinforcing that
the CAGED shapes are connected pieces of one continuous map. Pairwise
overlap is sufficient for adjacent CAGED positions in any key (3-way and
higher overlaps don't occur with the ≤4-fret-wide windows defined here, but
the implementation handles them correctly via per-pair computation).

## Testing

**`src/theory/positions.test.ts`:**
- `getPositionWindow` for representative `(key, position)` pairs covering every
  wrap case: C/all-5 (fits), G/P4 (straddle), G/P5 (wrap), A/P5 (wrap), B/P3
  (straddle to single fret), B/P5 (wrap).
- `isInPositionWindow` boundary cases (low edge, high edge, just outside).
- Exhaustive sanity: for every `(key, position)` pair (12 × 5 = 60), assert
  `0 ≤ low ≤ high ≤ FRET_COUNT`.
- `computeOverlapZones(key, positions)`:
  - `['P1','P2']` in C → returns `[{ low: 2, high: 3 }]` (the shared frets).
  - `['P1','P3']` in C → returns `[]` (non-overlapping).
  - `['P1','P2','P3']` in C → returns 2 entries (P1∩P2 and P2∩P3).
  - Single-position selection → returns `[]`.
  - Empty positions → returns `[]`.

**`src/theory/chordTones.test.ts`:**

Tests `roleFromChordTone`:
- Worked example from vision doc's Chord Tones section: G major, ii (Am7) →
  A=root, C=third, E=fifth, G=seventh.
- Non-chord scale tone (e.g., D in that context) returns `'scale'`.

Tests `buildChordToneMarkers` (covers what would otherwise be a component
test; the view itself is a thin composition layer with no logic of its own,
so we test the pure marker output instead of mounting the view):
- `key === ALL_NOTES_KEY` → returns `[]`.
- `positions = []` (empty array) → returns `[]`.
- `key='C'`, `degree=2` (Dm7), `positions=['P1']`, `showContext=false`,
  `enabledHighlights = {root, third, fifth}`: every marker has `fret ≤ 3`;
  chord tones D / F / A have roles `root` / `third` / `fifth`; other in-window
  in-key scale tones have role `'scale'`; no muted markers exist.
- Same inputs but `showContext=true`: at least one marker exists with
  `fret > 3` and role `'muted'`; in-window markers retain their chord-tone
  roles.
- Same inputs but `enabledHighlights` includes `seventh`: C (Dm7's ♭7) appears
  with role `'seventh'`.
- Same inputs but `enabledHighlights` excludes `fifth`: A appears with role
  `'scale'` instead of `'fifth'` (Legend toggle demotion).
- `positions=['P1', 'P2']`: markers exist across the union of both windows
  (frets 0–5 in C major); a fret in both windows still renders once with its
  chord-tone role.
- `positions=['P1','P2','P3','P4','P5']`: markers exist across the full
  fretboard.

(No jsdom / @testing-library install needed — no component test required.)

**Manual verification before claiming done:**
- `npm run dev`, open Chord Tones tab.
- Cycle keys C / G / A / B (covers fits / straddle / wrap), 7 chord degrees,
  P1–P5 toggles (single and multiple), context toggle on/off, Legend R/3/5/7
  toggles.
- Toggle all positions off → empty-state message appears, position toggles
  remain interactive.
- Switch to "All Notes" key → empty state shows.
- Switch tabs back and forth → no animation lag, global state persists, local
  state resets.

**Pre-commit gate:** `npm run lint`, `tsc -b`, `npm test` — all pass.

## What's Explicitly Not in This Spec

- Per-string CAGED fret-offset encoding (the simpler fret-window encoding is
  sufficient for visible correctness).
- Persistence of position / context toggle across tab switches.
- Three-way+ overlap-zone visual differentiation (pairwise overlap rendering
  handles the only cases that occur with the current CAGED window widths;
  adding per-N-overlap distinct treatment is out of scope).

## References

- Vision doc: `docs/design/2026-05-05-app-vision-and-view-designs.md`
  (sections **Chord Tones in Scale Positions** and **Scale Positions** — the
  latter for the canonical CAGED fret-range list).
- Theory layer types: `src/theory/types.ts`
  (`NoteMarker`, `NoteDisplayRole`).
- Existing chord-tone resolver to extract: the marker `useMemo` in
  `src/views/NoteMapView.tsx`.
- Step 1 spec (precedent for theory-layer-driven views):
  `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md`.
