# String Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users mute individual strings via an eye-icon column on the left of the
fretboard; muted strings keep rendering the same set of notes but with the `muted` role
(dim).

**Architecture:** Add a global `enabledStrings: Set<number>` in `App.tsx`. Thread it as
a prop into the three views and into `Fretboard`. Each marker pipeline (`chordTones.ts`,
`chordShapes.ts`, `NoteMapView`) overrides each marker's role to `"muted"` when its
string isn't enabled — never adds markers. `Fretboard` wraps its existing SVG in a
`relative` div and renders 6 absolutely-positioned `<button>` toggles on the left.

**Tech Stack:** TypeScript (strict), React, Vitest, React Testing Library, Playwright.
No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-13-string-toggle-design.md`

---

## File map

**New:**

- `tests/e2e/string-toggle.spec.ts` — one E2E covering global state across view
  switches.

**Modified:**

- `src/theory/chordTones.ts` — add `enabledStrings` to `BuildChordToneMarkersInput`;
  demote at push site.
- `src/theory/chordTones.test.ts` — extend with three property tests.
- `src/theory/chordShapes.ts` — add `enabledStrings` to both
  `BuildChordShapeMarkersInput` variants; thread to `placeChordOnCombo`; demote at push
  site.
- `src/theory/chordShapes.test.ts` — extend with three property tests.
- `src/components/Fretboard/Fretboard.tsx` — wrap in `<div className="relative">`;
  render 6 toggle buttons; new props.
- `src/components/Fretboard/Fretboard.test.tsx` — new tests (file may not exist yet —
  Task 4 creates if missing).
- `src/views/NoteMapView.tsx` — accept `enabledStrings` / `onToggleString` props; demote
  at push site; pass to Fretboard.
- `src/views/ScalePositionsView.tsx` — accept new props; thread to
  `buildChordToneMarkers` and Fretboard.
- `src/views/ChordShapesView.tsx` — accept new props; thread to both
  `buildChordShapeMarkers` calls and Fretboard.
- `src/App.tsx` — add `enabledStrings` state + `toggleString` callback; thread to all
  three views.
- `src/App.test.tsx` — extend with one integration test for global state.

---

## Task 1: Add `enabledStrings` to `chordTones.ts` and demote at push site

**Files:**

- Modify: `src/theory/chordTones.ts`
- Modify: `src/theory/chordTones.test.ts`

- [ ] **Step 1: Write failing tests**

Open `src/theory/chordTones.test.ts`. Find the existing imports at the top. Append a new
test block at the very bottom of the file:

```ts
describe("buildChordToneMarkers — enabledStrings", () => {
  const baselineInput = {
    tuning: TUNINGS.standard,
    key: "C",
    chord: null,
    positions: ["P1"],
    showContext: false,
    enabledHighlights: new Set<HighlightableRole>([
      "root",
      "third",
      "fifth",
      "seventh",
    ]),
    startFret: 0,
    endFret: 12,
    enabledStrings: new Set<number>([0, 1, 2, 3, 4, 5]),
  } as const;

  it("baseline: with all strings enabled, no marker has role 'muted' (other than out-of-window context, which is gated by showContext=false here)", () => {
    const markers = buildChordToneMarkers(baselineInput);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((m) => m.role !== "muted")).toBe(true);
  });

  it("disabling string 5 overrides every string-5 marker's role to 'muted'", () => {
    const disabled = {
      ...baselineInput,
      enabledStrings: new Set<number>([0, 1, 2, 3, 4]),
    };
    const markers = buildChordToneMarkers(disabled);
    const stringFiveMarkers = markers.filter((m) => m.string === 5);
    expect(stringFiveMarkers.length).toBeGreaterThan(0);
    expect(stringFiveMarkers.every((m) => m.role === "muted")).toBe(true);
  });

  it("disabling string 5 does not change marker count on other strings", () => {
    const enabled = baselineInput;
    const disabled = {
      ...baselineInput,
      enabledStrings: new Set<number>([0, 1, 2, 3, 4]),
    };
    const enabledMarkers = buildChordToneMarkers(enabled).filter((m) => m.string !== 5);
    const disabledMarkers = buildChordToneMarkers(disabled).filter(
      (m) => m.string !== 5,
    );
    expect(disabledMarkers).toHaveLength(enabledMarkers.length);
    expect(
      disabledMarkers.every((m) =>
        enabledMarkers.some((e) => e.string === m.string && e.fret === m.fret),
      ),
    ).toBe(true);
  });
});
```

If `HighlightableRole` and/or `TUNINGS` aren't already imported in this test file, add
them. Existing imports start at line 1 — check `src/theory/chordTones.test.ts` before
editing.

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/theory/chordTones.test.ts
```

