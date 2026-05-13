# Scale-Degree Spelling Fix — Design

## Goal

Fix a correctness bug in scale-note naming. Every diatonic scale uses all 7 letter names
exactly once, with accidentals (♯, ♭, ♯♯, ♭♭) as needed. The current implementation
produces enharmonic duplicates or skipped letters in any key that requires `E♯`, `B♯`,
`F♭`, `C♭`, or a double accidental.

Example: **C♯ Ionian** currently renders as `C♯, D♯, F, F♯, G♯, A♯, C`. The musically
correct spelling is `C♯, D♯, E♯, F♯, G♯, A♯, B♯`.

This affects 4 major keys outright (`C♯`, `F♯`, `C♭`, `G♭` and their relatives) and many
of the modes built on them.

## Scope

### In scope

- A new diatonic speller function in `src/theory/notes.ts`.
- Rewire `getModalScaleNotes` (`modes.ts:108`) and all downstream callers to use it.
- Drop the `accidentalStyle` parameter from `getModalScaleNotes` and the consumers that
  only used it for scale-note display.
- Keep `getDisplayName` and the `AccidentalToggle` for `NoteMapView`'s chromatic
  fret-label use case.
- Property-based tests over all 12 × 7 = 84 (root, mode) combinations.
- Canonical-case tests pinning the exact spellings on the keys the bug poster-cased.

### Out of scope

- Replacing the `AccidentalToggle` with an enharmonic _key_ selector (e.g. "C♯ vs D♭" as
  two distinct keys the user can pick between). This is the more ambitious fix and
  belongs in a separate feature spec.
- Algorithmizing `MODE_INTERVALS`, `MODE_STEPS`, and `MODE_DEGREE_LABELS` from a single
  source of truth. Deferred to the vision doc.
- Deleting the unused `NoteName` type in `src/theory/types.ts`. Unrelated cleanup.
- Smarter root-picker UX that hides theoretical roots like `A♯` (which Lydian spells
  with double accidentals) in favor of their cleaner enharmonic.

## Background

### Current pipeline

`getModalScaleNotes(key, mode, accidentalStyle)` at `src/theory/modes.ts:108`:

1. Iterates `MODE_INTERVALS[mode]` semitones over `(rootIndex + interval) % 12`.
2. Picks the sharp name from `CHROMATIC_SCALE` (12 entries, sharp-only).
3. Passes through `getDisplayName(sharpName, key, accidentalStyle)` at `notes.ts:83`.

`getDisplayName` only chooses between single-sharp and single-flat enharmonics. It
cannot produce `E♯`, `B♯`, `F♭`, `C♭`, or any double accidental. That's the bug's root
cause.

### Affected display surfaces

All inherit their note names from `getModalScaleNotes`:

- `src/components/ScaleDisplay.tsx` — degree pill row.
- `src/components/DiatonicChords.tsx` — chord roots and notes via
  `getModalDiatonicTriads` / `getModalDiatonicChords`.
- `src/theory/chordShapes.ts:703` — Chord Shapes view marker labels.
- `src/theory/chordTones.ts:131` — Scale Positions view marker labels.

`NoteMapView` uses `getDisplayName` directly for chromatic fret labels — out of scope of
the scale-spelling pipeline.

## Implementation

### The speller

Add to `src/theory/notes.ts`:

```ts
const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const LETTER_PITCH: Record<(typeof LETTERS)[number], number> = {
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
 * (♯, ♭, ♯♯, ♭♭) as needed.
 */
export function spellScale(
  root: ChromaticNote,
  intervals: readonly number[],
): string[] {
  const rootLetter = root[0] as keyof typeof LETTER_PITCH;
  const rootLetterIdx = LETTERS.indexOf(rootLetter);
  const rootPitch = getNoteIndex(root);

  return intervals.map((interval, i) => {
    const letter = LETTERS[(rootLetterIdx + i) % 7];
    const targetPitch = (rootPitch + interval) % 12;
    const naturalPitch = LETTER_PITCH[letter];
    let delta = (targetPitch - naturalPitch + 12) % 12;
    if (delta > 6) delta -= 12; // normalize to [-6, +6], practically [-2, +2]
    const accidental =
      delta === 0 ? "" : delta > 0 ? "#".repeat(delta) : "b".repeat(-delta);
    return letter + accidental;
  });
}
```

**Notes:**

- Output is `string[]` for display only. No new type union; `ChromaticNote` stays the
  canonical internal type.
- Double accidentals fall out of the algorithm naturally. `A♯ Lydian` spells
  `A♯, B♯, C##, D♯, E♯, F##, G##`. Ugly but correct.
- The algorithm uses `getNoteIndex` (existing) for the root's pitch class. Root is
  always a `ChromaticNote` (sharp-only), which is the type at all call sites today.

### Wiring

In `src/theory/modes.ts`:

```ts
// Before
export function getModalScaleNotes(
  key: ChromaticNote,
  mode: Mode,
  accidentalStyle: AccidentalStyle = "auto",
): string[];

// After
export function getModalScaleNotes(key: ChromaticNote, mode: Mode): string[];

// Implementation
return spellScale(key, MODE_INTERVALS[mode]);
```

The `accidentalStyle` parameter is dropped from:

- `getModalScaleNotes`
- `getModalDiatonicTriads` and `getModalDiatonicChords` (which use scale notes
  internally for chord roots)
- `getCharacteristicNotes` if it carries the param

