# Chord Tones in Scale Positions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the **Chord Tones in Scale Positions** view (tab id `chord-tones`) — the highest-practice-value Fretlab view — and the CAGED position model it depends on, which the future Scale Positions view will reuse.

**Architecture:** Pure-function theory layer (`positions.ts`, `chordTones.ts`, `constants.ts`) drives a thin composition view (`ChordTonesView.tsx`) and a small selector component (`PositionSelector.tsx`). The existing `Fretboard` renderer is unchanged — it stays a dumb consumer of `NoteMarker[]`. Tests are pure-function unit tests via Vitest; no jsdom / @testing-library is added.

**Tech Stack:** React 19, Vite 8, Vitest 3, Tailwind v4, TypeScript ~6.0. Pure functions in `src/theory/`, components in `src/components/`, views in `src/views/`. No state-management library.

**Spec:** `docs/superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md`.

---

## File Structure

**New files:**
- `src/theory/constants.ts` — exports `FRET_COUNT = 15`. Single source of truth for the highest fret rendered.
- `src/theory/positions.ts` — CAGED position model: `PositionId`, `CagedShape`, `CAGED_POSITIONS`, `getPositionWindow`, `isInPositionWindow`.
- `src/theory/positions.test.ts` — tests for the position model.
- `src/theory/chordTones.ts` — `roleFromChordTone`, `buildChordToneMarkers`, `HIGHLIGHTABLE`. Pure functions extracted from / consumed by both `NoteMapView` and `ChordTonesView`.
- `src/theory/chordTones.test.ts` — tests for both functions above.
- `src/components/PositionSelector.tsx` — single-select buttons P1–P5 plus "All", styled like `ViewSelector`.
- `src/views/ChordTonesView.tsx` — composes inputs, renders `Fretboard` with markers from `buildChordToneMarkers`. Owns local state for position + focus toggle.

**Modified files:**
- `src/components/Fretboard/Fretboard.tsx` — `fretCount` default sourced from `FRET_COUNT` constant rather than the literal `15`.
- `src/views/NoteMapView.tsx` — drop the inline `FRET_COUNT = 15`, the inline `HIGHLIGHTABLE`, and the inline chord-tone resolution; import them from the new modules.
- `src/App.tsx` — route case for `selectedView === 'chord-tones'` that renders `ChordTonesView`.

---

## Task 1: Extract `FRET_COUNT` constant

**Files:**
- Create: `src/theory/constants.ts`
- Modify: `src/components/Fretboard/Fretboard.tsx` (line 8 prop default, line 15 destructure default)
- Modify: `src/views/NoteMapView.tsx` (line 22)

This is a pure refactor — no behavior changes, no new tests. Verification is the existing test suite plus a manual smoke check of the running app.

- [ ] **Step 1: Create `src/theory/constants.ts`**

```ts
// Highest fret rendered by the Fretboard. Single source of truth — every view
// and the renderer itself must derive their fret loop bounds and defaults from
// this constant. Bumping it changes the visible range across the entire app.
export const FRET_COUNT = 15
```

- [ ] **Step 2: Update `Fretboard.tsx` to import the constant**

Replace the literal `15` in the prop default. Find at the top of `src/components/Fretboard/Fretboard.tsx`:

```ts
import type { NoteMarker } from '../../theory/types'
import { FretboardString } from './FretboardString'
import { FretMarkers } from './FretMarkers'
import { NoteCircle } from './NoteCircle'

type FretboardProps = {
  markers: NoteMarker[]
  fretCount?: number
}
```

Add the import and update the destructure default. Result:

```ts
import type { NoteMarker } from '../../theory/types'
import { FRET_COUNT } from '../../theory/constants'
import { FretboardString } from './FretboardString'
import { FretMarkers } from './FretMarkers'
import { NoteCircle } from './NoteCircle'

type FretboardProps = {
  markers: NoteMarker[]
  fretCount?: number
}
```

And on the function signature line (currently `export function Fretboard({ markers, fretCount = 15 }: FretboardProps) {`):

```ts
export function Fretboard({ markers, fretCount = FRET_COUNT }: FretboardProps) {
```

- [ ] **Step 3: Update `NoteMapView.tsx` to import the constant**

Replace the local `const FRET_COUNT = 15` (currently line 22) with an import. Add to the existing imports at the top:

```ts
import { FRET_COUNT } from '../theory/constants'
```