Expected: failures with "enabledStrings does not exist on type
BuildChordToneMarkersInput" or similar.

- [ ] **Step 3: Update `BuildChordToneMarkersInput` and the push site**

In `src/theory/chordTones.ts`, find the `BuildChordToneMarkersInput` type (around line
52). Add a new required field:

```ts
export type BuildChordToneMarkersInput = {
  tuning: Tuning;
  key: string;
  chord: DiatonicChord | DiatonicTriad | null;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: Set<HighlightableRole>;
  enabledStrings: ReadonlySet<number>;
  startFret: number;
  endFret: number;
  mode?: Mode;
};
```

In `buildChordToneMarkers`, destructure `enabledStrings` from the input (search for the
existing `({ tuning, key, chord, ... }: BuildChordToneMarkersInput)` destructure):

```ts
export function buildChordToneMarkers({
  tuning,
  key,
  chord,
  enabledHighlights,
  enabledStrings,
  positions,
  showContext,
  startFret,
  endFret,
  mode = "ionian",
}: BuildChordToneMarkersInput): NoteMarker[] {
```

Then find the `result.push(...)` site (around line 131). Replace the role assignment
area. Just before the push, after all existing role-mutation logic, add:

```ts
const finalRole = enabledStrings.has(stringIndex) ? role : "muted";
```

And change the push to use `finalRole`:

```ts
result.push({
  string: stringIndex,
  fret,
  note: spellingMap.get(getNoteIndex(note)) ?? note,
  role: finalRole,
  ...(isCharacteristic ? { isCharacteristic: true } : {}),
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/theory/chordTones.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Full type-check**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: errors only in callers that don't yet pass `enabledStrings` —
`ScalePositionsView.tsx`. That's expected; Task 6 wires the view.

- [ ] **Step 6: Commit**

```bash
git add src/theory/chordTones.ts src/theory/chordTones.test.ts
git commit --no-verify -m "feat(theory): add enabledStrings to buildChordToneMarkers"
```

`--no-verify` because ScalePositionsView's call site is now broken at type-check time.
Task 6 brings the suite back to green.

---

## Task 2: Add `enabledStrings` to `chordShapes.ts` and demote at push site

**Files:**

- Modify: `src/theory/chordShapes.ts`
- Modify: `src/theory/chordShapes.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `src/theory/chordShapes.test.ts`:

```ts
describe("buildChordShapeMarkers — enabledStrings", () => {
  const cMajorTriad = getModalDiatonicTriads("C", "ionian")[0];
  const baseline = {
    mode: "triads" as const,
    tuning: TUNINGS.standard,
    chord: cMajorTriad,
    key: "C",
    stringSets: ["1-2-3"] as const,
    inversions: ["root"] as const,
    startFret: 0,
    endFret: 12,
    enabledStrings: new Set<number>([0, 1, 2, 3, 4, 5]),
  };

  it("baseline with all strings enabled: no muted markers from disabled-string override", () => {
    const markers = buildChordShapeMarkers(baseline);
    expect(markers.length).toBeGreaterThan(0);
    expect(markers.every((m) => m.role !== "muted")).toBe(true);
  });

  it("disabling string 5 demotes every string-5 marker to 'muted'", () => {
    // Use a string-set that includes string 5. The "3-4-5" string set has its
    // highest string at index 5.
    const input = {
      ...baseline,
      stringSets: ["3-4-5"] as const,
      enabledStrings: new Set<number>([0, 1, 2, 3, 4]),
    };
    const markers = buildChordShapeMarkers(input);
    const stringFive = markers.filter((m) => m.string === 5);
    expect(stringFive.length).toBeGreaterThan(0);
    expect(stringFive.every((m) => m.role === "muted")).toBe(true);
  });

  it("disabling a string a shape doesn't touch produces no new markers on that string", () => {
    // "1-2-3" string set covers strings 0-2 only. Disabling string 5 produces
    // no markers on string 5 (no widening).
    const input = {
      ...baseline,
      enabledStrings: new Set<number>([0, 1, 2, 3, 4]),
    };
    const markers = buildChordShapeMarkers(input);
    const stringFive = markers.filter((m) => m.string === 5);
    expect(stringFive).toHaveLength(0);
  });
});
```