Call sites in `ScaleDisplay`, `DiatonicChords`, `chordShapes.ts`, `chordTones.ts`, and
`App.tsx` stop passing `accidentalStyle` to scale functions. They keep passing it to
`getDisplayName` for any non-scale labels.

`AccidentalToggle` remains in the UI and continues to thread `accidentalStyle` into
`NoteMapView`'s `getDisplayName` calls — its scope just narrows.

## Testing

Two layers in `src/theory/notes.test.ts` and `src/theory/modes.test.ts`.

### Property-based tests (all 84 scales)

In `modes.test.ts`, iterate over `CHROMATIC_SCALE × MODES`:

```ts
for (const root of CHROMATIC_SCALE) {
  for (const mode of MODES) {
    test(`${root} ${mode}: structural correctness`, () => {
      const notes = getModalScaleNotes(root, mode);
      const rootPitch = getNoteIndex(root);
      const rootLetterIdx = LETTERS.indexOf(root[0]);

      // 7 notes
      expect(notes).toHaveLength(7);

      // Letter cycle starts at root letter
      const letters = notes.map((n) => n[0]);
      const expectedLetters = Array.from(
        { length: 7 },
        (_, i) => LETTERS[(rootLetterIdx + i) % 7],
      );
      expect(letters).toEqual(expectedLetters);

      // Pitch classes match intervals
      const pitches = notes.map(parseSpelledNoteToPitch);
      const expectedPitches = MODE_INTERVALS[mode].map((iv) => (rootPitch + iv) % 12);
      expect(pitches).toEqual(expectedPitches);
    });
  }
}
```

`parseSpelledNoteToPitch` is a small test helper (not production code) that reads
letter + `#`/`b` count and returns the pitch class.

### Canonical-case tests

In `modes.test.ts`, ~10 hand-authored cases that pin exact spellings on keys the bug
historically affected, so regressions name themselves clearly in test output:

```ts
test.each([
  ["C#", "ionian", ["C#", "D#", "E#", "F#", "G#", "A#", "B#"]],
  ["F#", "ionian", ["F#", "G#", "A#", "B", "C#", "D#", "E#"]],
  ["Cb", "ionian", ["Cb", "Db", "Eb", "Fb", "Gb", "Ab", "Bb"]],
  ["F#", "lydian", ["F#", "G#", "A#", "B#", "C#", "D#", "E#"]],
  ["E#", "phrygian", ["E#", "F#", "G#", "A#", "B#", "C#", "D#"]],
  ["G#", "aeolian", ["G#", "A#", "B", "C#", "D#", "E", "F#"]],
  ["D#", "dorian", ["D#", "E#", "F#", "G#", "A#", "B#", "C#"]],
  // …a couple more
])("canonical: %s %s", (root, mode, expected) => {
  expect(getModalScaleNotes(root, mode)).toEqual(expected);
});
```

Note: `Cb` is not in `CHROMATIC_SCALE` (the registry is sharp-only). The canonical case
for `Cb Ionian` either (a) accepts a flat input by extending the speller's accepted root
types, or (b) is exercised via the toggle's flat preference if NoteMap uses `Cb`
somewhere. Simplest: extend `spellScale` to accept `"Cb"` and `"Fb"` as synonyms for
`"B"` and `"E"`. (No production code path passes them today, but the algorithm doesn't
care — it reads the letter and normalizes via `getNoteIndex`.)

### Display-label / interval agreement test

One test per mode (7 total) deriving expected `MODE_DEGREE_LABELS[mode]` from
`MODE_INTERVALS[mode]` and asserting equality. Proves the two tables agree and gives the
vision doc a foothold for later derivation:

```ts
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

for (const mode of MODES) {
  test(`${mode}: degree labels match intervals`, () => {
    const derived = MODE_INTERVALS[mode].map((iv) => INTERVAL_TO_LABEL[iv]);
    expect(MODE_DEGREE_LABELS[mode]).toEqual(derived);
  });
}
```

This test would also catch a future bug where Lydian's `♯4` is encoded as `5` or
similar.

### Existing tests

`src/theory/modes.test.ts` cases for `C`, `D`, `F` continue to pass because their
diatonic spellings already fit single-sharp / single-flat enharmonics. No fixture
changes needed — only additions.

Tests that pass `accidentalStyle` into `getModalScaleNotes` need their calls updated to
drop the argument.

## File map

Modified files:

- `src/theory/notes.ts` — add `spellScale`, `LETTERS`, `LETTER_PITCH`.
- `src/theory/notes.test.ts` — add unit tests for `spellScale` directly (small set
  covering the algorithm's edge cases: root-letter handling, double-accidental emission,
  single-sharp/flat cases).
- `src/theory/modes.ts` — `getModalScaleNotes` calls `spellScale`; drop
  `accidentalStyle` parameter from this function and from `getModalDiatonicTriads` /
  `getModalDiatonicChords` / `getCharacteristicNotes`.
- `src/theory/modes.test.ts` — add property-based, canonical, and
  label/interval-agreement tests.
- `src/components/ScaleDisplay.tsx` — drop `accidentalStyle` from scale calls.
- `src/components/DiatonicChords.tsx` — drop `accidentalStyle` from scale calls.
- `src/theory/chordShapes.ts` — drop `accidentalStyle` from scale calls (line 703
  region).
- `src/theory/chordTones.ts` — drop `accidentalStyle` from scale calls (line 131
  region).
- `src/App.tsx` — stop threading `accidentalStyle` into scale-bearing components;
  continue threading it to `NoteMapView`.

No new files.
