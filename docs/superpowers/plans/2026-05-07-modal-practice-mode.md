# Modal Practice Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a global `(key, mode)` tonal-center model to Fretlab so any practice
routine extends to modal practice (Ionian / Dorian / Phrygian / Lydian / Mixolydian /
Aeolian / Locrian) by changing a header dropdown — no new view to learn.

**Architecture:** A new `src/theory/modes.ts` module owns the modal-scale primitives
(note set, diatonic chords, parent-major helper, characteristic-tone helper). Existing
major-scale helpers stay as-is for backward compatibility. The marker pipelines
(`buildChordToneMarkers`, `buildChordShapeMarkers`, `NoteMapView`'s inline computation)
gain a `mode` parameter that defaults to `'ionian'` so the existing code path is
byte-identical. A new `ModeSelector` component sits in the app header, the `Fretboard`
renderer learns to draw a thin outer ring on markers flagged `isCharacteristic`, and the
header reorganizes into a top bar (title + global preferences) above a focal-control row
(Key + Mode).

**Tech Stack:** TypeScript, React, Vite, Tailwind v4 (CSS tokens in `src/index.css`
`@theme` block), Vitest for tests. Pre-commit hook runs `lint-staged` (prettier on
staged files) plus the full test suite — manually run `npm run lint`,
`npx prettier --write .`, and `npm test` before each commit per `CLAUDE.md`.

**Spec:** `docs/superpowers/specs/2026-05-07-modal-practice-mode-design.md`.

---

## File map

**New files:**

- `src/theory/modes.ts` — `Mode` type, mode interval/label/step/characteristic
  constants, modal-scale primitives, parent-major helper.
- `src/theory/modes.test.ts` — Vitest coverage for every export of `modes.ts`.
- `src/components/ModeSelector.tsx` — header dropdown for picking a mode; mirrors
  `KeySelector`'s button-pill pattern.

**Modified files:**

- `src/theory/types.ts` — add `isCharacteristic?: boolean` to `NoteMarker`.
- `src/theory/chordTones.ts` — `buildChordToneMarkers` accepts `mode`; uses
  `getModalIntervalRole` for the in-mode check; uses `parentMajorOf` for the
  position-window check; sets per-marker `isCharacteristic`.
- `src/theory/chordShapes.ts` — `BuildChordShapeMarkersInput` arms grow a
  `modalMode: Mode` field (named to avoid colliding with the existing
  `mode: 'triads'|'sevenths'` discriminator); `buildChordShapeMarkers` sets
  `isCharacteristic` on emitted markers.
- `src/components/Fretboard/NoteCircle.tsx` — accepts `isCharacteristic?: boolean`; when
  true, draws an outer ring in `var(--color-characteristic)`.
- `src/components/Fretboard/Fretboard.tsx` — passes `marker.isCharacteristic` through to
  `NoteCircle`.
- `src/components/ScaleDisplay.tsx` — accepts `mode: Mode`; uses modal scale notes,
  modal degree labels, modal step pattern, modal header text.
- `src/components/DiatonicChords.tsx` — accepts `mode: Mode`; uses
  `getModalDiatonicChords` / `getModalDiatonicTriads`.
- `src/views/NoteMapView.tsx` — accepts `mode: Mode`; uses `getModalIntervalRole` for
  in-mode check; flags characteristic-note markers.
- `src/views/ScalePositionsView.tsx` — accepts `mode: Mode`; computes `parentKey` for
  window math; drops the C/A/G/E/D shape suffix from window labels in non-Ionian modes;
  threads `mode` to `buildChordToneMarkers`.
- `src/App.tsx` — header refactor (top bar + focal-control row); `mode` state; threads
  `mode` to every view.
- `src/index.css` — adds `--color-characteristic` token under the `@theme` block.

**Documentation:**

- `docs/design/2026-05-05-app-vision-and-view-designs.md` — replace the "Future: Modal
  practice mode" section with a pointer to the new design doc + a brief recap of
  resolved decisions.
- `README.md` — append the music-theory citation list from the spec's Sources.

---

## Conventions for every commit

- Run `npm run lint`, `npx prettier --write .`, then `npm test` before `git commit`.
- Use Conventional-Commit-style prefixes mirroring recent history: `feat(theory)`,
  `feat(view)`, `feat(ui)`, `refactor`, `docs`, `chore`. Don't skip the husky hook.
- Stage only the files the task touches (avoid `git add .`).

---

## Phase A — Theory layer foundation

### Task 1: Scaffold `src/theory/modes.ts` with type + constants

**Files:**

- Create: `src/theory/modes.ts`

- [ ] **Step 1: Create the file with the `Mode` type and constants**

Write:

```ts
import { CHROMATIC_SCALE, getNoteIndex } from "./notes";
import type { ScaleStep } from "./scales";

export type Mode =
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian";

export const MODES: readonly Mode[] = [
  "ionian",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "aeolian",
  "locrian",
] as const;

// Each mode's interval-from-tonic in semitones (7 entries, ascending).
export const MODE_INTERVALS: Record<
  Mode,
  readonly [number, number, number, number, number, number, number]
> = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
};

// Degree labels carrying modal accidentals — consumed by ScaleDisplay so the
// pill row visually telegraphs the mode's relation to same-root major.
export const MODE_DEGREE_LABELS: Record<Mode, readonly string[]> = {
  ionian: ["1", "2", "3", "4", "5", "6", "7"],
  dorian: ["1", "2", "♭3", "4", "5", "6", "♭7"],
  phrygian: ["1", "♭2", "♭3", "4", "5", "♭6", "♭7"],
  lydian: ["1", "2", "3", "♯4", "5", "6", "7"],
  mixolydian: ["1", "2", "3", "4", "5", "6", "♭7"],
  aeolian: ["1", "2", "♭3", "4", "5", "♭6", "♭7"],
  locrian: ["1", "♭2", "♭3", "4", "♭5", "♭6", "♭7"],
};

// Step pattern (whole/half) per mode. Mirrors MAJOR_SCALE_STEPS' 7-entry
// shape (the 7th entry wraps to the octave).
export const MODE_STEPS: Record<Mode, readonly ScaleStep[]> = {
  ionian: ["whole", "whole", "half", "whole", "whole", "whole", "half"],
  dorian: ["whole", "half", "whole", "whole", "whole", "half", "whole"],
  phrygian: ["half", "whole", "whole", "whole", "half", "whole", "whole"],
  lydian: ["whole", "whole", "whole", "half", "whole", "whole", "half"],
  mixolydian: ["whole", "whole", "half", "whole", "whole", "half", "whole"],
  aeolian: ["whole", "half", "whole", "whole", "half", "whole", "whole"],
  locrian: ["half", "whole", "whole", "half", "whole", "whole", "whole"],
};

// Indices (0-6 within MODE_INTERVALS) of each mode's characteristic tone(s).
// Ionian and Aeolian are the references — empty arrays.
export const CHARACTERISTIC_DEGREES: Record<Mode, readonly number[]> = {
  ionian: [],
  dorian: [5], // ♮6 vs Aeolian
  phrygian: [1], // ♭2 vs Aeolian
  lydian: [3], // ♯4 vs Ionian
  mixolydian: [6], // ♭7 vs Ionian
  aeolian: [],
  locrian: [4], // ♭5 vs Phrygian
};

// Semitone offset from a mode's tonic to its parent major's tonic.
// Used by Scale Positions to anchor CAGED windows in non-Ionian modes.
export const PARENT_MAJOR_OFFSET: Record<Mode, number> = {
  ionian: 0,
  dorian: -2,
  phrygian: -4,
  lydian: -5,
  mixolydian: -7,
  aeolian: -9,
  locrian: -11,
};

// Imports CHROMATIC_SCALE / getNoteIndex are placeholders for the helpers
// added in subsequent tasks; keep them here so each helper's diff is local.
void CHROMATIC_SCALE;
void getNoteIndex;
```

- [ ] **Step 2: Verify TypeScript still compiles**

Run: `npm run lint` Expected: No errors. (The `void` placeholders silence "unused
import" warnings until the helpers land in later tasks.)

- [ ] **Step 3: Format and commit**

```bash
npx prettier --write src/theory/modes.ts
git add src/theory/modes.ts
git commit -m "feat(theory): scaffold modes.ts with Mode type and constants"
```

---

### Task 2: `getModalScaleNotes`

**Files:**

- Create: `src/theory/modes.test.ts`
- Modify: `src/theory/modes.ts` (add function + remove the corresponding `void`
  placeholder)

- [ ] **Step 1: Write the failing test**

Create `src/theory/modes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getModalScaleNotes } from "./modes";

describe("getModalScaleNotes", () => {
  it("returns C Ionian (= C major)", () => {
    expect(getModalScaleNotes("C", "ionian")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("returns C Dorian with flat spelling", () => {
    expect(getModalScaleNotes("C", "dorian", "flat")).toEqual([
      "C",
      "D",
      "Eb",
      "F",
      "G",
      "A",
      "Bb",
    ]);
  });

  it("returns C Phrygian with flat spelling", () => {
    expect(getModalScaleNotes("C", "phrygian", "flat")).toEqual([
      "C",
      "Db",
      "Eb",
      "F",
      "G",
      "Ab",
      "Bb",
    ]);
  });

  it("returns C Lydian with sharp spelling", () => {
    expect(getModalScaleNotes("C", "lydian", "sharp")).toEqual([
      "C",
      "D",
      "E",
      "F#",
      "G",
      "A",
      "B",
    ]);
  });

  it("returns C Mixolydian with flat spelling", () => {
    expect(getModalScaleNotes("C", "mixolydian", "flat")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "Bb",
    ]);
  });

  it("returns C Aeolian (= C natural minor) with flat spelling", () => {
    expect(getModalScaleNotes("C", "aeolian", "flat")).toEqual([
      "C",
      "D",
      "Eb",
      "F",
      "G",
      "Ab",
      "Bb",
    ]);
  });

  it("returns C Locrian with flat spelling", () => {
    expect(getModalScaleNotes("C", "locrian", "flat")).toEqual([
      "C",
      "Db",
      "Eb",
      "F",
      "Gb",
      "Ab",
      "Bb",
    ]);
  });

  it("returns D Dorian (parent C major)", () => {
    expect(getModalScaleNotes("D", "dorian")).toEqual([
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
      "C",
    ]);
  });

  it("returns F Lydian (parent C major)", () => {
    expect(getModalScaleNotes("F", "lydian")).toEqual([
      "F",
      "G",
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });

  it("Ionian output equals getMajorScaleNotes for representative keys", async () => {
    const { getMajorScaleNotes } = await import("./scales");
    for (const key of ["C", "G", "D", "F", "Bb", "Eb"]) {
      expect(getModalScaleNotes(key, "ionian")).toEqual(getMajorScaleNotes(key));
    }
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run src/theory/modes.test.ts` Expected: FAIL — "getModalScaleNotes is
not exported from './modes'" (or equivalent).

- [ ] **Step 3: Implement `getModalScaleNotes`**

In `src/theory/modes.ts`, remove the `void CHROMATIC_SCALE` line and replace it with the
function (also remove `void getNoteIndex` if it ends up used here):

```ts
import { getDisplayName, type AccidentalStyle } from "./notes";

export function getModalScaleNotes(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): string[] {
  const rootIndex = getNoteIndex(key);
  return MODE_INTERVALS[mode].map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    const sharpName = CHROMATIC_SCALE[noteIndex];
    return getDisplayName(sharpName, key, accidentalStyle);
  });
}
```

(Adjust the imports at the top of `modes.ts` accordingly. `CHROMATIC_SCALE` and
`getNoteIndex` are now used.)

- [ ] **Step 4: Run the test and verify it passes**

Run: `npx vitest run src/theory/modes.test.ts` Expected: PASS, 10 assertions.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/modes.ts src/theory/modes.test.ts
npm run lint
npm test
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "feat(theory): add getModalScaleNotes for parallel modal scales"
```

---

### Task 3: `parentMajorOf`

**Files:**

- Modify: `src/theory/modes.ts`
- Modify: `src/theory/modes.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/theory/modes.test.ts`:

```ts
import { parentMajorOf } from "./modes";

describe("parentMajorOf", () => {
  it("Ionian is identity for every tonic", () => {
    for (const key of ["C", "D", "F#", "Bb", "Eb"]) {
      expect(parentMajorOf(key, "ionian")).toBe(key);
    }
  });

  it("D Dorian's parent is C major", () => {
    expect(parentMajorOf("D", "dorian")).toBe("C");
  });

  it("E Phrygian's parent is C major", () => {
    expect(parentMajorOf("E", "phrygian")).toBe("C");
  });

  it("F Lydian's parent is C major", () => {
    expect(parentMajorOf("F", "lydian")).toBe("C");
  });

  it("G Mixolydian's parent is C major", () => {
    expect(parentMajorOf("G", "mixolydian")).toBe("C");
  });

  it("A Aeolian's parent is C major", () => {
    expect(parentMajorOf("A", "aeolian")).toBe("C");
  });

  it("B Locrian's parent is C major", () => {
    expect(parentMajorOf("B", "locrian")).toBe("C");
  });

  it("C Dorian's parent is Bb major (returns sharp-form A#)", () => {
    // parentMajorOf returns CHROMATIC_SCALE entries (sharp-form). Callers
    // that need flat spelling apply getDisplayName separately.
    expect(parentMajorOf("C", "dorian")).toBe("A#");
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/modes.test.ts -t parentMajorOf` Expected: FAIL —
"parentMajorOf is not exported".

- [ ] **Step 3: Implement**

Add to `src/theory/modes.ts`:

```ts
// Returns the tonic of the parent major scale for (modal-tonic, mode).
// Returns the sharp-form note from CHROMATIC_SCALE; callers that need flat
// spelling should pipe through getDisplayName themselves. Internal users
// (Scale Positions' window math) only need note-index-equivalent input, so
// sharp-form is fine for them.
export function parentMajorOf(tonic: string, mode: Mode): string {
  const tonicIdx = getNoteIndex(tonic);
  const parentIdx = (tonicIdx + PARENT_MAJOR_OFFSET[mode] + 12) % 12;
  return CHROMATIC_SCALE[parentIdx];
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/theory/modes.test.ts` Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/modes.ts src/theory/modes.test.ts
npm run lint && npm test
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "feat(theory): add parentMajorOf for modal CAGED anchoring"
```

---

### Task 4: `getModalIntervalRole`

**Files:**

- Modify: `src/theory/modes.ts`
- Modify: `src/theory/modes.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/theory/modes.test.ts`:

```ts
import { getModalIntervalRole } from "./modes";

describe("getModalIntervalRole", () => {
  it("returns 'root' for the modal tonic", () => {
    expect(getModalIntervalRole("C", "dorian", "C")).toBe("root");
    expect(getModalIntervalRole("D", "phrygian", "D")).toBe("root");
  });

  it("returns 'third' for the modal third (regardless of major/minor quality)", () => {
    // C Dorian: ♭3 = Eb (sharp form D#)
    expect(getModalIntervalRole("C", "dorian", "D#")).toBe("third");
    // C Lydian: 3 = E
    expect(getModalIntervalRole("C", "lydian", "E")).toBe("third");
  });

  it("returns 'seventh' for the modal seventh", () => {
    // C Mixolydian: ♭7 = Bb (sharp form A#)
    expect(getModalIntervalRole("C", "mixolydian", "A#")).toBe("seventh");
  });

  it("returns null for notes not in the mode", () => {
    // C Lydian has F# not F
    expect(getModalIntervalRole("C", "lydian", "F")).toBeNull();
    // C Phrygian has Db not D
    expect(getModalIntervalRole("C", "phrygian", "D")).toBeNull();
  });

  it("Ionian behaves identically to getIntervalRole", async () => {
    const { getIntervalRole } = await import("./scales");
    for (const note of ["C", "D", "E", "F", "G", "A", "B", "C#", "F#"]) {
      expect(getModalIntervalRole("C", "ionian", note)).toBe(
        getIntervalRole("C", note),
      );
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/modes.test.ts -t getModalIntervalRole` Expected: FAIL —
"getModalIntervalRole is not exported".

- [ ] **Step 3: Implement**

Add to `src/theory/modes.ts`:

```ts
import type { IntervalRole } from "./types";

const INTERVAL_NAMES: IntervalRole[] = [
  "root",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
];

export function getModalIntervalRole(
  key: string,
  mode: Mode,
  note: string,
): IntervalRole | null {
  const semitones = (getNoteIndex(note) - getNoteIndex(key) + 12) % 12;
  const intervals = MODE_INTERVALS[mode];
  const idx = intervals.indexOf(semitones as (typeof intervals)[number]);
  if (idx === -1) return null;
  return INTERVAL_NAMES[idx];
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/theory/modes.test.ts` Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/modes.ts src/theory/modes.test.ts
npm run lint && npm test
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "feat(theory): add getModalIntervalRole for in-mode checks"
```

---

### Task 5: `getCharacteristicNotes`

**Files:**

- Modify: `src/theory/modes.ts`
- Modify: `src/theory/modes.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/theory/modes.test.ts`:

```ts
import { getCharacteristicNotes } from "./modes";

describe("getCharacteristicNotes", () => {
  it("returns [] for Ionian and Aeolian", () => {
    expect(getCharacteristicNotes("C", "ionian")).toEqual([]);
    expect(getCharacteristicNotes("D", "aeolian")).toEqual([]);
  });

  it("returns the natural 6 for Dorian", () => {
    // C Dorian's ♮6 is A
    expect(getCharacteristicNotes("C", "dorian")).toEqual(["A"]);
    // D Dorian's ♮6 is B
    expect(getCharacteristicNotes("D", "dorian")).toEqual(["B"]);
  });

  it("returns the ♭2 for Phrygian (Db with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "phrygian", "flat")).toEqual(["Db"]);
  });

  it("returns the ♯4 for Lydian (F# with sharp spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "lydian", "sharp")).toEqual(["F#"]);
  });

  it("returns the ♭7 for Mixolydian (Bb with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "mixolydian", "flat")).toEqual(["Bb"]);
  });

  it("returns the ♭5 for Locrian (Gb with flat spelling for C tonic)", () => {
    expect(getCharacteristicNotes("C", "locrian", "flat")).toEqual(["Gb"]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/modes.test.ts -t getCharacteristicNotes` Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `src/theory/modes.ts`:

```ts
export function getCharacteristicNotes(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): string[] {
  const scale = getModalScaleNotes(key, mode, accidentalStyle);
  return CHARACTERISTIC_DEGREES[mode].map((degreeIdx) => scale[degreeIdx]);
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/theory/modes.test.ts` Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/modes.ts src/theory/modes.test.ts
npm run lint && npm test
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "feat(theory): add getCharacteristicNotes for modal flavor overlay"
```

---

### Task 6: `getModalDiatonicTriads`

**Files:**

- Modify: `src/theory/modes.ts`
- Modify: `src/theory/modes.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/theory/modes.test.ts`:

```ts
import { getModalDiatonicTriads } from "./modes";

describe("getModalDiatonicTriads", () => {
  it("Ionian output matches getDiatonicTriads", async () => {
    const { getDiatonicTriads } = await import("./scales");
    expect(getModalDiatonicTriads("C", "ionian")).toEqual(getDiatonicTriads("C"));
  });

  it("C Dorian triads (i, ii, ♭III, IV, v, vi°, ♭VII)", () => {
    const triads = getModalDiatonicTriads("C", "dorian", "flat");
    expect(triads.map((t) => t.symbol)).toEqual([
      "Cm",
      "Dm",
      "Eb",
      "F",
      "Gm",
      "A°",
      "Bb",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "i",
      "ii",
      "♭III",
      "IV",
      "v",
      "vi°",
      "♭VII",
    ]);
    expect(triads.map((t) => t.quality)).toEqual([
      "min",
      "min",
      "maj",
      "maj",
      "min",
      "dim",
      "maj",
    ]);
  });

  it("C Phrygian triad qualities (i, ♭II, ♭III, iv, v°, ♭VI, ♭vii)", () => {
    const triads = getModalDiatonicTriads("C", "phrygian", "flat");
    expect(triads.map((t) => t.quality)).toEqual([
      "min",
      "maj",
      "maj",
      "min",
      "dim",
      "maj",
      "min",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "i",
      "♭II",
      "♭III",
      "iv",
      "v°",
      "♭VI",
      "♭vii",
    ]);
  });

  it("C Lydian triad qualities (I, II, iii, ♯iv°, V, vi, vii)", () => {
    const triads = getModalDiatonicTriads("C", "lydian", "sharp");
    expect(triads.map((t) => t.quality)).toEqual([
      "maj",
      "maj",
      "min",
      "dim",
      "maj",
      "min",
      "min",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "I",
      "II",
      "iii",
      "♯iv°",
      "V",
      "vi",
      "vii",
    ]);
  });

  it("C Locrian triad qualities (i°, ♭II, ♭iii, iv, ♭V, ♭VI, ♭vii)", () => {
    const triads = getModalDiatonicTriads("C", "locrian", "flat");
    expect(triads.map((t) => t.quality)).toEqual([
      "dim",
      "maj",
      "min",
      "min",
      "maj",
      "maj",
      "min",
    ]);
    expect(triads.map((t) => t.romanNumeral)).toEqual([
      "i°",
      "♭II",
      "♭iii",
      "iv",
      "♭V",
      "♭VI",
      "♭vii",
    ]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/modes.test.ts -t getModalDiatonicTriads` Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `src/theory/modes.ts`:

```ts
import type { DiatonicTriad, TriadQuality } from "./scales";

// Modal degree-prefix derived from the same-root major scale's degree label.
// Ionian: '1','2',… → '', Dorian: '1','2','♭3','4',… → '','','♭','',…
function modalDegreePrefix(mode: Mode, position: number): string {
  const label = MODE_DEGREE_LABELS[mode][position];
  if (label.startsWith("♭")) return "♭";
  if (label.startsWith("♯")) return "♯";
  return "";
}

const TRIAD_BASE_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII"];

const TRIAD_QUALITY_SUFFIX: Record<TriadQuality, string> = {
  maj: "",
  min: "m",
  dim: "°",
};

// Determines triad quality from three semitone-offset pitches above the root.
function triadQualityFromIntervals(
  thirdSemitones: number,
  fifthSemitones: number,
): TriadQuality {
  if (thirdSemitones === 4 && fifthSemitones === 7) return "maj";
  if (thirdSemitones === 3 && fifthSemitones === 7) return "min";
  if (thirdSemitones === 3 && fifthSemitones === 6) return "dim";
  // Modal scales do not produce other triad qualities. Fall through with a
  // safe default to avoid crashes if a future mode breaks this invariant.
  return "min";
}

function buildTriadRomanNumeral(
  mode: Mode,
  position: number,
  quality: TriadQuality,
): string {
  const prefix = modalDegreePrefix(mode, position);
  const base = TRIAD_BASE_NUMERALS[position];
  const numeral = quality === "maj" ? base : base.toLowerCase();
  const suffix = quality === "dim" ? "°" : "";
  return `${prefix}${numeral}${suffix}`;
}

export function getModalDiatonicTriads(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): DiatonicTriad[] {
  const scale = getModalScaleNotes(key, mode, accidentalStyle);
  const intervals = MODE_INTERVALS[mode];
  return scale.map((root, i) => {
    const thirdInterval = intervals[(i + 2) % 7] - intervals[i];
    const fifthInterval = intervals[(i + 4) % 7] - intervals[i];
    // (i+2) and (i+4) wrap into the next octave for high positions; normalize
    // into [0, 11] so triadQualityFromIntervals can compare against canonical
    // semitone targets (maj=4/7, min=3/7, dim=3/6).
    const third = ((thirdInterval % 12) + 12) % 12;
    const fifth = ((fifthInterval % 12) + 12) % 12;
    const quality = triadQualityFromIntervals(third, fifth);
    return {
      degree: i + 1,
      romanNumeral: buildTriadRomanNumeral(mode, i, quality),
      quality,
      symbol: root + TRIAD_QUALITY_SUFFIX[quality],
      notes: [root, scale[(i + 2) % 7], scale[(i + 4) % 7]],
    };
  });
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/theory/modes.test.ts -t getModalDiatonicTriads` Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/modes.ts src/theory/modes.test.ts
npm run lint && npm test
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "feat(theory): add getModalDiatonicTriads with modal Roman numerals"
```

---

### Task 7: `getModalDiatonicChords` (sevenths)

**Files:**

- Modify: `src/theory/modes.ts`
- Modify: `src/theory/modes.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/theory/modes.test.ts`:

```ts
import { getModalDiatonicChords } from "./modes";

describe("getModalDiatonicChords", () => {
  it("Ionian output matches getDiatonicChords", async () => {
    const { getDiatonicChords } = await import("./scales");
    expect(getModalDiatonicChords("C", "ionian")).toEqual(getDiatonicChords("C"));
  });

  it("C Dorian sevenths (i7, ii7, ♭IIImaj7, IV7, v7, viø7, ♭VIImaj7)", () => {
    const chords = getModalDiatonicChords("C", "dorian", "flat");
    expect(chords.map((c) => c.symbol)).toEqual([
      "Cm7",
      "Dm7",
      "Ebmaj7",
      "F7",
      "Gm7",
      "Am7b5",
      "Bbmaj7",
    ]);
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "i7",
      "ii7",
      "♭IIImaj7",
      "IV7",
      "v7",
      "viø7",
      "♭VIImaj7",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "m7",
      "m7",
      "maj7",
      "7",
      "m7",
      "m7b5",
      "maj7",
    ]);
  });

  it("C Lydian sevenths qualities (maj7, 7, m7, m7b5, maj7, m7, m7)", () => {
    const chords = getModalDiatonicChords("C", "lydian", "sharp");
    expect(chords.map((c) => c.quality)).toEqual([
      "maj7",
      "7",
      "m7",
      "m7b5",
      "maj7",
      "m7",
      "m7",
    ]);
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "Imaj7",
      "II7",
      "iii7",
      "♯ivø7",
      "Vmaj7",
      "vi7",
      "vii7",
    ]);
  });

  it("C Mixolydian sevenths (I7, ii7, iiiø7, IVmaj7, v7, vi7, ♭VIImaj7)", () => {
    const chords = getModalDiatonicChords("C", "mixolydian", "flat");
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "I7",
      "ii7",
      "iiiø7",
      "IVmaj7",
      "v7",
      "vi7",
      "♭VIImaj7",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "7",
      "m7",
      "m7b5",
      "maj7",
      "m7",
      "m7",
      "maj7",
    ]);
  });

  it("C Locrian sevenths (iø7, ♭IImaj7, ♭iii7, iv7, ♭Vmaj7, ♭VI7, ♭vii7)", () => {
    const chords = getModalDiatonicChords("C", "locrian", "flat");
    expect(chords.map((c) => c.romanNumeral)).toEqual([
      "iø7",
      "♭IImaj7",
      "♭iii7",
      "iv7",
      "♭Vmaj7",
      "♭VI7",
      "♭vii7",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "m7b5",
      "maj7",
      "m7",
      "m7",
      "maj7",
      "7",
      "m7",
    ]);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/modes.test.ts -t getModalDiatonicChords` Expected: FAIL.

- [ ] **Step 3: Implement**

Add to `src/theory/modes.ts`:

```ts
import type { ChordQuality, DiatonicChord } from "./scales";

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj7: "maj7",
  m7: "m7",
  "7": "7",
  m7b5: "m7b5",
};

function seventhQualityFromIntervals(
  thirdSemitones: number,
  fifthSemitones: number,
  seventhSemitones: number,
): ChordQuality {
  // Compare to canonical chord-stack semitone signatures:
  //   maj7 = (4, 7, 11), m7 = (3, 7, 10), 7 = (4, 7, 10), m7b5 = (3, 6, 10).
  if (thirdSemitones === 4 && fifthSemitones === 7 && seventhSemitones === 11)
    return "maj7";
  if (thirdSemitones === 3 && fifthSemitones === 7 && seventhSemitones === 10)
    return "m7";
  if (thirdSemitones === 4 && fifthSemitones === 7 && seventhSemitones === 10)
    return "7";
  if (thirdSemitones === 3 && fifthSemitones === 6 && seventhSemitones === 10)
    return "m7b5";
  // No diatonic mode produces other 7th qualities; fall through safely.
  return "m7";
}

const QUALITY_TO_TRIAD: Record<ChordQuality, TriadQuality> = {
  maj7: "maj",
  m7: "min",
  "7": "maj",
  m7b5: "dim",
};

function buildSeventhRomanNumeral(
  mode: Mode,
  position: number,
  quality: ChordQuality,
): string {
  const prefix = modalDegreePrefix(mode, position);
  const base = TRIAD_BASE_NUMERALS[position];
  // Case follows the *triad* quality of the stack — half-diminished is still
  // a minor-quality triad with a flat 5, so it stays lowercase.
  const triadQuality = QUALITY_TO_TRIAD[quality];
  const numeral = triadQuality === "maj" ? base : base.toLowerCase();
  // Suffix encoding:
  //   maj7  → "maj7"
  //   m7    → "7"        (the minor-case numeral already implies m)
  //   7     → "7"
  //   m7b5  → "ø7"       (the half-dim glyph; lowercase numeral implies minor)
  let suffix: string;
  switch (quality) {
    case "maj7":
      suffix = "maj7";
      break;
    case "m7b5":
      suffix = "ø7";
      break;
    case "m7":
    case "7":
      suffix = "7";
      break;
  }
  return `${prefix}${numeral}${suffix}`;
}

export function getModalDiatonicChords(
  key: string,
  mode: Mode,
  accidentalStyle?: AccidentalStyle,
): DiatonicChord[] {
  const scale = getModalScaleNotes(key, mode, accidentalStyle);
  const intervals = MODE_INTERVALS[mode];
  return scale.map((root, i) => {
    const third = (((intervals[(i + 2) % 7] - intervals[i]) % 12) + 12) % 12;
    const fifth = (((intervals[(i + 4) % 7] - intervals[i]) % 12) + 12) % 12;
    const seventh = (((intervals[(i + 6) % 7] - intervals[i]) % 12) + 12) % 12;
    const quality = seventhQualityFromIntervals(third, fifth, seventh);
    return {
      degree: i + 1,
      romanNumeral: buildSeventhRomanNumeral(mode, i, quality),
      quality,
      symbol: root + QUALITY_SUFFIX[quality],
      notes: [root, scale[(i + 2) % 7], scale[(i + 4) % 7], scale[(i + 6) % 7]],
    };
  });
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npx vitest run src/theory/modes.test.ts` Expected: PASS for all `modes.test.ts`
cases.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/modes.ts src/theory/modes.test.ts
npm run lint && npm test
git add src/theory/modes.ts src/theory/modes.test.ts
git commit -m "feat(theory): add getModalDiatonicChords with modal Roman numerals"
```

---

## Phase B — Marker types and pipelines

### Task 8: Add `isCharacteristic` to `NoteMarker`

**Files:**

- Modify: `src/theory/types.ts`

- [ ] **Step 1: Add the optional flag**

Edit `src/theory/types.ts`. Replace the `NoteMarker` definition (lines 37–42) with:

```ts
export type NoteMarker = {
  string: number; // 0 = low E, 5 = high E
  fret: number; // 0 = open, up to 15
  note: string; // Display name (e.g., "C", "F#", "Bb")
  role: NoteDisplayRole;
  // When true, the renderer draws an additional outer ring in the
  // characteristic-tone color. Set by marker pipelines for notes flagged
  // characteristic by getCharacteristicNotes(key, mode).
  isCharacteristic?: boolean;
};
```

- [ ] **Step 2: Verify lint + tests still pass**

Run: `npm run lint && npm test` Expected: PASS — adding an optional field is a
non-breaking type change.

- [ ] **Step 3: Format and commit**

```bash
npx prettier --write src/theory/types.ts
git add src/theory/types.ts
git commit -m "feat(theory): add NoteMarker.isCharacteristic flag"
```

---

### Task 9: `buildChordToneMarkers` — modal-aware

**Files:**

- Modify: `src/theory/chordTones.ts`
- Modify: `src/theory/chordTones.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/theory/chordTones.test.ts`:

```ts
import { buildChordToneMarkers } from "./chordTones";
import { getDiatonicChords } from "./scales";

describe("buildChordToneMarkers — modal", () => {
  it("mode='ionian' is regression-equivalent to omitting mode", () => {
    const baseInput = {
      key: "C",
      chord: getDiatonicChords("C")[0],
      accidentalStyle: "flat" as const,
      positions: ["P1" as const],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"] as const),
      startFret: 0,
      endFret: 12,
    };
    const without = buildChordToneMarkers(baseInput);
    const withIonian = buildChordToneMarkers({ ...baseInput, mode: "ionian" });
    expect(withIonian).toEqual(without);
  });

  it("D Dorian + Dm7 + P1 emits markers in frets 0-3 (parent C major's P1)", () => {
    const { getModalDiatonicChords } = require("./modes");
    const dDorianI = getModalDiatonicChords("D", "dorian")[0]; // Dm7
    const markers = buildChordToneMarkers({
      key: "D",
      mode: "dorian",
      chord: dDorianI,
      accidentalStyle: "flat",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 0,
      endFret: 12,
    });
    // Every marker should fall inside the parent C-major P1 window (0-3),
    // not D-Ionian's P1 (2-5).
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(0);
      expect(m.fret).toBeLessThanOrEqual(3);
    }
  });

  it("drops out-of-mode notes (C Lydian filters out F)", () => {
    const { getModalDiatonicChords } = require("./modes");
    const cLydianI = getModalDiatonicChords("C", "lydian", "sharp")[0]; // Cmaj7
    const markers = buildChordToneMarkers({
      key: "C",
      mode: "lydian",
      chord: cLydianI,
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: true, // include context so we'd see F if it weren't filtered
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 0,
      endFret: 12,
    });
    // C Lydian has F#, not F. No marker should display "F" without a sharp.
    for (const m of markers) {
      expect(m.note).not.toBe("F");
    }
  });

  it("flags characteristic notes in Dorian (♮6 = A in C Dorian)", () => {
    const { getModalDiatonicTriads } = require("./modes");
    const cDorianI = getModalDiatonicTriads("C", "dorian", "flat")[0]; // Cm
    const markers = buildChordToneMarkers({
      key: "C",
      mode: "dorian",
      chord: cDorianI,
      accidentalStyle: "flat",
      positions: ["P1", "P2", "P3", "P4", "P5"],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 0,
      endFret: 12,
    });
    const aMarkers = markers.filter((m) => m.note === "A");
    expect(aMarkers.length).toBeGreaterThan(0);
    for (const m of aMarkers) {
      expect(m.isCharacteristic).toBe(true);
    }
    const cMarkers = markers.filter((m) => m.note === "C");
    for (const m of cMarkers) {
      expect(m.isCharacteristic).toBeFalsy();
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/chordTones.test.ts -t modal` Expected: FAIL — `mode`
parameter not yet supported, and `isCharacteristic` not set.

- [ ] **Step 3: Implement**

Edit `src/theory/chordTones.ts`. Update imports, input type, and function body. Replace
the file's body with:

```ts
import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import { isInPositionWindow, type PositionId } from "./positions";
import { getIntervalRole, type DiatonicChord, type DiatonicTriad } from "./scales";
import {
  getCharacteristicNotes,
  getModalIntervalRole,
  parentMajorOf,
  type Mode,
} from "./modes";
import type { NoteDisplayRole, NoteMarker } from "./types";

export const HIGHLIGHTABLE: ReadonlySet<NoteDisplayRole> = new Set<NoteDisplayRole>([
  "root",
  "third",
  "fifth",
  "seventh",
]);

export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | DiatonicTriad | null,
): NoteDisplayRole {
  if (!chord) return "scale";
  const noteIdx = getNoteIndex(note);
  if (noteIdx === getNoteIndex(chord.notes[0])) return "root";
  if (noteIdx === getNoteIndex(chord.notes[1])) return "third";
  if (noteIdx === getNoteIndex(chord.notes[2])) return "fifth";
  if (chord.notes.length === 4 && noteIdx === getNoteIndex(chord.notes[3])) {
    return "seventh";
  }
  return "scale";
}

export type BuildChordToneMarkersInput = {
  key: string;
  chord: DiatonicChord | DiatonicTriad | null;
  accidentalStyle: AccidentalStyle;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: Set<HighlightableRole>;
  startFret: number;
  endFret: number;
  // Optional — defaults to 'ionian', preserving existing behavior. When
  // 'ionian', the in-mode check, parent-major anchoring, and characteristic
  // overlay all degrade to identical output of the pre-modal pipeline.
  mode?: Mode;
};

export function buildChordToneMarkers({
  key,
  chord,
  accidentalStyle,
  positions,
  showContext,
  enabledHighlights,
  startFret,
  endFret,
  mode = "ionian",
}: BuildChordToneMarkersInput): NoteMarker[] {
  if (key === ALL_NOTES_KEY) return [];
  if (positions.length === 0) return [];

  const parentKey = parentMajorOf(key, mode);
  const characteristicNotes = getCharacteristicNotes(key, mode, accidentalStyle);
  const characteristicSet = new Set(characteristicNotes.map((n) => getNoteIndex(n)));

  const result: NoteMarker[] = [];

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
    const openString = STANDARD_TUNING[stringIndex];
    for (let fret = startFret; fret <= endFret; fret++) {
      const note = getNoteAtFret(openString, fret);
      const interval =
        mode === "ionian"
          ? getIntervalRole(key, note)
          : getModalIntervalRole(key, mode, note);
      if (interval === null) continue;

      const inWindow = positions.some((p) =>
        isInPositionWindow(parentKey, p, fret, startFret, endFret),
      );
      if (!inWindow && !showContext) continue;

      let role = roleFromChordTone(note, chord);
      if (
        HIGHLIGHTABLE.has(role) &&
        !enabledHighlights.has(role as HighlightableRole)
      ) {
        role = "scale";
      }
      if (!inWindow) {
        role = "muted";
      }

      const isCharacteristic = characteristicSet.has(getNoteIndex(note));

      result.push({
        string: stringIndex,
        fret,
        note: getDisplayName(note, key, accidentalStyle),
        role,
        ...(isCharacteristic ? { isCharacteristic: true } : {}),
      });
    }
  }

  return result;
}
```

- [ ] **Step 4: Run and verify pass**

Run: `npm test` Expected: All existing tests pass (Ionian regression preserved); new
modal tests pass.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/chordTones.ts src/theory/chordTones.test.ts
npm run lint && npm test
git add src/theory/chordTones.ts src/theory/chordTones.test.ts
git commit -m "feat(theory): make buildChordToneMarkers modal-aware"
```

---

### Task 10: `buildChordShapeMarkers` — modal-aware

**Files:**

- Modify: `src/theory/chordShapes.ts`
- Modify: `src/theory/chordShapes.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/theory/chordShapes.test.ts`:

```ts
describe("buildChordShapeMarkers — modal", () => {
  it("flags A as characteristic in C Dorian Cm7 voicings", async () => {
    const { getModalDiatonicChords } = await import("./modes");
    const cDorianI = getModalDiatonicChords("C", "dorian", "flat")[0]; // Cm7
    const markers = buildChordShapeMarkers({
      mode: "sevenths",
      modalMode: "dorian",
      voicingSystem: "drop2",
      chord: cDorianI,
      key: "C",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root", "first", "second", "third"],
      startFret: 0,
      endFret: 15,
    });
    // Cm7 voicings don't contain A — verify no characteristic flag fires.
    expect(markers.every((m) => !m.isCharacteristic)).toBe(true);
  });

  it("flags A as characteristic in C Dorian's IV7 (F7) voicings", async () => {
    const { getModalDiatonicChords } = await import("./modes");
    const cDorianIV = getModalDiatonicChords("C", "dorian", "flat")[3]; // F7
    const markers = buildChordShapeMarkers({
      mode: "sevenths",
      modalMode: "dorian",
      voicingSystem: "drop2",
      chord: cDorianIV,
      key: "C",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 15,
    });
    // F7 = F-A-C-Eb. The 'A' is the modal characteristic note for C Dorian.
    const aMarkers = markers.filter((m) => m.note === "A");
    expect(aMarkers.length).toBeGreaterThan(0);
    for (const m of aMarkers) {
      expect(m.isCharacteristic).toBe(true);
    }
  });

  it("modalMode='ionian' is regression-equivalent (no characteristic flags)", async () => {
    const { getDiatonicChords } = await import("./scales");
    const cMajorIV = getDiatonicChords("C")[3]; // Fmaj7
    const markers = buildChordShapeMarkers({
      mode: "sevenths",
      modalMode: "ionian",
      voicingSystem: "drop2",
      chord: cMajorIV,
      key: "C",
      accidentalStyle: "flat",
      stringSets: ["3-4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 15,
    });
    expect(markers.every((m) => !m.isCharacteristic)).toBe(true);
  });
});
```

- [ ] **Step 2: Run and verify failure**

Run: `npx vitest run src/theory/chordShapes.test.ts -t modal` Expected: FAIL —
`modalMode` not in input type yet.

- [ ] **Step 3: Implement**

Edit `src/theory/chordShapes.ts`:

3a. Add the import near the top (alongside the existing imports):

```ts
import { getCharacteristicNotes, type Mode as ModalMode } from "./modes";
```

3b. Update `BuildChordShapeMarkersInput` to add `modalMode` to both arms (and
`accidentalStyle` is already present). Replace lines 607-628 with:

```ts
export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      modalMode: ModalMode;
      chord: DiatonicTriad;
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversions: ReadonlyArray<Inversion>;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "sevenths";
      modalMode: ModalMode;
      voicingSystem: VoicingSystem;
      chord: DiatonicChord;
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<SeventhStringSet>;
      inversions: ReadonlyArray<SeventhInversion>;
      startFret: number;
      endFret: number;
    };
```

3c. Modify `placeChordOnCombo` to accept and apply the characteristic flag. Replace its
signature + body (lines ~654-689) with:

```ts
function placeChordOnCombo(
  chord: { quality: string; notes: readonly string[] },
  shape: TriadShape | SeventhShape,
  key: string,
  accidentalStyle: AccidentalStyle,
  startFret: number,
  endFret: number,
  characteristicSet: ReadonlySet<number>,
): NoteMarker[] {
  const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
  const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
  const candidates = getRootFrets(chord.notes[0], openAnchorNote, startFret, endFret);
  const result: NoteMarker[] = [];

  for (const candidate of candidates) {
    const allFit = shape.positions.every(
      (p) =>
        candidate + p.fretOffset >= startFret && candidate + p.fretOffset <= endFret,
    );
    if (!allFit) continue;

    for (const p of shape.positions) {
      const absFret = candidate + p.fretOffset;
      const markerString = shapeStringToMarkerString(p.string);
      const openNote = STANDARD_TUNING[markerString];
      const noteSharp = getNoteAtFret(openNote, absFret);
      const isCharacteristic = characteristicSet.has(getNoteIndex(noteSharp));
      result.push({
        string: markerString,
        fret: absFret,
        note: getDisplayName(noteSharp, key, accidentalStyle),
        role: p.role,
        ...(isCharacteristic ? { isCharacteristic: true } : {}),
      });
    }
  }

  return result;
}
```

3d. Update the two `placeChordOnCombo` call sites in `buildChordShapeMarkers` to pass
the characteristic set. Replace the function body's content with:

```ts
export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[] {
  if (input.key === ALL_NOTES_KEY) return [];

  const characteristicNotes = getCharacteristicNotes(
    input.key,
    input.modalMode,
    input.accidentalStyle,
  );
  const characteristicSet = new Set(characteristicNotes.map((n) => getNoteIndex(n)));

  if (input.mode === "triads") {
    if (input.stringSets.length === 0 || input.inversions.length === 0) return [];
    const result: NoteMarker[] = [];
    for (const stringSet of input.stringSets) {
      for (const inv of INVERSION_ORDER) {
        if (!input.inversions.includes(inv)) continue;
        const shape = (TRIAD_SHAPES[stringSet][inv] as Record<string, TriadShape>)[
          input.chord.quality
        ];
        if (!shape) continue;
        result.push(
          ...placeChordOnCombo(
            input.chord,
            shape,
            input.key,
            input.accidentalStyle,
            input.startFret,
            input.endFret,
            characteristicSet,
          ),
        );
      }
    }
    return result;
  }

  // sevenths
  if (input.stringSets.length === 0 || input.inversions.length === 0) return [];
  const result: NoteMarker[] = [];
  const systemTable = SEVENTH_SHAPES[input.voicingSystem];
  for (const stringSet of input.stringSets) {
    const perStringSet = systemTable[stringSet];
    if (!perStringSet) continue;
    for (const inv of SEVENTH_INVERSION_ORDER) {
      if (!input.inversions.includes(inv)) continue;
      const shape = (perStringSet[inv] as Record<string, SeventhShape>)[
        input.chord.quality
      ];
      if (!shape) continue;
      result.push(
        ...placeChordOnCombo(
          input.chord,
          shape,
          input.key,
          input.accidentalStyle,
          input.startFret,
          input.endFret,
          characteristicSet,
        ),
      );
    }
  }
  return result;
}
```

3e. Update existing `chordShapes.test.ts` test cases to include `modalMode: 'ionian'` in
their inputs. Run the test file to find which call sites break:

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: TypeScript-level errors
in tests for missing `modalMode` field — fix each test case by adding
`modalMode: "ionian"` to its input object.

- [ ] **Step 4: Run and verify pass**

Run: `npm test` Expected: All tests PASS (existing + new modal tests).

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/theory/chordShapes.ts src/theory/chordShapes.test.ts
npm run lint && npm test
git add src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git commit -m "feat(theory): make buildChordShapeMarkers modal-aware"
```

---

### Task 11: `NoteMapView` — modal-aware

**Files:**

- Modify: `src/views/NoteMapView.tsx`

- [ ] **Step 1: Replace `NoteMapView` body to thread mode through**

Edit `src/views/NoteMapView.tsx`. Replace the file with:

```tsx
import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import { roleFromChordTone, HIGHLIGHTABLE } from "../theory/chordTones";
import {
  STANDARD_TUNING,
  getNoteAtFret,
  getNoteIndex,
  getDisplayName,
  type AccidentalStyle,
} from "../theory/notes";
import { type DiatonicChord, type DiatonicTriad } from "../theory/scales";
import {
  getCharacteristicNotes,
  getModalIntervalRole,
  type Mode,
} from "../theory/modes";
import type { NoteMarker, NoteDisplayRole } from "../theory/types";

type NoteMapViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
  mode: Mode;
};

export function NoteMapView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
  startFret,
  endFret,
  mode,
}: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = [];
    const showAll = selectedKey === ALL_NOTES_KEY;

    const characteristicSet = showAll
      ? new Set<number>()
      : new Set(
          getCharacteristicNotes(selectedKey, mode, accidentalStyle).map((n) =>
            getNoteIndex(n),
          ),
        );

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex];
      for (let fret = startFret; fret <= endFret; fret++) {
        const note = getNoteAtFret(openString, fret);

        let role: NoteDisplayRole;
        if (showAll) {
          role = "scale";
        } else {
          if (getModalIntervalRole(selectedKey, mode, note) === null) continue;
          role = roleFromChordTone(note, selectedChord);
          if (
            HIGHLIGHTABLE.has(role) &&
            !enabledHighlights.has(role as HighlightableRole)
          ) {
            role = "scale";
          }
        }

        const isCharacteristic = characteristicSet.has(getNoteIndex(note));

        result.push({
          string: stringIndex,
          fret,
          note: getDisplayName(note, selectedKey, accidentalStyle),
          role,
          ...(isCharacteristic ? { isCharacteristic: true } : {}),
        });
      }
    }

    return result;
  }, [
    selectedKey,
    accidentalStyle,
    enabledHighlights,
    selectedChord,
    startFret,
    endFret,
    mode,
  ]);

  return <Fretboard markers={markers} startFret={startFret} endFret={endFret} />;
}
```

- [ ] **Step 2: Verify lint catches unused imports / type errors**

Run: `npm run lint` Expected: At this point `App.tsx` doesn't yet pass `mode` to
`NoteMapView` — this is expected and will be fixed in Task 17. Lint currently passes
because the prop is required but App.tsx passes incorrect props will be a TS error
caught later. If TypeScript build fails right now, defer the commit until Task 17 lands.

To preview the build error without blocking commit:

Run: `npx tsc --noEmit` Expected: Error in `App.tsx` — `Property 'mode' is missing`.
Note this; we'll fix in Task 17.

- [ ] **Step 3: Defer commit until Task 17**

Don't commit yet. The compile error means the app is in a broken state. Tasks 11 and 17
ship together. Skip to Task 12.

(If you prefer to commit incrementally, you can add a temporary `mode="ionian" as const`
default in `App.tsx`'s NoteMapView call site and remove it in Task 17 — but it's cleaner
to keep the change atomic.)

---

## Phase C — UI components

### Task 12: CSS token + Fretboard characteristic ring

**Files:**

- Modify: `src/index.css`
- Modify: `src/components/Fretboard/NoteCircle.tsx`
- Modify: `src/components/Fretboard/Fretboard.tsx`

- [ ] **Step 1: Add the CSS token**

Edit `src/index.css`. Inside the existing `@theme { ... }` block, in the "Theory roles"
section (after `--color-muted: #374151;`), add:

```css
--color-characteristic: #f5d76e; /* warm gold — distinct from R/3/5/7 palette */
```

- [ ] **Step 2: Update `NoteCircle` to render the ring**

Replace `src/components/Fretboard/NoteCircle.tsx` with:

```tsx
import type { NoteDisplayRole } from "../../theory/types";

const ROLE_COLORS: Record<NoteDisplayRole, string> = {
  root: "var(--color-root)",
  third: "var(--color-third)",
  fifth: "var(--color-fifth)",
  seventh: "var(--color-seventh)",
  scale: "var(--color-scale)",
  muted: "var(--color-muted)",
};

type NoteCircleProps = {
  cx: number;
  cy: number;
  note: string;
  role: NoteDisplayRole;
  isCharacteristic?: boolean;
};

export function NoteCircle({ cx, cy, note, role, isCharacteristic }: NoteCircleProps) {
  const color = ROLE_COLORS[role];
  const isMuted = role === "muted";
  const radius = isMuted ? 10 : 13;
  const fontSize = isMuted ? 9 : 11;
  // Ring radius sits 3px outside the fill circle; stroke 2px keeps it
  // readable but visually subordinate to the role color.
  const ringRadius = radius + 3;

  return (
    <g opacity={isMuted ? 0.4 : 1}>
      {isCharacteristic && (
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="var(--color-characteristic)"
          strokeWidth={2}
        />
      )}
      <circle cx={cx} cy={cy} r={radius} fill={color} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {note}
      </text>
    </g>
  );
}
```

- [ ] **Step 3: Pass `isCharacteristic` from Fretboard**

Edit `src/components/Fretboard/Fretboard.tsx`. Find the marker render block (currently
around lines 263-272):

```tsx
{
  markers.map((marker, i) => (
    <NoteCircle
      key={`${marker.string}-${marker.fret}-${marker.role}-${i}`}
      cx={fretCenterX(marker.fret)}
      cy={stringY(marker.string)}
      note={marker.note}
      role={marker.role}
    />
  ));
}
```

Replace with:

```tsx
{
  markers.map((marker, i) => (
    <NoteCircle
      key={`${marker.string}-${marker.fret}-${marker.role}-${i}`}
      cx={fretCenterX(marker.fret)}
      cy={stringY(marker.string)}
      note={marker.note}
      role={marker.role}
      isCharacteristic={marker.isCharacteristic}
    />
  ));
}
```

- [ ] **Step 4: Run lint + tests**

Run: `npm run lint && npm test` Expected: PASS. The change is purely additive; no test
should fail.

- [ ] **Step 5: Format and commit**

```bash
npx prettier --write src/index.css src/components/Fretboard/NoteCircle.tsx src/components/Fretboard/Fretboard.tsx
git add src/index.css src/components/Fretboard/NoteCircle.tsx src/components/Fretboard/Fretboard.tsx
git commit -m "feat(ui): render characteristic-tone ring on flagged note markers"
```

---

### Task 13: `ModeSelector` component

**Files:**

- Create: `src/components/ModeSelector.tsx`

- [ ] **Step 1: Create the component**

Write `src/components/ModeSelector.tsx`:

```tsx
import { MODES, type Mode } from "../theory/modes";

const MODE_LABELS: Record<Mode, string> = {
  ionian: "Ionian",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  aeolian: "Aeolian",
  locrian: "Locrian",
};

type ModeSelectorProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled?: boolean;
};

// Mirrors KeySelector's button-pill pattern. When the selected mode is
// non-Ionian, the active button uses an emphasized treatment so a glance at
// the header tells the user they're in a modal frame.
export function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <div
      className={`flex flex-wrap gap-1 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
      aria-disabled={disabled}
    >
      {MODES.map((m) => (
        <button
          key={m}
          onClick={() => onModeChange(m)}
          disabled={disabled}
          aria-pressed={mode === m}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
            mode === m
              ? mode === "ionian"
                ? "bg-surface-active text-fg-emphasis"
                : "bg-root text-fg-emphasis"
              : "bg-surface-raised text-fg-secondary hover:bg-surface-active"
          }`}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build + lint**

Run: `npm run lint` Expected: PASS — the component is self-contained.

- [ ] **Step 3: Format and commit**

```bash
npx prettier --write src/components/ModeSelector.tsx
git add src/components/ModeSelector.tsx
git commit -m "feat(ui): add ModeSelector header component"
```

---

### Task 14: `ScaleDisplay` — modal-aware

**Files:**

- Modify: `src/components/ScaleDisplay.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/components/ScaleDisplay.tsx` with:

```tsx
import type { AccidentalStyle } from "../theory/notes";
import { type DiatonicChord, type DiatonicTriad } from "../theory/scales";
import {
  getModalScaleNotes,
  MODE_DEGREE_LABELS,
  MODE_STEPS,
  type Mode,
} from "../theory/modes";
import { HIGHLIGHTABLE, roleFromChordTone } from "../theory/chordTones";
import { ALL_NOTES_KEY } from "./KeySelector";
import type { HighlightableRole } from "./Legend";

const ROLE_PILL_CLASSES: Record<HighlightableRole, string> = {
  root: "bg-root/20 border-root/40 text-fg-primary",
  third: "bg-third/20 border-third/40 text-fg-primary",
  fifth: "bg-fifth/20 border-fifth/40 text-fg-primary",
  seventh: "bg-seventh/20 border-seventh/40 text-fg-primary",
};

const NEUTRAL_PILL_CLASSES = "bg-surface-raised border-line text-fg-secondary";

const MODE_DISPLAY_NAME: Record<Mode, string> = {
  ionian: "major",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  aeolian: "Aeolian",
  locrian: "Locrian",
};

type ScaleDisplayProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  enabledRoles: Set<HighlightableRole>;
  mode: Mode;
};

export function ScaleDisplay({
  selectedKey,
  accidentalStyle,
  selectedChord,
  enabledRoles,
  mode,
}: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const notes = getModalScaleNotes(selectedKey, mode, accidentalStyle);
  const labels = MODE_DEGREE_LABELS[mode];
  const steps = MODE_STEPS[mode].slice(0, notes.length - 1);

  const gridStyle = {
    gridTemplateColumns: `auto repeat(${notes.length}, auto)`,
  };

  return (
    <div className="overflow-x-auto overflow-y-clip">
      <div
        className="inline-grid items-center gap-x-2 gap-y-1 text-sm"
        style={gridStyle}
      >
        <span
          className="text-xs text-fg-muted uppercase tracking-wide self-center"
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          {selectedKey} {MODE_DISPLAY_NAME[mode]}
        </span>
        {notes.map((note, i) => {
          let role = roleFromChordTone(note, selectedChord);
          if (HIGHLIGHTABLE.has(role) && !enabledRoles.has(role as HighlightableRole)) {
            role = "scale";
          }
          const isHighlighted = HIGHLIGHTABLE.has(role);
          const pillClasses = isHighlighted
            ? ROLE_PILL_CLASSES[role as HighlightableRole]
            : NEUTRAL_PILL_CLASSES;
          return (
            <div
              key={`pill-${i}-${note}`}
              className={`flex items-baseline gap-1 px-2 py-1 rounded border ${pillClasses}`}
              style={{ gridRow: 1, gridColumn: i + 2 }}
            >
              <span className="text-xs opacity-70">{labels[i]}</span>
              <span className="font-semibold">{note}</span>
            </div>
          );
        })}
        {steps.map((step, i) => (
          <span
            key={`step-${i}`}
            className="text-[10px] leading-none text-fg-faint text-center select-none"
            style={{ gridRow: 2, gridColumn: `${i + 2} / span 2` }}
            title={step === "half" ? "Half step" : "Whole step"}
          >
            {step === "half" ? "H" : "W"}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript catches the unforwarded prop**

Run: `npx tsc --noEmit` Expected: Error — `App.tsx` calls `<ScaleDisplay ... />` without
`mode`. Fix later in Task 17.

- [ ] **Step 3: Defer commit until Task 17**

Same rationale as Task 11 — don't ship a broken state. Continue to Task 15.

---

### Task 15: `DiatonicChords` — modal-aware

**Files:**

- Modify: `src/components/DiatonicChords.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/components/DiatonicChords.tsx` with:

```tsx
import type { AccidentalStyle } from "../theory/notes";
import { type ChordQuality, type TriadQuality } from "../theory/scales";
import {
  getModalDiatonicChords,
  getModalDiatonicTriads,
  type Mode,
} from "../theory/modes";
import { ALL_NOTES_KEY } from "./KeySelector";

export type ChordRowMode = "triads" | "sevenths";

type DiatonicChordsProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedDegree: number | null;
  onSelectDegree: (degree: number) => void;
  mode: ChordRowMode;
  onModeChange: (mode: ChordRowMode) => void;
  modalMode: Mode;
};

const QUALITY_ACCENT: Record<ChordQuality | TriadQuality, string> = {
  maj7: "border-line-emphasis bg-surface-raised",
  m7: "border-line bg-surface-raised",
  "7": "border-line bg-surface-raised",
  m7b5: "border-line bg-surface-raised",
  maj: "border-line-emphasis bg-surface-raised",
  min: "border-line bg-surface-raised",
  dim: "border-line bg-surface-raised",
};

const MODE_OPTIONS: { value: ChordRowMode; label: string }[] = [
  { value: "triads", label: "Triads" },
  { value: "sevenths", label: "Sevenths" },
];

export function DiatonicChords({
  selectedKey,
  accidentalStyle,
  selectedDegree,
  onSelectDegree,
  mode,
  onModeChange,
  modalMode,
}: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const chords =
    mode === "sevenths"
      ? getModalDiatonicChords(selectedKey, modalMode, accidentalStyle)
      : getModalDiatonicTriads(selectedKey, modalMode, accidentalStyle);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3 gap-4">
        <h2 className="text-sm text-fg-secondary uppercase tracking-wider font-semibold">
          Diatonic chords
        </h2>
        <div
          className="inline-flex rounded overflow-hidden border border-line"
          role="radiogroup"
          aria-label="Chord row mode"
        >
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={mode === opt.value}
              onClick={() => onModeChange(opt.value)}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                mode === opt.value
                  ? "bg-surface-active text-fg-emphasis"
                  : "bg-surface text-fg-muted hover:bg-surface-raised"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {chords.map((chord) => {
          const isSelected = selectedDegree === chord.degree;
          return (
            <button
              key={chord.degree}
              type="button"
              onClick={() => onSelectDegree(chord.degree)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-1.5 px-3 py-4 min-h-[6.5rem] rounded-xl border-2 shadow-lg cursor-pointer transition-colors ${
                isSelected
                  ? "border-line-selected bg-surface-active"
                  : `${QUALITY_ACCENT[chord.quality]} hover:border-line-hover`
              }`}
            >
              <span className="text-sm text-fg-muted font-mono font-semibold">
                {chord.romanNumeral}
              </span>
              <span className="text-xl font-bold text-fg-emphasis leading-none">
                {chord.symbol}
              </span>
              <span className="text-xs text-fg-secondary tracking-wider font-medium">
                {chord.notes.join(" – ")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Defer commit until Task 17**

App.tsx now needs to pass `modalMode` everywhere `DiatonicChords` is rendered. Continue
to Task 16.

---

## Phase D — Wiring + Scale Positions

### Task 16: `ScalePositionsView` — parent-major windows + label adjustment

**Files:**

- Modify: `src/views/ScalePositionsView.tsx`

- [ ] **Step 1: Replace the file**

Replace `src/views/ScalePositionsView.tsx` with:

```tsx
import { useMemo } from "react";
import {
  Fretboard,
  type OverlapZone,
  type PositionWindow,
} from "../components/Fretboard/Fretboard";
import { PositionToggles } from "../components/PositionToggles";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import type { HighlightableRole } from "../components/Legend";
import { buildChordToneMarkers } from "../theory/chordTones";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
} from "../theory/positions";
import type { AccidentalStyle } from "../theory/notes";
import type { DiatonicChord, DiatonicTriad } from "../theory/scales";
import { parentMajorOf, type Mode } from "../theory/modes";
import { type ScalePositionsControls } from "./useScalePositionsState";

type ScalePositionsViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
  controls: ScalePositionsControls;
  mode: Mode;
};

const EMPTY_KEY_MESSAGE = "Select a key to view scale positions.";

export function ScalePositionsView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
  startFret,
  endFret,
  controls,
  mode,
}: ScalePositionsViewProps) {
  const { selectedPositions, togglePosition, showContext, setShowContext } = controls;

  // CAGED windows are anchored to the parent major scale: when mode is non-
  // Ionian, position math runs on parentKey rather than selectedKey, so the
  // boxes frame fret regions where the modal scale actually lays.
  const parentKey = useMemo(
    () =>
      selectedKey === ALL_NOTES_KEY ? selectedKey : parentMajorOf(selectedKey, mode),
    [selectedKey, mode],
  );

  const positionsArray = useMemo(
    () => CAGED_POSITIONS.map((p) => p.id).filter((id) => selectedPositions.has(id)),
    [selectedPositions],
  );

  const positionWindows = useMemo<PositionWindow[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return CAGED_POSITIONS.filter((p) => selectedPositions.has(p.id)).flatMap((p) =>
      getPositionWindows(parentKey, p.id, startFret, endFret).map(
        ([low, high], octaveIndex) => ({
          id: `${p.id}-${octaveIndex}`,
          low,
          high,
          // Drop the C/A/G/E/D shape suffix in non-Ionian modes — the shape
          // names refer to major-scale fingering patterns and are misleading
          // in modal context. Just the position number remains useful.
          label: mode === "ionian" ? `${p.id} — ${p.shape}` : `${p.id}`,
        }),
      ),
    );
  }, [selectedKey, parentKey, selectedPositions, startFret, endFret, mode]);

  const overlapZones = useMemo<OverlapZone[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [];
    return computeOverlapZones(parentKey, positionsArray, startFret, endFret);
  }, [selectedKey, parentKey, positionsArray, startFret, endFret]);

  const markers = useMemo(
    () =>
      buildChordToneMarkers({
        key: selectedKey,
        chord: selectedChord,
        accidentalStyle,
        positions: positionsArray,
        showContext,
        enabledHighlights,
        startFret,
        endFret,
        mode,
      }),
    [
      selectedKey,
      selectedChord,
      accidentalStyle,
      positionsArray,
      showContext,
      enabledHighlights,
      startFret,
      endFret,
      mode,
    ],
  );

  if (selectedKey === ALL_NOTES_KEY) {
    return <div className="text-fg-faint text-center py-20">{EMPTY_KEY_MESSAGE}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-6">
        <PositionToggles selected={selectedPositions} onToggle={togglePosition} />
        <label className="inline-flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
          />
          Show context notes
        </label>
      </div>
      <Fretboard
        markers={markers}
        startFret={startFret}
        endFret={endFret}
        positionWindows={positionWindows}
        overlapZones={overlapZones}
        emptyMessage={
          selectedPositions.size === 0 ? "Toggle a position to begin." : undefined
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Defer commit — wire up in Task 17**

App.tsx still needs to pass `mode` to `ScalePositionsView`. Continue.

---

### Task 17: `App.tsx` — header refactor + mode state + wiring

**Files:**

- Modify: `src/App.tsx`

This task ships Tasks 11, 14, 15, 16 together as a single working state.

- [ ] **Step 1: Replace `App.tsx`**

Replace `src/App.tsx` with:

```tsx
import { useCallback, useMemo, useState } from "react";
import { AccidentalToggle } from "./components/AccidentalToggle";
import { FretRangeControl } from "./components/FretRangeControl";
import { KeySelector, ALL_NOTES_KEY } from "./components/KeySelector";
import { ModeSelector } from "./components/ModeSelector";
import { ViewSelector } from "./components/ViewSelector";
import { Legend, type HighlightableRole } from "./components/Legend";
import { ScaleDisplay } from "./components/ScaleDisplay";
import { DiatonicChords, type ChordRowMode } from "./components/DiatonicChords";
import { ChordShapesView } from "./views/ChordShapesView";
import { NoteMapView } from "./views/NoteMapView";
import { ScalePositionsView } from "./views/ScalePositionsView";
import { useChordShapesState } from "./views/useChordShapesState";
import { useScalePositionsState } from "./views/useScalePositionsState";
import type { AccidentalStyle } from "./theory/notes";
import { DEFAULT_END_FRET } from "./theory/constants";
import {
  getModalDiatonicChords,
  getModalDiatonicTriads,
  type Mode,
} from "./theory/modes";

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ["root", "third", "fifth", "seventh"];

const ENHARMONIC_KEY_SWAP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

function App() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [mode, setMode] = useState<Mode>("ionian");
  const [selectedView, setSelectedView] = useState("note-map");
  const [accidentalStyle, setAccidentalStyle] = useState<AccidentalStyle>("flat");
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  );
  const [selectedChordDegree, setSelectedChordDegree] = useState<number | null>(1);
  const [chordRowMode, setChordRowMode] = useState<ChordRowMode>("triads");
  const [startFret, setStartFret] = useState(0);
  const [endFret, setEndFret] = useState(DEFAULT_END_FRET);

  const chordShapesControls = useChordShapesState();
  const scalePositionsControls = useScalePositionsState();

  const handleFretRangeChange = useCallback((start: number, end: number) => {
    setStartFret(start);
    setEndFret(end);
  }, []);

  // Selected chord is computed against the (key, mode) pair so the chord
  // row's chord set reflects the modal scale's harmony. selectedChordDegree
  // persists across mode changes — the user's "I'm focused on the IV chord"
  // intent stays anchored to degree 4 even when the chord's symbol changes.
  const selectedChord = useMemo(() => {
    if (selectedChordDegree === null || selectedKey === ALL_NOTES_KEY) return null;
    const chords =
      chordRowMode === "sevenths"
        ? getModalDiatonicChords(selectedKey, mode, accidentalStyle)
        : getModalDiatonicTriads(selectedKey, mode, accidentalStyle);
    return chords[selectedChordDegree - 1] ?? null;
  }, [selectedChordDegree, chordRowMode, selectedKey, mode, accidentalStyle]);

  const handleChordSelect = useCallback((degree: number) => {
    setSelectedChordDegree((prev) => (prev === degree ? null : degree));
  }, []);

  const toggleHighlight = useCallback((role: HighlightableRole) => {
    setEnabledHighlights((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }, []);

  const handleAccidentalChange = useCallback((next: AccidentalStyle) => {
    setAccidentalStyle((prev) => {
      if (prev !== next) {
        setSelectedKey((prevKey) =>
          prevKey === ALL_NOTES_KEY
            ? prevKey
            : (ENHARMONIC_KEY_SWAP[prevKey] ?? prevKey),
        );
      }
      return next;
    });
  }, []);

  const isAllNotesKey = selectedKey === ALL_NOTES_KEY;

  return (
    <div className="min-h-screen bg-surface text-fg-primary">
      <header className="max-w-[90rem] mx-auto">
        {/* Top bar: title + global preferences (sharp/flat, fret range) */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-line">
          <h1 className="text-xl font-bold">Fretlab</h1>
          <div className="flex items-center gap-4">
            <AccidentalToggle
              accidentalStyle={accidentalStyle}
              onChange={handleAccidentalChange}
            />
            <FretRangeControl
              startFret={startFret}
              endFret={endFret}
              onChange={handleFretRangeChange}
            />
          </div>
        </div>

        {/* Focal-control row: tonal-center selectors */}
        <div className="px-4 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
            <div>
              <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">
                Key
              </label>
              <KeySelector
                selectedKey={selectedKey}
                accidentalStyle={accidentalStyle}
                onKeyChange={setSelectedKey}
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">
                Mode
              </label>
              <ModeSelector
                mode={mode}
                onModeChange={setMode}
                disabled={isAllNotesKey}
              />
            </div>
          </div>
          <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
          <ScaleDisplay
            selectedKey={selectedKey}
            accidentalStyle={accidentalStyle}
            selectedChord={selectedChord}
            enabledRoles={enabledHighlights}
            mode={mode}
          />
        </div>
      </header>

      <main className="max-w-[90rem] mx-auto px-4 pb-4">
        {selectedView === "note-map" && (
          <>
            <NoteMapView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={enabledHighlights}
              selectedChord={selectedChord}
              startFret={startFret}
              endFret={endFret}
              mode={mode}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
              mode={chordRowMode}
              onModeChange={setChordRowMode}
              modalMode={mode}
            />
          </>
        )}
        {selectedView === "scale-positions" && (
          <>
            <ScalePositionsView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={enabledHighlights}
              selectedChord={selectedChord}
              startFret={startFret}
              endFret={endFret}
              controls={scalePositionsControls}
              mode={mode}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
              mode={chordRowMode}
              onModeChange={setChordRowMode}
              modalMode={mode}
            />
          </>
        )}
        {selectedView === "chord-shapes" && (
          <>
            <ChordShapesView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              startFret={startFret}
              endFret={endFret}
              selectedChord={selectedChord}
              chordRowMode={chordRowMode}
              onChordRowModeChange={setChordRowMode}
              enabledHighlights={enabledHighlights}
              controls={chordShapesControls}
              modalMode={mode}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
              mode={chordRowMode}
              onModeChange={setChordRowMode}
              modalMode={mode}
            />
          </>
        )}
        {selectedView !== "note-map" &&
          selectedView !== "scale-positions" &&
          selectedView !== "chord-shapes" && (
            <div className="text-fg-faint text-center py-20">Coming soon</div>
          )}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Update `ChordShapesView` to accept and forward `modalMode`**

Edit `src/views/ChordShapesView.tsx`:

2a. Add the import to the existing import block:

```ts
import { type Mode } from "../theory/modes";
```

2b. Add `modalMode: Mode;` as the last field of `ChordShapesViewProps` (after
`controls: ChordShapesControls;`).

2c. Add `modalMode` to the destructured props in the function signature (the block at
the top of `ChordShapesView`):

```tsx
export function ChordShapesView({
  selectedKey,
  accidentalStyle,
  startFret,
  endFret,
  selectedChord,
  chordRowMode,
  onChordRowModeChange,
  enabledHighlights,
  controls,
  modalMode,
}: ChordShapesViewProps) {
```

2d. Replace both `buildChordShapeMarkers` calls inside the `markers` `useMemo`
(currently around lines 129-150) with versions that pass `modalMode`:

```tsx
const markers = useMemo(() => {
  if (!selectedChord) return [];
  if (mode === "triads") {
    return buildChordShapeMarkers({
      mode: "triads",
      modalMode,
      chord: selectedChord as DiatonicTriad,
      key: selectedKey,
      accidentalStyle,
      stringSets: Array.from(selectedStringSets),
      inversions: Array.from(selectedInversions),
      startFret,
      endFret,
    });
  }
  return buildChordShapeMarkers({
    mode: "sevenths",
    modalMode,
    voicingSystem: selectedVoicingSystem,
    chord: selectedChord as DiatonicChord,
    key: selectedKey,
    accidentalStyle,
    stringSets: activeSeventhStringSets,
    inversions: Array.from(selectedSeventhInversions),
    startFret,
    endFret,
  });
}, [
  mode,
  modalMode,
  selectedChord,
  selectedKey,
  accidentalStyle,
  selectedStringSets,
  selectedInversions,
  selectedVoicingSystem,
  activeSeventhStringSets,
  selectedSeventhInversions,
  startFret,
  endFret,
]);
```

(Add `modalMode` to the dependency array as shown.)

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit` Expected: PASS — every prop is forwarded.

- [ ] **Step 4: Connect to dev server and visually verify**

Start the dev server only if it isn't already running on `localhost:5173`. Per the
project's memory, never `pkill vite` — connect to whatever's already running.

```bash
# Check if dev server is up
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173
# If 000 / connection refused, run:
# npm run dev   (in a separate terminal — do NOT background here)
```

Manual checks (Mode = Ionian baseline):

- App loads with `mode = ionian` selected (Ionian button is the active "neutral" pill).
- Top bar shows `Fretlab` left-aligned, `♭/♯` and `Frets` right-aligned, divider
  underneath.
- Focal row shows `Key: ...` then
  `Mode: Ionian Dorian Phrygian Lydian Mixolydian Aeolian Locrian`.
- ScaleDisplay reads `C major` (the Ionian special-case label).
- Note Map / Scale Positions / Chord Shapes look identical to before this PR.

Manual checks (Mode = Dorian on key C):

- Click `Dorian` in the mode selector.
- ScaleDisplay reads `C Dorian`, pills show degree labels `1, 2, ♭3, 4, 5, 6, ♭7` over
  `C, D, Eb, F, G, A, Bb`.
- Diatonic chord row shows
  `i7 (Cm7), ii7 (Dm7), ♭IIImaj7 (Ebmaj7), IV7 (F7), v7 (Gm7), viø7 (Am7b5), ♭VIImaj7 (Bbmaj7)`
  (when sevenths mode is active).
- Switch to triads — row shows
  `i (Cm), ii (Dm), ♭III (Eb), IV (F), v (Gm), vi° (A°), ♭VII (Bb)`.
- Note Map: notes show only the C-Dorian set; `A` notes carry the gold characteristic
  ring; `E` notes are absent (replaced by `Eb`).
- Scale Positions with P1 selected: window sits at frets 0-3 (C major's P1, since C
  Dorian's parent is B♭ major... wait, C Dorian's parent is B♭ major and B♭ major's P1
  is at fret 1-4). Actually for C Dorian P1 visually anchors to the parent's CAGED.
  Verify the window spans cover B♭-major's C-shape window in the visible range.
- The `Mode` selector's active button is highlighted with the root-color treatment
  (active modal mode), distinct from Ionian's neutral active state.

Manual checks (Mode = Lydian on key C):

- Pick `Lydian`. ScaleDisplay reads `C Lydian`, labels include `♯4` over `F#`.
- The `F#` notes carry the characteristic ring on the fretboard.
- Diatonic row shows
  `Imaj7 (Cmaj7), II7 (D7), iii7 (Em7), ♯ivø7 (F#m7b5), Vmaj7 (Gmaj7), vi7 (Am7), vii7 (Bm7)`.

Manual checks (chord-degree persistence):

- With Mode = Ionian, click the IV card (Fmaj7) so degree 4 is selected.
- Switch to Dorian. The selected card is now IV7 (F7) — selection stayed at degree 4
  even though the chord changed.

Manual checks (All-Notes key disables ModeSelector):

- Pick `All` in the key selector. The mode selector is greyed out / non-interactive.

- [ ] **Step 5: Run lint, prettier, tests**

Run:

```bash
npx prettier --write src/App.tsx src/views/ScalePositionsView.tsx src/views/NoteMapView.tsx src/components/ScaleDisplay.tsx src/components/DiatonicChords.tsx src/views/ChordShapesView.tsx
npm run lint && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/views/ScalePositionsView.tsx src/views/NoteMapView.tsx src/components/ScaleDisplay.tsx src/components/DiatonicChords.tsx src/views/ChordShapesView.tsx
git commit -m "feat(view): wire global mode selector into all views

Adds the ModeSelector to a refactored two-zone header (top bar for global
preferences, focal row for key+mode), threads mode through NoteMapView,
ScalePositionsView, and ChordShapesView, and reanchors Scale Positions'
CAGED windows to the parent major scale in non-Ionian modes."
```

---

## Phase E — Documentation

### Task 18: Update vision doc + README

**Files:**

- Modify: `docs/design/2026-05-05-app-vision-and-view-designs.md`
- Modify: `README.md`

- [ ] **Step 1: Update vision doc**

Open `docs/design/2026-05-05-app-vision-and-view-designs.md`. Find the "Future: Modal
practice mode" section (search: `### Future: Modal practice mode`).

Replace its body (everything between the heading and the next `###`) with:

```markdown
### Future: Modal practice mode

Implemented. See
[`docs/superpowers/specs/2026-05-07-modal-practice-mode-design.md`](../superpowers/specs/2026-05-07-modal-practice-mode-design.md)
for the full design and
[`docs/superpowers/plans/2026-05-07-modal-practice-mode.md`](../superpowers/plans/2026-05-07-modal-practice-mode.md)
for the implementation plan.

Resolved decisions:

- **Placement:** global ModeSelector in the app header alongside the key selector. (Key,
  mode) is the global tonal-center state; defaults to `(selectedKey, ionian)`. Affects
  every view.
- **Chord-row interaction:** the chord row recomputes against the modal scale (e.g., C
  Dorian shows `i7, ii7, ♭IIImaj7, IV7, v7, viø7, ♭VIImaj7`). Selected chord degree
  persists across mode changes.
- **Mode picker:** explicit mode selector in the header, not inferred from the chord
  row.
- **CAGED framing:** in non-Ionian modes, position windows reanchor to the mode's parent
  major scale (e.g., C Dorian's windows use B♭ major's CAGED). Position labels drop the
  C/A/G/E/D shape suffix and show just `P1`-`P5`.
- **Characteristic-tones overlay:** subtle gold outer ring on every characteristic note
  (Dorian's ♮6, Lydian's ♯4, etc.). Always-on when `mode !== 'ionian'`; renders nothing
  for Ionian and Aeolian (the references).
```

- [ ] **Step 2: Add citations to README**

Open `README.md`. Append a new section at the end (or near a "References" / similar
section if one exists; otherwise as a final section before any footer):

```markdown
## Music-theory references

The modal-practice-mode design draws on these sources:

- [Mode (music) — Wikipedia](<https://en.wikipedia.org/wiki/Mode_(music)>)
- [Music Modes: Major and Minor — Berklee Online](https://online.berklee.edu/takenote/music-modes-major-and-minor/)
- [The Seven Modes — The Nandi Method](https://thenandimethod.com/lesson/the-seven-modes/)
- [Modal Schemas — Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/modal-schemas/)
- [Roman Numerals of Diatonic Seventh Chords — University of Puget Sound](https://musictheory.pugetsound.edu/mt21c/RomanNumeralsOfDiatonicSeventhChords.html)
```

- [ ] **Step 3: Format and commit**

```bash
npx prettier --write docs/design/2026-05-05-app-vision-and-view-designs.md README.md
git add docs/design/2026-05-05-app-vision-and-view-designs.md README.md
git commit -m "docs: record modal practice mode resolution in vision doc and README"
```

---

## Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm run lint && npm test` Expected: All tests pass; no lint errors.

- [ ] **Step 2: Visual smoke pass on the dev server**

Walk through each mode (Ionian → Dorian → … → Locrian) on key C and key F#, switching
between Note Map, Scale Positions (with P1+P3 selected), and Chord Shapes (sevenths,
drop-2 system). Verify:

- ScaleDisplay labels and notes match the canonical mode set.
- Chord row shows the expected modal symbols + Roman numerals.
- Characteristic notes carry the gold ring (and only the right notes).
- Scale Positions windows shift correctly when changing mode.
- Ionian behaves identically to pre-modal builds.

- [ ] **Step 3: Confirm git log shows the planned commit cadence**

Run: `git log --oneline -25`

Expected commit sequence (titles only, in order):

1. feat(theory): scaffold modes.ts with Mode type and constants
2. feat(theory): add getModalScaleNotes for parallel modal scales
3. feat(theory): add parentMajorOf for modal CAGED anchoring
4. feat(theory): add getModalIntervalRole for in-mode checks
5. feat(theory): add getCharacteristicNotes for modal flavor overlay
6. feat(theory): add getModalDiatonicTriads with modal Roman numerals
7. feat(theory): add getModalDiatonicChords with modal Roman numerals
8. feat(theory): add NoteMarker.isCharacteristic flag
9. feat(theory): make buildChordToneMarkers modal-aware
10. feat(theory): make buildChordShapeMarkers modal-aware
11. feat(ui): render characteristic-tone ring on flagged note markers
12. feat(ui): add ModeSelector header component
13. feat(view): wire global mode selector into all views
14. docs: record modal practice mode resolution in vision doc and README
