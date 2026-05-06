# Chord Shapes — Chord-Centric Redesign

> Supersedes `2026-05-06-chord-shapes-design.md`. The original design walked all 7
> diatonic chords ascending the neck on a single inversion. This produced visually
> ambiguous markers — every "blue" root belongs to a different chord, and a viewer can't
> tell which trio of (root/third/fifth) markers forms a single chord. This redesign
> pivots to a chord-centric model: the user picks one chord at a time from the chord
> row, and the view shows that chord's shapes across all selected string sets and
> inversions.

## Goal

Chord Shapes shows **one diatonic chord at a time**, displaying its triad (or shell)
shape at every position that fits inside `[0, FRET_COUNT]` on the user's selected string
sets and inversions. The view answers _"where can I play this chord on this part of the
neck?"_ rather than _"what does the whole I–vii° walk look like?"_

## Why this design

- **Chord-tone color roles are chord-specific.** Root / 3rd / 5th / 7th colors encode a
  note's role _within its chord_. Showing >1 chord at a time produces markers whose
  colors can only be parsed if you already know the underlying chord — defeating the
  visual contract.
- **One chord, multiple shapes** matches actual practice patterns: "show me C major
  across the neck on strings 1-2-3" is a common drill. The Image 2 reference
  (per-chord-row layout) inspired the visual model.
- **Reuse the chord row already in the app.** `DiatonicChords` already lives at the
  bottom of Note Map and Scale Positions and has a Triads/Sevenths toggle. Chord Shapes
  can adopt the same chord-row pattern without inventing a new selection mechanism, and
  "select logic doesn't change per screen" is a project guideline.

## Architecture

```
App.tsx (existing chord-row state owner)
  ├── DiatonicChords         (chord row, shared across views)
  ├── Legend (interactive)   (shared, drives enabledHighlights)
  └── ChordShapesView        (this redesign)
        ├── sub-selector row
        │   ├── triads mode: StringSetToggles + InversionToggles (multi-pick each)
        │   └── shells mode: StringSetToggles configured for root strings
        └── Fretboard (markers from buildChordShapeMarkers)
```

- **App** owns: `selectedKey`, `selectedChordDegree`, `chordRowMode`, `accidentalStyle`,
  `enabledHighlights`, `selectedChord` (memoized).
- **App** renders `<DiatonicChords>` and `<Legend>` below `<ChordShapesView>`, mirroring
  Note Map and Scale Positions.
- **`ChordShapesView`** owns local sub-selector state only:
  `selectedStringSets: Set<StringSet>`, `selectedRootStrings: Set<RootString>`,
  `selectedInversions: Set<Inversion>` (default all 3 on).
- **The top-level `Mode` (Triads/Shells) toggle is removed.** Mode is derived from
  `chordRowMode`: `"triads" → "triads"`, `"sevenths" → "shells"`.

## Marker pipeline

`buildChordShapeMarkers` is rewritten to take a single chord and produce all fitting
placements across the user's selected sub-selectors.

### Input

```ts
type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      chord: DiatonicTriad;
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversions: ReadonlyArray<Inversion>;
    }
  | {
      mode: "shells";
      chord: DiatonicChord;
      key: string;
      accidentalStyle: AccidentalStyle;
      rootStrings: ReadonlyArray<RootString>;
    };
```

### Algorithm

```
markers := []
if key == ALL_NOTES_KEY: return []

if mode == "triads":
    if stringSets is empty or inversions is empty: return []
    for stringSet in stringSets:                        // outer iteration
        for inversion in [root, first, second]:         // canonical inversion order
            if inversion not in inversions: continue
            shape := TRIAD_SHAPES[stringSet][inversion][chord.quality]
            for candidate in getRootFrets(chord.notes[0], openAnchorNote(shape)):
                if every position fits in [0, FRET_COUNT]:
                    emit cluster as 3 markers (in ascending fret order)

else: // shells
    if rootStrings is empty: return []
    for rootString in rootStrings:                      // outer iteration
        shape := SHELL_SHAPES[rootString][chord.quality]
        for candidate in getRootFrets(chord.notes[0], openAnchorNote(shape)):
            if every position fits in [0, FRET_COUNT]:
                emit cluster as 3 markers
```

### Differences from the original pipeline

- **No across-combo deduplication.** The original "ascending root rule" coupled
  successive chords; here every `(stringSet, inversion)` combo is independent and
  contributes whatever placements fit.
- **Multiple octaves of the same shape are allowed.** If both root-fret candidates fit
  (shape root at fret 0 and fret 12, both with positions in bounds), both are emitted.
- **Drops at the combo level only.** A chord whose shape doesn't fit on, say,
  `(4-5-6, second)` simply yields zero markers from that combo; other selected combos
  are unaffected.

### Marker ordering

