# Chord Tones in Scale Positions — Design

## Goal

Implement the **Chord Tones in Scale Positions** view (tab id `chord-tones`), the
highest-practice-value view per the build priority order. The view answers the
question *"I'm soloing over chord X in key Y in position Z — which notes do I
target?"* by rendering a chord's R / 3 / 5 (and optional 7) against a faint
major-scale background, optionally constrained to a CAGED position window.

This spec also introduces the **CAGED position model** as shared theory
infrastructure that the future Scale Positions tab will reuse.

The Scale Positions tab itself, multi-position selection, overlap-zone
highlighting, and any other CAGED features beyond a single-position window are
**out of scope**.

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
- `src/theory/chordTones.ts` — two exports:
  - `roleFromChordTone(note, chord, intervalRole)`, extracted from the inline
    logic currently in `NoteMapView.tsx` (the `chordIndices` block in the
    marker `useMemo`) so `ChordTonesView` and `NoteMapView` share one
    implementation.
  - `buildChordToneMarkers({ key, chord, accidentalStyle, position,
    showOutside, enabledHighlights })`: the full marker-computation pipeline
    described under **Marker Computation** below, returned as
    `NoteMarker[]`. Pure function. Returns `[]` when `key === ALL_NOTES_KEY`.
  - `HIGHLIGHTABLE` set, currently inlined in `NoteMapView.tsx`, hoisted here
    so both views apply the same Legend-toggle demotion logic from a single
    source.

**View layer (new).**
- `src/views/ChordTonesView.tsx` — composes the inputs into `NoteMarker[]` and
  feeds the existing `Fretboard`. Owns local UI state (selected position, focus
  mode). Reads global state (key, accidental, chord degree, enabled highlights)
  via props.

**Component layer (new).**
- `src/components/PositionSelector.tsx` — single-select buttons P1–P5 plus
  "All". Mirrors styling of `ViewSelector` / `DiatonicChords` cards.

**Wire-up.**
- `App.tsx` adds a route case for `selectedView === 'chord-tones'` rendering
  `ChordTonesView`. Removes the "Coming soon" placeholder for that tab id only;
  the other unimplemented tabs remain placeholders.

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

Top to bottom on the Chord Tones tab:

1. **Diatonic chord row** (existing `DiatonicChords`) — pick chord degree.
2. **Position selector** (new `PositionSelector`) — P1 / P2 / P3 / P4 / P5 /
   All. Single-select. Default: All.
3. **Focus toggle** (new) — "Show outside position" switch. Off by default
   (hide outside-window notes). On = render outside-window notes with role
   `'muted'` (faint context). **Hidden** when position = All (nothing outside
   to show).
4. **Fretboard** (existing `Fretboard`).
5. **Legend** (existing) — R / 3 / 5 / 7 toggles, already wired through
   `enabledHighlights`.

## State

**Global, in `App.tsx`** (already exists):
- `selectedKey`, `accidentalStyle`, `selectedChordDegree`, `enabledHighlights`.

**Local to `ChordTonesView`:**
- `selectedPosition: PositionId | 'all'` — default `'all'`.
- `showOutside: boolean` — default `false`.

These are tab-local. Switching to another tab and back resets them. Per the
vision doc's fast-switching constraint, that's acceptable; persistence isn't a
goal.

## Marker Computation

Inside `ChordTonesView`, all in one `useMemo` keyed on every input. Pseudocode:

```
inputs: key, accidentalStyle, chord, enabledHighlights, position, showOutside

if (key === ALL_NOTES_KEY) return []          // empty state, see below

for each (string = 0..5, fret = 0..FRET_COUNT):
  noteAtFret = getNoteAtFret(STANDARD_TUNING[string], fret)
  intervalRole = getIntervalRole(key, noteAtFret)
  if (intervalRole === null) continue          // out of key — drop entirely

  inWindow = (position === 'all') || isInPositionWindow(key, position, fret)
  if (!inWindow && !showOutside) continue      // hide outside (focus mode)

  role = roleFromChordTone(noteAtFret, chord, intervalRole)
        // -> 'root' | 'third' | 'fifth' | 'seventh' | 'scale'

  if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role)) {
    role = 'scale'                             // legend toggle off → demote
  }
  if (!inWindow) {
    role = 'muted'                             // outside-window override
  }

  push { string, fret, note: getDisplayName(noteAtFret, key, accidentalStyle), role }
```