Then delete the line `const FRET_COUNT = 15` near the top of the file (it's redundant now).

- [ ] **Step 4: Run lint and typecheck**

Run: `npm run lint`
Expected: no errors.

Run: `npx tsc -b`
Expected: clean exit.

- [ ] **Step 5: Run tests**

Run: `npm test`
Expected: all existing tests pass (no behavior change).

- [ ] **Step 6: Smoke test the app manually**

Run: `npm run dev`
Open the printed URL, confirm the Note Map view still renders frets 0–15 exactly as before. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/theory/constants.ts src/components/Fretboard/Fretboard.tsx src/views/NoteMapView.tsx
git commit -m "refactor(theory): extract FRET_COUNT to a shared constant"
```

---

## Task 2: Extract `roleFromChordTone` and `HIGHLIGHTABLE` (TDD)

**Files:**
- Create: `src/theory/chordTones.ts`
- Create: `src/theory/chordTones.test.ts`
- Modify: `src/views/NoteMapView.tsx` (drops the inline `HIGHLIGHTABLE` set and the inline chord-tone resolution; imports the new helpers)

The new helper accepts a `DiatonicChord | null` so both views can call it identically: with a chord, you get chord-relative roles; without one, you get the major-scale interval mapping.

- [ ] **Step 1: Write the failing tests**

Create `src/theory/chordTones.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { roleFromChordTone, HIGHLIGHTABLE } from './chordTones'
import { getDiatonicChords, getIntervalRole } from './scales'
import type { IntervalRole, NoteDisplayRole } from './types'

describe('roleFromChordTone', () => {
  it('returns the major-scale interval mapping when no chord is given', () => {
    // C major scale tones: 1=C(root), 2=D(scale), 3=E(third), 4=F(scale),
    //                      5=G(fifth), 6=A(scale), 7=B(seventh).
    const cases: Array<[string, IntervalRole, NoteDisplayRole]> = [
      ['C', 'root', 'root'],
      ['D', 'second', 'scale'],
      ['E', 'third', 'third'],
      ['F', 'fourth', 'scale'],
      ['G', 'fifth', 'fifth'],
      ['A', 'sixth', 'scale'],
      ['B', 'seventh', 'seventh'],
    ]
    for (const [note, interval, expected] of cases) {
      expect(roleFromChordTone(note, null, interval)).toBe(expected)
    }
  })

  it('maps to chord-relative roles when a chord is given (G major, ii = Am7)', () => {
    // ii in G major is Am7: A C E G — A=root, C=third, E=fifth, G=seventh.
    const chords = getDiatonicChords('G')
    const am7 = chords[1] // ii
    expect(am7.symbol.toLowerCase()).toContain('a')

    expect(roleFromChordTone('A', am7, getIntervalRole('G', 'A')!)).toBe('root')
    expect(roleFromChordTone('C', am7, getIntervalRole('G', 'C')!)).toBe('third')
    expect(roleFromChordTone('E', am7, getIntervalRole('G', 'E')!)).toBe('fifth')
    expect(roleFromChordTone('G', am7, getIntervalRole('G', 'G')!)).toBe('seventh')
  })

  it('returns "scale" for in-key notes that are not chord tones', () => {
    // In G major over Am7, D is in the G major scale but not in Am7.
    const am7 = getDiatonicChords('G')[1]
    expect(roleFromChordTone('D', am7, getIntervalRole('G', 'D')!)).toBe('scale')
  })

  it('handles enharmonic equivalence (sharp vs flat input)', () => {
    // V7 in F major is C7 = C E G Bb. Bb and A# are enharmonic — both should
    // resolve as the chord's seventh.
    const c7 = getDiatonicChords('F')[4]
    expect(roleFromChordTone('Bb', c7, getIntervalRole('F', 'Bb')!)).toBe('seventh')
    expect(roleFromChordTone('A#', c7, getIntervalRole('F', 'A#')!)).toBe('seventh')
  })
})

describe('HIGHLIGHTABLE', () => {
  it('contains exactly the four chord-tone roles', () => {
    expect(HIGHLIGHTABLE.has('root')).toBe(true)
    expect(HIGHLIGHTABLE.has('third')).toBe(true)
    expect(HIGHLIGHTABLE.has('fifth')).toBe(true)
    expect(HIGHLIGHTABLE.has('seventh')).toBe(true)
    expect(HIGHLIGHTABLE.has('scale')).toBe(false)
    expect(HIGHLIGHTABLE.has('muted')).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theory/chordTones.test.ts`
Expected: FAIL — module `./chordTones` not found.

- [ ] **Step 3: Implement `chordTones.ts`**

Create `src/theory/chordTones.ts`:

```ts
import { getNoteIndex } from './notes'
import type { DiatonicChord } from './scales'
import type { IntervalRole, NoteDisplayRole } from './types'

const INTERVAL_TO_DISPLAY_ROLE: Record<IntervalRole, NoteDisplayRole> = {
  root: 'root',
  second: 'scale',
  third: 'third',
  fourth: 'scale',
  fifth: 'fifth',
  sixth: 'scale',
  seventh: 'seventh',
}

// Roles the Legend can toggle off (demoted to 'scale' when their toggle is
// disabled). Both NoteMapView and ChordTonesView read from this single set.
export const HIGHLIGHTABLE: ReadonlySet<NoteDisplayRole> = new Set<NoteDisplayRole>([
  'root',
  'third',
  'fifth',
  'seventh',
])

// Resolves the visual role of an in-key note given an optional chord context.
// - With a chord: returns the chord-relative role ('root'/'third'/'fifth'/
//   'seventh'), or 'scale' if the note is in-key but not a chord tone.
// - Without a chord: falls back to the major-scale interval mapping where
//   1/3/5/7 light up and 2/4/6 are muted to 'scale'.
// Caller is responsible for filtering out-of-key notes upstream (intervalRole
// is non-nullable here; callers pass the result of getIntervalRole and skip
// when null).
export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | null,
  intervalRole: IntervalRole,
): NoteDisplayRole {
  if (!chord) {
    return INTERVAL_TO_DISPLAY_ROLE[intervalRole]
  }
  const noteIdx = getNoteIndex(note)
  const rootIdx = getNoteIndex(chord.notes[0])
  const thirdIdx = getNoteIndex(chord.notes[1])
  const fifthIdx = getNoteIndex(chord.notes[2])
  const seventhIdx = getNoteIndex(chord.notes[3])

  if (noteIdx === rootIdx) return 'root'
  if (noteIdx === thirdIdx) return 'third'
  if (noteIdx === fifthIdx) return 'fifth'
  if (noteIdx === seventhIdx) return 'seventh'
  return 'scale'
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/theory/chordTones.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Refactor `NoteMapView.tsx` to use the new helpers**

Replace the inline `INTERVAL_TO_DISPLAY_ROLE`, `HIGHLIGHTABLE`, and the chord-tone resolution block with calls to `roleFromChordTone` + the imported `HIGHLIGHTABLE`. The full new file content:

```tsx
import { useMemo } from 'react'
import { Fretboard } from '../components/Fretboard/Fretboard'
import { ALL_NOTES_KEY } from '../components/KeySelector'
import type { HighlightableRole } from '../components/Legend'
import { FRET_COUNT } from '../theory/constants'
import { roleFromChordTone, HIGHLIGHTABLE } from '../theory/chordTones'
import {
  STANDARD_TUNING,
  getNoteAtFret,
  getDisplayName,
  type AccidentalStyle,
} from '../theory/notes'
import { getIntervalRole, type DiatonicChord } from '../theory/scales'
import type { NoteMarker, NoteDisplayRole } from '../theory/types'

type NoteMapViewProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  enabledHighlights: Set<HighlightableRole>
  selectedChord: DiatonicChord | null
}

export function NoteMapView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = []
    const showAll = selectedKey === ALL_NOTES_KEY

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex]
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const note = getNoteAtFret(openString, fret)

        let role: NoteDisplayRole
        if (showAll) {
          role = 'scale'
        } else {
          const interval = getIntervalRole(selectedKey, note)
          if (interval === null) continue
          role = roleFromChordTone(note, selectedChord, interval)
          if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role as HighlightableRole)) {
            role = 'scale'
          }
        }

        result.push({
          string: stringIndex,
          fret,
          note: getDisplayName(note, selectedKey, accidentalStyle),
          role,
        })
      }
    }

    return result
  }, [selectedKey, accidentalStyle, enabledHighlights, selectedChord])

  return <Fretboard markers={markers} fretCount={FRET_COUNT} />
}
```

- [ ] **Step 6: Run lint, typecheck, and tests**

Run: `npm run lint`
Expected: clean.

Run: `npx tsc -b`
Expected: clean.

Run: `npm test`
Expected: all tests pass (existing scales/notes/positions tests + new chordTones tests).

- [ ] **Step 7: Smoke test the Note Map view**

Run: `npm run dev`. Confirm:
- Selecting a key (e.g., G) still hides out-of-key notes and lights R/3/5/7.
- Clicking a diatonic chord card still re-highlights to that chord's tones.
- Toggling Legend's R/3/5/7 buttons still demotes the corresponding notes to plain scale tones.

Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/theory/chordTones.ts src/theory/chordTones.test.ts src/views/NoteMapView.tsx
git commit -m "refactor(theory): extract roleFromChordTone and HIGHLIGHTABLE for reuse"
```

---

## Task 3: CAGED position model (TDD)

**Files:**
- Create: `src/theory/positions.ts`
- Create: `src/theory/positions.test.ts`

The model encodes 5 fret-windows anchored to C major plus a per-key wrap rule: fits as-is, straddle-clip at the high end of the neck, or wrap −12 octaves when entirely past the end. See spec §"CAGED Position Model".

- [ ] **Step 1: Write the failing tests**

Create `src/theory/positions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  CAGED_POSITIONS,
  getPositionWindow,
  isInPositionWindow,
  type PositionId,
} from './positions'
import { FRET_COUNT } from './constants'

const ALL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const
const ALL_POSITIONS: PositionId[] = ['P1', 'P2', 'P3', 'P4', 'P5']

describe('CAGED_POSITIONS', () => {
  it('declares the 5 CAGED positions in the spec-defined order', () => {
    expect(CAGED_POSITIONS).toHaveLength(5)
    expect(CAGED_POSITIONS.map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5'])
    expect(CAGED_POSITIONS.map((p) => p.shape)).toEqual(['E', 'D', 'C', 'A', 'G'])
    expect(CAGED_POSITIONS.map((p) => p.cMajorWindow)).toEqual([
      [0, 3],
      [2, 5],
      [4, 8],
      [7, 10],
      [9, 13],
    ])
  })
})

describe('getPositionWindow', () => {
  it('returns the C-major windows unchanged for key=C', () => {
    expect(getPositionWindow('C', 'P1')).toEqual([0, 3])
    expect(getPositionWindow('C', 'P2')).toEqual([2, 5])
    expect(getPositionWindow('C', 'P3')).toEqual([4, 8])
    expect(getPositionWindow('C', 'P4')).toEqual([7, 10])
    expect(getPositionWindow('C', 'P5')).toEqual([9, 13])
  })

  it('shifts windows by the key offset when they fit within FRET_COUNT', () => {
    // D major = +2: P1 [0,3] -> [2,5], P2 [2,5] -> [4,7], P5 [9,13] -> [11,15].
    expect(getPositionWindow('D', 'P1')).toEqual([2, 5])
    expect(getPositionWindow('D', 'P5')).toEqual([11, 15])
  })

  it('clips a straddling window at FRET_COUNT (G major P4: [14,17] -> [14,15])', () => {
    expect(getPositionWindow('G', 'P4')).toEqual([14, 15])
  })

  it('clips to a single fret when only the low edge is on the neck (B major P3: [15,19] -> [15,15])', () => {
    expect(getPositionWindow('B', 'P3')).toEqual([15, 15])
  })

  it('wraps -12 when the window is entirely past FRET_COUNT (G major P5: [16,20] -> [4,8])', () => {
    expect(getPositionWindow('G', 'P5')).toEqual([4, 8])
  })

  it('wraps -12 for A major P5 ([18,22] -> [6,10])', () => {
    expect(getPositionWindow('A', 'P5')).toEqual([6, 10])
  })

  it('wraps -12 for B major P5 ([20,24] -> [8,12])', () => {
    expect(getPositionWindow('B', 'P5')).toEqual([8, 12])
  })

  it('produces a window with 0 <= low <= high <= FRET_COUNT for every (key, position) pair', () => {
    for (const key of ALL_KEYS) {
      for (const position of ALL_POSITIONS) {
        const [low, high] = getPositionWindow(key, position)
        expect(
          low >= 0 && low <= high && high <= FRET_COUNT,
          `key=${key} pos=${position} window=[${low},${high}]`,
        ).toBe(true)
      }
    }
  })
})

describe('isInPositionWindow', () => {
  it('returns true at both edges of the window and false just outside', () => {
    // C major P3 = [4, 8]
    expect(isInPositionWindow('C', 'P3', 4)).toBe(true)
    expect(isInPositionWindow('C', 'P3', 8)).toBe(true)
    expect(isInPositionWindow('C', 'P3', 5)).toBe(true)
    expect(isInPositionWindow('C', 'P3', 3)).toBe(false)
    expect(isInPositionWindow('C', 'P3', 9)).toBe(false)
  })

  it('reflects the wrap rule (G major P5 wraps to [4, 8])', () => {
    expect(isInPositionWindow('G', 'P5', 4)).toBe(true)
    expect(isInPositionWindow('G', 'P5', 8)).toBe(true)
    expect(isInPositionWindow('G', 'P5', 16)).toBe(false) // outside the rendered range
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theory/positions.test.ts`
Expected: FAIL — module `./positions` not found.

- [ ] **Step 3: Implement `positions.ts`**

Create `src/theory/positions.ts`:

```ts
import { FRET_COUNT } from './constants'
import { getNoteIndex } from './notes'

export type PositionId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5'
export type CagedShape = 'E' | 'D' | 'C' | 'A' | 'G'

export type FretWindow = readonly [low: number, high: number]

type PositionDef = {
  id: PositionId
  shape: CagedShape
  cMajorWindow: FretWindow
}

// Anchored to C major. Numbers from the vision doc's Scale Positions section
// (P1 E shape ≈ frets 0–3, P2 D shape ≈ frets 2–5, ...). Other keys are
// derived from these by getPositionWindow.
export const CAGED_POSITIONS: ReadonlyArray<PositionDef> = [
  { id: 'P1', shape: 'E', cMajorWindow: [0, 3] },
  { id: 'P2', shape: 'D', cMajorWindow: [2, 5] },
  { id: 'P3', shape: 'C', cMajorWindow: [4, 8] },
  { id: 'P4', shape: 'A', cMajorWindow: [7, 10] },
  { id: 'P5', shape: 'G', cMajorWindow: [9, 13] },
]

const C_INDEX = getNoteIndex('C')

function getKeyOffset(key: string): number {
  // 0..11, the chromatic distance from C up to the given key.
  const idx = getNoteIndex(key)
  return (idx - C_INDEX + 12) % 12
}

function lookup(position: PositionId): PositionDef {
  const def = CAGED_POSITIONS.find((p) => p.id === position)
  if (!def) {
    throw new Error(`Unknown position id: ${position}`)
  }
  return def
}

// Computes the visible fret window for a given key and CAGED position by
// applying the wrap rule: fits as-is, straddle-clip at FRET_COUNT, or -12
// octave wrap when the natural window is entirely past the visible neck.
export function getPositionWindow(key: string, position: PositionId): FretWindow {
  const { cMajorWindow } = lookup(position)
  const offset = getKeyOffset(key)
  const naturalLow = cMajorWindow[0] + offset
  const naturalHigh = cMajorWindow[1] + offset

  if (naturalHigh <= FRET_COUNT) {
    return [naturalLow, naturalHigh]
  }
  if (naturalLow <= FRET_COUNT) {
    return [naturalLow, FRET_COUNT]
  }
  return [naturalLow - 12, naturalHigh - 12]
}

export function isInPositionWindow(
  key: string,
  position: PositionId,
  fret: number,
): boolean {
  const [low, high] = getPositionWindow(key, position)
  return fret >= low && fret <= high
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/theory/positions.test.ts`
Expected: PASS, all assertions including the 60-pair sanity check.

- [ ] **Step 5: Run the full test suite + typecheck**

Run: `npm test`
Expected: all green.

Run: `npx tsc -b`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/theory/positions.ts src/theory/positions.test.ts
git commit -m "feat(theory): add CAGED position model with wrap rule"
```

---

## Task 4: `buildChordToneMarkers` pure function (TDD)

**Files:**
- Modify: `src/theory/chordTones.ts` (add `buildChordToneMarkers` and a small input type)
- Modify: `src/theory/chordTones.test.ts` (append marker-pipeline tests)

This is the pure marker-computation pipeline that `ChordTonesView` will render. Testing it as a pure function avoids needing a jsdom / @testing-library setup.

- [ ] **Step 1: Append the failing tests to `chordTones.test.ts`**

Add at the bottom of the existing `src/theory/chordTones.test.ts` (alongside the existing describe blocks):

```ts
import { buildChordToneMarkers } from './chordTones'
import type { HighlightableRole } from '../components/Legend'
import { ALL_NOTES_KEY } from '../components/KeySelector'

describe('buildChordToneMarkers', () => {
  // Reusable inputs: C major, ii (Dm7), default Legend (all four roles on).
  const cMajor_ii = () => getDiatonicChords('C')[1]
  const allRoles: Set<HighlightableRole> = new Set(['root', 'third', 'fifth', 'seventh'])

  it('returns an empty list when key is ALL_NOTES_KEY', () => {
    const markers = buildChordToneMarkers({
      key: ALL_NOTES_KEY,
      chord: null,
      accidentalStyle: 'sharp',
      position: 'all',
      showOutside: false,
      enabledHighlights: allRoles,
    })
    expect(markers).toEqual([])
  })

  it('with position=P1 and showOutside=false, every marker has fret <= 3', () => {
    const markers = buildChordToneMarkers({
      key: 'C',
      chord: cMajor_ii(),
      accidentalStyle: 'sharp',
      position: 'P1',
      showOutside: false,
      enabledHighlights: allRoles,
    })
    expect(markers.length).toBeGreaterThan(0)
    for (const m of markers) {
      expect(m.fret).toBeLessThanOrEqual(3)
    }
  })

  it('with position=P1 and chord=Dm7 in C, marks D=root, F=third, A=fifth, C=seventh', () => {
    const markers = buildChordToneMarkers({
      key: 'C',
      chord: cMajor_ii(),
      accidentalStyle: 'sharp',
      position: 'P1',
      showOutside: false,
      enabledHighlights: allRoles,
    })
    // String index convention: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E.
    // Pick one representative cell for each chord tone within [0,3]:
    // - D: D string (idx 2) open
    // - F: low E (idx 0) + fret 1
    // - A: A string (idx 1) open
    // - C: A string (idx 1) + fret 3
    const find = (string: number, fret: number) =>
      markers.find((m) => m.string === string && m.fret === fret)

    expect(find(2, 0)?.role).toBe('root')    // D string open = D
    expect(find(0, 1)?.role).toBe('third')   // low E + 1 = F
    expect(find(1, 0)?.role).toBe('fifth')   // A string open = A
    expect(find(1, 3)?.role).toBe('seventh') // A string + 3 = C
  })

  it('non-chord scale tones in the position are role "scale"', () => {
    const markers = buildChordToneMarkers({
      key: 'C',
      chord: cMajor_ii(),
      accidentalStyle: 'sharp',
      position: 'P1',
      showOutside: false,
      enabledHighlights: allRoles,
    })
    // E is a C-major scale tone but not in Dm7 (D F A C).
    // E appears on the low E string at fret 0.
    const e = markers.find((m) => m.string === 0 && m.fret === 0)
    expect(e?.role).toBe('scale')
  })

  it('with showOutside=true, at least one outside-window marker exists with role "muted"', () => {
    const markers = buildChordToneMarkers({
      key: 'C',
      chord: cMajor_ii(),
      accidentalStyle: 'sharp',
      position: 'P1',
      showOutside: true,
      enabledHighlights: allRoles,
    })
    const outside = markers.filter((m) => m.fret > 3)
    expect(outside.length).toBeGreaterThan(0)
    for (const m of outside) {
      expect(m.role).toBe('muted')
    }
  })

  it('demotes a chord-tone role to "scale" when the Legend toggles it off', () => {
    const without5: Set<HighlightableRole> = new Set(['root', 'third', 'seventh'])
    const markers = buildChordToneMarkers({
      key: 'C',
      chord: cMajor_ii(),
      accidentalStyle: 'sharp',
      position: 'P1',
      showOutside: false,
      enabledHighlights: without5,
    })
    // A string open = A, which would be 'fifth' of Dm7. With fifth toggled off,
    // it should demote to 'scale'.
    const a = markers.find((m) => m.string === 1 && m.fret === 0)
    expect(a?.role).toBe('scale')
  })

  it('with position="all", returns markers spanning the full neck', () => {
    const markers = buildChordToneMarkers({
      key: 'C',
      chord: cMajor_ii(),
      accidentalStyle: 'sharp',
      position: 'all',
      showOutside: false,
      enabledHighlights: allRoles,
    })
    const maxFret = Math.max(...markers.map((m) => m.fret))
    expect(maxFret).toBeGreaterThan(10) // covers higher-neck cells
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theory/chordTones.test.ts`
Expected: FAIL — `buildChordToneMarkers` is not exported.

- [ ] **Step 3: Implement `buildChordToneMarkers` in `chordTones.ts`**

Append to `src/theory/chordTones.ts`:

```ts
import { ALL_NOTES_KEY } from '../components/KeySelector'
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  type AccidentalStyle,
} from './notes'
import { FRET_COUNT } from './constants'
import { isInPositionWindow, type PositionId } from './positions'
import { getIntervalRole, type DiatonicChord } from './scales'
import type { HighlightableRole } from '../components/Legend'
import type { NoteMarker } from './types'

export type PositionSelection = PositionId | 'all'

export type BuildChordToneMarkersInput = {
  key: string
  chord: DiatonicChord | null
  accidentalStyle: AccidentalStyle
  position: PositionSelection
  showOutside: boolean
  enabledHighlights: Set<HighlightableRole>
}

// Pure function: given the Chord-Tones view's full input, returns the
// NoteMarker[] that the Fretboard should render. Mirrors the pipeline
// described in the spec under "Marker Computation". Returns [] for the
// "All Notes" key (the chord-tones concept requires a key).
export function buildChordToneMarkers({
  key,
  chord,
  accidentalStyle,
  position,
  showOutside,
  enabledHighlights,
}: BuildChordToneMarkersInput): NoteMarker[] {
  if (key === ALL_NOTES_KEY) return []

  const result: NoteMarker[] = []

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
    const openString = STANDARD_TUNING[stringIndex]
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const note = getNoteAtFret(openString, fret)
      const interval = getIntervalRole(key, note)
      if (interval === null) continue // out of key — drop entirely

      const inWindow =
        position === 'all' ? true : isInPositionWindow(key, position, fret)
      if (!inWindow && !showOutside) continue // hide outside (focus mode)

      let role = roleFromChordTone(note, chord, interval)
      if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role as HighlightableRole)) {
        role = 'scale' // Legend toggle off → demote
      }
      if (!inWindow) {
        role = 'muted' // outside-window override (showOutside=true case)
      }

      result.push({
        string: stringIndex,
        fret,
        note: getDisplayName(note, key, accidentalStyle),
        role,
      })
    }
  }

  return result
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/theory/chordTones.test.ts`
Expected: PASS — both the original `roleFromChordTone` / `HIGHLIGHTABLE` blocks and the new `buildChordToneMarkers` block.

- [ ] **Step 5: Lint, typecheck, full test suite**

Run: `npm run lint`
Expected: clean.

Run: `npx tsc -b`
Expected: clean.

Run: `npm test`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/theory/chordTones.ts src/theory/chordTones.test.ts
git commit -m "feat(theory): add buildChordToneMarkers pure pipeline"
```

---

## Task 5: `PositionSelector` component

**Files:**
- Create: `src/components/PositionSelector.tsx`

A small button-row component, single-select, P1–P5 plus "All". Same visual pattern as the existing `ViewSelector` (no test — `ViewSelector.tsx` doesn't have one either; the component is verified manually in Task 6's smoke run).

- [ ] **Step 1: Read `ViewSelector.tsx` for the existing styling pattern**

Read `src/components/ViewSelector.tsx`. The pattern is a flex row of `<button>` elements with `aria-pressed`, `bg-surface-raised` / `bg-surface-active` classes for selected vs. unselected, and a callback prop. Use the same idiom.

- [ ] **Step 2: Create `PositionSelector.tsx`**

```tsx
import type { PositionId } from '../theory/positions'
import type { PositionSelection } from '../theory/chordTones'

const POSITIONS: ReadonlyArray<{ id: PositionId; label: string }> = [
  { id: 'P1', label: 'P1' },
  { id: 'P2', label: 'P2' },
  { id: 'P3', label: 'P3' },
  { id: 'P4', label: 'P4' },
  { id: 'P5', label: 'P5' },
]

type PositionSelectorProps = {
  selectedPosition: PositionSelection
  onChange: (next: PositionSelection) => void
}

export function PositionSelector({ selectedPosition, onChange }: PositionSelectorProps) {
  const baseClass =
    'px-3 py-1.5 rounded text-sm border border-line-emphasis transition-colors'

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Scale position">
      <button
        type="button"
        role="radio"
        aria-checked={selectedPosition === 'all'}
        onClick={() => onChange('all')}
        className={`${baseClass} ${
          selectedPosition === 'all'
            ? 'bg-surface-active text-fg-emphasis border-line-selected'
            : 'bg-surface-raised text-fg-secondary hover:border-line-hover'
        }`}
      >
        All
      </button>
      {POSITIONS.map(({ id, label }) => {
        const selected = selectedPosition === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(id)}
            className={`${baseClass} ${
              selected
                ? 'bg-surface-active text-fg-emphasis border-line-selected'
                : 'bg-surface-raised text-fg-secondary hover:border-line-hover'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Lint and typecheck**

Run: `npm run lint`
Expected: clean.

Run: `npx tsc -b`
Expected: clean. (Note: `PositionSelection` is exported from `chordTones.ts`, defined in Task 4.)

- [ ] **Step 4: Commit**

```bash
git add src/components/PositionSelector.tsx
git commit -m "feat(ui): add PositionSelector for CAGED position picking"
```

---

## Task 6: `ChordTonesView` view + wire into `App.tsx`

**Files:**
- Create: `src/views/ChordTonesView.tsx`
- Modify: `src/App.tsx` (add a route case, render the new view + Legend + DiatonicChords + PositionSelector + focus toggle)

The view is composition-only. All marker logic lives in `buildChordToneMarkers`. Local state covers position and focus toggle.

- [ ] **Step 1: Create `ChordTonesView.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Fretboard } from '../components/Fretboard/Fretboard'
import { PositionSelector } from '../components/PositionSelector'
import { ALL_NOTES_KEY } from '../components/KeySelector'
import type { HighlightableRole } from '../components/Legend'
import { FRET_COUNT } from '../theory/constants'
import {
  buildChordToneMarkers,
  type PositionSelection,
} from '../theory/chordTones'
import type { AccidentalStyle } from '../theory/notes'
import type { DiatonicChord } from '../theory/scales'

type ChordTonesViewProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  enabledHighlights: Set<HighlightableRole>
  selectedChord: DiatonicChord | null
}

export function ChordTonesView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: ChordTonesViewProps) {
  const [selectedPosition, setSelectedPosition] = useState<PositionSelection>('all')
  const [showOutside, setShowOutside] = useState(false)

  const markers = useMemo(
    () =>
      buildChordToneMarkers({
        key: selectedKey,
        chord: selectedChord,
        accidentalStyle,
        position: selectedPosition,
        showOutside,
        enabledHighlights,
      }),
    [selectedKey, selectedChord, accidentalStyle, selectedPosition, showOutside, enabledHighlights],
  )

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord tones.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <PositionSelector
          selectedPosition={selectedPosition}
          onChange={setSelectedPosition}
        />
        {selectedPosition !== 'all' && (
          <label className="inline-flex items-center gap-2 text-sm text-fg-secondary">
            <input
              type="checkbox"
              checked={showOutside}
              onChange={(e) => setShowOutside(e.target.checked)}
            />
            Show outside position
          </label>
        )}
      </div>
      <Fretboard markers={markers} fretCount={FRET_COUNT} />
    </div>
  )
}
```

- [ ] **Step 2: Wire `ChordTonesView` into `App.tsx`**

The new tab should render `DiatonicChords` (chord-degree picker) above the view and `Legend` below it, like `note-map` does. The full updated `<main>` block of `src/App.tsx` (replacing the current ternary at lines 78–102):

```tsx
<main className="max-w-6xl mx-auto">
  {selectedView === 'note-map' && (
    <>
      <NoteMapView
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        enabledHighlights={enabledHighlights}
        selectedChord={selectedChord}
      />
      <div className="mt-4">
        <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
      </div>
      <DiatonicChords
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        selectedDegree={selectedChordDegree}
        onSelectDegree={handleChordSelect}
      />
    </>
  )}
  {selectedView === 'chord-tones' && (
    <>
      <DiatonicChords
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        selectedDegree={selectedChordDegree}
        onSelectDegree={handleChordSelect}
      />
      <div className="mt-4">
        <ChordTonesView
          selectedKey={selectedKey}
          accidentalStyle={accidentalStyle}
          enabledHighlights={enabledHighlights}
          selectedChord={selectedChord}
        />
      </div>
      <div className="mt-4">
        <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
      </div>
    </>
  )}
  {selectedView !== 'note-map' && selectedView !== 'chord-tones' && (
    <div className="text-fg-faint text-center py-20">
      Coming soon
    </div>
  )}
</main>
```

Also add the import at the top of `App.tsx`, alongside the existing `NoteMapView` import:

```tsx
import { ChordTonesView } from './views/ChordTonesView'
```

- [ ] **Step 3: Lint, typecheck, and run tests**

Run: `npm run lint`
Expected: clean.

Run: `npx tsc -b`
Expected: clean.

Run: `npm test`
Expected: all green.

- [ ] **Step 4: Manual verification — golden path**

Run: `npm run dev`. Open the app:

1. Switch to the **Chord Tones in Scale Positions** tab.
2. With key = C, default chord (I = Cmaj7), position = All — confirm chord tones C/E/G/B light up across all 16 frets, other scale tones are faint.
3. Click the ii chord (Dm7). Confirm D/F/A/C now light up as R/3/5/7.
4. Click position P1. Confirm only frets 0–3 show markers; outside frets disappear.
5. Toggle the **Show outside position** checkbox on. Confirm outside-window markers appear with the muted color.
6. Toggle Legend's `7` button off. Confirm C (Dm7's ♭7) demotes to plain scale tone color.
7. Switch key to G. Repeat steps 3–4 with each position. Specifically check P4: it should show a partial box at the high end of the neck (frets 14–15). P5: should appear at frets 4–8 (wrapped).
8. Switch key to A. P5 should show at frets 6–10.
9. Switch key to B. P3 should show on a single fret (15).
10. Switch key to "All Notes". Confirm the empty-state message ("Select a key to view chord tones.") replaces the fretboard.
11. Switch back to the Note Map tab and confirm it still behaves exactly as before.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/views/ChordTonesView.tsx src/App.tsx
git commit -m "feat(view): add Chord Tones in Scale Positions view"
```

---

## Task 7: Mark spec section as Done in the vision doc

**Files:**
- Modify: `docs/design/2026-05-05-app-vision-and-view-designs.md` (status row in the View completion map table)

- [ ] **Step 1: Update the status entry**

In `docs/design/2026-05-05-app-vision-and-view-designs.md`, find the table row:

```markdown
| Chord Tones in Scale Positions  | In design   | Spec: [2026-05-05-chord-tones-in-scale-positions-design.md](../superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md). Bundles CAGED model. |
```

Replace with:

```markdown
| Chord Tones in Scale Positions  | Done        | Rendered by [ChordTonesView.tsx](src/views/ChordTonesView.tsx). Bundles CAGED model in [positions.ts](src/theory/positions.ts). Spec: [design](../superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md). |
```

- [ ] **Step 2: Commit**

```bash
git add docs/design/2026-05-05-app-vision-and-view-designs.md
git commit -m "docs: mark Chord Tones in Scale Positions as done"
```

---

## Final verification

Before declaring done, run the full pre-commit gate one more time:

- [ ] `npm run lint` — clean
- [ ] `npx tsc -b` — clean
- [ ] `npm test` — all green
- [ ] `npm run build` — successful build (catches anything `tsc -b` doesn't)

If any of those fail, fix the underlying issue before claiming the work complete (per the user's CLAUDE.md guidance: don't skip verification).
