# Modal practice mode — design

## Summary

Modal practice mode generalizes Fretlab's existing key-as-major-scale model into **key +
mode**. A new `ModeSelector` lives in the app header alongside the key selector; the
(key, mode) pair becomes the global tonal-center state.

When `mode === 'ionian'` (default), every existing surface renders byte-identical to
today. When `mode !== 'ionian'`, the entire app re-anchors to the parallel mode of the
selected key:

- The diatonic scale set becomes the parallel mode of the selected key (C Dorian = C, D,
  E♭, F, G, A, B♭).
- The diatonic chord row recomputes against the modal scale, with modal Roman numerals
  (e.g., Dorian's `i7, ii7, ♭IIImaj7, IV7, v7, viø7, ♭VIImaj7`).
- The `ScaleDisplay` relabels degrees with modal accidentals (`1, 2, ♭3, 4, 5, 6, ♭7`
  for Dorian).
- The Scale Positions view re-anchors its CAGED windows to the mode's _parent major_
  scale and drops the C/A/G/E/D shape names in non-Ionian modes.
- A subtle characteristic-tone overlay surfaces the mode's defining interval on the
  fretboard.

The unique value: any practice routine the user already runs (chord-tone targeting,
scale-position drilling, voicing exploration) extends to modal practice by changing the
mode dropdown — no new view to learn.

## Music-theory foundations

### The 7 modes (parallel form)

All rooted at the same tonic. The formula compares each mode's degrees to the same-root
major scale; the W/H pattern reads the consecutive intervals between the seven scale
notes.

| Mode       | Formula            | C-rooted notes     | W/H pattern   |
| ---------- | ------------------ | ------------------ | ------------- |
| Ionian     | 1 2 3 4 5 6 7      | C D E F G A B      | W W H W W W H |
| Dorian     | 1 2 ♭3 4 5 6 ♭7    | C D E♭ F G A B♭    | W H W W W H W |
| Phrygian   | 1 ♭2 ♭3 4 5 ♭6 ♭7  | C D♭ E♭ F G A♭ B♭  | H W W W H W W |
| Lydian     | 1 2 3 ♯4 5 6 7     | C D E F♯ G A B     | W W W H W W H |
| Mixolydian | 1 2 3 4 5 6 ♭7     | C D E F G A B♭     | W W H W W H W |
| Aeolian    | 1 2 ♭3 4 5 ♭6 ♭7   | C D E♭ F G A♭ B♭   | W H W W H W W |
| Locrian    | 1 ♭2 ♭3 4 ♭5 ♭6 ♭7 | C D♭ E♭ F G♭ A♭ B♭ | H W W H W W W |

### Diatonic 7th-chord qualities by mode

| Position | Ionian | Dorian | Phrygian | Lydian | Mixolydian | Aeolian | Locrian |
| -------- | ------ | ------ | -------- | ------ | ---------- | ------- | ------- |
| 1        | maj7   | m7     | m7       | maj7   | 7          | m7      | m7♭5    |
| 2        | m7     | m7     | maj7     | 7      | m7         | m7♭5    | maj7    |
| 3        | m7     | maj7   | 7        | m7     | m7♭5       | maj7    | m7      |
| 4        | maj7   | 7      | m7       | m7♭5   | maj7       | m7      | m7      |
| 5        | 7      | m7     | m7♭5     | maj7   | m7         | m7      | maj7    |
| 6        | m7     | m7♭5   | maj7     | m7     | m7         | maj7    | 7       |
| 7        | m7♭5   | maj7   | m7       | 7      | maj7       | 7       | m7      |

Verified by rotating each mode's parent major scale (e.g., C Dorian = B♭ major's 2nd
mode, so its diatonic 7th chords are B♭ major's chords starting at the 2nd: Cm7, Dm7,
E♭maj7, F7, Gm7, Am7♭5, B♭maj7).

Triad qualities follow the same matrix with the 7th omitted (maj7 → maj, m7 → min, 7 →
maj, m7♭5 → dim).

### Roman numerals (sevenths)