Verify `TUNINGS`, `getModalDiatonicTriads`, and `buildChordShapeMarkers` are imported at
the top of the file. If `getModalDiatonicTriads` isn't there yet, add it:

```ts
import { getModalDiatonicTriads } from "./modes";
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/theory/chordShapes.test.ts
```

Expected: failures about missing `enabledStrings` field.

- [ ] **Step 3: Extend both variants of `BuildChordShapeMarkersInput`**

In `src/theory/chordShapes.ts` (around line 612), add
`enabledStrings: ReadonlySet<number>` to both branches of the discriminated union:

```ts
export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      tuning: Tuning;
      modalMode?: ModalMode;
      chord: DiatonicTriad;
      key: string;
      stringSets: ReadonlyArray<StringSet>;
      inversions: ReadonlyArray<Inversion>;
      enabledStrings: ReadonlySet<number>;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "sevenths";
      tuning: Tuning;
      modalMode?: ModalMode;
      voicingSystem: VoicingSystem;
      chord: DiatonicChord;
      key: string;
      stringSets: ReadonlyArray<SeventhStringSet>;
      inversions: ReadonlyArray<SeventhInversion>;
      enabledStrings: ReadonlySet<number>;
      startFret: number;
      endFret: number;
    };
```

- [ ] **Step 4: Thread `enabledStrings` through `placeChordOnCombo`**

Find `function placeChordOnCombo(` (around line 674). Add an `enabledStrings` parameter:

```ts
function placeChordOnCombo(
  chord: { quality: string; notes: readonly string[] },
  shape: TriadShape | SeventhShape,
  tuning: Tuning,
  spellingMap: ReadonlyMap<number, string>,
  startFret: number,
  endFret: number,
  characteristicSet: ReadonlySet<number>,
  enabledStrings: ReadonlySet<number>,
): NoteMarker[] {
```

Inside the inner shape-positions loop, at the marker push site (around line 701),
replace the role assignment:

```ts
const finalRole = enabledStrings.has(markerString) ? p.role : "muted";
result.push({
  string: markerString,
  fret: absFret,
  note: spellingMap.get(getNoteIndex(noteSharp)) ?? noteSharp,
  role: finalRole,
  ...(isCharacteristic ? { isCharacteristic: true } : {}),
});
```

- [ ] **Step 5: Update the two `placeChordOnCombo` call sites inside
      `buildChordShapeMarkers`**

Search the file for `placeChordOnCombo(`. There are two calls (one for triads, one for
sevenths, around lines 744 and 774 in the pre-task state but may have shifted). Add
`input.enabledStrings` as the new final argument:

```ts
placeChordOnCombo(
  input.chord,
  shape,
  input.tuning,
  spellingMap,
  input.startFret,
  input.endFret,
  characteristicSet,
  input.enabledStrings,
),
```

