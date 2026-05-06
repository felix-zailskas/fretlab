# Configurable Fret Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick the visible fret range (`startFret`, `endFret`, defaults
`0..15`) globally from a header popover. Theory pipelines and the fretboard renderer
take the range as input and respect it.

**Architecture:** A new constant pair (`DEFAULT_END_FRET = 15`, `MAX_FRET = 24`)
replaces the single `FRET_COUNT`. App owns the `[startFret, endFret]` state and threads
it down to every view, every marker generator, and the fretboard renderer. Position
windows in Scale Positions become a multi-octave concept — two octaves of P1 can be
visible simultaneously when the range is wide.

**Tech Stack:** React 19, Vite, Vitest, Tailwind v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-05-06-configurable-fret-range-design.md`.

---

## File Structure

**New files:**

- `src/components/FretRangeControl.tsx` — header popover with two number inputs, Reset
  button, click-outside / Escape dismiss.

**Modified files:**

- `src/theory/constants.ts` — rename `FRET_COUNT` → `DEFAULT_END_FRET`, add `MAX_FRET`.
- `src/theory/positions.ts` — `getPositionWindow` → `getPositionWindows` (array).
  `isInPositionWindow` and `computeOverlapZones` take range. New multi-octave algorithm.
- `src/theory/positions.test.ts` — rewrite for the new array-returning API.
- `src/theory/chordTones.ts` — `BuildChordToneMarkersInput` gains `startFret`,
  `endFret`. Inner loop bounds use them.
- `src/theory/chordTones.test.ts` — every existing test passes the range explicitly; add
  a narrow-range case.
- `src/theory/chordShapes.ts` — both arms of `BuildChordShapeMarkersInput` gain
  `startFret`, `endFret`. `getRootFrets` and the position-fits check use them.
- `src/theory/chordShapes.test.ts` — every existing test passes the range explicitly;
  add narrow-range and wide-range cases.
- `src/components/Fretboard/Fretboard.tsx` — replace `fretCount` prop with
  `startFret`/`endFret`. Update coordinate math, fret-line rendering, fret labels,
  pre-nut zone conditional, position-window edge math.
- `src/components/Fretboard/FretMarkers.tsx` — extended inlay vocabulary (single dots at
  3, 5, 7, 9, 15, 17, 19, 21; double dots at 12, 24); range-aware filter.
- `src/App.tsx` — add `[startFret, endFret]` state and `setStartFret`, `setEndFret`
  callbacks. Render `<FretRangeControl />` in the header. Pass range to every view.
- `src/views/NoteMapView.tsx` — accept `startFret`/`endFret` props; use them in the
  inline fret iteration; pass them into `<Fretboard>`.
- `src/views/ScalePositionsView.tsx` — accept range props; pass them into
  `buildChordToneMarkers`, `getPositionWindows`, `computeOverlapZones`, and
  `<Fretboard>`. The `positionWindows` array now contains multiple entries per position
  when octaves repeat.
- `src/views/ChordShapesView.tsx` — accept range props; pass them into
  `buildChordShapeMarkers` and `<Fretboard>`.

---

## String-index conventions

Unchanged from existing code: `NoteMarker.string` is 0-indexed low E (0) to high E (5);
shape-data `string` field is 1-indexed high E (1) to low E (6). The marker-pipeline
conversion `markerStringIndex = 6 - shapeStringIndex` is unchanged.

---

## Range-coordinate conventions

Throughout this plan and the renderer:

- **Bounds are inclusive.** `[startFret, endFret] = [5, 12]` means notes at frets 5
  _and_ 12 are both visible.
- **`startFret = 0`** is the only value that exposes the pre-nut "open string" zone.
  `startFret > 0` replaces the nut graphic with a plain starting-boundary line at
  `nutX`.
- **`effectiveStart = Math.max(startFret - 1, 0)`** is the value used by the renderer
  for coordinate math so that `startFret = 0` keeps today's visual scale
  (`fretSpacing = boardWidth / endFret` when `startFret = 0`) and `startFret > 0` shows
  `endFret - startFret + 1` slots inside the board
  (`fretSpacing = boardWidth / (endFret - startFret + 1)`).

---

## Task 1: Rename `FRET_COUNT` → `DEFAULT_END_FRET`, add `MAX_FRET`

**Files:**

- Modify: `src/theory/constants.ts`
- Modify: `src/theory/positions.ts`, `src/theory/chordTones.ts`,
  `src/theory/chordShapes.ts`, `src/views/NoteMapView.tsx`,
  `src/views/ScalePositionsView.tsx`, `src/views/ChordShapesView.tsx`,
  `src/components/Fretboard/Fretboard.tsx`, `src/theory/positions.test.ts`

This is a pure rename + add. No behavior change.

- [ ] **Step 1: Update `constants.ts`**

Replace the entire file `src/theory/constants.ts`:

```ts
// Default highest fret rendered by the Fretboard. The user can override
// the visible range via FretRangeControl; this is just the default end.
export const DEFAULT_END_FRET = 15;

// Absolute UI ceiling — the longest commonly-built electric neck.
// FretRangeControl clamps endFret to this value.
export const MAX_FRET = 24;
```

- [ ] **Step 2: Find every importer and rename**

```bash
grep -rln "FRET_COUNT" src/
```

In each file listed (typically `chordShapes.ts`, `chordTones.ts`, `positions.ts`,
`NoteMapView.tsx`, `ScalePositionsView.tsx`, `ChordShapesView.tsx`, `Fretboard.tsx`,
`positions.test.ts`):

- Replace `import { FRET_COUNT } from ".../constants"` with
  `import { DEFAULT_END_FRET } from ".../constants"`.
- Replace every in-file usage `FRET_COUNT` with `DEFAULT_END_FRET`.

The renamed identifier behaves identically — same value, same semantics. Comments
referencing "FRET_COUNT" inside the source files are fine to leave as-is for this task;
they'll be revised when those files get range-aware behavior in later tasks.

- [ ] **Step 3: Lint, typecheck, full test suite**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green (no behavior change).

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/theory/constants.ts src/theory/positions.ts src/theory/chordTones.ts src/theory/chordShapes.ts src/theory/positions.test.ts src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx src/components/Fretboard/Fretboard.tsx
git add src/theory/constants.ts src/theory/positions.ts src/theory/chordTones.ts src/theory/chordShapes.ts src/theory/positions.test.ts src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx src/components/Fretboard/Fretboard.tsx
git commit -m "refactor(theory): rename FRET_COUNT to DEFAULT_END_FRET, add MAX_FRET"
```

---

## Task 2: `positions.ts` multi-octave API (TDD)

**Files:**

- Modify: `src/theory/positions.ts`
- Modify: `src/theory/positions.test.ts`
- Modify: `src/theory/chordTones.ts` (caller — adapt to new `isInPositionWindow`
  signature, hardcode `[0, DEFAULT_END_FRET]` for now)
