# Diatonic Chord Row — Triads Mode — Design

## Goal

Extend the existing diatonic chord row (`DiatonicChords.tsx`) so it can display either
the 7 diatonic seventh chords (current behaviour) or the 7 diatonic triads, controlled
by a small in-section toggle. Triad mode supports R/3/5 chord-tone targeting on the
fretboard the same way seventh mode supports R/3/5/7 today.

This replaces the originally-planned standalone "Diatonic Chord Reference" tab — the
reference content was already on screen via the chord row; only triads were missing. See
the consolidation note in `docs/design/2026-05-05-app-vision-and-view-designs.md`.

## Background

Today, the chord row in Note Map and Scale Positions renders
`getDiatonicChords(key, accidentalStyle)` — 7 cards (`Imaj7`, `ii7`, …, `viiø7`) with
Roman numerals, chord symbols, and 4 spelled notes. Clicking a card sets
`selectedChordDegree` in `App.tsx`; the derived `selectedChord` drives chord-tone
highlighting on the fretboard via `roleFromChordTone`.

The fretboard's chord-tone resolution (`src/theory/chordTones.ts`) currently assumes a
4-tuple `notes` field on the chord — it reads `notes[3]` unconditionally to detect the
seventh.

## Goals

- Add a `Triads | Sevenths` toggle in the chord row's section header.
- In triads mode, render 7 cards (`I`, `ii`, `iii`, `IV`, `V`, `vi`, `vii°`) with chord
  symbols (`C`, `Dm`, `Em`, `F`, `G`, `Am`, `B°`) and 3 spelled notes (R/3/5).
- Selecting a card in triads mode highlights R/3/5 on the fretboard, never a seventh.
- Default mode: sevenths (preserves existing behaviour).
- Mode and selected degree both persist across view switches.

## Non-Goals

- Visual redesign of the cards. Triad cards reuse the existing card layout — only the
  chord symbol and the spelled-notes line differ.
- Chord-tone targeting in Chord Shapes (the future view) — that view will fold the
  triad/seventh decision into its own Shells/Triads mode toggle, not consume this chord
  row.
- Persistence of `chordRowMode` to localStorage. Same in-memory pattern as other
  view-level state.
- Disabling Legend's "7" toggle when in triads mode (see _Edge cases_).

## Theory layer

### New types

```ts
// src/theory/scales.ts

export type TriadQuality = "maj" | "min" | "dim";

export type DiatonicTriad = {
  degree: number; // 1-7
  romanNumeral: string; // 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'
  quality: TriadQuality;
  symbol: string; // 'C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'
  notes: [string, string, string];
};
```

### New function

```ts
// src/theory/scales.ts

export function getDiatonicTriads(
  key: string,
  accidentalStyle?: AccidentalStyle,
): DiatonicTriad[];
```

Implementation mirrors `getDiatonicChords`: build 7 entries from the major scale, take
root + 3rd + 5th (no 7th), assign Roman numeral and quality from the diatonic template:

| Degree | Roman  | Quality |
| ------ | ------ | ------- |
| 1      | `I`    | `maj`   |
| 2      | `ii`   | `min`   |
| 3      | `iii`  | `min`   |
| 4      | `IV`   | `maj`   |
| 5      | `V`    | `maj`   |
| 6      | `vi`   | `min`   |
| 7      | `vii°` | `dim`   |

Symbol formatting:

- `maj`: `<root>` (e.g. `C`)
- `min`: `<root>m` (e.g. `Dm`)
- `dim`: `<root>°` (e.g. `B°`)

## Chord-tone resolution

`roleFromChordTone` (in `src/theory/chordTones.ts`) accepts a union:

```ts
export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | DiatonicTriad | null,
): NoteDisplayRole;
```

Behaviour:

- If `chord` is null, return `'scale'` (unchanged).
- Always check root/third/fifth from `chord.notes[0..2]`.
- Check seventh only when `chord.notes.length >= 4`. Triads (length 3) never return
  `'seventh'`.

`buildChordToneMarkers` accepts the same union via its `chord` field; no internal logic
change beyond the type widening.

## App state

`src/App.tsx` adds:

```ts
type ChordRowMode = "triads" | "sevenths";

const [chordRowMode, setChordRowMode] = useState<ChordRowMode>("sevenths");
```

`selectedChord` `useMemo` switches the source list based on `chordRowMode`:

```ts
const selectedChord = useMemo(() => {
  if (selectedChordDegree === null || selectedKey === ALL_NOTES_KEY) return null;
  const chords =
    chordRowMode === "sevenths"
      ? getDiatonicChords(selectedKey, accidentalStyle)
      : getDiatonicTriads(selectedKey, accidentalStyle);
  return chords[selectedChordDegree - 1] ?? null;
}, [selectedChordDegree, chordRowMode, selectedKey, accidentalStyle]);
```

`selectedChord`'s type widens to `DiatonicChord | DiatonicTriad | null`. It still passes
to `NoteMapView`, `ScalePositionsView`, and `ScaleDisplay` unchanged in shape — they all
consume it via the (now union-aware) `roleFromChordTone`.

## DiatonicChords component

Two new props:

