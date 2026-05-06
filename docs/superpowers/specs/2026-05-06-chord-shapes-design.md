# Chord Shapes — Design

## Goal

A new top-level tab — **Chord Shapes** — that renders the 7 diatonic chords as compact
3-note voicings walking up the neck on user-selected string sets. Two modes (Triads and
Shells), chord tones only (no scale background), read-only display in V1. Answers the
practice question _"on these strings, where do the I/ii/iii/IV/V/vi/vii° voicings sit
and how does my hand walk through them?"_.

This view replaces the originally-planned Shell Voicing Diagrams (#4) and Diatonic Triad
Shapes (#5) tabs from the vision doc, in line with the A+B consolidation already
recorded there.

## Background

Phase A landed the chord-row triads extension (toggle in the existing `DiatonicChords`
component, `getDiatonicTriads` helper, widened `roleFromChordTone`). Phase B is the new
Chord Shapes view.

Two existing tabs already render diatonic chord tones on the neck:

- **Note Map** with the chord row shows _every_ instance of a chord's tones across the
  entire fretboard. Useful for soloing context.
- **Scale Positions** shows chord tones inside selected CAGED windows. Useful for
  box-bound practice and target-tone soloing.

Neither shows specific compact voicings (3-note triads or shells) at fixed fret
positions. Chord Shapes fills that gap. The mental model is _"see one diatonic chord
progression as a fingering walk up the neck"_ — the comping / voice-leading view.

## Goals

- New tab: `Chord Shapes`, third tab after Note Map and Scale Positions.
- Top-level mode toggle: `Triads | Shells`.
- Sub-selector that depends on mode:
  - **Triads:** multi-toggle string groups (1-2-3, 2-3-4, 3-4-5, 4-5-6).
  - **Shells:** multi-toggle root strings (6th, 5th).
- **Triads-only:** single-pick inversion selector (Root / 1st / 2nd).
- Fretboard renders 7 diatonic chord clusters per active string-set/root-string,
  ascending up the neck.
- Each cluster is a 3-note voicing: R/3/5 in Triads mode, R/3/7 in Shells mode.
- **Chord tones only** — no scale-tone background.
- **Cap-at-fits rule:** any chord whose shape places a note past `FRET_COUNT` is
  silently dropped. No octave wrap, no half-shapes.
- Default state: Triads mode, string set `{1-2-3}`, Root inversion.
- Read-only display in V1: no click interactions on clusters.

## Non-goals

- No chord-diagram box grid (deferred to a future Reference tab).
- No chord row in this view.
- No scale-tone background.
- No CAGED position framing.
- No click-to-focus, click-to-select, or any cluster-level interaction.
- No octave-wrap or alternate-inversion fallback for off-neck chords.
- No persistence of view state to localStorage. Same in-memory pattern as other views.
- No theory formulas, non-diatonic lookups, or arbitrary-chord references — parked for
  the future Reference tab.

## Theory layer

### Existing functions reused

- `getDiatonicTriads(key, accidentalStyle)` (Phase A) — used for Triads mode.
- `getDiatonicChords(key, accidentalStyle)` (Step 1) — used for Shells mode (the
  seventh-chord versions; Shells use R/3/7).

### New types

```ts
// src/theory/chordShapes.ts

export type StringSet = "1-2-3" | "2-3-4" | "3-4-5" | "4-5-6";
export type RootString = "6th" | "5th";
export type Inversion = "root" | "first" | "second";
export type ChordShapesMode = "triads" | "shells";

// One note's placement within a shape, expressed relative to the chord's root
// fret. The shape is anchored by locating the root on its assigned string;
// every other note is placed by adding `fretOffset` to the root's fret on its
// own assigned string.
type ShapePosition = {
  string: number; // 1..6 (1=high E, 6=low E)
  fretOffset: number; // offset from the root's fret on its anchor string
  role: "root" | "third" | "fifth" | "seventh";
};

type TriadShape = {
  rootString: number; // 1..6 — which string the root sits on
  positions: ShapePosition[]; // exactly 3 entries (R, 3, 5)
};

type ShellShape = {
  rootString: number; // 6 or 5 in practice
  positions: ShapePosition[]; // exactly 3 entries (R, 3, 7)
};
```

### New static shape data

Two top-level constants encode the shape vocabulary:

```ts
// Triads: 4 string sets × 3 inversions × 3 qualities = 36 entries.
export const TRIAD_SHAPES: Record<
  StringSet,
  Record<Inversion, Record<TriadQuality, TriadShape>>
>;

// Shells: 2 root strings × 4 qualities = 8 entries.
export const SHELL_SHAPES: Record<RootString, Record<ChordQuality, ShellShape>>;
```

Sample entry (root-position major triad on string set 1-2-3):

```ts
TRIAD_SHAPES["1-2-3"]["root"]["maj"] = {
  rootString: 3, // root sits on the G string (lowest pitch of 1-2-3)
  positions: [
    { string: 3, fretOffset: 0, role: "root" },
    { string: 2, fretOffset: 0, role: "third" },
    { string: 1, fretOffset: -2, role: "fifth" },
  ],
};
```

Sample entry (6th-string-root maj7 shell):

```ts
SHELL_SHAPES["6th"]["maj7"] = {
  rootString: 6,
  positions: [
    { string: 6, fretOffset: 0, role: "root" },
    { string: 4, fretOffset: 1, role: "seventh" },
    { string: 3, fretOffset: 1, role: "third" },
  ],
};
```

Worked example: for Cmaj7 with the root anchor at fret 8 on the 6th string, the shape
places the seventh (B) on the 4th string at fret 9 (D + 9 = B) and the third (E) on the
3rd string at fret 9 (G + 9 = E). Standard jazz comping shell — root on bottom, 7 and 3
stacked on the two adjacent inner strings at fret + 1.

The full shape data is large but bounded; the implementation plan tabulates all 36 + 8
entries with an authoritative chord-chart cross-reference.

### New pure aggregation function

```ts
export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversion: Inversion;
    }
  | {
      mode: "shells";
      key: string;
      accidentalStyle: AccidentalStyle;
      rootStrings: ReadonlyArray<RootString>;
    };

export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[];
```

Behaviour:

- Returns `[]` if `key === ALL_NOTES_KEY`.
- Returns `[]` if the active sub-selector set is empty.
- For each selected string-set / root-string independently, walk the 7 diatonic chords
  in degree order (1..7) and place each chord's root on the shape's `rootString` using
  the **ascending root rule** below. For each successfully placed chord, translate the
  shape's `fretOffset`s to absolute frets and emit one `NoteMarker` per position.
- **Ascending root rule.** The root of a guitar string repeats every 12 frets, so a
  given note name has up to two playable frets in `[0, FRET_COUNT]`. For each chord,
  pick the lowest root fret that:
  - is in `[0, FRET_COUNT]`,
  - places every position in the shape inside `[0, FRET_COUNT]` (cap-at- fits — see
    below),
  - **is strictly greater than the previous rendered chord's root fret on the same
    string-set / root-string.**
- The first chord (i.e. the lowest-numbered diatonic degree that fits) has no "previous"
  to compare to; it picks the lowest root fret that satisfies the first two conditions.
  Because diatonic chord roots ascend in pitch, this rule produces a strictly ascending
  sequence.
- **Cap-at-fits:** if no root fret satisfies all three conditions, the chord is silently
  dropped. In practice this means drops only happen at the high end of the neck (chords
  whose roots run past `FRET_COUNT` before any fitting position is found).
- Each emitted marker carries the appropriate `role` (`'root'`, `'third'`, `'fifth'`,
  `'seventh'`) and `note` set via `getDisplayName` for the current accidental style.
- Output order is stable across renders: for each selected string-set / root-string in
  declared order, then by diatonic degree ascending.

## View

`src/views/ChordShapesView.tsx` — composition only. Mirrors the structure of
`ScalePositionsView.tsx`.

### Local state

```ts
const [mode, setMode] = useState<ChordShapesMode>("triads");
const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
  () => new Set(["1-2-3"]),
);
const [selectedRootStrings, setSelectedRootStrings] = useState<Set<RootString>>(
  () => new Set(["6th"]),
);
const [inversion, setInversion] = useState<Inversion>("root");
```

State persistence rules:

- All four pieces of state are local to `ChordShapesView` (not lifted to App).
- `mode` switches do **not** reset `selectedStringSets` / `selectedRootStrings` /
  `inversion` — each piece persists independently. Triads' string-set selection survives
  a flip to Shells and back.
- Switching to a different view tab and returning preserves all state (state lives in
  the component, which stays mounted? — actually, current App.tsx conditionally renders
  views, so state resets on tab switch. This matches Scale Positions behaviour today;
  acceptable.)

### Render flow

```
selectedKey === ALL_NOTES_KEY?
  → empty-state message: "Select a key to view chord shapes."

active sub-selector set empty (no string sets or no root strings)?
  → empty-state message: "Select a string set to begin."

otherwise:
  → markers = buildChordShapeMarkers({ mode, key, accidentalStyle, … })
  → <Fretboard markers={markers} fretCount={FRET_COUNT} />
  → <Legend mode="readonly" />
```

## Components

### `ModeToggle` (new, small)

Inline JSX inside `ChordShapesView`, or extract into
`src/components/ChordShapesModeToggle.tsx` if reuse becomes likely. Two buttons
(`Triads | Shells`) styled like `AccidentalToggle`.

### `StringSetToggles` (new)

Multi-toggle, mirrors the existing `PositionToggles.tsx`. The labels swap by mode:

- Triads: `1-2-3 | 2-3-4 | 3-4-5 | 4-5-6` (4 toggles)
- Shells: `6th | 5th` (2 toggles)

Implemented as one component that takes `options: string[]` and a
`selected: Set<string>` plus an `onToggle(option)` callback, parameterised by the
caller.

### `InversionPicker` (new, small, Triads only)

Single-pick segmented (`Root | 1st | 2nd`). Hidden in Shells mode.

### `Legend` (modified)

Add a `readOnly` prop:

```ts
type LegendProps = {
  enabledRoles: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  readOnly?: boolean; // NEW — when true, render swatches without click handlers
};
```

In `ChordShapesView`, render `<Legend readOnly />`. The swatches still show R/3/5/7
colours; the click handlers are skipped and the buttons render with non-button styling.
This avoids the false affordance of a Legend toggle that does nothing in this view.

In other views, `readOnly` is omitted (defaults `false`) — existing behaviour preserved.

## Layout

```
┌────────────────────────────────────────────────────────────┐
│ [ Note Map ] [ Scale Positions ] [ Chord Shapes ]           │  ← tab bar
│                                                              │
│ Key: C major ▾   ♭ / ♯                                       │  ← shared chrome
│                                                              │
│ Mode: ( Triads | Shells )                                    │  ← view-level
│                                                              │
│ String groups: [1-2-3] [2-3-4] [3-4-5] [4-5-6]               │  ← multi-toggle
│ Inversion: ( Root | 1st | 2nd )                              │  ← Triads only
│                                                              │
│ ┌─ Fretboard (frets 0-15, 6 strings) ────────────────────┐  │
│ │  C    Dm   Em    F    G    Am   B°                       │  │
│ │  ●    ●    ●     ●    ●    ●                             │  │  ← chord clusters
│ │  ●    ●    ●     ●    ●    ●                             │  │     (B° dropped if
│ │  ●    ●    ●     ●    ●    ●                             │  │      out of range)
│ │                                                          │  │
│ └──────────────────────────────────────────────────────────┘  │
│                                                              │
│ Legend: R / 3 / 5 / 7 (read-only swatches)                   │
└──────────────────────────────────────────────────────────────┘
```

## Defaults

| Setting               | Default            |
| --------------------- | ------------------ |
| Mode                  | `triads`           |
| Triads → string sets  | `{ "1-2-3" }`      |
| Triads → inversion    | `root`             |
| Shells → root strings | `{ "6th" }`        |
| Selected key          | inherited from app |

## Behaviour

- **Multi-toggle string sets:** the fretboard renders the union. Toggling on `1-2-3` +
  `4-5-6` shows up to 14 clusters (7 per set, fewer if some don't fit).
- **Inversion change:** all visible chord clusters re-render in the new inversion. Some
  chords may disappear if their shape doesn't fit; some may appear that didn't fit
  before.
- **Mode change (Triads ↔ Shells):** swaps the sub-selectors and the chord-tone palette
  (R/3/5 → R/3/7). Selection state persists per mode independently.
- **Cap-at-fits:** any chord whose shape places a note past `FRET_COUNT` is silently
  dropped. No wrap, no half-shapes, no warning.
- **Click on a marker / cluster:** no-op in V1.

## Edge cases / empty states

- **`selectedKey === ALL_NOTES_KEY`** → empty-state: _"Select a key to view chord
  shapes."_
- **Zero string sets or zero root strings selected** → empty-state: _"Select a string
  set to begin."_ The toggle row stays visible above the message.
- **Inversion that produces zero fitting chords** (rare; e.g. 2nd inversion on string
  set 4-5-6 in B major) → fretboard renders empty (no markers, no message). The toggle
  row is the recovery path.
- **Mode change with empty sub-selector for the new mode** → still empty, same recovery
  behaviour. Selection state for the previous mode is not affected.

## Files touched

**New:**

- `src/theory/chordShapes.ts` — `StringSet`, `RootString`, `Inversion`,
  `ChordShapesMode`, `TRIAD_SHAPES`, `SHELL_SHAPES`, `buildChordShapeMarkers`, plus the
  input type union.
- `src/theory/chordShapes.test.ts` — tests for `TRIAD_SHAPES` / `SHELL_SHAPES` structure
  plus `buildChordShapeMarkers` cases.
- `src/views/ChordShapesView.tsx` — composition view.
- `src/components/StringSetToggles.tsx` — generic multi-toggle component.
- `src/components/InversionPicker.tsx` — single-pick segmented (Triads only).

**Modified:**

- `src/App.tsx` — new tab id `chord-shapes`; render `ChordShapesView` in the matching
  branch.
- `src/components/ViewSelector.tsx` — add the third tab option.
- `src/components/Legend.tsx` — add the optional `readOnly` prop.

**Out of scope:**

- `src/theory/scales.ts` — unchanged (helpers from Phase A and Step 1 are used as-is).
- `src/theory/chordTones.ts` — unchanged (Chord Shapes uses its own marker pipeline; the
  existing pipeline is for chord-tone-targeting views).

## Testing

- **`TRIAD_SHAPES` / `SHELL_SHAPES` structure tests** in `chordShapes.test.ts`:
  - Each entry has exactly 3 positions.
  - Each position has a unique `string`.
  - Roles are present: a triad shape has exactly one of each
    `'root'`/`'third'`/`'fifth'`; a shell has `'root'`/`'third'`/`'seventh'`.
  - The `rootString` matches the position whose role is `'root'`.

- **`buildChordShapeMarkers` cases:**
  - C major, Triads, `["1-2-3"]`, `'root'` → 6 chords (vii° drops because root-position
    B° on 1-2-3 needs a fret past 15). Markers count: 18.
  - C major, Triads, `["1-2-3", "4-5-6"]`, `'root'` → markers from both string sets;
    verify a marker exists with `string === 6` (4-5-6) and a marker exists with
    `string === 1` (1-2-3).
  - F major, Shells, `["6th"]` → 7 chords; verify each chord emits exactly 3 markers,
    and that the V chord (C7) places its root on the 6th string at fret 8 (the lowest C
    above the previous chord's root fret).
  - `key === ALL_NOTES_KEY` → empty array.
  - Empty `stringSets` → empty array.
  - Empty `rootStrings` (Shells) → empty array.
  - Inversion that produces 0 fitting chords (e.g. C major, Triads, `["4-5-6"]`,
    `'second'` if applicable) → empty array, no crash.

- **Manual UI verification:** switch tab, switch keys, toggle modes, toggle string sets,
  change inversion, confirm cluster rendering matches expectations across a few
  representative keys (C major, F major, B major).

## Future direction — Reference tab

Parked, not part of V1:

- Static chord-diagram box grid (Shells: 8 boxes; Triads: 36 boxes) — the
  fingering-reference content originally planned for this tab.
- Non-diatonic / arbitrary-chord lookup (e.g. _"show me the m7♭5 shape on the 6th
  string"_ regardless of whether it's diatonic in the current key).
- Theory formulas — chord construction, scale formulas, mode formulas.
- Octave-wrap behaviour for chords that don't fit cleanly (currently dropped silently
  per the cap-at-fits rule).

The Reference tab is a different cognitive job — theoretical lookup vs. practice-flow
targeting. Worth a separate spec when scoped.

## Verification

- `npm run lint` clean.
- `npx tsc -b` clean.
- `npm test` — all existing tests pass; new tests for `TRIAD_SHAPES`, `SHELL_SHAPES`,
  and `buildChordShapeMarkers` added.
- `npm run build` succeeds.
- Manual: run `npm run dev`, switch to Chord Shapes, confirm:
  - Triads default state renders 6 clusters on strings 1-2-3 in C major.
  - Switching key to G shifts clusters up; vii° (F#°) may disappear.
  - Toggling on a second string set adds clusters at new positions.
  - Switching inversion changes cluster fret positions (and possibly which chords fit).
  - Switching to Shells mode swaps sub-selectors and renders 7 clusters with R/3/7
    colouring.
  - "All notes" key shows the empty-state message.

## References

- Vision doc: `docs/design/2026-05-05-app-vision-and-view-designs.md` (Chord Shapes
  section + consolidation note).
- Phase A spec: `docs/superpowers/specs/2026-05-05-chord-row-triads-design.md`.
- Step 1 spec: `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md` (theory-layer
  conventions).
- Scale Positions spec:
  `docs/superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md` (pattern
  source for multi-toggle, empty states, view structure).