- Modify: `src/views/ScalePositionsView.tsx` (caller — adapt to new `getPositionWindows`
  array return + new `computeOverlapZones` signature, hardcode `[0, DEFAULT_END_FRET]`
  for now)

The single-window `getPositionWindow(key, position)` becomes
`getPositionWindows(key, position, startFret, endFret)` returning an array of
fully-fitting octave windows. `isInPositionWindow` and `computeOverlapZones` take the
range too.

The intermediate state passes `[0, DEFAULT_END_FRET]` from callers — the App threads the
user range through in Task 8.

- [ ] **Step 1: Rewrite the failing tests**

Replace the body of `src/theory/positions.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindows,
  isInPositionWindow,
  type PositionId,
} from "./positions";
import { DEFAULT_END_FRET } from "./constants";

const ALL_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;
const ALL_POSITIONS: PositionId[] = ["P1", "P2", "P3", "P4", "P5"];

describe("CAGED_POSITIONS", () => {
  it("declares the 5 CAGED positions in the spec-defined order", () => {
    expect(CAGED_POSITIONS).toHaveLength(5);
    expect(CAGED_POSITIONS.map((p) => p.id)).toEqual(["P1", "P2", "P3", "P4", "P5"]);
    expect(CAGED_POSITIONS.map((p) => p.shape)).toEqual(["C", "A", "G", "E", "D"]);
    expect(CAGED_POSITIONS.map((p) => p.cMajorWindow)).toEqual([
      [0, 3],
      [2, 5],
      [4, 8],
      [7, 10],
      [9, 13],
    ]);
  });
});

describe("getPositionWindows — default range [0, DEFAULT_END_FRET]", () => {
  it("returns a single-octave array for each C-major position", () => {
    expect(getPositionWindows("C", "P1", 0, DEFAULT_END_FRET)).toEqual([[0, 3]]);
    expect(getPositionWindows("C", "P2", 0, DEFAULT_END_FRET)).toEqual([[2, 5]]);
    expect(getPositionWindows("C", "P3", 0, DEFAULT_END_FRET)).toEqual([[4, 8]]);
    expect(getPositionWindows("C", "P4", 0, DEFAULT_END_FRET)).toEqual([[7, 10]]);
    expect(getPositionWindows("C", "P5", 0, DEFAULT_END_FRET)).toEqual([[9, 13]]);
  });

  it("emits the wrapped octave when the natural window is past endFret (G major P4)", () => {
    // cMajorWindow [7, 10] + offset 7 = [14, 17]: doesn't fit in [0, 15].
    // Octave -1: [2, 5] fits.
    expect(getPositionWindows("G", "P4", 0, DEFAULT_END_FRET)).toEqual([[2, 5]]);
  });

  it("emits the wrapped octave when only the high edge spills (B major P3)", () => {
    expect(getPositionWindows("B", "P3", 0, DEFAULT_END_FRET)).toEqual([[3, 7]]);
  });

  it("emits the wrapped octave when the entire window is off-board (G major P5)", () => {
    expect(getPositionWindows("G", "P5", 0, DEFAULT_END_FRET)).toEqual([[4, 8]]);
  });

  it("produces only fully-fitting windows for every (key, position) pair in [0, DEFAULT_END_FRET]", () => {
    for (const key of ALL_KEYS) {
      for (const position of ALL_POSITIONS) {
        const windows = getPositionWindows(key, position, 0, DEFAULT_END_FRET);
        expect(windows.length).toBeGreaterThan(0);
        for (const [low, high] of windows) {
          expect(
            low >= 0 && low <= high && high <= DEFAULT_END_FRET,
            `key=${key} pos=${position} window=[${low},${high}]`,
          ).toBe(true);
        }
      }
    }
  });
});

describe("getPositionWindows — wider and narrower ranges", () => {
  it("emits two octaves of C major P1 in [0, 24]", () => {
    expect(getPositionWindows("C", "P1", 0, 24)).toEqual([
      [0, 3],
      [12, 15],
    ]);
  });

  it("emits a single octave of C major P1 in [0, 11] (octave-up doesn't fit)", () => {
    expect(getPositionWindows("C", "P1", 0, 11)).toEqual([[0, 3]]);
  });

  it("emits one octave of C major P5 in [0, 24] (octave-up [21, 25] doesn't fit fully)", () => {
    expect(getPositionWindows("C", "P5", 0, 24)).toEqual([[9, 13]]);
  });

  it("returns [] when no octave fits fully (C major P1 in [5, 11])", () => {
    expect(getPositionWindows("C", "P1", 5, 11)).toEqual([]);
  });
});

describe("isInPositionWindow", () => {
  it("returns true for frets inside any visible octave window", () => {
    // C major P3 in [0, 15] = [[4, 8]]
    expect(isInPositionWindow("C", "P3", 4, 0, DEFAULT_END_FRET)).toBe(true);
    expect(isInPositionWindow("C", "P3", 8, 0, DEFAULT_END_FRET)).toBe(true);
    expect(isInPositionWindow("C", "P3", 5, 0, DEFAULT_END_FRET)).toBe(true);
    expect(isInPositionWindow("C", "P3", 3, 0, DEFAULT_END_FRET)).toBe(false);
    expect(isInPositionWindow("C", "P3", 9, 0, DEFAULT_END_FRET)).toBe(false);
  });

  it("returns true for frets in the upper octave when both fit", () => {
    // C major P1 in [0, 24] = [[0, 3], [12, 15]]
    expect(isInPositionWindow("C", "P1", 0, 0, 24)).toBe(true);
    expect(isInPositionWindow("C", "P1", 13, 0, 24)).toBe(true);
    expect(isInPositionWindow("C", "P1", 7, 0, 24)).toBe(false);
  });

  it("returns false when no octave fits", () => {
    expect(isInPositionWindow("C", "P1", 5, 5, 11)).toBe(false);
  });
});

describe("computeOverlapZones", () => {
  it("returns the shared frets for two adjacent positions in C major default range", () => {
    // P1 [0,3], P2 [2,5] → overlap [2,3].
    const overlaps = computeOverlapZones("C", ["P1", "P2"], 0, DEFAULT_END_FRET);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].low).toBe(2);
    expect(overlaps[0].high).toBe(3);
  });

  it("returns no overlap for non-adjacent positions in C major default range", () => {
    const overlaps = computeOverlapZones("C", ["P1", "P3"], 0, DEFAULT_END_FRET);
    expect(overlaps).toEqual([]);
  });

  it("returns multiple overlap zones for three sequential positions", () => {
    // P1 [0,3], P2 [2,5], P3 [4,8] → P1∩P2=[2,3], P2∩P3=[4,5].
    const overlaps = computeOverlapZones("C", ["P1", "P2", "P3"], 0, DEFAULT_END_FRET);
    expect(overlaps).toHaveLength(2);
    const ranges = overlaps.map((o) => [o.low, o.high]).sort();
    expect(ranges).toEqual([
      [2, 3],
      [4, 5],
    ]);
  });

  it("considers all (octave × position) pairs in a wide range", () => {
    // C major in [0, 24]: P1 = [[0,3], [12,15]], P3 = [[4,8]].
    // P1∩P3 = empty for both P1 octaves.
    const overlaps = computeOverlapZones("C", ["P1", "P3"], 0, 24);
    expect(overlaps).toEqual([]);
  });

  it("returns no overlap for a single selected position", () => {
    expect(computeOverlapZones("C", ["P3"], 0, DEFAULT_END_FRET)).toEqual([]);
  });

  it("returns no overlap for an empty selection", () => {
    expect(computeOverlapZones("C", [], 0, DEFAULT_END_FRET)).toEqual([]);
  });

  it("produces a stable id for each pair (independent of input order)", () => {
    const a = computeOverlapZones("C", ["P1", "P2"], 0, DEFAULT_END_FRET);
    const b = computeOverlapZones("C", ["P2", "P1"], 0, DEFAULT_END_FRET);
    expect(a.map((o) => o.id).sort()).toEqual(b.map((o) => o.id).sort());
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/theory/positions.test.ts` Expected: FAIL — `getPositionWindows`
is not exported and the existing `isInPositionWindow`/`computeOverlapZones` signatures
don't match.