| Mode       | I     | II      | III      | IV     | V      | VI      | VII      |
| ---------- | ----- | ------- | -------- | ------ | ------ | ------- | -------- |
| Ionian     | Imaj7 | ii7     | iii7     | IVmaj7 | V7     | vi7     | viiø7    |
| Dorian     | i7    | ii7     | ♭IIImaj7 | IV7    | v7     | viø7    | ♭VIImaj7 |
| Phrygian   | i7    | ♭IImaj7 | ♭III7    | iv7    | vø7    | ♭VImaj7 | ♭vii7    |
| Lydian     | Imaj7 | II7     | iii7     | ♯ivø7  | Vmaj7  | vi7     | vii7     |
| Mixolydian | I7    | ii7     | iiiø7    | IVmaj7 | v7     | vi7     | ♭VIImaj7 |
| Aeolian    | i7    | iiø7    | ♭IIImaj7 | iv7    | v7     | ♭VImaj7 | ♭VII7    |
| Locrian    | iø7   | ♭IImaj7 | ♭iii7    | iv7    | ♭Vmaj7 | ♭VI7    | ♭vii7    |

Conventions: uppercase = major-quality root triad, lowercase = minor-quality, ° =
diminished, ø = half-diminished. Accidentals (♭, ♯) prefix the numeral when the chord
root is a chromatic alteration of the same-root major scale's degree. Triad-form
numerals drop the `7` / `maj7` / `ø7` suffix (e.g., Dorian's triads:
`i, ii, ♭III, IV, v, vi°, ♭VII`).

### Characteristic notes

| Mode       | Characteristic | Reference   |
| ---------- | -------------- | ----------- |
| Ionian     | (none)         | —           |
| Dorian     | ♮6             | vs Aeolian  |
| Phrygian   | ♭2             | vs Aeolian  |
| Lydian     | ♯4             | vs Ionian   |
| Mixolydian | ♭7             | vs Ionian   |
| Aeolian    | (none)         | —           |
| Locrian    | ♭5             | vs Phrygian |