Apply to both call sites.

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/theory/chordShapes.test.ts
```

Expected: all tests pass.

- [ ] **Step 7: Full type-check**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: errors only in `ChordShapesView.tsx` (still calls `buildChordShapeMarkers`
without `enabledStrings`). Expected; Task 7 fixes it.

- [ ] **Step 8: Commit**

```bash
git add src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git commit --no-verify -m "feat(theory): add enabledStrings to buildChordShapeMarkers"
```

---

## Task 3: Demote in `NoteMapView`'s marker pipeline

**Files:**

- Modify: `src/views/NoteMapView.tsx`

NoteMapView builds markers inline — no separate theory module.

- [ ] **Step 1: Extend props and destructure**

Find the `NoteMapViewProps` type (around line 24). Add two fields:

```ts
type NoteMapViewProps = {
  tuning: Tuning;
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: Set<HighlightableRole>;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  startFret: number;
  endFret: number;
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
  mode?: Mode;
};
```

Add the two destructured props in the function body:

```ts
export function NoteMapView({
  tuning,
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  onToggleRole,
  disabledRoles,
  selectedChord,
  startFret,
  endFret,
  enabledStrings,
  onToggleString,
  mode = "ionian",
}: NoteMapViewProps) {
```

- [ ] **Step 2: Demote at push site**

Inside the existing `for` loop, around line 84, just before `result.push(...)`, compute
the final role:

```ts
const finalRole = enabledStrings.has(stringIndex) ? role : "muted";
```

Then change the push to use `finalRole`:

```ts
result.push({
  string: stringIndex,
  fret,
  note:
    spellingMap?.get(getNoteIndex(note)) ??
    getDisplayName(note, selectedKey, accidentalStyle),
  role: finalRole,
  ...(isCharacteristic ? { isCharacteristic: true } : {}),
});
```

- [ ] **Step 3: Add `enabledStrings` to the `useMemo` deps**

Around line 105, in the `useMemo`'s dependency array, add `enabledStrings`:

```ts
}, [
  tuning,
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
  startFret,
  endFret,
  enabledStrings,
  mode,
]);
```

- [ ] **Step 4: Pass new props to `<Fretboard>`**

Find the `<Fretboard ... />` JSX (around line 110). Add the two new props:

```tsx
<Fretboard
  markers={markers}
  startFret={startFret}
  endFret={endFret}
  tuning={tuning}
  enabledStrings={enabledStrings}
  onToggleString={onToggleString}
/>
```

- [ ] **Step 5: Type-check**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: NoteMapView no longer errors on its own internals. New error: `Fretboard`
doesn't accept `tuning` / `enabledStrings` / `onToggleString` yet. Task 4 adds them.

- [ ] **Step 6: Commit**

```bash
git add src/views/NoteMapView.tsx
git commit --no-verify -m "feat(views): NoteMap demotes muted-string markers to 'muted' role"
```

---

## Task 4: Fretboard — add toggle column and new props

**Files:**

- Modify: `src/components/Fretboard/Fretboard.tsx`
- Create: `src/components/Fretboard/Fretboard.test.tsx` (only if it doesn't already
  exist)

- [ ] **Step 1: Check whether a Fretboard test file exists**

```bash
ls src/components/Fretboard/Fretboard.test.tsx
```

If it exists, plan to extend it. If not, you'll create it.

- [ ] **Step 2: Write failing tests**

Create or extend `src/components/Fretboard/Fretboard.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Fretboard } from "./Fretboard";
import { TUNINGS } from "../../theory/tuning";