- [ ] **Step 3: Implement the new `positions.ts`**

Replace the body of `src/theory/positions.ts` with:

```ts
import { DEFAULT_END_FRET, MAX_FRET } from "./constants";
import { getNoteIndex } from "./notes";

export type PositionId = "P1" | "P2" | "P3" | "P4" | "P5";
export type CagedShape = "E" | "D" | "C" | "A" | "G";

export type FretWindow = readonly [low: number, high: number];

type PositionDef = {
  id: PositionId;
  shape: CagedShape;
  cMajorWindow: FretWindow;
};

// Anchored to C major. Shapes follow the canonical CAGED order ascending the
// neck from the open position in C major: C → A → G → E → D (then C again
// one octave up). Each shape's window is the fret span where its barre form
// sits for C major, derived by adding the shape's relative offset to its
// barre fret. Other keys are derived from these by getPositionWindows.
export const CAGED_POSITIONS: ReadonlyArray<PositionDef> = [
  { id: "P1", shape: "C", cMajorWindow: [0, 3] },
  { id: "P2", shape: "A", cMajorWindow: [2, 5] },
  { id: "P3", shape: "G", cMajorWindow: [4, 8] },
  { id: "P4", shape: "E", cMajorWindow: [7, 10] },
  { id: "P5", shape: "D", cMajorWindow: [9, 13] },
];

const C_INDEX = getNoteIndex("C");

function getKeyOffset(key: string): number {
  const idx = getNoteIndex(key);
  return (idx - C_INDEX + 12) % 12;
}

function lookup(position: PositionId): PositionDef {
  const def = CAGED_POSITIONS.find((p) => p.id === position);
  if (!def) {
    throw new Error(`Unknown position id: ${position}`);
  }
  return def;
}

// Returns every octave of the given (key, position) box that fits fully
// inside [startFret, endFret]. Octave shifts considered cover the entire
// MAX_FRET=24 range plus the wrap below the open position.
//
// The "fully inside" rule preserves the existing wrap-rule's principle of
// "no useless slivers" — a partially-visible window is dropped, not
// clipped. With wider user ranges, multiple octaves can be visible at
// once; with narrower user ranges, a position may yield zero windows
// (surfaces as empty state in the view).
export function getPositionWindows(
  key: string,
  position: PositionId,
  startFret: number,
  endFret: number,
): FretWindow[] {
  const { cMajorWindow } = lookup(position);
  const offset = getKeyOffset(key);
  const naturalLow = cMajorWindow[0] + offset;
  const naturalHigh = cMajorWindow[1] + offset;

  // Octave shifts -1..+2 cover [-12 below open] up to [+24 above],
  // sufficient for any cMajorWindow + key offset combination inside
  // [0, MAX_FRET].
  const result: FretWindow[] = [];
  for (let k = -1; k <= 2; k++) {
    const low = naturalLow + 12 * k;
    const high = naturalHigh + 12 * k;
    if (low >= startFret && high <= endFret) {
      result.push([low, high]);
    }
  }
  return result;
}

// Returns true if `fret` is inside ANY visible octave window for the given
// (key, position) box constrained by [startFret, endFret].
export function isInPositionWindow(
  key: string,
  position: PositionId,
  fret: number,
  startFret: number,
  endFret: number,
): boolean {
  return getPositionWindows(key, position, startFret, endFret).some(
    ([low, high]) => fret >= low && fret <= high,
  );
}

export type OverlapZone = {
  id: string;
  low: number;
  high: number;
};

// Computes pairwise overlaps between selected positions' visible octave
// windows. Each (positionA-octave × positionB-octave) intersection is
// emitted once if non-empty, with a stable id derived from the sorted
// position pair.
export function computeOverlapZones(
  key: string,
  positions: ReadonlyArray<PositionId>,
  startFret: number,
  endFret: number,
): OverlapZone[] {
  if (positions.length < 2) return [];

  const result: OverlapZone[] = [];
  for (let i = 0; i < positions.length; i++) {
    const aWindows = getPositionWindows(key, positions[i], startFret, endFret);
    for (let j = i + 1; j < positions.length; j++) {
      const bWindows = getPositionWindows(key, positions[j], startFret, endFret);
      for (const [aLow, aHigh] of aWindows) {
        for (const [bLow, bHigh] of bWindows) {
          const low = Math.max(aLow, bLow);
          const high = Math.min(aHigh, bHigh);
          if (low > high) continue;
          const [a, b] = [positions[i], positions[j]].sort();
          result.push({ id: `${a}-${b}`, low, high });
        }
      }
    }
  }
  return result;
}

// Re-export MAX_FRET so callers needing the absolute UI ceiling can pull it
// from this module alongside the position helpers.
export { MAX_FRET, DEFAULT_END_FRET };
```

- [ ] **Step 4: Update callers to the new APIs**

In `src/theory/chordTones.ts`, find the call:

```ts
const inWindow = positions.some((p) => isInPositionWindow(key, p, fret));
```

Replace with (hardcoded range — Task 3 threads the input through):

```ts
const inWindow = positions.some((p) =>
  isInPositionWindow(key, p, fret, 0, DEFAULT_END_FRET),
);
```

(Add `import { DEFAULT_END_FRET } from "./constants";` at the top if not already
present.)

In `src/views/ScalePositionsView.tsx`, find the import:

```ts
import {
  CAGED_POSITIONS,
  computeOverlapZones,
  getPositionWindow,
  type PositionId,
} from "../theory/positions";
```

Replace `getPositionWindow` with `getPositionWindows`.

Find the `positionWindows` memoized expression:

