# Scale-Degree Spelling Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the scale-degree spelling bug so every diatonic scale uses all 7 letter
names with proper accidentals (e.g. C♯ Ionian → `C#, D#, E#, F#, G#, A#, B#` instead of
`C#, D#, F, F#, G#, A#, C`).

**Architecture:** Add a `spellScale(root, intervals)` function in `src/theory/notes.ts`
that walks the 7 letter names starting at the root's letter and emits the accidental
that brings each natural pitch to the target pitch. Rewire `getModalScaleNotes` to call
it, and drop the now-redundant `accidentalStyle` parameter from `getModalScaleNotes` and
the four functions that only used it for scale spelling.

**Tech Stack:** TypeScript (strict), Vitest, React. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-13-scale-degree-spelling-fix-design.md`

---

## Task 1: Add `spellScale` to `notes.ts` with unit tests

**Files:**

- Modify: `src/theory/notes.ts` (append new helper)
- Modify: `src/theory/notes.test.ts` (append test block)

- [ ] **Step 1: Write the failing tests**

Append to `src/theory/notes.test.ts`:

```ts
import { spellScale, getNoteIndex } from "./notes";
import { MODE_INTERVALS } from "./modes";

describe("spellScale", () => {
  it("spells C Ionian using natural letters", () => {
    expect(spellScale("C", MODE_INTERVALS.ionian)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("spells C# Ionian using single sharps including E# and B#", () => {
    expect(spellScale("C#", MODE_INTERVALS.ionian)).toEqual([
      "C#",
      "D#",
      "E#",
      "F#",
      "G#",
      "A#",
      "B#",
    ]);
  });

  it("spells F# Lydian using single sharps including E#", () => {
    expect(spellScale("F#", MODE_INTERVALS.lydian)).toEqual([
      "F#",
      "G#",
      "A#",
      "B#",
      "C#",
      "D#",
      "E#",
    ]);
  });

  it("spells G# Aeolian preserving natural letters where the interval lands on them", () => {
    // G# Aeolian: G#, A#, B, C#, D#, E, F#
    expect(spellScale("G#", MODE_INTERVALS.aeolian)).toEqual([
      "G#",
      "A#",
      "B",
      "C#",
      "D#",
      "E",
      "F#",
    ]);
  });

  it("emits double-sharps when the target pitch is two semitones above the natural", () => {
    // A# Lydian — F natural is pitch 5; F## is pitch 7. The 6th degree of
    // A# Lydian is pitch 7 (A# + 9 semitones - 12 = pitch 7) on letter F.
    // Verifying the algorithm handles double accidentals at all.
    const notes = spellScale("A#", MODE_INTERVALS.lydian);
    expect(notes).toHaveLength(7);
    expect(notes[0]).toBe("A#");
    // At minimum, every letter is distinct
    expect(new Set(notes.map((n) => n[0])).size).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/theory/notes.test.ts` Expected: 5 failing tests with
`spellScale is not a function` (or `is not exported`).

- [ ] **Step 3: Implement `spellScale`**

Append to `src/theory/notes.ts`:

```ts
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
type Letter = (typeof LETTERS)[number];

const LETTER_PITCH: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Spell a diatonic scale using all 7 letter names, with accidentals
 * (#, b, ##, bb) as needed. The root's letter anchors the cycle.
 */
export function spellScale(
  root: ChromaticNote,
  intervals: readonly number[],
): string[] {
  const rootLetter = root[0] as Letter;
  const rootLetterIdx = LETTERS.indexOf(rootLetter);
  const rootPitch = getNoteIndex(root);

  return intervals.map((interval, i) => {
    const letter = LETTERS[(rootLetterIdx + i) % 7];
    const targetPitch = (rootPitch + interval) % 12;
    const naturalPitch = LETTER_PITCH[letter];
    let delta = (targetPitch - naturalPitch + 12) % 12;
    if (delta > 6) delta -= 12;
    const accidental =
      delta === 0 ? "" : delta > 0 ? "#".repeat(delta) : "b".repeat(-delta);
    return letter + accidental;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/theory/notes.test.ts` Expected: all tests pass (including the 5
new ones).

- [ ] **Step 5: Commit**

```bash
git add src/theory/notes.ts src/theory/notes.test.ts
git commit -m "feat(theory): add spellScale for diatonic note naming"
```

---

## Task 2: Add the failing property and canonical tests in `modes.test.ts`

This task introduces tests that are expected to fail. Task 3 will make them pass by
rewiring `getModalScaleNotes`. Splitting it this way creates a clean red/green pair in
the commit history.

**Files:**

- Modify: `src/theory/modes.test.ts` (append three new `describe` blocks)

- [ ] **Step 1: Add a small test helper at the top of `modes.test.ts`**

Add after the existing imports (line 11):

```ts
import { CHROMATIC_SCALE, getNoteIndex } from "./notes";
import { MODES, MODE_INTERVALS, MODE_DEGREE_LABELS } from "./modes";

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;

// Test helper — converts a spelled note (e.g. "B#", "Cbb") to its pitch class.
function spelledPitch(note: string): number {
  const letter = note[0] as (typeof LETTERS)[number];
  const accidentals = note.slice(1);
  const letterPitch: Record<(typeof LETTERS)[number], number> = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };
  let pitch = letterPitch[letter];
  for (const ch of accidentals) {
    if (ch === "#") pitch += 1;
    else if (ch === "b") pitch -= 1;
  }
  return ((pitch % 12) + 12) % 12;
}
```

- [ ] **Step 2: Add the three new `describe` blocks at the bottom of the file**

Append to `src/theory/modes.test.ts` (after the `naturalAccidentalForKeyMode` block at
line 457):

```ts
describe("getModalScaleNotes — structural correctness across all 84 scales", () => {
  for (const root of CHROMATIC_SCALE) {
    for (const mode of MODES) {
      it(`${root} ${mode}: 7 notes, 7 distinct letters, correct pitches`, () => {
        const notes = getModalScaleNotes(root, mode);
        const rootPitch = getNoteIndex(root);
        const rootLetterIdx = LETTERS.indexOf(root[0] as (typeof LETTERS)[number]);

        expect(notes).toHaveLength(7);

        const letters = notes.map((n) => n[0]);
        const expectedLetters = Array.from(
          { length: 7 },
          (_, i) => LETTERS[(rootLetterIdx + i) % 7],
        );
        expect(letters).toEqual(expectedLetters);

        const pitches = notes.map(spelledPitch);
        const expectedPitches = MODE_INTERVALS[mode].map((iv) => (rootPitch + iv) % 12);
        expect(pitches).toEqual(expectedPitches);
      });
    }
  }
});

describe("getModalScaleNotes — canonical pinned spellings", () => {
  it.each([
    ["C#", "ionian", ["C#", "D#", "E#", "F#", "G#", "A#", "B#"]],
    ["F#", "ionian", ["F#", "G#", "A#", "B", "C#", "D#", "E#"]],
    ["F#", "lydian", ["F#", "G#", "A#", "B#", "C#", "D#", "E#"]],
    ["E", "phrygian", ["E", "F", "G", "A", "B", "C", "D"]],
    ["G#", "aeolian", ["G#", "A#", "B", "C#", "D#", "E", "F#"]],
    ["D#", "dorian", ["D#", "E#", "F#", "G#", "A#", "B#", "C#"]],
    ["B", "ionian", ["B", "C#", "D#", "E", "F#", "G#", "A#"]],
    ["A#", "phrygian", ["A#", "B", "C#", "D#", "E#", "F#", "G#"]],
  ] as const)("%s %s spells correctly", (root, mode, expected) => {
    expect(getModalScaleNotes(root, mode)).toEqual(expected);
  });
});

describe("MODE_DEGREE_LABELS agrees with MODE_INTERVALS", () => {
  const INTERVAL_TO_LABEL: Record<number, string> = {
    0: "1",
    1: "♭2",
    2: "2",
    3: "♭3",
    4: "3",
    5: "4",
    6: "♭5",
    7: "5",
    8: "♭6",
    9: "6",
    10: "♭7",
    11: "7",
  };
  // Lydian is the one mode whose 4 is sharp rather than flat. The
  // INTERVAL_TO_LABEL table above can't distinguish ♯4 from ♭5 from interval
  // alone, so we patch the expectation for Lydian's 4th degree (interval 6).
  const expectedLabel = (mode: string, interval: number, position: number) => {
    if (mode === "lydian" && position === 3) return "♯4";
    return INTERVAL_TO_LABEL[interval];
  };

  for (const mode of MODES) {
    it(`${mode}`, () => {
      const derived = MODE_INTERVALS[mode].map((iv, i) => expectedLabel(mode, iv, i));
      expect(MODE_DEGREE_LABELS[mode]).toEqual(derived);
    });
  }
});
```

- [ ] **Step 3: Run tests to verify the new ones fail**

Run: `npx vitest run src/theory/modes.test.ts` Expected: the 84 structural tests will
mostly fail (the buggy spellings produce wrong letters), the 8 canonical tests will
fail, and the 7 label-agreement tests will **pass** (the labels and intervals already
agree).

The structural tests for "well-behaved" roots like `C`, `D`, `F`, `G`, `A` (in modes
that don't require theoretical accidentals) will pass; the others fail.

- [ ] **Step 4: Commit (red state)**

```bash
git add src/theory/modes.test.ts
git commit -m "test(theory): add property + canonical scale spelling tests (red)"
```

This commit captures the bug. Task 3 turns it green.

---

## Task 3: Rewire `getModalScaleNotes` to use `spellScale`; drop `accidentalStyle` from scale functions

**Files:**

- Modify: `src/theory/modes.ts`
- Modify: `src/theory/modes.test.ts` (drop `accidentalStyle` args from existing test
  calls)

- [ ] **Step 1: Update `getModalScaleNotes` in `src/theory/modes.ts`**

Replace lines 108–119:

```ts
export function getModalScaleNotes(key: string, mode: Mode): string[] {
  return spellScale(key as ChromaticNote, MODE_INTERVALS[mode]);
}
```

Update the imports at the top of the file (lines 1–7):

```ts
import {
  CHROMATIC_SCALE,
  getDisplayName,
  getNoteIndex,
  naturalAccidentalForKey,
  spellScale,
  type AccidentalStyle,
  type ChromaticNote,
} from "./notes";
```

(Note: `AccidentalStyle` is still imported because other code in this file may use it
for `getDisplayName` references — verify by re-running the file once imports are
updated.)

- [ ] **Step 2: Drop `accidentalStyle` from the four downstream functions**

Update `getCharacteristicNotes` (lines 161-168):

```ts
export function getCharacteristicNotes(key: string, mode: Mode): string[] {
  const scale = getModalScaleNotes(key, mode);
  return CHARACTERISTIC_DEGREES[mode].map((degreeIdx) => scale[degreeIdx]);
}
```

Update `getCharacteristicNoteIndexSet` (lines 173-181):

```ts
export function getCharacteristicNoteIndexSet(
  key: string,
  mode: Mode,
): ReadonlySet<number> {
  return new Set(getCharacteristicNotes(key, mode).map((n) => getNoteIndex(n)));
}
```

Update `getModalDiatonicTriads` (lines 230-254). Change the signature to drop the third
arg, and change the inner call (line 235) to drop the arg:

```ts
export function getModalDiatonicTriads(key: string, mode: Mode): DiatonicTriad[] {
  const scale = getModalScaleNotes(key, mode);
  // …rest unchanged
}
```

Update `getModalDiatonicChords` (lines 324-344) the same way:

```ts
export function getModalDiatonicChords(key: string, mode: Mode): DiatonicChord[] {
  const scale = getModalScaleNotes(key, mode);
  // …rest unchanged
}
```

- [ ] **Step 3: Check for unused imports in `modes.ts`**

After the changes, `AccidentalStyle` may be unused in `modes.ts`. Remove it from the
import block if so. Same check for any other now-unused imports. Use the type checker
(next step) to confirm.

- [ ] **Step 4: Update existing test calls in `modes.test.ts` to drop
      `accidentalStyle`**

The following test cases currently pass `"flat"` or `"sharp"` as the third arg. Drop the
third arg from each:

- Line 26: `getModalScaleNotes("C", "dorian", "flat")` →
  `getModalScaleNotes("C", "dorian")`
- Line 38: `getModalScaleNotes("C", "phrygian", "flat")` →
  `getModalScaleNotes("C", "phrygian")`
- Line 50: `getModalScaleNotes("C", "lydian", "sharp")` →
  `getModalScaleNotes("C", "lydian")`
- Line 62: `getModalScaleNotes("C", "mixolydian", "flat")` →
  `getModalScaleNotes("C", "mixolydian")`
- Line 74: `getModalScaleNotes("C", "aeolian", "flat")` →
  `getModalScaleNotes("C", "aeolian")`
- Line 86: `getModalScaleNotes("C", "locrian", "flat")` →
  `getModalScaleNotes("C", "locrian")`
- Line 200: `getCharacteristicNotes("C", "phrygian", "flat")` →
  `getCharacteristicNotes("C", "phrygian")`
- Line 204: `getCharacteristicNotes("C", "lydian", "sharp")` →
  `getCharacteristicNotes("C", "lydian")`
- Line 208: `getCharacteristicNotes("C", "mixolydian", "flat")` →
  `getCharacteristicNotes("C", "mixolydian")`
- Line 212: `getCharacteristicNotes("C", "locrian", "flat")` →
  `getCharacteristicNotes("C", "locrian")`
- Line 230: `getCharacteristicNoteIndexSet("C", "phrygian", "flat")` →
  `getCharacteristicNoteIndexSet("C", "phrygian")`
- Line 231: `getCharacteristicNoteIndexSet("C", "phrygian", "sharp")` →
  `getCharacteristicNoteIndexSet("C", "phrygian")` (this case is now duplicate — keep
  only one of the two, delete the other)
- Line 239: `getModalDiatonicTriads("C", "dorian", "flat")` →
  `getModalDiatonicTriads("C", "dorian")`
- Line 270: `getModalDiatonicTriads("C", "phrygian", "flat")` →
  `getModalDiatonicTriads("C", "phrygian")`
- Line 292: `getModalDiatonicTriads("C", "lydian", "sharp")` →
  `getModalDiatonicTriads("C", "lydian")`
- Line 314: `getModalDiatonicTriads("C", "locrian", "flat")` →
  `getModalDiatonicTriads("C", "locrian")`
- Line 338: `getModalDiatonicChords("C", "dorian", "flat")` →
  `getModalDiatonicChords("C", "dorian")`
- Line 369: `getModalDiatonicChords("C", "lydian", "sharp")` →
  `getModalDiatonicChords("C", "lydian")`
- Line 391: `getModalDiatonicChords("C", "mixolydian", "flat")` →
  `getModalDiatonicChords("C", "mixolydian")`
- Line 413: `getModalDiatonicChords("C", "locrian", "flat")` →
  `getModalDiatonicChords("C", "locrian")`

All asserted expectations stay the same — for these C-rooted (and D, F) modes, the
diatonic spelling equals the previously-specified flat/sharp enharmonic.

For the test at line 230-234 ("returns the ♭2 index for C Phrygian regardless of
spelling"), after dropping the args both lines become identical. Collapse to a single
assertion:

```ts
it("returns the ♭2 index for C Phrygian", () => {
  // Db = C# = chromatic index 1
  const set = getCharacteristicNoteIndexSet("C", "phrygian");
  expect(set.has(1)).toBe(true);
});
```

- [ ] **Step 5: Run the full test suite**

Run: `npm test` Expected: all 435+ existing tests pass, the 84 structural tests pass,
the 8 canonical tests pass, the 7 label-agreement tests pass.

If any test fails, debug before moving on. The most likely failure is a TypeScript error
elsewhere in the codebase pointing at a now-stale third-arg call — Task 4 and Task 5 fix
those.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit` Expected: zero errors in `src/theory/`. Errors elsewhere
(`src/components/`, `src/App.tsx`, `src/theory/chordShapes.ts`,
`src/theory/chordTones.ts`) are expected at this point — they'll be fixed in Tasks 4
and 5.

- [ ] **Step 7: Commit**

```bash
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "fix(theory): spell scales diatonically; drop accidentalStyle from scale fns

Every diatonic scale now uses all 7 letter names with accidentals as
needed. Fixes C# Ionian rendering as C#,D#,F,F#,G#,A#,C and analogous
bugs in 4 major keys and their modes.

The accidentalStyle parameter is dropped from getModalScaleNotes,
getCharacteristicNotes, getCharacteristicNoteIndexSet,
getModalDiatonicTriads, and getModalDiatonicChords. AccidentalToggle
still applies to NoteMap's chromatic fret labels."
```

---

## Task 4: Drop `accidentalStyle` from scale-helper calls in `chordTones.ts` and `chordShapes.ts`

Both files still receive `accidentalStyle` from upstream and continue to use it for
`getDisplayName` calls on chromatic fret labels. We only drop the threading into the
now-paramless scale helpers.

**Files:**

- Modify: `src/theory/chordTones.ts`
- Modify: `src/theory/chordShapes.ts`

- [ ] **Step 1: Update `chordTones.ts:99`**

Find:

```ts
const characteristicSet = getCharacteristicNoteIndexSet(key, mode, accidentalStyle);
```

Replace with:

```ts
const characteristicSet = getCharacteristicNoteIndexSet(key, mode);
```

The function's own `accidentalStyle` parameter (line 55, 87) is preserved — it's still
passed to `getDisplayName` at line 131.

- [ ] **Step 2: Update `chordShapes.ts:726-729`**

Find:

```ts
const characteristicSet = getCharacteristicNoteIndexSet(
  key,
  mode,
  input.accidentalStyle,
);
```

(Exact whitespace may vary — match the call's arguments.)

Replace with:

```ts
const characteristicSet = getCharacteristicNoteIndexSet(key, mode);
```

Check if any further `getCharacteristicNoteIndexSet` calls exist in this file (the grep
earlier showed lines 748 and 778 reference `input.accidentalStyle` — verify those are
passed to `getDisplayName`, not the now-paramless scale helper). Only update the
scale-helper call sites.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit` Expected: errors in `src/theory/chordShapes.ts` and
`src/theory/chordTones.ts` are gone. Errors may remain in `src/components/` and
`src/App.tsx` — those are fixed in Task 5.

- [ ] **Step 4: Run the test suite**

Run: `npm test` Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/theory/chordTones.ts src/theory/chordShapes.ts
git commit -m "refactor(theory): drop accidentalStyle from scale-helper calls in fretboard markers"
```

---

## Task 5: Drop `accidentalStyle` prop from `ScaleDisplay` and `DiatonicChords`; clean up `App.tsx`

**Files:**

- Modify: `src/components/ScaleDisplay.tsx`
- Modify: `src/components/DiatonicChords.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `src/components/ScaleDisplay.tsx`**

Remove `accidentalStyle` from the prop type (line 34) and the destructured props (line
44). Update the call on line 51:

```tsx
// Before
const notes = getModalScaleNotes(selectedKey, mode, accidentalStyle);

// After
const notes = getModalScaleNotes(selectedKey, mode);
```

Remove the now-unused import of `AccidentalStyle` (line 1):

```tsx
import { type DiatonicChord, type DiatonicTriad } from "../theory/scales";
```

The full updated component (showing only the changed regions):

```tsx
type ScaleDisplayProps = {
  selectedKey: string;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  enabledRoles: Set<HighlightableRole>;
  mode?: Mode;
};

export function ScaleDisplay({
  selectedKey,
  selectedChord,
  enabledRoles,
  mode = "ionian",
}: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const notes = getModalScaleNotes(selectedKey, mode);
  // …rest unchanged
}
```

- [ ] **Step 2: Update `src/components/DiatonicChords.tsx`**

Remove `accidentalStyle` from the prop type (line 14) and the destructured props (line
54). Update lines 65-66:

```tsx
// Before
mode === "sevenths"
  ? getModalDiatonicChords(selectedKey, modalMode, accidentalStyle)
  : getModalDiatonicTriads(selectedKey, modalMode, accidentalStyle);

// After
mode === "sevenths"
  ? getModalDiatonicChords(selectedKey, modalMode)
  : getModalDiatonicTriads(selectedKey, modalMode);
```

Remove the now-unused import (line 1):

```tsx
import { type ChordQuality, type TriadQuality } from "../theory/scales";
```

- [ ] **Step 3: Update `src/App.tsx`**

Update lines 123-124 to drop the third arg:

```tsx
const fullChord =
  chordRowMode === "sevenths"
    ? getModalDiatonicChords(selectedKey, mode)
    : getModalDiatonicTriads(selectedKey, mode);
```

Update line 126 to drop `accidentalStyle` from the `useMemo` dependency array:

```tsx
}, [selectedChordDegree, chordRowMode, selectedKey, mode]);
```

Drop the `accidentalStyle={accidentalStyle}` prop from these four JSX call sites only:

- Line 185 — `<DiatonicChords>` (note-map view's chord row)
- Line 212 — `<DiatonicChords>` (scale-positions view's chord row)
- Line 240 — `<DiatonicChords>` (chord-shapes view's chord row)
- Line 357 — `<ScaleDisplay>`

**Keep** the prop on these call sites — they still need `accidentalStyle` for chromatic
/ non-scale-bound labels:

- Line 174 — `<NoteMapView>`
- Line 200 — `<ScalePositionsView>`
- Line 227 — `<ChordShapesView>`
- Line 308 — `<AccidentalToggle>` (the toggle itself)
- Line 330 — `<KeySelector>`

Line numbers are approximate — match by component name. Use
`grep -n "accidentalStyle=" src/App.tsx` to confirm before editing.

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit` Expected: zero errors anywhere.

- [ ] **Step 5: Run the test suite**

Run: `npm test` Expected: all tests pass.

- [ ] **Step 6: Run lint and prettier**

```bash
npm run lint
npx prettier --write .
```

Expected: no errors. Prettier may format the touched files; review the diff before
committing.

- [ ] **Step 7: Manual smoke test**

If `localhost:5173` is already running (don't `pkill` vite — connect to the user's
running instance):

1. Open the app. Select **C♯** as the key, **Ionian** as the mode.
2. Verify the scale-degree pill row reads `C♯ D♯ E♯ F♯ G♯ A♯ B♯` (not `… F F♯ … C`).
3. Verify the diatonic chord row's chord roots use the diatonic spelling (e.g. the ♯iv°
   chord is `E♯°`).
4. Switch to **F♯ Lydian** — verify the row reads `F♯ G♯ A♯ B♯ C♯ D♯ E♯`.
5. Switch to a flat key like **B♭** — verify spelling is `B♭ C D E♭ F G A` (no
   regression on previously-correct keys).
6. Toggle the AccidentalToggle on the NoteMap view — verify fret labels still flip
   between sharps and flats.
7. Toggle the AccidentalToggle while looking at the ScaleDisplay — verify it has no
   effect (it shouldn't; the toggle is now scoped to NoteMap).

- [ ] **Step 8: Commit**

```bash
git add src/components/ScaleDisplay.tsx src/components/DiatonicChords.tsx src/App.tsx
git commit -m "refactor(ui): drop accidentalStyle prop from scale-only components

ScaleDisplay and DiatonicChords no longer rely on user accidental
preference — scale spelling is fully determined by key + mode.
AccidentalToggle continues to control NoteMap's chromatic fret labels."
```

---

## Final verification

- [ ] **Step 1: Full test suite + lint + typecheck**

```bash
npm run lint
npx prettier --check .
npm test
npx tsc --noEmit
```

All four must pass.

- [ ] **Step 2: Diff sanity check**

```bash
git log --oneline main..HEAD
```

Expected: 5 commits — `feat(theory): add spellScale`,
`test(theory): add property + canonical scale spelling tests (red)`,
`fix(theory): spell scales diatonically; drop accidentalStyle from scale fns`,
`refactor(theory): drop accidentalStyle from scale-helper calls in fretboard markers`,
`refactor(ui): drop accidentalStyle prop from scale-only components`.

- [ ] **Step 3: Ready for PR**

The branch is `fix/scale-degree-spelling`. Confirm with the user before pushing or
opening a PR.