```ts
type DiatonicChordsProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedDegree: number | null;
  onSelectDegree: (degree: number) => void;
  mode: ChordRowMode; // NEW
  onModeChange: (mode: ChordRowMode) => void; // NEW
};
```

- Section header gains a small segmented control (`Triads | Sevenths`) right of the
  "Diatonic chords" label.
- Chord list is fetched via `getDiatonicTriads` or `getDiatonicChords` based on `mode`.
- Card layout is unchanged. Per-card render differences:
  - Roman numeral comes from the source list (triads have `I`/`ii`/.../`vii°`, sevenths
    have `Imaj7`/etc.).
  - Chord symbol comes from the source list.
  - `notes.join(' – ')` produces 3 names in triads mode, 4 in sevenths mode — same
    dash-separator.
- `QUALITY_ACCENT` extended to include the triad qualities. Mapping mirrors the
  seventh-quality pattern (major variants get an emphasized border; minor and diminished
  variants get the plain line border):

  | Triad quality | Accent classes                           |
  | ------------- | ---------------------------------------- |
  | `maj`         | `border-line-emphasis bg-surface-raised` |
  | `min`         | `border-line bg-surface-raised`          |
  | `dim`         | `border-line bg-surface-raised`          |

## ScaleDisplay

`ScaleDisplay` receives `selectedChord` and renders chord-tone-relative role pills
(R/3/5/7). When the selected chord is a triad, the seventh pill receives no chord tone
and falls back to the plain scale role — the same fallback path that already exists when
no chord is selected. Verify during plan that the existing logic handles missing chord
tones gracefully; expect no code change here.

## Data flow

```
User clicks toggle in DiatonicChords header
   ↓
onModeChange → setChordRowMode in App.tsx
   ↓
selectedChord useMemo re-runs: switches list source
   ↓
NoteMapView / ScalePositionsView re-render
   → buildChordToneMarkers receives new chord (triad or seventh)
   → roleFromChordTone never returns 'seventh' for triads
   ↓
Fretboard re-renders without seventh markers
```

## Edge cases

- **`selectedKey === ALL_NOTES_KEY`**: chord row hidden today; toggle is hidden with it.
- **Mode toggle while degree is selected**: degree persists. Fretboard re-renders with
  R/3/5 only.
- **Accidental change in triads mode**: same as today — Roman numerals don't change, but
  spelled notes and symbols do.
- **Legend "7" toggle in triads mode**: stays clickable, has no visual effect because no
  seventh-role markers exist. Acceptable; not worth disabling because it would feel
  inconsistent across modes.

## Files touched

- `src/theory/scales.ts` — add `TriadQuality`, `DiatonicTriad`, `getDiatonicTriads`.
- `src/theory/scales.test.ts` — add unit tests for `getDiatonicTriads`.
- `src/theory/chordTones.ts` — widen `roleFromChordTone` and `buildChordToneMarkers`
  signatures to accept the union; add the length check on the seventh branch.
- `src/theory/chordTones.test.ts` — add triad cases.
- `src/App.tsx` — add `chordRowMode` state, branch the `selectedChord` `useMemo`, pass
  new props through to `DiatonicChords`.
- `src/components/DiatonicChords.tsx` — accept new props, render mode toggle in section
  header, branch chord list source, extend `QUALITY_ACCENT` for triad qualities.
- `src/components/ScaleDisplay.tsx` — verify only; expect no change.

## Testing

- **`getDiatonicTriads`** in `scales.test.ts`:
  - C major: `I=C`, `ii=Dm`, `iii=Em`, `IV=F`, `V=G`, `vi=Am`, `vii°=B°`. Notes triplets
    per chord.
  - F♯ major (sharp-heavy): correct sharps in symbols and notes.
  - B♭ major (flat-heavy): correct flats.
  - Round-trip with `accidentalStyle = 'sharp'` vs `'flat'`.
- **`roleFromChordTone`** in `chordTones.test.ts`:
  - Triad input — root/third/fifth resolve correctly; any other in-key note returns
    `'scale'`; out-of-key handled by caller as before.
  - Triad input — `'seventh'` is never returned.
- **`buildChordToneMarkers`** in `chordTones.test.ts`:
  - Triad case (e.g. C major, ii triad, P1) produces no markers with role `'seventh'`.
  - Marker counts match expected R/3/5 placements within the position window.

## Out of scope

- Persistence of `chordRowMode` to localStorage.
- Mode-aware Legend behaviour (e.g., dimming the "7" toggle when in triads mode).
  Deferred — see _Edge cases_.
- Triad-specific UI variants (e.g., a tighter card layout for 3-note chords). Same card
  layout as sevenths.
- The Chord Shapes view — see vision doc; will be specced separately.

## Verification

- `npm run lint` clean.
- `npm run test` — all existing tests pass; new tests added.
- `npm run build` succeeds.
- Manual: switch keys, toggle modes, click chords across both Note Map and Scale
  Positions; confirm fretboard highlights match the mode and selected degree.

## References

- Vision doc: `docs/design/2026-05-05-app-vision-and-view-designs.md` (consolidation
  note + "Diatonic chord row (extension)" section).
- Step 1 spec: `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md` (theory-
  layer conventions).
- Chord Tones in Scale Positions spec:
  `docs/superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md`
  (chord-tone resolution pipeline).