describe("Fretboard — string toggle column", () => {
  it("renders 6 string-toggle buttons", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );
    const toggles = screen.getAllByTestId("string-toggle");
    expect(toggles).toHaveLength(6);
  });

  it("each button has the correct data-string-index", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );
    const toggles = screen.getAllByTestId("string-toggle");
    const indices = toggles
      .map((t) => parseInt(t.getAttribute("data-string-index") ?? "-1", 10))
      .sort((a, b) => a - b);
    expect(indices).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("data-enabled reflects enabledStrings membership", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4])}
        onToggleString={() => {}}
      />,
    );
    const fiveToggle = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "5");
    expect(fiveToggle).toBeDefined();
    expect(fiveToggle).toHaveAttribute("data-enabled", "false");
    expect(fiveToggle).toHaveAttribute("aria-pressed", "true");

    const zeroToggle = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "0");
    expect(zeroToggle).toHaveAttribute("data-enabled", "true");
    expect(zeroToggle).toHaveAttribute("aria-pressed", "false");
  });

  it("aria-label includes the open-string note from the tuning", () => {
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.dadgad}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={() => {}}
      />,
    );
    // DADGAD: low D, A, D, G, A, D — string index 0 is "D".
    const zero = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "0");
    expect(zero).toHaveAttribute("aria-label", expect.stringContaining("D"));
  });

  it("clicking a toggle calls onToggleString with the correct index", async () => {
    const onToggleString = vi.fn();
    render(
      <Fretboard
        markers={[]}
        startFret={0}
        endFret={12}
        tuning={TUNINGS.standard}
        enabledStrings={new Set([0, 1, 2, 3, 4, 5])}
        onToggleString={onToggleString}
      />,
    );
    const twoToggle = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "2");
    if (!twoToggle) throw new Error("toggle not found");
    await userEvent.click(twoToggle);
    expect(onToggleString).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx vitest run src/components/Fretboard/Fretboard.test.tsx
```

Expected: failures because `tuning`, `enabledStrings`, `onToggleString` aren't accepted
props.

- [ ] **Step 4: Extend `FretboardProps` and wrap the SVG**

Open `src/components/Fretboard/Fretboard.tsx`. Add the new types to the imports near the
top:

```ts
import type { NoteMarker } from "../../theory/types";
import type { Tuning } from "../../theory/tuning";
import { DEFAULT_END_FRET } from "../../theory/constants";
```

Extend `FretboardProps`:

```ts
type FretboardProps = {
  markers: NoteMarker[];
  startFret?: number;
  endFret?: number;
  positionWindows?: ReadonlyArray<PositionWindow>;
  overlapZones?: ReadonlyArray<OverlapZone>;
  emptyMessage?: string;
  tuning: Tuning;
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
};
```

Update the function signature to destructure the new props:

```tsx
export function Fretboard({
  markers,
  startFret = 0,
  endFret = DEFAULT_END_FRET,
  positionWindows,
  overlapZones,
  emptyMessage,
  tuning,
  enabledStrings,
  onToggleString,
}: FretboardProps) {
```

- [ ] **Step 5: Compute string-toggle button positions and add the inline SVG icons**

Inside the `Fretboard` function, near the other layout calculations (after
`function stringY(...)` is defined, around line 92), add helper functions for the icon
paths:

```tsx
const NUM_STRINGS_TOGGLE = 6;

// Lucide-style eye / eye-off paths (16-unit viewBox scaled inside 16x16 rendered size).
function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}
```

Move these icon helpers to the **top of the file**, before `export function Fretboard`,
so they're not re-created on each render. (Place them just under the existing constants
block around line 53.)

- [ ] **Step 6: Render the toggle column**

The Fretboard currently returns a single `<svg>`. Wrap it in a `<div>` and render the
toggle column as siblings of the SVG. Find the existing `return (` in `Fretboard`.
Replace its top-level wrapper so the structure becomes:

```tsx
return (
  <div className="relative" style={{ width: totalWidth, height: totalHeight }}>
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}
    >
      {/* …all existing SVG content unchanged… */}
    </svg>
    <div
      className="absolute top-0 left-0"
      style={{ width: PADDING.left, height: totalHeight }}
      aria-label="String toggles"
    >
      {Array.from({ length: NUM_STRINGS_TOGGLE }).map((_, stringIndex) => {
        const enabled = enabledStrings.has(stringIndex);
        const openNote = tuning.strings[stringIndex];
        const stringNumber = 6 - stringIndex; // guitarist convention
        const y = stringY(stringIndex);
        return (
          <button
            key={stringIndex}
            type="button"
            data-testid="string-toggle"
            data-string-index={stringIndex}
            data-enabled={enabled}
            aria-pressed={!enabled}
            aria-label={`String ${stringNumber}: ${openNote}, ${
              enabled ? "enabled" : "muted"
            }`}
            onClick={() => onToggleString(stringIndex)}
            className={`absolute flex items-center justify-center w-8 h-6 rounded transition-transform active:scale-[0.92] ${
              enabled
                ? "text-fg-muted hover:text-fg-secondary opacity-60 hover:opacity-100"
                : "text-fg-faint opacity-40 hover:opacity-60"
            }`}
            style={{ left: 8, top: y - 12 }}
          >
            {enabled ? <EyeIcon /> : <EyeOffIcon />}
          </button>
        );
      })}
    </div>
  </div>
);
```

Read your current Fretboard return statement before editing — preserve its full existing
SVG inside the new wrapping `<div>`. **Do not delete any SVG content.**

If your existing SVG wrapper had attributes (className, etc.), preserve them.

- [ ] **Step 7: Verify all references to `PADDING` and `stringY` are in scope**

`PADDING.left` and `stringY()` are defined earlier in the same function. The new toggle
column block references them — confirm they're accessible at the return-statement
location (they should be).

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run src/components/Fretboard/Fretboard.test.tsx
```

Expected: all 5 tests pass.

- [ ] **Step 9: Full type-check + suite**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm test
```

Expected: tsc errors only in `ScalePositionsView.tsx` and `ChordShapesView.tsx` (still
need to thread `tuning`/`enabledStrings`/`onToggleString` to the Fretboard and need to
pass `enabledStrings` to the marker builders). All other tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/components/Fretboard/Fretboard.tsx src/components/Fretboard/Fretboard.test.tsx
git commit --no-verify -m "feat(fretboard): add string-toggle column with eye / eye-off icons"
```

---

## Task 5: Wire `ScalePositionsView`

**Files:**

- Modify: `src/views/ScalePositionsView.tsx`

- [ ] **Step 1: Extend props**

Add the two new fields to the props type (find `ScalePositionsViewProps` around line
22):

```ts
type ScalePositionsViewProps = {
  tuning: Tuning;
  selectedKey: string;
  // …existing fields
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
};
```

(Insert the two new fields wherever feels natural in the existing prop ordering.)

Destructure them in the function signature:

```ts
export function ScalePositionsView({
  tuning,
  selectedKey,
  // …existing
  enabledStrings,
  onToggleString,
  // …rest existing
}: ScalePositionsViewProps) {
```

- [ ] **Step 2: Pass `enabledStrings` to `buildChordToneMarkers`**

Find the `buildChordToneMarkers({` call (around line 95). Add the `enabledStrings` field
to the input object:

```ts
buildChordToneMarkers({
  tuning,
  // …existing fields
  enabledStrings,
  startFret,
  endFret,
  mode,
});
```

Add `enabledStrings` to the surrounding `useMemo`'s dependency array (if it's used
inside a useMemo — search for it).

