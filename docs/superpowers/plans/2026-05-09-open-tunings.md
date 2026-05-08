# Open Tunings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Open G tuning support to NoteMap, with a tuning-aware data model that scales to future preset and custom tunings without further refactoring.

**Architecture:** A new `Tuning` data model (`src/theory/tuning.ts`) is the single source of truth for tuning identity, presets, and per-tuning view support. NoteMap is parameterized by `Tuning`; ScalePositions and ChordShapes are gated to standard tuning at the App level via disabled tabs. Adding a future preset or custom tuning is a one-row change to `TUNINGS` and `VIEWS_BY_TUNING`.

**Tech Stack:** React 19, TypeScript, Vitest, Tailwind v4, Vite.

**Spec:** [`docs/superpowers/specs/2026-05-09-open-tunings-design.md`](../specs/2026-05-09-open-tunings-design.md)

**Naming note:** the spec section "Threading" refers to a function `getChordTonePositions`. The actual function in `src/theory/chordTones.ts` is named `buildChordToneMarkers`. This plan uses the correct name. Behavior intent is unchanged.

---

## File Structure

**New files:**

- `src/views/types.ts` — `ViewId` type. One responsibility: name the set of top-level views.
- `src/theory/tuning.ts` — `Tuning`, `TuningId`, `TUNINGS`, `VIEWS_BY_TUNING`, `tuningSupportsView`. One responsibility: tuning identity + view-support lookup.
- `src/theory/tuning.test.ts` — tests for the tuning module.
- `src/components/TuningSelector.tsx` — the dropdown UI. One responsibility: present preset tunings to the user and emit `TuningId` selections.

**Modified files:**

- `src/theory/notes.ts` — add `ChromaticNote` type export; tighten `getNoteAtFret` return type; **delete** `STANDARD_TUNING`.
- `src/theory/notes.test.ts` — migrate `STANDARD_TUNING` import; add random-tuning property test.
- `src/theory/chordTones.ts` — add `tuning: Tuning` to `BuildChordToneMarkersInput`; replace `STANDARD_TUNING` loop with `tuning.strings`.
- `src/theory/chordTones.test.ts` — pass `TUNINGS.standard` in existing tests; add random-tuning property test.
- `src/theory/chordShapes.ts` — replace `STANDARD_TUNING` import with `TUNINGS.standard.strings` (this module is standard-only by design, but the global constant goes away).
- `src/views/NoteMapView.tsx` — accept `tuning: Tuning` prop; loop `tuning.strings`.
- `src/views/ScalePositionsView.tsx` — pass `tuning: TUNINGS.standard` into `buildChordToneMarkers`.
- `src/components/ViewSelector.tsx` — accept `disabledViews: ReadonlySet<ViewId>` prop; tighten types to `ViewId`; render disabled tabs with reduced opacity, `disabled`, `aria-disabled`, and `title`.
- `src/App.tsx` — `selectedView` becomes `useState<ViewId>`; add `tuningId` state with auto-fallback setter; render `TuningSelector` in top bar; convert view-rendering branch to an exhaustive switch.

---

## Phase 1: Tighten `ViewId` and `ChromaticNote` types

Pure type tightening with no behavior change. Establishes types that later phases depend on.

### Task 1: Add `ViewId` type

**Files:**
- Create: `src/views/types.ts`

- [ ] **Step 1: Create the file**

```ts
// src/views/types.ts
// Top-level view identifiers shown in ViewSelector. Single source of truth.
export type ViewId = "note-map" | "scale-positions" | "chord-shapes";
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run build`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/views/types.ts
git commit -m "feat(views): add ViewId type"
```

### Task 2: Tighten `ViewSelector` to `ViewId`

**Files:**
- Modify: `src/components/ViewSelector.tsx`

- [ ] **Step 1: Update `ViewSelector.tsx`**

Replace the file contents with:

```tsx
import type { ViewId } from "../views/types";

const VIEWS: ReadonlyArray<{ id: ViewId; label: string }> = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-shapes", label: "Chord Shapes" },
];

type ViewSelectorProps = {
  selectedView: ViewId;
  onViewChange: (view: ViewId) => void;
};