```ts
const positionWindows = useMemo<PositionWindow[]>(() => {
  if (selectedKey === ALL_NOTES_KEY) return [];
  return CAGED_POSITIONS.filter((p) => selectedPositions.has(p.id)).map((p) => {
    const [low, high] = getPositionWindow(selectedKey, p.id);
    return {
      id: p.id,
      low,
      high,
      label: `${p.id} — ${p.shape}`,
    };
  });
}, [selectedKey, selectedPositions]);
```

Replace with:

```ts
const positionWindows = useMemo<PositionWindow[]>(() => {
  if (selectedKey === ALL_NOTES_KEY) return [];
  return CAGED_POSITIONS.filter((p) => selectedPositions.has(p.id)).flatMap((p) =>
    getPositionWindows(selectedKey, p.id, 0, DEFAULT_END_FRET).map(
      ([low, high], octaveIndex) => ({
        id: `${p.id}-${octaveIndex}`,
        low,
        high,
        label: `${p.id} — ${p.shape}`,
      }),
    ),
  );
}, [selectedKey, selectedPositions]);
```

(The `octaveIndex` suffix on the `id` keeps React keys unique when a position renders
twice. Add `import { DEFAULT_END_FRET } from "../theory/constants";` if needed.)

Find the `overlapZones` memoized expression:

```ts
const overlapZones = useMemo<OverlapZone[]>(() => {
  if (selectedKey === ALL_NOTES_KEY) return [];
  return computeOverlapZones(selectedKey, positionsArray);
}, [selectedKey, positionsArray]);
```

Replace with:

```ts
const overlapZones = useMemo<OverlapZone[]>(() => {
  if (selectedKey === ALL_NOTES_KEY) return [];
  return computeOverlapZones(selectedKey, positionsArray, 0, DEFAULT_END_FRET);
}, [selectedKey, positionsArray]);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/theory/positions.test.ts` Expected: PASS — all position tests
green.

Run: `npm test` Expected: all green.

- [ ] **Step 6: Lint, typecheck**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 7: Commit**

```bash
npx prettier --write src/theory/positions.ts src/theory/positions.test.ts src/theory/chordTones.ts src/views/ScalePositionsView.tsx
git add src/theory/positions.ts src/theory/positions.test.ts src/theory/chordTones.ts src/views/ScalePositionsView.tsx
git commit -m "feat(positions): multi-octave windows with explicit fret range"
```

---

## Task 3: `chordTones.ts` range-aware pipeline

**Files:**

- Modify: `src/theory/chordTones.ts`
- Modify: `src/theory/chordTones.test.ts`
- Modify: `src/views/ScalePositionsView.tsx` (caller — pass hardcoded
  `[0, DEFAULT_END_FRET]` to `buildChordToneMarkers`)

`BuildChordToneMarkersInput` gains `startFret` and `endFret`. The inner loop uses them.
The `isInPositionWindow` call (added in Task 2) is updated to use the input's range
instead of hardcoded constants.

- [ ] **Step 1: Update `chordTones.test.ts` — pass range explicitly + add narrow-range
      test**

In `src/theory/chordTones.test.ts`, every existing call to
`buildChordToneMarkers({ ... })` gains `startFret: 0, endFret: DEFAULT_END_FRET` to the
input object. Add the import:

```ts
import { DEFAULT_END_FRET } from "./constants";
```

at the top of the test file if not already present.

After the existing tests, append a new describe block:

```ts
describe("buildChordToneMarkers — narrowed range", () => {
  it("emits no markers below startFret (C major, P1, range [5, 12])", () => {
    const markers = buildChordToneMarkers({
      key: "C",
      chord: null,
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 5,
      endFret: 12,
    });
    // P1 = C-shape window [0, 3] in C major. With startFret=5, that
    // window is fully outside the visible range, so no markers.
    expect(markers).toEqual([]);
  });

  it("only emits markers within [startFret, endFret] when at least one fits", () => {
    const markers = buildChordToneMarkers({
      key: "C",
      chord: null,
      accidentalStyle: "sharp",
      positions: ["P3"],
      showContext: false,
      enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
      startFret: 4,
      endFret: 8,
    });
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(4);
      expect(m.fret).toBeLessThanOrEqual(8);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/theory/chordTones.test.ts` Expected: FAIL —
`startFret`/`endFret` are not part of the input type yet, and the new narrow-range tests
fail because the loop still iterates `0..DEFAULT_END_FRET`.

- [ ] **Step 3: Update `chordTones.ts`**

In `src/theory/chordTones.ts`, change the input type:

```ts
export type BuildChordToneMarkersInput = {
  key: string;
  chord: DiatonicChord | DiatonicTriad | null;
  accidentalStyle: AccidentalStyle;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: Set<HighlightableRole>;
  startFret: number;
  endFret: number;
};
```

In the function body, destructure the new fields and use them:

```ts
export function buildChordToneMarkers({
  key,
  chord,
  accidentalStyle,
  positions,
  showContext,
  enabledHighlights,
  startFret,
  endFret,
}: BuildChordToneMarkersInput): NoteMarker[] {
  if (key === ALL_NOTES_KEY) return [];
  if (positions.length === 0) return [];

  const result: NoteMarker[] = [];

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
    const openString = STANDARD_TUNING[stringIndex];
    for (let fret = startFret; fret <= endFret; fret++) {
      const note = getNoteAtFret(openString, fret);
      const interval = getIntervalRole(key, note);
      if (interval === null) continue;

      const inWindow = positions.some((p) =>
        isInPositionWindow(key, p, fret, startFret, endFret),
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

      result.push({
        string: stringIndex,
        fret,
        note: getDisplayName(note, key, accidentalStyle),
        role,
      });
    }
  }

  return result;
}
```

The hardcoded `DEFAULT_END_FRET` import added in Task 2 is no longer needed in this file
(the range now comes from the input). If TypeScript flags it as unused, remove the
import.

- [ ] **Step 4: Update `ScalePositionsView.tsx`**

In `src/views/ScalePositionsView.tsx`, find the `markers` memoized
`buildChordToneMarkers` call:

```ts
const markers = useMemo(
  () =>
    buildChordToneMarkers({
      key: selectedKey,
      chord: selectedChord,
      accidentalStyle,
      positions: positionsArray,
      showContext,
      enabledHighlights,
    }),
  [
    selectedKey,
    selectedChord,
    accidentalStyle,
    positionsArray,
    showContext,
    enabledHighlights,
  ],
);
```