Citations for the music-theory framing are listed in [Sources](#sources).

## Architecture

### Global state

The app's existing header state — `(key, accidentalStyle, fretRange)` — extends to
`(key, mode, accidentalStyle, fretRange)`. State lives in `App.tsx` alongside the
existing selectors. Default: `mode = 'ionian'`. Not persisted to localStorage in V1
(matches the existing handling of `selectedKey`).

### Theory layer

A new `src/theory/modes.ts` houses modal-scale primitives. Existing
`src/theory/scales.ts` keeps the major-scale-only helpers; modal helpers live next door
rather than inside `scales.ts` to keep each file's purpose clear.

#### Types & constants

```ts
export type Mode =
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian";

export const MODES: readonly Mode[];

// Each mode's intervals from the modal tonic, in semitones.
const MODE_INTERVALS: Record<
  Mode,
  readonly [number, number, number, number, number, number, number]
>;

// Degree labels with modal accidentals (consumed by ScaleDisplay).
const MODE_DEGREE_LABELS: Record<Mode, readonly string[]>;

// Step pattern (whole/half) per mode, derived from MODE_INTERVALS.
const MODE_STEPS: Record<Mode, readonly ScaleStep[]>;

// Modal-degree indices (0-6) flagged as characteristic for the overlay.
const CHARACTERISTIC_DEGREES: Record<Mode, readonly number[]>;

// Semitone offset from modal tonic to the parent major's tonic.
// Dorian: -2, Phrygian: -4, Lydian: -5, Mixolydian: -7, Aeolian: -9,
// Locrian: -11. Ionian: 0.
const PARENT_MAJOR_OFFSET: Record<Mode, number>;
```

#### Pure functions

```ts
// Generalizes getMajorScaleNotes. mode === 'ionian' returns identical output.
export function getModalScaleNotes(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): string[];

// Generalizes getDiatonicChords / getDiatonicTriads. Stacks 3rds within the
// modal scale, derives quality + modal Roman numeral from the resulting pitch
// set. Roman numerals carry modal accidentals; case reflects quality.
export function getModalDiatonicChords(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): DiatonicChord[];
export function getModalDiatonicTriads(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): DiatonicTriad[];

// Returns the modal scale degree (0-6) for a note in the (key, mode) scale,
// or null if not in-mode. Replaces getIntervalRole for in-mode checks.
export function getModalIntervalRole(
  key: string,
  mode: Mode,
  note: string,
): IntervalRole | null;

// Returns the parent major scale's tonic. Used by Scale Positions to drive
// CAGED windows in non-Ionian modes.
export function parentMajorOf(tonic: string, mode: Mode): string;

// Returns the actual notes (post-key-transposition) flagged as characteristic
// for the (key, mode) pair. Used by the characteristic-tone overlay.
export function getCharacteristicNotes(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): string[];
```

**Backward compatibility.** Existing helpers (`getMajorScaleNotes`, `getDiatonicChords`,
`getDiatonicTriads`, `getIntervalRole`) stay as-is. The Ionian code path through every
modal helper degrades to byte-identical output of its major-scale counterpart — call
sites can migrate gradually.

### Header layout refactor

The app's header reorganizes into two zones to absorb the layout pressure of adding
`ModeSelector` and clarify the visual hierarchy.

```
┌─────────────────────────────────────────────────┐
│ Fretlab                          ♭/♯    Frets   │  ← top bar
├─────────────────────────────────────────────────┤
│ Key:  [C ▾]   Mode:  [Ionian ▾]                 │  ← focal controls
│ [ Note Map | Scale Positions | Chord Shapes ]   │
│ [ ScaleDisplay row ]                            │
└─────────────────────────────────────────────────┘
```

- **Top bar:** the `Fretlab` title (left) + `AccidentalToggle` + `FretRangeControl`
  (right). Separated from the rest by a `border-b border-line` divider.
- **Focal-control row:** `KeySelector` + `ModeSelector`, side-by-side.
- **`ViewSelector` and `ScaleDisplay`:** unchanged in placement.

Rationale: `AccidentalToggle` and `FretRangeControl` are global preferences
(set-and-forget); `KeySelector` and `ModeSelector` are the focal practice setting.
Splitting them clarifies what's permanent vs. what's actively being changed during
practice.

A small `AppTopBar` component (or inline JSX in `App.tsx` if it stays simple) owns the
title + right-aligned control group. Final extraction decision is plan-level.

On narrow screens the top bar stays a single row (title left, controls right — both
groups are compact enough). The focal-control row keeps its existing
`flex-col sm:flex-row` responsive treatment.

### Components

#### `ModeSelector` (new)

`src/components/ModeSelector.tsx`. Mirrors `KeySelector`'s API and visual style: a
compact dropdown with 7 options labeled with their full mode names (Ionian, Dorian,
Phrygian, Lydian, Mixolydian, Aeolian, Locrian).

```tsx
type ModeSelectorProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled?: boolean; // when selectedKey === ALL_NOTES_KEY
};
```

Visual indicator for "modal mode is active": when `mode !== 'ionian'`, the control picks
up a subtle accent treatment (e.g., `border-line-emphasis` or a colored ring) so a quick
glance tells the user their current modal frame. When `mode === 'ionian'` it sits as a
quiet default.

Disabled when `selectedKey === ALL_NOTES_KEY` — mode is meaningless without a tonal
center.

#### `ScaleDisplay`

New `mode: Mode` prop. Internally:

- Notes from `getModalScaleNotes(key, mode, accidentalStyle)`.
- Degree labels from `MODE_DEGREE_LABELS[mode]` — pills show e.g. `♭3, ♭7` for Dorian,
  `♯4` for Lydian, `♭2` for Phrygian. The accidental in the label is the primary "how
  does this differ from same-root major" cue.
- Step indicators from `MODE_STEPS[mode]` — the W/H pattern reshuffles per mode.
- Header text: `"{key} {modeName}"` (`"C Dorian"`, `"F Lydian"`); special-cased to
  `"{key} major"` when `mode === 'ionian'` to preserve current chrome.

Chord-tone highlighting unchanged — `roleFromChordTone` is already chord-relative, so
the pill colors lay out around the modal scale notes without any code change.

The characteristic-tone is _not_ separately decorated in the ScaleDisplay; the
accidental in its degree label already carries that signal.

#### `DiatonicChords`

New `mode: Mode` prop. Chord set resolved via
`getModalDiatonicChords(key, mode, accidentalStyle)` (sevenths) or
`getModalDiatonicTriads(key, mode, accidentalStyle)` (triads). Roman numerals come from
the chord object itself (computed in the theory layer with modal accidentals).

Display logic unchanged. The existing `QUALITY_ACCENT` map (major-quality chords get
`border-line-emphasis`; everything else gets `border-line`) generalizes for free —
Dorian's IV7 (dom7) gets the plain border; Phrygian's ♭IImaj7 (maj7) gets the emphasized
border.

**Chord-degree persistence on mode change.** `selectedChordDegree` (in `App.tsx`)
persists across mode changes. The user's "I'm focused on the IV chord" intent stays
anchored to degree 4; only the chord symbol/quality derived from `(key, mode, degree)`
changes.

### Scale Positions in modal mode

#### Position window math (parent-major anchoring)

A computed `parentKey = parentMajorOf(selectedKey, mode)` drives the CAGED window math.
When `mode === 'ionian'`, `parentKey === selectedKey` (no behavior change).

In `ScalePositionsView.tsx`:

- `getPositionWindows(parentKey, p.id, ...)` instead of
  `getPositionWindows(selectedKey, ...)`.
- `computeOverlapZones(parentKey, ...)` instead of
  `computeOverlapZones(selectedKey, ...)`.

So in C Dorian, P1 sits at frets 0–3 (parent C major's P1) — a real D-Dorian fingering
position because D Dorian and C major share a note set (similarly for any modal scale
and its parent). In D Dorian (parent C major), P1 is also at frets 0–3 rather than
D-Ionian's 2–5 — anchoring to the parent gives spatial windows where the modal scale
actually lays.

#### Window labels drop CAGED shape names in modal mode

```ts
label: mode === "ionian" ? `${p.id} — ${p.shape}` : `${p.id}`;
```

Position labels become bare `P1`–`P5` in non-Ionian modes. The C/A/G/E/D shape names
refer to major-scale fingering patterns and are misleading in modal context; the
position number itself remains a useful spatial reference.

#### Marker pipeline

`buildChordToneMarkers` gains a `mode: Mode` parameter:

- The "is this note in-scale?" check switches from `getIntervalRole(key, note)` to
  `getModalIntervalRole(key, mode, note)`. Out-of-mode notes are dropped (mirrors
  today's out-of-key drop).
- `isInPositionWindow` is fed `parentKey` (computed via `parentMajorOf`) instead of
  `key`.
- Chord-tone role resolution (`roleFromChordTone`), Legend-toggle demotion,
  `showContext` muting, and marker emission are unchanged. The chord-relative coloring
  contract carries over for free.
- Each emitted marker also gets its `isCharacteristic` flag set (see Characteristic-tone
  overlay).

#### Empty states unchanged

- All-Notes key → "Select a key…" (`ModeSelector` is disabled).
- Zero positions selected → "Toggle a position to begin."
- Mode is always set (defaults to Ionian); no new "select a mode" empty state.

### Characteristic-tone overlay

#### Marker flag

`NoteMarker` grows one optional flag:

```ts
export type NoteMarker = {
  string: number;
  fret: number;
  note: string;
  role: NoteDisplayRole;
  isCharacteristic?: boolean; // new
};
```

The `Fretboard` renderer reads the flag and draws an additional thin outer ring around
the marker circle when `isCharacteristic === true`. Role color (R/3/5/7/scale/muted) is
unaffected — the ring is a separate visual layer.

#### Visual treatment

A thin (1.5–2px) outer ring in a warm gold/amber accent color, distinct from the
existing root/3rd/5th/7th palette. A new CSS token (e.g., `--color-characteristic`) is
added to the design tokens.

#### Theory layer drives the flag

Each marker pipeline (`buildChordToneMarkers`, `buildChordShapeMarkers`) computes a
`characteristicSet = new Set(getCharacteristicNotes(key, mode))` once, then sets
`isCharacteristic` per marker via a note-index lookup. Cheap and pure.

#### Mode coverage

- **Ionian, Aeolian:** `getCharacteristicNotes` returns `[]`. The overlay renders
  nothing. Same code path as the other modes — no special-casing.
- **Dorian, Phrygian, Lydian, Mixolydian, Locrian:** the characteristic note(s) per the
  [characteristic notes](#characteristic-notes) table.

#### Coverage across views

- **Note Map:** in-mode notes on the full neck; characteristic notes ring-decorated.
- **Scale Positions:** same, but only inside position windows. The ring honors
  `showContext` — out-of-window characteristic notes still render the ring on the
  muted-role marker so the user sees the modal flavor extending past the box.
- **Chord Shapes:** chord-tone markers only, but the ring still applies if a chord tone
  happens to be the characteristic note (e.g., F7 in C Dorian — A is both the chord's
  3rd and Dorian's characteristic ♮6). Opportunistic — surfaces the modal-flavor signal
  when relevant.

#### Toggleability (V1)

Always-on when `mode !== 'ionian'`. No Legend entry, no separate toggle. Matches the
"modal mode just works" principle. If users later report visual noise, a Legend
extension or view-level toggle can be added.

## Edge cases

- **Chord-degree persistence on mode change**: `selectedChordDegree` is
  mode-independent. Switching from Ionian to Dorian while degree 4 is selected changes
  the chord from `IVmaj7 = Fmaj7` to `IV7 = F7`; the selection itself stays at degree 4.
- **All-Notes key**: `ModeSelector` disabled; `ScaleDisplay` and `DiatonicChords`
  short-circuit via existing logic.
- **Mode-aware accidental spelling**: naturally-flat modes (Phrygian, Locrian, Aeolian)
  over a sharp-style key (and vice versa) can produce odd enharmonic spellings. The
  accidental toggle remains user-controlled — spot-check spellings during
  implementation, but no design-level fix needed.
- **Characteristic-tone ring + `showContext`**: out-of-window characteristic notes still
  render the ring on the muted-role marker.
- **Ionian regression coverage**: every existing test must pass unchanged. Modal helpers
  degrade to identical Ionian behavior.

## Testing

### Theory layer (`src/theory/modes.test.ts`)

- `getModalScaleNotes` for each of the 7 modes rooted at C against canonical references
  (C Dorian = C, D, E♭, F, G, A, B♭, etc.).
- Spelling spot-checks across `(mode, tonic, accidentalStyle)` combinations (D Phrygian
  flat, F♯ Lydian sharp, B Locrian, etc.).
- `getModalDiatonicChords` quality table — every mode × every position matches the
  matrix above.
- `getModalDiatonicTriads` triad qualities.
- Roman numerals — verify modal accidentals and case for each mode's 7 chords in both
  triad and seventh forms.
- `parentMajorOf` — `('D', 'dorian') === 'C'`, `('F', 'lydian') === 'C'`,
  `('A', 'aeolian') === 'C'`, etc. across all 7 modes × representative tonics.
- `getModalIntervalRole` — in-mode notes return their degree; out-of-mode notes return
  `null`.
- `getCharacteristicNotes` — correct notes for the 5 modes that have them; `[]` for
  Ionian and Aeolian.

### Integration tests

- `chordTones.test.ts`:
  - `mode = 'ionian'` regression — byte-identical output to current behavior on existing
    test cases.
  - `(key='D', mode='dorian', chord=Dm7, P1)` → markers in frets 0–3 (parent C major's
    P1), not 2–5 (D-Ionian's P1).
  - `isCharacteristic` flag set on characteristic notes; unset on others.
- `chordShapes.test.ts`:
  - `(key='C', mode='dorian', chord=IV)` renders F7 voicings (not Fmaj7).
  - Characteristic-tone flag propagates to chord-shape markers.

### Component spot-checks

- `ScaleDisplay` renders correct modal degree labels per mode.
- `DiatonicChords` shows correct Roman numerals + symbols for each (key, mode).
- `ModeSelector` renders 7 options, fires `onModeChange`, disables on All-Notes.

## Implementation footprint

**New files**

- `src/theory/modes.ts`
- `src/theory/modes.test.ts`
- `src/components/ModeSelector.tsx`
- Possibly `src/components/AppTopBar.tsx` (or inline in `App.tsx`)

**Modified files**

- `src/App.tsx` — top-bar refactor; `mode` state; `ModeSelector` wiring; prop threading
  down to all views.
- `src/components/ScaleDisplay.tsx` — `mode` prop; modal degree labels; mode step
  pattern; header text.
- `src/components/DiatonicChords.tsx` — `mode` prop; modal chord set; modal Roman
  numerals.
- `src/theory/chordTones.ts` — `mode` parameter on `buildChordToneMarkers`; modal-aware
  in-key check; parent-major-anchored window check; per-marker `isCharacteristic` flag.
- `src/theory/chordShapes.ts` — modal-aware chord set hookup; `isCharacteristic` flag on
  emitted markers.
- `src/views/ScalePositionsView.tsx` — `parentKey` computation; window-label adjustment;
  pass-through `mode` to `buildChordToneMarkers`.
- `src/components/Fretboard/Fretboard.tsx` — characteristic-tone ring rendering when
  `marker.isCharacteristic === true`.
- `src/theory/types.ts` — `NoteMarker.isCharacteristic`.
- CSS token additions for `--color-characteristic`.

**Documentation updates**

- Update the "Future: Modal practice mode" section of
  `docs/design/2026-05-05-app-vision-and-view-designs.md` to point at this design doc
  and reflect the resolved decisions.
- Add the music-theory citations from [Sources](#sources) to `README.md`.

## Sources

Music-theory references consulted while drafting this design:

- [Mode (music) — Wikipedia](<https://en.wikipedia.org/wiki/Mode_(music)>)
- [Music Modes: Major and Minor — Berklee Online](https://online.berklee.edu/takenote/music-modes-major-and-minor/)
- [The Seven Modes — The Nandi Method](https://thenandimethod.com/lesson/the-seven-modes/)
- [Modal Schemas — Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/modal-schemas/)
- [Roman Numerals of Diatonic Seventh Chords — University of Puget Sound](https://musictheory.pugetsound.edu/mt21c/RomanNumeralsOfDiatonicSeventhChords.html)