- [ ] **Step 3: Pass props to `<Fretboard>`**

Find the `<Fretboard ... />` JSX. Add:

```tsx
<Fretboard
  markers={markers}
  startFret={startFret}
  endFret={endFret}
  positionWindows={positionWindows}
  overlapZones={overlapZones}
  tuning={tuning}
  enabledStrings={enabledStrings}
  onToggleString={onToggleString}
/>
```

Preserve any existing props you find on the Fretboard call.

- [ ] **Step 4: Type-check**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: errors only in `ChordShapesView.tsx` and `App.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/views/ScalePositionsView.tsx
git commit --no-verify -m "feat(views): ScalePositions threads enabledStrings to marker pipeline and Fretboard"
```

---

## Task 6: Wire `ChordShapesView`

**Files:**

- Modify: `src/views/ChordShapesView.tsx`

- [ ] **Step 1: Extend props**

Find `ChordShapesViewProps` (around line 26). Add:

```ts
type ChordShapesViewProps = {
  tuning: Tuning;
  // …existing fields
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
};
```

Destructure both in the function signature (find the existing destructure around line
85).

- [ ] **Step 2: Pass `enabledStrings` to both `buildChordShapeMarkers` calls**

The view calls `buildChordShapeMarkers` twice (one for triads at line 134, one for
sevenths at line 146 in the pre-task state — confirm by searching). Add `enabledStrings`
to each call's input object:

