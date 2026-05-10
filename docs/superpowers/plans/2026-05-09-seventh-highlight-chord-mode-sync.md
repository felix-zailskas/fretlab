# Seventh Highlight / Chord Mode Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disable the 7th highlight toggle in the Legend when chord mode is "triads",
and exclude 7th-role notes from fretboard highlights in that mode, without mutating
stored highlight state.

**Architecture:** A `useMemo`-derived `effectiveHighlights` in `App.tsx` strips the
"seventh" role when `chordRowMode === "triads"`. This derived set is passed to the three
view components instead of the raw `enabledHighlights`. A new optional `disabledRoles`
prop on `Legend` renders the 7th button as disabled and greyed-out. Each view component
threads `disabledRoles` through to `Legend`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library

---

## Files

| File                               | Change                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| `src/components/Legend.tsx`        | Add `disabledRoles?: Set<HighlightableRole>` prop; disable button when role is in set |
| `src/components/Legend.test.tsx`   | Create — unit tests for `disabledRoles` behaviour                                     |
| `src/views/NoteMapView.tsx`        | Add `disabledRoles` prop to interface; forward to `<Legend>`                          |
| `src/views/ScalePositionsView.tsx` | Same                                                                                  |
| `src/views/ChordShapesView.tsx`    | Same                                                                                  |
| `src/App.tsx`                      | Add `effectiveHighlights` useMemo; pass it + `disabledRoles` to all three views       |

---

### Task 1: `disabledRoles` prop on Legend — TDD

**Files:**

- Create: `src/components/Legend.test.tsx`
- Modify: `src/components/Legend.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Legend.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Legend } from "./Legend";
import type { HighlightableRole } from "./Legend";

const ALL_ROLES = new Set<HighlightableRole>(["root", "third", "fifth", "seventh"]);
const noop = () => {};

describe("Legend", () => {
  it("renders four role buttons", () => {
    render(<Legend enabledRoles={ALL_ROLES} onToggleRole={noop} />);
    expect(screen.getByRole("button", { name: /Root/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /3rd/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5th/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /7th/ })).toBeInTheDocument();
  });

  it("disables the 7th button when disabledRoles contains 'seventh'", () => {
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={noop}
        disabledRoles={new Set<HighlightableRole>(["seventh"])}
      />,
    );
    expect(screen.getByRole("button", { name: /7th/ })).toBeDisabled();
  });

  it("does not disable the 7th button when disabledRoles is undefined", () => {
    render(<Legend enabledRoles={ALL_ROLES} onToggleRole={noop} />);
    expect(screen.getByRole("button", { name: /7th/ })).not.toBeDisabled();
  });

  it("does not call onToggleRole when a disabled button is clicked", async () => {
    const onToggleRole = vi.fn();
    render(
      <Legend
        enabledRoles={ALL_ROLES}
        onToggleRole={onToggleRole}
        disabledRoles={new Set<HighlightableRole>(["seventh"])}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /7th/ }));
    expect(onToggleRole).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- Legend
```

Expected: 3–4 failures — `disabledRoles` prop does not exist yet.

- [ ] **Step 3: Implement `disabledRoles` in Legend.tsx**

In `src/components/Legend.tsx`, update `LegendProps` (lines 40–43) and the component:

```tsx
type LegendProps = {
  enabledRoles: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
  disabledRoles?: Set<HighlightableRole>;
};

export function Legend({ enabledRoles, onToggleRole, disabledRoles }: LegendProps) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-line"
      role="group"
      aria-label="Highlight roles"
    >
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role);
        const isDisabled = disabledRoles?.has(item.role) ?? false;
        return (
          <button
            key={item.label}
            onClick={() => onToggleRole(item.role)}
            title={item.title}
            aria-pressed={isEnabled}
            disabled={isDisabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold transition-colors ${
              isDisabled
                ? "bg-surface text-fg-muted opacity-40 cursor-not-allowed"
                : isEnabled
                  ? "bg-surface-active text-fg-emphasis cursor-pointer"
                  : "bg-surface text-fg-muted hover:bg-surface-raised cursor-pointer"
            }`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- Legend
```

Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/Legend.tsx src/components/Legend.test.tsx
git commit -m "feat: add disabledRoles prop to Legend; grey out 7th button when disabled"
```

---

### Task 2: Thread `disabledRoles` through the three view components

**Files:**