Stable order for testability: outer iteration by `stringSets` (input order), then by
inversion (canonical: root → first → second), then by ascending root fret within a
combo. Within a single cluster, markers come out in the shape-position order (which is
the data's intrinsic order — already validated by Task 1 structure tests).

### Helpers reused as-is

- `TRIAD_SHAPES`, `SHELL_SHAPES` (data is correct under the new model).
- `shapeStringToMarkerString` (1..6 → 0..5 conversion).
- `getRootFrets` (returns 1 or 2 candidates inside `[0, FRET_COUNT]`).

The `placeChordsOnAnchor` helper from the original pipeline is removed — its "ascending
across chords" coupling is no longer needed.

## UI structure

```
┌── ChordShapesView ────────────────────────────────────────────┐
│                                                                │
│  Triads mode:                                                  │
│    [ 1-2-3 | 2-3-4 | 3-4-5 | 4-5-6 ]   [ Root | 1st | 2nd ]    │
│                                                                │
│  Shells mode:                                                  │
│    [ 6th-string-root | 5th-string-root ]                       │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      <Fretboard />                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
   <Legend interactive>             ← rendered by App.tsx
   <DiatonicChords>                 ← rendered by App.tsx
```

### Empty states

- **`selectedKey === ALL_NOTES_KEY`** → "Select a key to view chord shapes."
- **`selectedChord === null`** (e.g., user clicked the active card to deselect) →
  "Select a chord to view shapes."
- **active sub-selector empty** (e.g., Triads mode with `selectedStringSets` size 0 _or_
  `selectedInversions` size 0; Shells mode with `selectedRootStrings` size 0) → "Select
  a string set to begin." (sub-selector row stays visible above the message).

Empty states render in place of the fretboard; the sub-selector row remains visible so
the user can recover.

### Interactive Legend (replaces `readOnly`)

The Chord Shapes view now uses the same interactive `<Legend>` as Note Map and Scale
Positions. Toggling a role off (e.g., 5th) hides every marker with that role across all
displayed clusters — a useful "isolate the roots and thirds" practice tool. The
`readOnly` arm of `Legend` is **deleted** as part of this work (per CLAUDE.md "don't
design for hypothetical future requirements"; can be re-added when the Reference tab
arrives).

## Component changes

### Reused

- `StringSetToggles` (already generic over `Id extends string` — used for both string
  sets and root strings, plus inversions in the new design).
- `TRIAD_SHAPES`, `SHELL_SHAPES` data and types.

### Replaced

- **`buildChordShapeMarkers`** — full rewrite per the algorithm above.
- **`chordShapes.test.ts` pipeline tests** — the 8 existing pipeline tests are replaced;
  structure tests for `TRIAD_SHAPES` / `SHELL_SHAPES` (13 tests) are unchanged.
- **`ChordShapesView`** — drops Mode toggle and local mode state; receives
  `selectedChord`, `chordRowMode`, `enabledHighlights`, `onToggleHighlight` as props;
  renders sub-selector row driven by `chordRowMode`; passes role-filtered markers to
  Fretboard (filter by `enabledHighlights` before passing).
- **`App.tsx`** — `selectedView === "chord-shapes"` branch now also renders `<Legend>`
  and `<DiatonicChords>` below `<ChordShapesView>`, matching the Note Map / Scale
  Positions branches.

### Deleted

- **`InversionPicker.tsx`** — replaced by `StringSetToggles` configured with inversion
  options.
- **`Legend` `readOnly` arm** — Chord Shapes uses the interactive legend; no current
  consumer needs the read-only mode.

## Test plan

**Pipeline tests (rewritten).** The function never receives `chord === null` (`chord` is
required in the input type) — null-handling lives in the view. Test cases are described
behaviorally; exact fret values are pinned in the implementation plan after a manual
trace.

1. **`key === ALL_NOTES_KEY`** → returns `[]`.
2. **Empty `stringSets` (triads)** → `[]`.
3. **Empty `inversions` (triads)** → `[]`.
4. **Empty `rootStrings` (shells)** → `[]`.
5. **C major I (Triads), `[1-2-3]`, all inversions** — emits one cluster per
   `(inversion, fitting-root-fret)` combo. Verifies multi-placement from a single chord;
   covers the two-octave case (2nd inv on `[1-2-3]` for C has a low candidate _and_ its
   +12 octave inside `[0, FRET_COUNT]`, so 2nd-inv contributes 2 clusters).
6. **C major I (Triads), `[1-2-3]`, only `[root, second]`** — skips 1st-inv
   contribution; asserts that filtering the inversion set drops exactly that combo's
   markers.
7. **C major I (Triads), `[1-2-3, 4-5-6]`, all inversions** — markers from both string
   sets present; ordering verifies outer grouping by stringSet in input order, then by
   inversion (root → first → second), then by ascending fret within a combo.
8. **F major V (Shells), `[6th]`** — V is C7 → cluster(s) at C-on-low-E candidates that
   fit (asserts the shells path with a flat-key chord).
9. **Cap-at-fits drop** — choose a `(stringSet, inversion, chord)` whose only candidate
   root fret pushes a position outside `[0, FRET_COUNT]`. Asserts 0 markers from that
   combo while other combos still produce output.
10. **Two-octave emission** — when both candidate root frets fit, both placements are
    emitted (verified incidentally by test 5; a focused assertion makes the contract
    explicit).
11. **Accidental style** — F#m on D major / `[1-2-3]` / root with
    `accidentalStyle: "flat"` → root marker is `Gb`.
12. **Structure-test invariants from Task 1** (13 tests in the existing file) are
    unchanged.

**Manual smoke (after implementation):**

1. Switch to Chord Shapes; chord row shows triads (or sevenths, depending on last
   `chordRowMode`); a default chord (I) is auto-selected.
2. Toggle inversions; markers update.
3. Toggle string sets; markers update; both sub-selectors stay visible at empty state.
4. Click active chord card to deselect → empty state appears.
5. Switch chord-row mode (Triads ↔ Sevenths) → sub-selector swaps between
   string-sets+inversions and root-strings; selectedChord type swaps.
6. Toggle 3rd off in Legend → all third-role markers disappear from clusters in this
   view _and_ in Note Map / Scale Positions (shared state).
7. Switch key to "All Notes" → empty-state message.

## Out of scope

- The chord-row layout (DiatonicChords component itself) is not changed.
- The shape data (`TRIAD_SHAPES`, `SHELL_SHAPES`) is not modified.
- The vision-doc completion-map row already says "Done"; this redesign keeps it at
  "Done" but updates the description to reflect the chord-centric model.