```ts
return buildChordShapeMarkers({
  mode: "triads",
  tuning,
  // …existing fields
  enabledStrings,
  startFret,
  endFret,
});
```

And the sevenths call:

```ts
return buildChordShapeMarkers({
  mode: "sevenths",
  tuning,
  // …existing fields
  enabledStrings,
  startFret,
  endFret,
});
```

- [ ] **Step 3: Pass props to `<Fretboard>`**

```tsx
<Fretboard
  markers={markers}
  startFret={startFret}
  endFret={endFret}
  tuning={tuning}
  enabledStrings={enabledStrings}
  onToggleString={onToggleString}
/>
```

Preserve any existing Fretboard props.

- [ ] **Step 4: Type-check**

```bash
npx tsc -p tsconfig.app.json --noEmit
```

Expected: errors only in `App.tsx` (still passes the old prop shape to the three views).

- [ ] **Step 5: Commit**

```bash
git add src/views/ChordShapesView.tsx
git commit --no-verify -m "feat(views): ChordShapes threads enabledStrings to marker pipeline and Fretboard"
```

---

## Task 7: Wire `App.tsx` and add integration test

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Add the state and callback**

In `src/App.tsx`, near the existing `enabledHighlights` state (around line 99), add:

```ts
const [enabledStrings, setEnabledStrings] = useState<Set<number>>(
  () => new Set([0, 1, 2, 3, 4, 5]),
);

const toggleString = useCallback((stringIndex: number) => {
  setEnabledStrings((prev) => {
    const next = new Set(prev);
    if (next.has(stringIndex)) next.delete(stringIndex);
    else next.add(stringIndex);
    return next;
  });
}, []);
```

If `useCallback` isn't already imported from React, add it.

- [ ] **Step 2: Thread the props into all three views**

Find each `<NoteMapView ... />`, `<ScalePositionsView ... />`, `<ChordShapesView ... />`
JSX block in App.tsx. The view calls live near lines 226, 250, 279 in the pre-task
state. To each, add:

```tsx
enabledStrings = { enabledStrings };
onToggleString = { toggleString };
```

- [ ] **Step 3: Type-check + run all tests**

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm test
```

Expected: zero tsc errors, lint clean, all tests pass. If `App.test.tsx` had tests
rendering `<App />` directly that need the toggle to exist, they should still pass — we
didn't remove anything.

- [ ] **Step 4: Add integration test in `App.test.tsx`**

Append at the bottom:

```tsx
describe("App — string-toggle state is global across views", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("muting a string in Scale Positions keeps it muted after switching to Note Map", async () => {
    render(<App />);
    // Make sure we're on Scale Positions (it's a separate tab)
    await userEvent.click(screen.getByRole("tab", { name: /Scale Positions/ }));

    // Find the string 5 toggle (top row, high E)
    const toggle5 = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "5");
    if (!toggle5) throw new Error("toggle not found");
    expect(toggle5).toHaveAttribute("data-enabled", "true");
    await userEvent.click(toggle5);
    expect(toggle5).toHaveAttribute("data-enabled", "false");

    // Switch to Note Map
    await userEvent.click(screen.getByRole("tab", { name: /Note Map/ }));

    // String 5 toggle on Note Map should still report disabled
    const noteMapToggle5 = screen
      .getAllByTestId("string-toggle")
      .find((t) => t.getAttribute("data-string-index") === "5");
    if (!noteMapToggle5) throw new Error("toggle not found in Note Map");
    expect(noteMapToggle5).toHaveAttribute("data-enabled", "false");
  });
});
```

Confirm imports at the top of `App.test.tsx`. If `beforeEach` or `userEvent` aren't
imported, add them.

- [ ] **Step 5: Run the integration test**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Lint + prettier + final type-check**

```bash
npm run lint
npx prettier --write .
npx tsc -p tsconfig.app.json --noEmit
```

Expected: clean across the board. If prettier touched files outside this task's scope,
decide whether to include them in the commit (default: only stage files you
intentionally modified).

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "$(cat <<'EOF'
feat(app): wire global enabledStrings state and thread to all three views

Muting strings in any view persists across view switches via global
App-level state. Demote-to-muted semantics implemented in each marker
pipeline; this commit only adds the state owner + prop threading.
EOF
)"
```