Replace with (hardcoded range — Task 8 threads the App's user range):

```ts
const markers = useMemo(
  () =>
    buildChordToneMarkers({
      key: selectedKey,
      chord: selectedChord,
      accidentalStyle,
      positions: positionsArray,
      showContext,
      enabledHighlights,
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    }),
  [
    selectedKey,
    selectedChord,
    accidentalStyle,
    positionsArray,
    showContext,
    enabledHighlights,
  ],
);
```

- [ ] **Step 5: Run tests, lint, typecheck**

Run: `npx vitest run src/theory/chordTones.test.ts` Expected: PASS.

Run: `npm test` Expected: all green.

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/theory/chordTones.ts src/theory/chordTones.test.ts src/views/ScalePositionsView.tsx
git add src/theory/chordTones.ts src/theory/chordTones.test.ts src/views/ScalePositionsView.tsx
git commit -m "feat(chordTones): pipeline takes startFret and endFret"
```

---

## Task 4: `chordShapes.ts` range-aware pipeline

**Files:**

- Modify: `src/theory/chordShapes.ts`
- Modify: `src/theory/chordShapes.test.ts`
- Modify: `src/views/ChordShapesView.tsx` (caller — pass hardcoded
  `[0, DEFAULT_END_FRET]`)

Both arms of `BuildChordShapeMarkersInput` gain `startFret` and `endFret`.
`getRootFrets` and the position-fits check use them. Existing tests pass the range
explicitly; new tests cover narrowed and widened ranges.

- [ ] **Step 1: Update `chordShapes.test.ts` — pass range explicitly + add new tests**

In `src/theory/chordShapes.test.ts`, every existing call to
`buildChordShapeMarkers({ ... })` gains `startFret: 0, endFret: DEFAULT_END_FRET` to the
input. Add `import { DEFAULT_END_FRET } from "./constants";` at the top.

After the existing pipeline tests, append:

```ts
describe("buildChordShapeMarkers — explicit range", () => {
  it("drops a chord whose only fitting placement falls below startFret", () => {
    // C major Triads, [4-5-6], root inv. With range [0, 15] the I (C)
    // chord's root sits at fret 8 on low E. With startFret=10, that
    // placement is below the visible range and the chord drops.
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversion: "root",
      startFret: 10,
      endFret: 15,
    });
    // I (C@8) drops; ii (D@10), iii (E@12), IV (F@13), V (G@15) still fit.
    const rootFrets = markers
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).not.toContain(8);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(10);
      expect(m.fret).toBeLessThanOrEqual(15);
    }
  });

  it("emits more chords when the range extends past 15", () => {
    // C major Triads, [4-5-6], root inv. In [0, 15] only I..V fit
    // (vi at 17 and vii° at 19 drop). In [0, 24] vi and vii° fit too.
    const wide = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversion: "root",
      startFret: 0,
      endFret: 24,
    });
    // Roots on low E: C(8), D(10), E(12), F(13), G(15), A(17), B(19).
    const rootFrets = wide
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).toEqual([8, 10, 12, 13, 15, 17, 19]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: FAIL — range fields
aren't part of the input shape.

- [ ] **Step 3: Update `chordShapes.ts`**

In `src/theory/chordShapes.ts`, change the input type's two arms:

```ts
export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversion: Inversion;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "shells";
      key: string;
      accidentalStyle: AccidentalStyle;
      rootStrings: ReadonlyArray<RootString>;
      startFret: number;
      endFret: number;
    };
```

Update `getRootFrets` to take and use the range:

```ts
function getRootFrets(
  targetNote: string,
  openStringNote: string,
  startFret: number,
  endFret: number,
): number[] {
  const baseFret = (getNoteIndex(targetNote) - getNoteIndex(openStringNote) + 12) % 12;
  const result: number[] = [];
  // Walk every octave of the target note that fits inside [startFret, endFret].
  for (let candidate = baseFret; candidate <= endFret; candidate += 12) {
    if (candidate >= startFret) result.push(candidate);
  }
  return result;
}
```

Update `placeChordsOnAnchor` to take the range and pass it through:

```ts
function placeChordsOnAnchor(
  chords: ReadonlyArray<ChordSource>,
  shapeLookup: ShapeLookup,
  key: string,
  accidentalStyle: AccidentalStyle,
  startFret: number,
  endFret: number,
): NoteMarker[] {
  const result: NoteMarker[] = [];
  let previousFret = startFret - 1;

  for (const chord of chords) {
    const shape = shapeLookup(chord.quality);
    if (!shape) continue;

    const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
    const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
    const rootNote = chord.notes[0];

    const candidateRootFrets = getRootFrets(
      rootNote,
      openAnchorNote,
      startFret,
      endFret,
    );

    for (const candidate of candidateRootFrets) {
      if (candidate <= previousFret) continue;

      const allFit = shape.positions.every((p) => {
        const absFret = candidate + p.fretOffset;
        return absFret >= startFret && absFret <= endFret;
      });
      if (!allFit) continue;

      for (const p of shape.positions) {
        const absFret = candidate + p.fretOffset;
        const markerString = shapeStringToMarkerString(p.string);
        const openNote = STANDARD_TUNING[markerString];
        const noteAtFret = getNoteAtFret(openNote, absFret);
        result.push({
          string: markerString,
          fret: absFret,
          note: getDisplayName(noteAtFret, key, accidentalStyle),
          role: p.role,
        });
      }
      previousFret = candidate;
      break;
    }
  }

  return result;
}
```

Update `buildChordShapeMarkers` to thread the range through:

```ts
export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[] {
  if (input.key === ALL_NOTES_KEY) return [];

  if (input.mode === "triads") {
    if (input.stringSets.length === 0) return [];
    const triads = getDiatonicTriads(input.key, input.accidentalStyle);
    const result: NoteMarker[] = [];
    for (const stringSet of input.stringSets) {
      const lookup: ShapeLookup = (q) =>
        (TRIAD_SHAPES[stringSet][input.inversion] as Record<string, TriadShape>)[q];
      result.push(
        ...placeChordsOnAnchor(
          triads,
          lookup,
          input.key,
          input.accidentalStyle,
          input.startFret,
          input.endFret,
        ),
      );
    }
    return result;
  }

  if (input.rootStrings.length === 0) return [];
  const chords = getDiatonicChords(input.key, input.accidentalStyle);
  const result: NoteMarker[] = [];
  for (const rootString of input.rootStrings) {
    const lookup: ShapeLookup = (q) =>
      (SHELL_SHAPES[rootString] as Record<string, ShellShape>)[q];
    result.push(
      ...placeChordsOnAnchor(
        chords,
        lookup,
        input.key,
        input.accidentalStyle,
        input.startFret,
        input.endFret,
      ),
    );
  }
  return result;
}
```

The `FRET_COUNT`-era reference in `chordShapes.ts` (renamed to `DEFAULT_END_FRET` in
Task 1) is no longer needed at runtime — remove the `DEFAULT_END_FRET` import if
TypeScript flags it as unused.

- [ ] **Step 4: Update `ChordShapesView.tsx`**

In `src/views/ChordShapesView.tsx`, find the `markers` memoized expression:

```ts
const markers = useMemo(() => {
  if (mode === "triads") {
    return buildChordShapeMarkers({
      mode: "triads",
      key: selectedKey,
      accidentalStyle,
      stringSets: Array.from(selectedStringSets),
      inversion,
    });
  }
  return buildChordShapeMarkers({
    mode: "shells",
    key: selectedKey,
    accidentalStyle,
    rootStrings: Array.from(selectedRootStrings),
  });
}, [...]);
```

Add `startFret: 0, endFret: DEFAULT_END_FRET` to both calls (and
`import { DEFAULT_END_FRET } from "../theory/constants";` if needed). Task 8 will
replace these with prop values.

- [ ] **Step 5: Run tests, lint, typecheck**

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: PASS.

Run: `npm test` Expected: all green.

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/theory/chordShapes.ts src/theory/chordShapes.test.ts src/views/ChordShapesView.tsx
git add src/theory/chordShapes.ts src/theory/chordShapes.test.ts src/views/ChordShapesView.tsx
git commit -m "feat(chordShapes): pipeline takes startFret and endFret"
```

---

## Task 5: `Fretboard.tsx` range-aware renderer

**Files:**

- Modify: `src/components/Fretboard/Fretboard.tsx`
- Modify: `src/views/NoteMapView.tsx`, `src/views/ScalePositionsView.tsx`,
  `src/views/ChordShapesView.tsx` (call sites pass `startFret={0}`,
  `endFret={DEFAULT_END_FRET}` for now — Task 8 threads the user range).

Replace the `fretCount` prop with `startFret` (default 0) and `endFret` (default
`DEFAULT_END_FRET`). Update coordinate math so `startFret = 0` preserves today's visual
scale exactly and `startFret > 0` shows `endFret - startFret + 1` slots inside the
board.

No unit tests for the renderer — manual verification in Task 9.

- [ ] **Step 1: Update `FretboardProps` and the renderer body**

In `src/components/Fretboard/Fretboard.tsx`:

Replace the import line for the constant:

```ts
import { DEFAULT_END_FRET } from "../../theory/constants";
```

Update the props type:

```ts
type FretboardProps = {
  markers: NoteMarker[];
  startFret?: number;
  endFret?: number;
  positionWindows?: ReadonlyArray<PositionWindow>;
  overlapZones?: ReadonlyArray<OverlapZone>;
};
```

Update the function signature and the derived geometry:

```ts
export function Fretboard({
  markers,
  startFret = 0,
  endFret = DEFAULT_END_FRET,
  positionWindows,
  overlapZones,
}: FretboardProps) {
  const boardTop = PADDING.top;
  const boardBottom = PADDING.top + (NUM_STRINGS - 1) * STRING_SPACING;
  const boardWidth = 900;

  // effectiveStart preserves the original "fretCount = endFret"
  // visual scale when startFret = 0 (the pre-nut zone is bonus,
  // outside boardWidth). When startFret > 0, slots startFret..endFret
  // fit fully inside boardWidth.
  const effectiveStart = Math.max(startFret - 1, 0);
  const visibleSlots = endFret - effectiveStart;
  const fretSpacing = boardWidth / visibleSlots;

  const nutX = PADDING.left;
  const totalWidth = PADDING.left + boardWidth + PADDING.right;
  const totalHeight = boardBottom + PADDING.bottom;

  function fretCenterX(fret: number): number {
    if (fret === 0 && startFret === 0) return nutX - 20;
    return nutX + (fret - effectiveStart - 0.5) * fretSpacing;
  }

  function fretX(fret: number): number {
    return nutX + (fret - effectiveStart - 0.5) * fretSpacing;
  }
  // ... existing stringY, windowLeftX, windowRightX, bracketPath helpers
```

Update `windowLeftX` and `windowRightX` to use `effectiveStart`:

```ts
function windowLeftX(low: number): number {
  if (low === 0 && startFret === 0) return nutX - 35;
  return nutX + (low - effectiveStart - 1) * fretSpacing;
}
function windowRightX(high: number): number {
  return nutX + (high - effectiveStart) * fretSpacing;
}
```

Update the fret-line rendering (the existing
`Array.from({ length: fretCount }, (_, i) => i + 1)` block). Two such blocks exist in
the file — one rendering fret-wires (around line 178), one rendering fret-number labels
(around line 202). Replace both:

```tsx
{
  /* Fret lines */
}
{
  Array.from(
    { length: endFret - effectiveStart },
    (_, i) => effectiveStart + i + 1,
  ).map((fret) => (
    <line
      key={fret}
      x1={nutX + (fret - effectiveStart) * fretSpacing}
      y1={boardTop - 10}
      x2={nutX + (fret - effectiveStart) * fretSpacing}
      y2={boardBottom + 10}
      stroke="var(--color-fret)"
      strokeWidth={1.5}
    />
  ));
}
```

```tsx
{
  /* Fret numbers */
}
{
  Array.from(
    { length: endFret - effectiveStart },
    (_, i) => effectiveStart + i + 1,
  ).map((fret) => (
    <text
      key={fret}
      x={fretX(fret)}
      y={boardBottom + 30}
      textAnchor="middle"
      fill="var(--color-scale)"
      fontSize={11}
      fontFamily="system-ui, sans-serif"
    >
      {fret}
    </text>
  ));
}
```

Update the nut rendering (around line 168) so it always draws a vertical line at `nutX`
but uses a thinner, neutral stroke when `startFret > 0`:

```tsx
{
  /* Nut (when startFret === 0) or starting boundary (when startFret > 0) */
}
<line
  x1={nutX}
  y1={boardTop - 10}
  x2={nutX}
  y2={boardBottom + 10}
  stroke={startFret === 0 ? "var(--color-fg-primary)" : "var(--color-fret)"}
  strokeWidth={startFret === 0 ? 4 : 1.5}
/>;
```

Update the `<FretMarkers ... />` call to pass the range (Task 6 implements the consumer
side):

```tsx
<FretMarkers
  fretX={fretX}
  boardTop={boardTop}
  boardBottom={boardBottom}
  startFret={startFret}
  endFret={endFret}
/>
```

- [ ] **Step 2: Update view call sites**

In each of `NoteMapView.tsx`, `ScalePositionsView.tsx`, `ChordShapesView.tsx`, find the
`<Fretboard ...` call. Replace `fretCount={DEFAULT_END_FRET}` (or
`fretCount={FRET_COUNT}` if the rename in Task 1 left any) with
`startFret={0} endFret={DEFAULT_END_FRET}`. Task 8 will replace the literals with prop
values.

NoteMapView's call (`src/views/NoteMapView.tsx`):

```tsx
return <Fretboard markers={markers} startFret={0} endFret={DEFAULT_END_FRET} />;
```

ScalePositionsView's call (`src/views/ScalePositionsView.tsx`):

```tsx
<Fretboard
  markers={markers}
  startFret={0}
  endFret={DEFAULT_END_FRET}
  positionWindows={positionWindows}
  overlapZones={overlapZones}
/>
```

ChordShapesView's call (`src/views/ChordShapesView.tsx`):

```tsx
<Fretboard markers={markers} startFret={0} endFret={DEFAULT_END_FRET} />
```

- [ ] **Step 3: Lint, typecheck, full test suite, build**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

Run: `npm run build` Expected: successful.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/components/Fretboard/Fretboard.tsx src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx
git add src/components/Fretboard/Fretboard.tsx src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx
git commit -m "feat(fretboard): replace fretCount with startFret/endFret"
```

---

## Task 6: `FretMarkers` extended inlay vocabulary + range filter

**Files:**

- Modify: `src/components/Fretboard/FretMarkers.tsx`

Add inlays at frets 17, 19, 21, and a double-dot at fret 24. Filter to
`[startFret, endFret]` so off-board inlays don't render.

- [ ] **Step 1: Replace `FretMarkers.tsx`**

Replace the entire file with:

```tsx
const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOT_FRETS = [12, 24];

type FretMarkersProps = {
  fretX: (fret: number) => number;
  boardTop: number;
  boardBottom: number;
  startFret: number;
  endFret: number;
};

export function FretMarkers({
  fretX,
  boardTop,
  boardBottom,
  startFret,
  endFret,
}: FretMarkersProps) {
  const midY = (boardTop + boardBottom) / 2;
  const dotOffset = (boardBottom - boardTop) / 5;

  const visibleSingles = SINGLE_DOT_FRETS.filter((f) => f >= startFret && f <= endFret);
  const visibleDoubles = DOUBLE_DOT_FRETS.filter((f) => f >= startFret && f <= endFret);

  return (
    <g>
      {visibleSingles.map((fret) => (
        <circle
          key={fret}
          cx={fretX(fret)}
          cy={midY}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />
      ))}
      {visibleDoubles.flatMap((fret) => [
        <circle
          key={`${fret}-top`}
          cx={fretX(fret)}
          cy={midY - dotOffset}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />,
        <circle
          key={`${fret}-bottom`}
          cx={fretX(fret)}
          cy={midY + dotOffset}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />,
      ])}
    </g>
  );
}
```

- [ ] **Step 2: Lint, typecheck, full test suite**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/components/Fretboard/FretMarkers.tsx
git add src/components/Fretboard/FretMarkers.tsx
git commit -m "feat(fretboard): extend inlay vocabulary up to fret 24"
```

---

## Task 7: `FretRangeControl` component

**Files:**

- Create: `src/components/FretRangeControl.tsx`

A header popover with two clamped number inputs and a Reset button. The component is
purely presentational — it receives the current range and a single
`onChange(start, end)` callback.

No unit tests (matches existing component convention; manual verification in Task 9).

- [ ] **Step 1: Create `FretRangeControl.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { DEFAULT_END_FRET, MAX_FRET } from "../theory/constants";

type FretRangeControlProps = {
  startFret: number;
  endFret: number;
  onChange: (startFret: number, endFret: number) => void;
};

function clamp(value: number, lo: number, hi: number): number {
  if (Number.isNaN(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

export function FretRangeControl({
  startFret,
  endFret,
  onChange,
}: FretRangeControlProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        e.target instanceof Node &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleStartChange(raw: number) {
    const next = clamp(raw, 0, MAX_FRET - 1);
    const e = next >= endFret ? Math.min(next + 1, MAX_FRET) : endFret;
    onChange(next, e);
  }

  function handleEndChange(raw: number) {
    const next = clamp(raw, startFret + 1, MAX_FRET);
    onChange(startFret, next);
  }

  function handleReset() {
    onChange(0, DEFAULT_END_FRET);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1.5 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Frets: {startFret}–{endFret} ▾
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Fret range"
          className="absolute right-0 top-full mt-2 z-10 w-56 p-4 rounded-lg border border-line bg-surface-raised shadow-lg space-y-3"
        >
          <label className="flex items-center justify-between gap-2 text-sm text-fg-secondary">
            <span>Start fret</span>
            <input
              type="number"
              min={0}
              max={MAX_FRET - 1}
              value={startFret}
              onChange={(e) => handleStartChange(Number(e.target.value))}
              className="w-16 px-2 py-1 rounded border border-line bg-surface text-fg-primary text-sm"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-fg-secondary">
            <span>End fret</span>
            <input
              type="number"
              min={startFret + 1}
              max={MAX_FRET}
              value={endFret}
              onChange={(e) => handleEndChange(Number(e.target.value))}
              className="w-16 px-2 py-1 rounded border border-line bg-surface text-fg-primary text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleReset}
            className="w-full px-3 py-1.5 rounded text-sm font-medium bg-surface text-fg-secondary hover:bg-surface-active cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Lint, typecheck**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/components/FretRangeControl.tsx
git add src/components/FretRangeControl.tsx
git commit -m "feat(ui): add FretRangeControl popover component"
```

---

## Task 8: App state + view threading

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/views/NoteMapView.tsx`, `src/views/ScalePositionsView.tsx`,
  `src/views/ChordShapesView.tsx`

Wire the user-controllable range through. App owns the state, renders the control,
passes the range to every view, and each view threads it into its pipeline calls and the
Fretboard.

- [ ] **Step 1: Update `App.tsx` — state + control + view props**

In `src/App.tsx`, add the import:

```ts
import { FretRangeControl } from "./components/FretRangeControl";
import { DEFAULT_END_FRET } from "./theory/constants";
```

Add state inside `App()` next to the other `useState` calls:

```ts
const [startFret, setStartFret] = useState(0);
const [endFret, setEndFret] = useState(DEFAULT_END_FRET);

const handleFretRangeChange = useCallback((start: number, end: number) => {
  setStartFret(start);
  setEndFret(end);
}, []);
```

Add `<FretRangeControl />` to the header next to `AccidentalToggle`. Find:

```tsx
<AccidentalToggle accidentalStyle={accidentalStyle} onChange={handleAccidentalChange} />
```

Replace with:

```tsx
<AccidentalToggle
  accidentalStyle={accidentalStyle}
  onChange={handleAccidentalChange}
/>
<FretRangeControl
  startFret={startFret}
  endFret={endFret}
  onChange={handleFretRangeChange}
/>
```

In each view rendering, add the range props:

```tsx
{
  selectedView === "note-map" && (
    <>
      <NoteMapView
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        enabledHighlights={enabledHighlights}
        selectedChord={selectedChord}
        startFret={startFret}
        endFret={endFret}
      />
      ...
    </>
  );
}
{
  selectedView === "scale-positions" && (
    <>
      <ScalePositionsView
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        enabledHighlights={enabledHighlights}
        selectedChord={selectedChord}
        startFret={startFret}
        endFret={endFret}
      />
      ...
    </>
  );
}
{
  selectedView === "chord-shapes" && (
    <ChordShapesView
      selectedKey={selectedKey}
      accidentalStyle={accidentalStyle}
      startFret={startFret}
      endFret={endFret}
    />
  );
}
```

- [ ] **Step 2: Update `NoteMapView.tsx`**

Add `startFret` and `endFret` to the props type:

```ts
type NoteMapViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
};
```

Destructure them in the function signature and use them in the inline fret iteration:

```tsx
export function NoteMapView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
  startFret,
  endFret,
}: NoteMapViewProps) {
  // ... existing logic, replacing 0 and DEFAULT_END_FRET in the loop:

  const markers = useMemo<NoteMarker[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return [...];
    const result: NoteMarker[] = [];
    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex];
      for (let fret = startFret; fret <= endFret; fret++) {
        // ... existing inner body unchanged
      }
    }
    return result;
  }, [selectedKey, accidentalStyle, enabledHighlights, selectedChord, startFret, endFret]);

  return (
    <Fretboard markers={markers} startFret={startFret} endFret={endFret} />
  );
}
```

The exact existing inner loop body in `NoteMapView` is preserved verbatim — only the
loop bounds and the dependency array change. Keep the current logic for the All Notes
branch (which iterates 0..DEFAULT_END_FRET); update it to use `startFret..endFret` so
that branch also respects the user range:

```ts
if (selectedKey === ALL_NOTES_KEY) {
  const result: NoteMarker[] = [];
  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
    const openString = STANDARD_TUNING[stringIndex];
    for (let fret = startFret; fret <= endFret; fret++) {
      const note = getNoteAtFret(openString, fret);
      result.push({
        string: stringIndex,
        fret,
        note: getDisplayName(note, "C", accidentalStyle),
        role: "scale",
      });
    }
  }
  return result;
}
```

(If the existing All Notes branch in `NoteMapView` differs from this shape, preserve its
logic verbatim and just change the iteration bounds and the memo dependency array.)

- [ ] **Step 3: Update `ScalePositionsView.tsx`**

Add `startFret` and `endFret` to the props type:

```ts
type ScalePositionsViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
};
```

Destructure them in the function signature, then replace the hardcoded ranges introduced
in earlier tasks with the prop values:

```ts
const positionWindows = useMemo<PositionWindow[]>(() => {
  if (selectedKey === ALL_NOTES_KEY) return [];
  return CAGED_POSITIONS.filter((p) => selectedPositions.has(p.id)).flatMap((p) =>
    getPositionWindows(selectedKey, p.id, startFret, endFret).map(
      ([low, high], octaveIndex) => ({
        id: `${p.id}-${octaveIndex}`,
        low,
        high,
        label: `${p.id} — ${p.shape}`,
      }),
    ),
  );
}, [selectedKey, selectedPositions, startFret, endFret]);

const overlapZones = useMemo<OverlapZone[]>(() => {
  if (selectedKey === ALL_NOTES_KEY) return [];
  return computeOverlapZones(selectedKey, positionsArray, startFret, endFret);
}, [selectedKey, positionsArray, startFret, endFret]);

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
  ],
);
```

And update the `<Fretboard>` call:

```tsx
<Fretboard
  markers={markers}
  startFret={startFret}
  endFret={endFret}
  positionWindows={positionWindows}
  overlapZones={overlapZones}
/>
```

The `DEFAULT_END_FRET` import added in earlier tasks is no longer needed in this view —
remove it if TypeScript flags it as unused.

- [ ] **Step 4: Update `ChordShapesView.tsx`**

Add `startFret` and `endFret` to the props type:

```ts
type ChordShapesViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  startFret: number;
  endFret: number;
};
```

Destructure them in the function signature, then replace the hardcoded ranges in
`buildChordShapeMarkers` calls with the prop values, and add `startFret, endFret` to the
memo dependency array:

```ts
const markers = useMemo(() => {
  if (mode === "triads") {
    return buildChordShapeMarkers({
      mode: "triads",
      key: selectedKey,
      accidentalStyle,
      stringSets: Array.from(selectedStringSets),
      inversion,
      startFret,
      endFret,
    });
  }
  return buildChordShapeMarkers({
    mode: "shells",
    key: selectedKey,
    accidentalStyle,
    rootStrings: Array.from(selectedRootStrings),
    startFret,
    endFret,
  });
}, [
  mode,
  selectedKey,
  accidentalStyle,
  selectedStringSets,
  selectedRootStrings,
  inversion,
  startFret,
  endFret,
]);
```

And update the `<Fretboard>` call:

```tsx
<Fretboard markers={markers} startFret={startFret} endFret={endFret} />
```

- [ ] **Step 5: Lint, typecheck, full test suite, build**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

Run: `npm run build` Expected: successful.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/App.tsx src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx
git add src/App.tsx src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx
git commit -m "feat(app): wire FretRangeControl through to all views"
```

---

## Task 9: Manual verification + final gate

**Files:** none (verification only).

- [ ] **Step 1: Final lint, typecheck, full test suite, build**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

Run: `npm run build` Expected: successful.

- [ ] **Step 2: Manual smoke — golden path**

Run: `npm run dev`. Open the app:

1. **Default state.** Range button shows `Frets: 0–15 ▾`. Note Map renders identically
   to before (frets 0–15, inlays at 3/5/7/9/12/15).
2. **Open the popover.** Two number inputs and a Reset button visible. Click outside the
   popover — it closes. Open it again, press Escape — it closes.
3. **Set Start fret = 5, End fret = 12.** Note Map: only frets 5–12 render on the board;
   no pre-nut/open notes; inlays at 5, 7, 9, 12 visible. Trigger button label updates to
   `Frets: 5–12 ▾`.
4. **Switch to Scale Positions.** Range persists. With key = C and selected positions =
   `{P3}`, the box `P3 — G` (frets 4–8) doesn't fully fit `[5, 12]` and disappears
   (empty-state overlay shows). Toggle on `P4` (frets 7–10) — it appears.
5. **Set End fret = 24, Start fret = 0.** Inlays at 15, 17, 19, 21, plus double-dot at
   24, visible. Switch to Scale Positions in C major, toggle `P1` — two octaves of
   `P1 — C` render (`[0, 3]` and `[12, 15]`), both bracket-labelled.
6. **Switch to Chord Shapes.** With Triads / `[1-2-3]` / Root inv in C major and
   end-fret 24, additional triad clusters appear above fret 15.
7. **Reset.** Click Reset in the popover — range returns to `[0, 15]`.
8. **Validation.** Try clearing the End fret field — input snaps back on blur. Try
   setting End fret = 30 — clamps to 24. Setting Start fret > End fret should not be
   reachable (the End fret input's `min` is `startFret + 1`, but if it does happen via
   paste, the handler clamps).
9. **Switch keys.** Change key from C to G with range `[0, 24]`. Markers update;
   multi-octave windows shift correctly.

Stop the dev server.

- [ ] **Step 3: No commit — manual verification only**

If any smoke step fails, fix the underlying issue in the corresponding task and re-run
the gate. Otherwise the work is done.

---

## Final verification gate

Before declaring done, run the full pre-commit gate one more time:

- [ ] `npm run lint` — clean
- [ ] `npx tsc -b` — clean
- [ ] `npm test` — all green
- [ ] `npm run build` — successful

If any of those fail, fix the underlying issue before claiming the work complete (per
the project CLAUDE.md: don't skip verification).