- Modify: `src/views/NoteMapView.tsx`
- Modify: `src/views/ScalePositionsView.tsx`
- Modify: `src/views/ChordShapesView.tsx`

- [ ] **Step 1: Update NoteMapView**

In `src/views/NoteMapView.tsx`:

Add `disabledRoles?: Set<HighlightableRole>` to the props interface (after the existing
`onToggleRole` line, around line 26):

```ts
disabledRoles?: Set<HighlightableRole>;
```

Destructure it in the function signature alongside `enabledHighlights` and
`onToggleRole`.

Update the `<Legend>` call at line 105:

```tsx
<Legend
  enabledRoles={enabledHighlights}
  onToggleRole={onToggleRole}
  disabledRoles={disabledRoles}
/>
```

- [ ] **Step 2: Update ScalePositionsView**

In `src/views/ScalePositionsView.tsx`:

Add `disabledRoles?: Set<HighlightableRole>` to the props interface (after
`onToggleRole`, around line 27).

Destructure it and update the `<Legend>` call at line 144:

```tsx
<Legend
  enabledRoles={enabledHighlights}
  onToggleRole={onToggleRole}
  disabledRoles={disabledRoles}
/>
```

- [ ] **Step 3: Update ChordShapesView**

In `src/views/ChordShapesView.tsx`:

Add `disabledRoles?: Set<HighlightableRole>` to the props interface (after
`onToggleRole`, around line 35).

Destructure it and update the `<Legend>` call at line 219:

```tsx
<Legend
  enabledRoles={enabledHighlights}
  onToggleRole={onToggleRole}
  disabledRoles={disabledRoles}
/>
```

- [ ] **Step 4: Run lint + tests**

```bash
npm run lint && npm test
```

Expected: all tests pass, no lint errors. (TypeScript will catch any mismatched types.)

- [ ] **Step 5: Commit**

```bash
git add src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/views/ChordShapesView.tsx
git commit -m "feat: thread disabledRoles prop through view components to Legend"
```

---

### Task 3: Derive `effectiveHighlights` in App.tsx and wire everything up

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Add `effectiveHighlights` useMemo**

In `src/App.tsx`, after the `toggleHighlight` callback (around line 131), add:

```ts
const effectiveHighlights = useMemo(
  () =>
    chordRowMode === "triads"
      ? new Set([...enabledHighlights].filter((r) => r !== "seventh"))
      : enabledHighlights,
  [enabledHighlights, chordRowMode],
);

const seventhDisabledRoles = useMemo(
  () =>
    chordRowMode === "triads" ? new Set<HighlightableRole>(["seventh"]) : undefined,
  [chordRowMode],
);
```

`useMemo` is already imported in `App.tsx` (line 4). `HighlightableRole` is already
imported (line 17).

- [ ] **Step 2: Update NoteMapView call (lines 149–159)**

Change `enabledHighlights={enabledHighlights}` to
`enabledHighlights={effectiveHighlights}` and add
`disabledRoles={seventhDisabledRoles}`:

```tsx
<NoteMapView
  tuning={TUNINGS[tuningId]}
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  enabledHighlights={effectiveHighlights}
  onToggleRole={toggleHighlight}
  selectedChord={selectedChord}
  startFret={startFret}
  endFret={endFret}
  mode={mode}
  disabledRoles={seventhDisabledRoles}
/>
```

- [ ] **Step 3: Update ScalePositionsView call (lines 174–185)**

```tsx
<ScalePositionsView
  tuning={TUNINGS[tuningId]}
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  enabledHighlights={effectiveHighlights}
  onToggleRole={toggleHighlight}
  selectedChord={selectedChord}
  startFret={startFret}
  endFret={endFret}
  controls={scalePositionsControls}
  mode={mode}
  disabledRoles={seventhDisabledRoles}
/>
```

- [ ] **Step 4: Update ChordShapesView call (lines 200–212)**

```tsx
<ChordShapesView
  tuning={TUNINGS[tuningId]}
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  startFret={startFret}
  endFret={endFret}
  selectedChord={selectedChord}
  chordRowMode={chordRowMode}
  enabledHighlights={effectiveHighlights}
  onToggleRole={toggleHighlight}
  controls={chordShapesControls}
  modalMode={mode}
  disabledRoles={seventhDisabledRoles}
/>
```

- [ ] **Step 5: Run lint + tests**

```bash
npm run lint && npm test
```

Expected: all tests pass, no type errors, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat: derive effectiveHighlights; gate 7th highlight on chord mode"
```