Normal pre-commit hook (no `--no-verify`) — all checks should pass.

---

## Task 8: E2E spec

**Files:**

- Create: `tests/e2e/string-toggle.spec.ts`

- [ ] **Step 1: Write the E2E test**

Create `tests/e2e/string-toggle.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test.describe("string toggle", () => {
  test("muting a string demotes its markers; switching views preserves state; re-toggling restores", async ({
    page,
  }) => {
    await page.goto("/");

    // Switch to Scale Positions (tab)
    await page.getByRole("tab", { name: "Scale Positions" }).click();

    // Pre-toggle: at least one marker on string 5 has a non-muted role
    const stringFiveMarkers = page.locator(
      '[data-testid="note-marker"][data-string="5"]',
    );
    const initialCount = await stringFiveMarkers.count();
    expect(initialCount).toBeGreaterThan(0);

    const nonMutedBefore = await page
      .locator('[data-testid="note-marker"][data-string="5"]:not([data-role="muted"])')
      .count();
    expect(nonMutedBefore).toBeGreaterThan(0);

    // Click string 5's toggle
    await page.locator('[data-testid="string-toggle"][data-string-index="5"]').click();

    // After toggle: every string-5 marker is muted
    const nonMutedAfter = await page
      .locator('[data-testid="note-marker"][data-string="5"]:not([data-role="muted"])')
      .count();
    expect(nonMutedAfter).toBe(0);

    // Switch to Note Map — toggle state survives
    await page.getByRole("tab", { name: "Note Map" }).click();
    await expect(
      page.locator('[data-testid="string-toggle"][data-string-index="5"]'),
    ).toHaveAttribute("data-enabled", "false");

    // Re-enable: click the toggle again
    await page.locator('[data-testid="string-toggle"][data-string-index="5"]').click();
    await expect(
      page.locator('[data-testid="string-toggle"][data-string-index="5"]'),
    ).toHaveAttribute("data-enabled", "true");

    // Switch back to Scale Positions, confirm markers are no longer muted
    await page.getByRole("tab", { name: "Scale Positions" }).click();
    const nonMutedRestored = await page
      .locator('[data-testid="note-marker"][data-string="5"]:not([data-role="muted"])')
      .count();
    expect(nonMutedRestored).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the E2E suite locally**

```bash
npx playwright test tests/e2e/string-toggle.spec.ts
```

Expected: 1 passing test. If the test fails on `data-role` not being present on every
marker, inspect `NoteCircle.tsx` to confirm the data-attributes spec'd in section 6 of
the spec doc are actually rendered. If they aren't, add them — but the codebase analyzer
report confirmed `data-testid="note-marker"`, `data-string`, `data-role` are already
there.

If the dev server isn't running and Playwright config doesn't auto-start it, run the dev
server first (or check `playwright.config.ts` for an existing `webServer` config).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/string-toggle.spec.ts
git commit -m "test(e2e): cover string-toggle muting and global state across views"
```

---

## Final verification

- [ ] **Step 1: Full local verification**

```bash
npm run lint
npx prettier --check .
npx tsc -p tsconfig.app.json --noEmit
npm test
npx playwright test tests/e2e/string-toggle.spec.ts
```

All five must pass.

- [ ] **Step 2: Commit history sanity**

```bash
git log --oneline main..HEAD
```

Expected: 8 implementation commits + 1 spec doc commit = 9 commits.

- [ ] **Step 3: Ready for PR**

Branch is `feat/string-toggle`. Confirm with the user before pushing or opening a PR.