export function ViewSelector({ selectedView, onViewChange }: ViewSelectorProps) {
  const activeIndex = VIEWS.findIndex((v) => v.id === selectedView);
  return (
    <div
      className="relative grid grid-cols-3 max-w-md rounded border border-line"
      role="tablist"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 rounded bg-surface-active transition-transform duration-200 ease-out"
        style={{
          width: `${100 / VIEWS.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={selectedView === view.id}
          onClick={() => onViewChange(view.id)}
          className={`relative z-10 px-3 py-2.5 pointer-coarse:py-3 text-sm font-medium cursor-pointer ${
            selectedView === view.id
              ? "text-fg-emphasis"
              : "text-fg-muted hover:text-fg-secondary"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run build`
Expected: error in `App.tsx` because `useState("note-map")` is `useState<string>`, not `useState<ViewId>`. This is fixed in the next task.

### Task 3: Tighten `App.tsx` `selectedView` to `ViewId` + exhaustive switch

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update the import block in `App.tsx`**

Add to the existing imports:

```tsx
import type { ViewId } from "./views/types";
```

- [ ] **Step 2: Tighten the state declaration**

Change line 29:

```tsx
const [selectedView, setSelectedView] = useState("note-map");
```

to:

```tsx
const [selectedView, setSelectedView] = useState<ViewId>("note-map");
```

- [ ] **Step 3: Convert view-rendering branches to an exhaustive switch**

Replace the four `{selectedView === "..." && (...)}` blocks (lines 214-290) and the trailing fallback with a single function call. Above the `return`, add:

```tsx
function renderView(): React.ReactNode {
  switch (selectedView) {
    case "note-map":
      return (
        <>
          <NoteMapView
            selectedKey={selectedKey}
            accidentalStyle={accidentalStyle}
            enabledHighlights={enabledHighlights}
            onToggleRole={toggleHighlight}
            selectedChord={selectedChord}
            startFret={startFret}
            endFret={endFret}
            mode={mode}
          />
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
      );
    case "scale-positions":
      return (
        <>
          <ScalePositionsView
            selectedKey={selectedKey}
            accidentalStyle={accidentalStyle}
            enabledHighlights={enabledHighlights}
            onToggleRole={toggleHighlight}
            selectedChord={selectedChord}
            startFret={startFret}
            endFret={endFret}
            controls={scalePositionsControls}
            mode={mode}
          />
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
      );
    case "chord-shapes":
      return (
        <>
          <ChordShapesView
            selectedKey={selectedKey}
            accidentalStyle={accidentalStyle}
            startFret={startFret}
            endFret={endFret}
            selectedChord={selectedChord}
            chordRowMode={chordRowMode}
            enabledHighlights={enabledHighlights}
            onToggleRole={toggleHighlight}
            controls={chordShapesControls}
            modalMode={mode}
          />
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
      );
    default: {
      // Exhaustiveness check: adding a new ViewId without handling it here
      // is a compile error.
      const _exhaustive: never = selectedView;
      return _exhaustive;
    }
  }
}
```

Then replace the body of the `<main>` element with:

```tsx
<main
  id="main-content"
  tabIndex={-1}
  className="max-w-[90rem] mx-auto px-4 pb-4 focus:outline-none"
>
  {renderView()}
</main>
```

Add `import React from "react";` if needed (or use `import { type ReactNode } from "react"` and change return type to `ReactNode`). Note: existing `App.tsx` already imports React hooks but not the React namespace. Use the named-import style:

```tsx
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
```

and change `renderView(): React.ReactNode` to `renderView(): ReactNode`.

- [ ] **Step 4: Run lint, typecheck, tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev`
Open http://localhost:5173 (or attach to user's running instance). Click each of the three view tabs; verify each renders correctly. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/ViewSelector.tsx
git commit -m "refactor: tighten selectedView to ViewId and use exhaustive switch"
```

### Task 4: Export `ChromaticNote`; tighten `getNoteAtFret` return type

**Files:**
- Modify: `src/theory/notes.ts`

- [ ] **Step 1: Add the type export and tighten the return type**

In `src/theory/notes.ts`, after the `CHROMATIC_SCALE` declaration (around line 14), add:

```ts
// 12-tone chromatic note (sharp spelling). Derived from CHROMATIC_SCALE so
// the union stays in sync with the array.
export type ChromaticNote = (typeof CHROMATIC_SCALE)[number];
```

Then change the signature of `getNoteAtFret` (around line 42):

```ts
export function getNoteAtFret(openString: string, fret: number): string {
```

to:

```ts
export function getNoteAtFret(openString: string, fret: number): ChromaticNote {
```

The body already returns `CHROMATIC_SCALE[noteIndex]`, which TypeScript will now narrow correctly.

- [ ] **Step 2: Run typecheck**

Run: `npm run build`
Expected: pass. (The return type is a strict subtype of `string`; existing callers continue to typecheck.)

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/theory/notes.ts
git commit -m "refactor(notes): export ChromaticNote and tighten getNoteAtFret return type"
```

---

## Phase 2: Create the tuning module

Pure addition. Nothing imports it yet.

### Task 5: Write `tuning.ts` with TDD

**Files:**
- Create: `src/theory/tuning.ts`
- Create: `src/theory/tuning.test.ts`

- [ ] **Step 1: Write failing tests in `tuning.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  TUNINGS,
  VIEWS_BY_TUNING,
  tuningSupportsView,
  type TuningId,
} from "./tuning";
import type { ViewId } from "../views/types";

const ALL_TUNING_IDS: TuningId[] = ["standard", "open-g"];
const ALL_VIEW_IDS: ViewId[] = ["note-map", "scale-positions", "chord-shapes"];

describe("TUNINGS registry", () => {
  it("has an entry for every TuningId", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(TUNINGS[id]).toBeDefined();
      expect(TUNINGS[id].id).toBe(id);
    }
  });

  it("standard tuning is E A D G B E (low → high)", () => {
    expect(TUNINGS.standard.strings).toEqual(["E", "A", "D", "G", "B", "E"]);
  });

  it("open-g tuning is D G D G B D (low → high)", () => {
    expect(TUNINGS["open-g"].strings).toEqual(["D", "G", "D", "G", "B", "D"]);
  });

  it("each tuning has exactly 6 strings", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(TUNINGS[id].strings).toHaveLength(6);
    }
  });
});

describe("tuningSupportsView", () => {
  it("standard tuning supports every view", () => {
    for (const view of ALL_VIEW_IDS) {
      expect(tuningSupportsView("standard", view)).toBe(true);
    }
  });

  it("open-g tuning supports only note-map", () => {
    expect(tuningSupportsView("open-g", "note-map")).toBe(true);
    expect(tuningSupportsView("open-g", "scale-positions")).toBe(false);
    expect(tuningSupportsView("open-g", "chord-shapes")).toBe(false);
  });
});

describe("VIEWS_BY_TUNING", () => {
  it("has an entry for every TuningId", () => {
    for (const id of ALL_TUNING_IDS) {
      expect(VIEWS_BY_TUNING[id]).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `npx vitest run src/theory/tuning.test.ts`
Expected: FAIL — `Cannot find module './tuning'`.

- [ ] **Step 3: Implement `tuning.ts`**

```ts
// src/theory/tuning.ts
import type { ChromaticNote } from "./notes";
import type { ViewId } from "../views/types";

export type TuningId = "standard" | "open-g";

// A tuning is its open-string notes ordered low-pitch → high-pitch (string 6
// → string 1 in standard guitar nomenclature).
export type Tuning = {
  id: TuningId;
  name: string;
  strings: readonly [
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
  ];
};

// Single source of truth for all preset tunings. Keying by TuningId means the
// compiler enforces that every id has a definition and vice-versa.
export const TUNINGS: Record<TuningId, Tuning> = {
  standard: {
    id: "standard",
    name: "Standard",
    strings: ["E", "A", "D", "G", "B", "E"],
  },
  "open-g": {
    id: "open-g",
    name: "Open G",
    strings: ["D", "G", "D", "G", "B", "D"],
  },
};

// Per-tuning view support. Adding a tuning = add a row. Adding a view = touch
// each row's set. Compiler enforces both.
export const VIEWS_BY_TUNING: Record<TuningId, ReadonlySet<ViewId>> = {
  standard: new Set<ViewId>(["note-map", "scale-positions", "chord-shapes"]),
  "open-g": new Set<ViewId>(["note-map"]),
};

// The only predicate any view-gating logic should need.
export function tuningSupportsView(tuningId: TuningId, view: ViewId): boolean {
  return VIEWS_BY_TUNING[tuningId].has(view);
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx vitest run src/theory/tuning.test.ts`
Expected: all pass.

- [ ] **Step 5: Run lint, typecheck, full tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/theory/tuning.ts src/theory/tuning.test.ts
git commit -m "feat(theory): add tuning module with Open G preset"
```

---

## Phase 3: Generalize the theory layer; delete `STANDARD_TUNING`

Parameterize `buildChordToneMarkers`. Migrate NoteMapView, ScalePositionsView, chordShapes.ts, and tests to the new model. Delete `STANDARD_TUNING`. Add random-tuning property tests.

### Task 6: Add `tuning` parameter to `buildChordToneMarkers`

**Files:**
- Modify: `src/theory/chordTones.ts`
- Modify: `src/theory/chordTones.test.ts`
- Modify: `src/views/ScalePositionsView.tsx`

- [ ] **Step 1: Update the existing tests in `chordTones.test.ts` to pass `tuning`**

In `src/theory/chordTones.test.ts`, add to the imports at the top:

```ts
import { TUNINGS } from "./tuning";
```

Then in every `buildChordToneMarkers({ ... })` call (12 occurrences in the file), add a `tuning: TUNINGS.standard,` line. Example, the first occurrence:

```ts
const markers = buildChordToneMarkers({
  tuning: TUNINGS.standard,
  key: "C",
  // ... existing fields
});
```

Use a single search/replace mental model: every input object literal passed to `buildChordToneMarkers` gets `tuning: TUNINGS.standard,` added. Apply consistently to all 12 occurrences.

- [ ] **Step 2: Run tests; verify they fail**

Run: `npx vitest run src/theory/chordTones.test.ts`
Expected: FAIL — TypeScript error or runtime error because `tuning` isn't on the input type yet.

- [ ] **Step 3: Update `chordTones.ts`**

In `src/theory/chordTones.ts`:

Replace this import block:

```ts
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
```

with:

```ts
import {
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import type { Tuning } from "./tuning";
```

Then add `tuning` to `BuildChordToneMarkersInput`:

```ts
export type BuildChordToneMarkersInput = {
  tuning: Tuning;
  key: string;
  // ... rest unchanged
};
```

Add `tuning` to the destructured args in the function signature:

```ts
export function buildChordToneMarkers({
  tuning,
  key,
  chord,
  // ... rest unchanged
}: BuildChordToneMarkersInput): NoteMarker[] {
```

Replace the `STANDARD_TUNING` loop. Find this line:

```ts
for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
  const openString = STANDARD_TUNING[stringIndex];
```

with:

```ts
for (let stringIndex = 0; stringIndex < tuning.strings.length; stringIndex++) {
  const openString = tuning.strings[stringIndex];
```

- [ ] **Step 4: Update `ScalePositionsView.tsx`**

In `src/views/ScalePositionsView.tsx`, find the import for `buildChordToneMarkers` and add `TUNINGS`:

```ts
import { buildChordToneMarkers } from "../theory/chordTones";
import { TUNINGS } from "../theory/tuning";
```

Then in the `buildChordToneMarkers({ ... })` call at line 93, add `tuning: TUNINGS.standard,` as the first field.

- [ ] **Step 5: Run tests; verify they pass**

Run: `npm test`
Expected: all pass (including all `buildChordToneMarkers` tests now passing `tuning: TUNINGS.standard`).

- [ ] **Step 6: Commit**

```bash
git add src/theory/chordTones.ts src/theory/chordTones.test.ts src/views/ScalePositionsView.tsx
git commit -m "refactor(chordTones): parameterize buildChordToneMarkers by tuning"
```

### Task 7: Migrate `NoteMapView` to take `tuning` prop

**Files:**
- Modify: `src/views/NoteMapView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `NoteMapView.tsx`**

In `src/views/NoteMapView.tsx`:

Replace the import:

```ts
import {
  STANDARD_TUNING,
  getNoteAtFret,
  getNoteIndex,
  getDisplayName,
  type AccidentalStyle,
} from "../theory/notes";
```

with:

```ts
import {
  getNoteAtFret,
  getNoteIndex,
  getDisplayName,
  type AccidentalStyle,
} from "../theory/notes";
import type { Tuning } from "../theory/tuning";
```

Add `tuning` to `NoteMapViewProps`:

```ts
type NoteMapViewProps = {
  tuning: Tuning;
  selectedKey: string;
  // ... rest unchanged
};
```

Add `tuning` to the destructured props in the component:

```ts
export function NoteMapView({
  tuning,
  selectedKey,
  // ... rest unchanged
}: NoteMapViewProps) {
```

Replace the loop. Find these lines (around 52-53):

```ts
for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
  const openString = STANDARD_TUNING[stringIndex];
```

with:

```ts
for (let stringIndex = 0; stringIndex < tuning.strings.length; stringIndex++) {
  const openString = tuning.strings[stringIndex];
```

Add `tuning` to the `useMemo` dependency array:

```ts
}, [
  tuning,
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
  startFret,
  endFret,
  mode,
]);
```

- [ ] **Step 2: Update `App.tsx` to pass `tuning`**

In `src/App.tsx`, add to imports:

```ts
import { TUNINGS } from "./theory/tuning";
```

In the `case "note-map":` of `renderView()`, add `tuning={TUNINGS.standard}` as the first prop on `<NoteMapView ... />`. (The actual `tuningId` state is added in Phase 4; for this task we hardcode `TUNINGS.standard` to keep behavior identical.)

- [ ] **Step 3: Run lint, typecheck, tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/views/NoteMapView.tsx src/App.tsx
git commit -m "refactor(note-map): accept tuning as a prop"
```

### Task 8: Migrate `chordShapes.ts` off the global `STANDARD_TUNING`

**Files:**
- Modify: `src/theory/chordShapes.ts`

- [ ] **Step 1: Replace the import**

In `src/theory/chordShapes.ts`, find this import (line 3):

```ts
import {
  STANDARD_TUNING,
  // ... other imports
} from "./notes";
```

Remove `STANDARD_TUNING` from the import list. Then add a new import line:

```ts
import { TUNINGS } from "./tuning";
```

Replace the two usages (lines 668 and 682). Find:

```ts
const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
```

with:

```ts
const openAnchorNote = TUNINGS.standard.strings[anchorMarkerString];
```

And find:

```ts
const openNote = STANDARD_TUNING[markerString];
```

with:

```ts
const openNote = TUNINGS.standard.strings[markerString];
```

Also update the comment on line 635 that references `STANDARD_TUNING`:

```ts
// STANDARD_TUNING.
```

becomes:

```ts
// TUNINGS.standard.strings.
```

- [ ] **Step 2: Run tests**

Run: `npm test -- chordShapes`
Expected: all pass (chord-shape behavior unchanged; same data, different access path).

- [ ] **Step 3: Commit**

```bash
git add src/theory/chordShapes.ts
git commit -m "refactor(chordShapes): use TUNINGS.standard.strings instead of global"
```

### Task 9: Migrate `notes.test.ts` off `STANDARD_TUNING` and add random-tuning test

**Files:**
- Modify: `src/theory/notes.test.ts`

- [ ] **Step 1: Update the import**

In `src/theory/notes.test.ts`, replace:

```ts
import {
  getNoteIndex,
  getNoteAtFret,
  getDisplayName,
  naturalAccidentalForKey,
  STANDARD_TUNING,
} from "./notes";
```

with:

```ts
import {
  CHROMATIC_SCALE,
  getNoteIndex,
  getNoteAtFret,
  getDisplayName,
  naturalAccidentalForKey,
} from "./notes";
import { TUNINGS } from "./tuning";
```

(Note: `CHROMATIC_SCALE` is needed for the random-tuning test.)

- [ ] **Step 2: Update the existing fret-12 invariant test**

Find this block (around line 67):

```ts
it("wraps around correctly at fret 12", () => {
  // Fret 12 = same note as open string
  for (const openString of STANDARD_TUNING) {
    expect(getNoteAtFret(openString, 12)).toBe(openString);
  }
});
```

Replace with:

```ts
it("wraps around correctly at fret 12 for standard tuning", () => {
  for (const openString of TUNINGS.standard.strings) {
    expect(getNoteAtFret(openString, 12)).toBe(openString);
  }
});

it("wraps around correctly at fret 12 for any open-string note", () => {
  // Property: getNoteAtFret(s, 12) === s for every chromatic note s.
  // If a function regresses to assuming a fixed tuning, this fails.
  for (const openString of CHROMATIC_SCALE) {
    expect(getNoteAtFret(openString, 12)).toBe(openString);
  }
});

it("wraps around correctly at fret 12 for randomized tunings", () => {
  // Seeded LCG so failures are reproducible.
  let seed = 0x517cc1b7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (let iter = 0; iter < 20; iter++) {
    const tuning = Array.from(
      { length: 6 },
      () => CHROMATIC_SCALE[Math.floor(rand() * CHROMATIC_SCALE.length)],
    );
    for (const openString of tuning) {
      expect(getNoteAtFret(openString, 12)).toBe(openString);
    }
  }
});
```

- [ ] **Step 3: Run the test file**

Run: `npx vitest run src/theory/notes.test.ts`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/theory/notes.test.ts
git commit -m "test(notes): replace STANDARD_TUNING import; add random-tuning property test"
```

### Task 10: Add random-tuning property test to `chordTones.test.ts`

**Files:**
- Modify: `src/theory/chordTones.test.ts`

- [ ] **Step 1: Add the property test**

In `src/theory/chordTones.test.ts`, first ensure these imports exist at the top of the file (add any that are missing — `getNoteIndex` is likely already imported indirectly via the existing tests, but make it explicit here):

```ts
import { CHROMATIC_SCALE, getNoteAtFret, getNoteIndex } from "./notes";
import type { Tuning } from "./tuning";
```

Then append the following `describe` block at the end of the file:

```ts
describe("buildChordToneMarkers — tuning-agnostic invariant", () => {
  // Seeded LCG so failures are reproducible.
  function makeRandom(seed: number) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0x100000000;
    };
  }

  function randomTuning(rand: () => number): Tuning {
    const pick = () =>
      CHROMATIC_SCALE[Math.floor(rand() * CHROMATIC_SCALE.length)];
    return {
      id: "standard", // any TuningId; the predicate doesn't read this field
      name: "Random",
      strings: [pick(), pick(), pick(), pick(), pick(), pick()],
    };
  }

  it("every emitted marker maps back to its open-string note via getNoteAtFret", () => {
    // Universal property: regardless of tuning, the (string, fret) returned by
    // buildChordToneMarkers must encode a note consistent with the tuning's
    // open string at that index. Catches any silent regression to a hardcoded
    // tuning.
    const rand = makeRandom(0xc001cafe);
    for (let iter = 0; iter < 20; iter++) {
      const tuning = randomTuning(rand);
      const markers = buildChordToneMarkers({
        tuning,
        key: "C",
        chord: null,
        accidentalStyle: "sharp",
        positions: ["P1", "P2", "P3", "P4", "P5"],
        showContext: true,
        enabledHighlights: new Set(["root", "third", "fifth", "seventh"]),
        startFret: 0,
        endFret: 12,
      });
      for (const m of markers) {
        const openString = tuning.strings[m.string];
        const expectedAtFret = getNoteAtFret(openString, m.fret);
        // m.note may be re-spelled (sharp/flat) for display; compare via
        // chromatic index for enharmonic equivalence.
        expect(getNoteIndex(m.note)).toBe(getNoteIndex(expectedAtFret));
      }
    }
  });
});
```

- [ ] **Step 2: Run the test file**

Run: `npx vitest run src/theory/chordTones.test.ts`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/theory/chordTones.test.ts
git commit -m "test(chordTones): add random-tuning property test"
```

### Task 11: Delete the global `STANDARD_TUNING` constant

**Files:**
- Modify: `src/theory/notes.ts`

- [ ] **Step 1: Confirm no remaining references**

Run: `grep -rn "STANDARD_TUNING" src/`
Expected: only the definition line in `src/theory/notes.ts`.

If any other references exist, fix them first by switching to `TUNINGS.standard.strings`.

- [ ] **Step 2: Delete the constant**

In `src/theory/notes.ts`, remove the line:

```ts
export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"] as const;
```

- [ ] **Step 3: Run lint, typecheck, full tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/theory/notes.ts
git commit -m "refactor(notes): remove STANDARD_TUNING; use TUNINGS.standard"
```

---

## Phase 4: App-level tuning state with auto-fallback

State plumbing only; no UI yet. Default stays `"standard"`. Verify by temporarily flipping the default.

### Task 12: Add `tuningId` state and `setTuningId` with auto-fallback

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add imports**

In `src/App.tsx`, replace the existing tuning import line:

```ts
import { TUNINGS } from "./theory/tuning";
```

with:

```ts
import { TUNINGS, tuningSupportsView, type TuningId } from "./theory/tuning";
```

- [ ] **Step 2: Add `tuningId` state and wrapped setter**

After the `selectedView` `useState` line:

```tsx
const [selectedView, setSelectedView] = useState<ViewId>("note-map");
```

add:

```tsx
const [tuningId, setTuningIdRaw] = useState<TuningId>("standard");

// When switching to a tuning that doesn't support the active view, fall
// back to note-map. Co-located with the setter (not in a useEffect) so
// behavior is local to the user's action and there's no transient frame
// where a disabled tab is selected.
const setTuningId = useCallback(
  (nextId: TuningId) => {
    setTuningIdRaw(nextId);
    if (!tuningSupportsView(nextId, selectedView)) {
      setSelectedView("note-map");
    }
  },
  [selectedView],
);
```

- [ ] **Step 3: Pass the dynamic tuning to `NoteMapView`**

In `renderView()`, in the `case "note-map":` block, change:

```tsx
<NoteMapView
  tuning={TUNINGS.standard}
  ...
/>
```

to:

```tsx
<NoteMapView
  tuning={TUNINGS[tuningId]}
  ...
/>
```

- [ ] **Step 4: Run lint, typecheck, tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 5: Manual verification**

Temporarily change the default state from `useState<TuningId>("standard")` to `useState<TuningId>("open-g")`. Run `npm run dev`. Verify:
- NoteMap fretboard now reflects D-G-D-G-B-D when key=G major: open strings 6, 4, 1 should show G's chord-tone scale role highlighting consistent with the new tuning.
- Click ScalePositions or ChordShapes tabs: they should still render (gating UI comes in Phase 5; no fallback wired through `setTuningId` because we haven't called it from anywhere yet — the initial state goes straight in).

Switch the default back to `"standard"`. Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): add tuningId state with auto-fallback view setter"
```

---

## Phase 5: UI

### Task 13: Add `disabledViews` to `ViewSelector`

**Files:**
- Modify: `src/components/ViewSelector.tsx`

- [ ] **Step 1: Update `ViewSelector.tsx`**

Replace the file with:

```tsx
import type { ViewId } from "../views/types";

const VIEWS: ReadonlyArray<{ id: ViewId; label: string }> = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-shapes", label: "Chord Shapes" },
];

const DISABLED_TOOLTIP: Record<ViewId, string> = {
  "note-map": "",
  "scale-positions": "Available in standard tuning only — uses the CAGED system.",
  "chord-shapes": "Available in standard tuning only — uses jazz voicing systems.",
};

type ViewSelectorProps = {
  selectedView: ViewId;
  onViewChange: (view: ViewId) => void;
  disabledViews?: ReadonlySet<ViewId>;
};

export function ViewSelector({
  selectedView,
  onViewChange,
  disabledViews,
}: ViewSelectorProps) {
  const activeIndex = VIEWS.findIndex((v) => v.id === selectedView);
  return (
    <div
      className="relative grid grid-cols-3 max-w-md rounded border border-line"
      role="tablist"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 rounded bg-surface-active transition-transform duration-200 ease-out"
        style={{
          width: `${100 / VIEWS.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {VIEWS.map((view) => {
        const isDisabled = disabledViews?.has(view.id) ?? false;
        const isSelected = selectedView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            title={isDisabled ? DISABLED_TOOLTIP[view.id] : undefined}
            onClick={() => onViewChange(view.id)}
            className={`relative z-10 px-3 py-2.5 pointer-coarse:py-3 text-sm font-medium ${
              isDisabled
                ? "text-fg-faint opacity-50 cursor-not-allowed"
                : isSelected
                  ? "text-fg-emphasis cursor-pointer"
                  : "text-fg-muted hover:text-fg-secondary cursor-pointer"
            }`}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Pass `disabledViews` from `App.tsx`**

In `src/App.tsx`, find:

```tsx
<ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
```

Replace with:

```tsx
<ViewSelector
  selectedView={selectedView}
  onViewChange={setSelectedView}
  disabledViews={disabledViewsForCurrentTuning}
/>
```

Above the `return`, add:

```tsx
const disabledViewsForCurrentTuning = useMemo<ReadonlySet<ViewId>>(() => {
  const all: ViewId[] = ["note-map", "scale-positions", "chord-shapes"];
  return new Set(all.filter((v) => !tuningSupportsView(tuningId, v)));
}, [tuningId]);
```

- [ ] **Step 3: Run lint, typecheck, tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ViewSelector.tsx src/App.tsx
git commit -m "feat(view-selector): support disabled tabs with tooltip"
```

### Task 14: Add `TuningSelector` component

**Files:**
- Create: `src/components/TuningSelector.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/TuningSelector.tsx
import { TUNINGS, type TuningId } from "../theory/tuning";

type TuningSelectorProps = {
  tuningId: TuningId;
  onTuningChange: (id: TuningId) => void;
};

const TUNING_IDS: TuningId[] = ["standard", "open-g"];

export function TuningSelector({ tuningId, onTuningChange }: TuningSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-fg-muted">
      <span className="uppercase tracking-wide text-xs">Tuning</span>
      <select
        value={tuningId}
        onChange={(e) => onTuningChange(e.target.value as TuningId)}
        className="rounded border border-line bg-surface text-fg-primary px-2 py-1 pointer-coarse:py-2 cursor-pointer"
      >
        {TUNING_IDS.map((id) => (
          <option key={id} value={id}>
            {TUNINGS[id].name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Render it in `App.tsx`**

In `src/App.tsx`:

Add the import:

```ts
import { TuningSelector } from "./components/TuningSelector";
```

In the top-bar preferences group (the inner `<div className="flex items-center gap-4">` around line 149), insert the `TuningSelector` between `ThemeToggle` and `FretRangeControl`:

```tsx
<AccidentalToggle
  accidentalStyle={accidentalStyle}
  onChange={(style) => dispatchTonal({ type: "set-accidental", style })}
/>
<ThemeToggle mode={themeMode} onCycle={cycleTheme} />
<TuningSelector tuningId={tuningId} onTuningChange={setTuningId} />
<FretRangeControl
  startFret={startFret}
  endFret={endFret}
  onChange={handleFretRangeChange}
/>
```

- [ ] **Step 3: Run lint, typecheck, tests**

Run: `npm run lint && npm run build && npm test`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/TuningSelector.tsx src/App.tsx
git commit -m "feat(app): add tuning selector to top bar"
```

---

## Phase 6: Manual verification and final QA

### Task 15: Run the manual verification checklist

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or attach to user's running localhost:5173 — see CLAUDE.md memory).

- [ ] **Step 2: Verify each checklist item**

In the browser:

1. **Default behavior unchanged.** Page loads on Note Map with Standard tuning. All three tabs are enabled. Fretboard shows E-A-D-G-B-E.
2. **Switch tuning while on Note Map.** Open the Tuning selector → choose Open G. Fretboard re-renders. With key=G major: open strings 6, 4, 1 (D's) and string 5 (G) and string 2 (B) all sit on chord-tone roles consistent with G major.
3. **Tabs gate correctly.** With Open G active: Scale Positions and Chord Shapes tabs are visibly dimmed, unclickable, hovering shows the tooltip ("Available in standard tuning only…"). Note Map remains clickable and active.
4. **Auto-fallback works.** Switch tuning back to Standard. Click Chord Shapes. Now switch tuning to Open G: view auto-falls back to Note Map. (If the user was on Scale Positions, same behavior.)
5. **Switching back re-enables tabs.** With Open G + Note Map: switch tuning to Standard. All three tabs re-enable. Click Scale Positions: it renders normally, in standard tuning.
6. **Accessibility check.** Hover Scale Positions while in Open G: tooltip surfaces. Inspect: `aria-disabled="true"` on the disabled buttons.

- [ ] **Step 3: Run the full pre-commit gauntlet**

Run: `npm run lint && npx prettier --write . && npm test`
Expected: lint passes; prettier may reformat (commit any changes); tests pass.

- [ ] **Step 4: If prettier reformatted anything, commit**

```bash
git status
# If files changed:
git add -u
git commit -m "style: prettier"
```

- [ ] **Step 5: Final summary check**

Run: `git log --oneline main..HEAD`
Expected: a clean linear history of one commit per task. No commits with "WIP", "fix", or amended messages.

---

## Self-review

Spec coverage:

- ✅ `Tuning`, `TuningId`, `TUNINGS` — Task 5.
- ✅ `VIEWS_BY_TUNING`, `tuningSupportsView` — Task 5.
- ✅ Open G preset — Task 5.
- ✅ `STANDARD_TUNING` deletion — Task 11.
- ✅ `ChromaticNote` type + `getNoteAtFret` return tightening — Task 4.
- ✅ `ViewId` type + exhaustive switch — Tasks 1-3.
- ✅ `buildChordToneMarkers` parameterization — Task 6.
- ✅ NoteMap accepts `tuning` prop — Task 7.
- ✅ `chordShapes.ts` migration off `STANDARD_TUNING` — Task 8.
- ✅ Random-tuning property tests — Tasks 9, 10.
- ✅ `tuningId` App state with auto-fallback — Task 12.
- ✅ `TuningSelector` UI — Task 14.
- ✅ `ViewSelector` disabled-tab behavior with tooltip — Task 13.
- ✅ Manual verification — Task 15.

No placeholders. Type names consistent across tasks (`Tuning`, `TuningId`, `ChromaticNote`, `ViewId`, `tuningSupportsView`, `TUNINGS`, `VIEWS_BY_TUNING`, `setTuningId`, `setTuningIdRaw`, `disabledViewsForCurrentTuning` all match across files).