`roleFromChordTone` is extracted from `NoteMapView.tsx:73-82` into
`src/theory/chordTones.ts` and imported by both views.

## Edge Cases

**`ALL_NOTES_KEY` selected.** The chord-tones concept requires a key. Render an
empty state ("Select a key to view chord tones") instead of the fretboard.
Matches the existing pattern in `DiatonicChords.tsx` and `ScaleDisplay.tsx`,
which already hide themselves in this state.

**Position window contains no chord tones.** E.g., B major P3 clips to
`[15, 15]`, and on that single fret the chord's R/3/5 may not appear. The view
just renders the scale tones that do land in the window. No special message —
honest behavior.

**Focus toggle while position = All.** Toggle is hidden — locked under View
Layout above.

## Testing

**`src/theory/positions.test.ts`:**
- `getPositionWindow` for representative `(key, position)` pairs covering every
  wrap case: C/all-5 (fits), G/P4 (straddle), G/P5 (wrap), A/P5 (wrap), B/P3
  (straddle to single fret), B/P5 (wrap).
- `isInPositionWindow` boundary cases (low edge, high edge, just outside).
- Exhaustive sanity: for every `(key, position)` pair (12 × 5 = 60), assert
  `0 ≤ low ≤ high ≤ FRET_COUNT`.

**`src/theory/chordTones.test.ts`:**

Tests `roleFromChordTone`:
- Worked example from vision doc's Chord Tones section: G major, ii (Am7) →
  A=root, C=third, E=fifth, G=seventh.
- Non-chord scale tone (e.g., D in that context) returns `'scale'`.

Tests `buildChordToneMarkers` (covers what would otherwise be a component
test; the view itself is a thin composition layer with no logic of its own,
so we test the pure marker output instead of mounting the view):
- `key === ALL_NOTES_KEY` → returns `[]`.
- `key='C'`, `degree=2` (Dm7), `position='P1'`, `showOutside=false`,
  `enabledHighlights = {root, third, fifth}`: every marker has `fret ≤ 3`;
  chord tones D / F / A have roles `root` / `third` / `fifth`; other in-window
  in-key scale tones have role `'scale'`; no muted markers exist.
- Same inputs but `showOutside=true`: at least one marker exists with `fret > 3`
  and role `'muted'`; in-window markers retain their chord-tone roles.
- Same inputs but `enabledHighlights` includes `seventh`: C (Dm7's ♭7) appears
  with role `'seventh'`.
- Same inputs but `enabledHighlights` excludes `fifth`: A appears with role
  `'scale'` instead of `'fifth'` (Legend toggle demotion).
- `position='all'`: markers exist across the full fretboard, not just one
  window.

(No jsdom / @testing-library install needed — no component test required.)

**Manual verification before claiming done:**
- `npm run dev`, open Chord Tones tab.
- Cycle keys C / G / A / B (covers fits / straddle / wrap), 7 chord degrees,
  positions All + P1–P5, focus toggle on/off, Legend R/3/5/7 toggles.
- Switch to "All Notes" key → empty state shows.
- Switch tabs back and forth → no animation lag, global state persists, local
  state resets.

**Pre-commit gate:** `npm run lint`, `tsc -b`, `npm test` — all pass.

## What's Explicitly Not in This Spec

- Scale Positions tab (build order #4). Stays "Coming soon."
- Multi-position selection.
- Overlap-zone (transition) highlighting between adjacent positions.
- Per-string CAGED fret-offset encoding (the simpler fret-window encoding is
  sufficient for visible correctness).
- Persistence of position / focus toggle across tab switches.
- Visual frame / shaded rectangle around the position window (the markers
  themselves communicate the window).

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
