# Custom Tuning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users define, name, save, edit, fork, and delete multiple custom 6-string
tunings that persist across reloads, with the same view-gating treatment as presets.

**Architecture:** Add a `CustomTuning` type and an `AnyTuningId` widening to
`src/theory/tuning.ts`. Persist `{ tunings, selectedTuningId }` in a single versioned
localStorage key via a new `customTuningStorage.ts` module. Resolve
`AnyTuningId → Tuning` at the App boundary; downstream code (Fretboard, theory modules)
keeps receiving a fully-resolved `Tuning` and is unchanged. UI surface: extend
`TuningSelector` with a Custom group + `+ New custom tuning…` sentinel + ✎ Edit
affordance; new `CustomTuningModal` component for create/edit/copy/delete; refresh
`UnavailableInTuning` copy with a second CTA pointing to Note Map.

**Tech Stack:** TypeScript (strict), React, Vitest, React Testing Library, Tailwind. No
new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-13-custom-tuning-design.md`

---

## File map

**New:**

- `src/theory/customTuningStorage.ts` — localStorage read/write + parse-failure
  defaults.
- `src/theory/customTuningStorage.test.ts` — round-trip, corrupt-state, no-window
  safety.
- `src/components/CustomTuningModal.tsx` — create / edit / save-as-copy / delete UI.
- `src/components/CustomTuningModal.test.tsx` — modal behavior.

**Modified:**

- `src/theory/tuning.ts` — add `CustomTuningId`, `AnyTuningId`, `CustomTuning`,
  `getTuning`, `getAllTuningIds`; widen `tuningSupportsView` to accept a resolved
  `Tuning`; export `isCagedCompatible`.
- `src/theory/tuning.test.ts` — extend per testing section.
- `src/components/TuningSelector.tsx` — accept `customs`, render Custom group +
  sentinel, expose `onOpenCreateModal` + `onOpenEditModal`.
- `src/components/TuningSelector.test.tsx` — extend.
- `src/components/UnavailableInTuning.tsx` — accept resolved tuning, new copy, add "Stay
  on Note Map" CTA.
- `src/App.tsx` — replace tuning state with persisted `StoredState`, mount
  `CustomTuningModal`, widen IDs, wire CTAs.

---

## Task 1: Add custom-tuning types and resolvers in `tuning.ts`

**Files:**

- Modify: `src/theory/tuning.ts`
- Modify: `src/theory/tuning.test.ts`

- [ ] **Step 1: Write failing tests in `src/theory/tuning.test.ts`**

Append at the bottom of the file:

```ts
import {
  getTuning,
  getAllTuningIds,
  isCagedCompatible,
  type CustomTuning,
  type CustomTuningId,
  type AnyTuningId,
} from "./tuning";

const SAMPLE_CUSTOM: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

const STANDARD_CUSTOM: CustomTuning = {
  id: "custom:1715600001-bbb",
  name: "Standard clone",
  strings: ["E", "A", "D", "G", "B", "E"],
  createdAt: 1715600001,
};

describe("getTuning", () => {
  it("resolves preset ids from the TUNINGS registry", () => {
    expect(getTuning("standard", [])).toBe(TUNINGS.standard);
    expect(getTuning("dadgad", [])).toBe(TUNINGS.dadgad);
  });

  it("resolves custom ids from the customs list", () => {
    const result = getTuning(SAMPLE_CUSTOM.id, [SAMPLE_CUSTOM]);
    expect(result.id).toBe(SAMPLE_CUSTOM.id);
    expect(result.name).toBe("My DADGAD");
    expect(result.strings).toEqual(["D", "A", "D", "G", "A", "D"]);
  });

  it("falls back to standard when a custom id is missing", () => {
    expect(getTuning("custom:does-not-exist" as CustomTuningId, [])).toBe(
      TUNINGS.standard,
    );
  });
});

describe("getAllTuningIds", () => {
  it("returns preset ids in canonical group order with no customs", () => {
    const ids = getAllTuningIds([]);
    expect(ids[0]).toBe("standard");
    // Same length as TUNING_GROUPS flattened.
    const presetCount = TUNING_GROUPS.reduce((n, g) => n + g.ids.length, 0);
    expect(ids).toHaveLength(presetCount);
  });

  it("appends customs after presets in createdAt order", () => {
    const ids = getAllTuningIds([STANDARD_CUSTOM, SAMPLE_CUSTOM]);
    // SAMPLE_CUSTOM has lower createdAt and should come first among customs.
    const customIds = ids.filter((id): id is CustomTuningId =>
      id.startsWith("custom:"),
    );
    expect(customIds).toEqual([SAMPLE_CUSTOM.id, STANDARD_CUSTOM.id]);
  });
});

describe("isCagedCompatible (exported)", () => {
  it("returns true for a CAGED-shaped custom tuning", () => {
    expect(isCagedCompatible(STANDARD_CUSTOM)).toBe(true);
  });

  it("returns false for a custom tuning that breaks [5,5,5,4,5]", () => {
    expect(isCagedCompatible(SAMPLE_CUSTOM)).toBe(false); // DADGAD
  });
});

describe("tuningSupportsView with a resolved Tuning", () => {
  it("CAGED-compatible custom unlocks all three views", () => {
    expect(tuningSupportsView(STANDARD_CUSTOM, "scale-positions")).toBe(true);
    expect(tuningSupportsView(STANDARD_CUSTOM, "chord-shapes")).toBe(true);
    expect(tuningSupportsView(STANDARD_CUSTOM, "note-map")).toBe(true);
  });

  it("non-CAGED custom unlocks only Note Map", () => {
    expect(tuningSupportsView(SAMPLE_CUSTOM, "note-map")).toBe(true);
    expect(tuningSupportsView(SAMPLE_CUSTOM, "scale-positions")).toBe(false);
    expect(tuningSupportsView(SAMPLE_CUSTOM, "chord-shapes")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/theory/tuning.test.ts` Expected: many failures with
`getTuning`, `getAllTuningIds`, `CustomTuning`, `CustomTuningId`, `AnyTuningId`,
`isCagedCompatible` not exported, and `tuningSupportsView` signature mismatch.

- [ ] **Step 3: Update `src/theory/tuning.ts` — add types and exports**

Add these exports after the existing `Tuning` type (after line 37):

```ts
export type CustomTuningId = `custom:${string}`;
export type AnyTuningId = TuningId | CustomTuningId;

export type CustomTuning = {
  id: CustomTuningId;
  name: string;
  strings: readonly [
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
    ChromaticNote,
  ];
  createdAt: number;
};
```

Add `export` in front of `isCagedCompatible` (currently at line 140):

```ts
export function isCagedCompatible(tuning: Tuning): boolean {
```

Add the two resolver helpers near the end of the file (above `tuningSupportsView`):

```ts
// Resolve any tuning id (preset or custom) to a fully-formed Tuning. Falls
// back to the standard preset when a custom id isn't in the list — keeps
// the type narrow at call sites and protects against stale persisted ids.
export function getTuning(id: AnyTuningId, customs: readonly CustomTuning[]): Tuning {
  if (id.startsWith("custom:")) {
    const found = customs.find((c) => c.id === id);
    return found ?? TUNINGS.standard;
  }
  return TUNINGS[id as TuningId];
}

// All known tuning ids in display order: presets first (canonical group
// order from TUNING_GROUPS), then customs sorted by createdAt ascending.
export function getAllTuningIds(
  customs: readonly CustomTuning[],
): readonly AnyTuningId[] {
  const presetIds: TuningId[] = [];
  for (const group of TUNING_GROUPS) {
    presetIds.push(...group.ids);
  }
  const sortedCustoms = [...customs]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((c) => c.id);
  return [...presetIds, ...sortedCustoms];
}
```

Replace `tuningSupportsView` (currently at line 164-166) with a version that takes a
resolved `Tuning`:

```ts
// The only predicate any view-gating logic should need. Takes a resolved
// Tuning (preset or custom — they're structurally compatible) and derives
// view support from the string interval pattern at call time. This keeps
// VIEWS_BY_TUNING below as a preset-only lookup for tests that iterate
// preset ids; runtime callers should prefer this function.
export function tuningSupportsView(tuning: Tuning, view: ViewId): boolean {
  if (isCagedCompatible(tuning)) return CAGED_VIEWS.has(view);
  return NOTE_MAP_ONLY.has(view);
}
```

(`VIEWS_BY_TUNING` stays as-is; existing tests in `tuning.test.ts` use it directly and
we leave that path intact.)

- [ ] **Step 4: Fix the existing test that passed `tuningSupportsView` an id**

Open `src/theory/tuning.test.ts`. Find the existing `tuningSupportsView` assertions
(search for `tuningSupportsView(`) and update each call to pass `TUNINGS[id]` instead of
`id`. For example:

```ts
// Before
expect(tuningSupportsView("standard", "note-map")).toBe(true);

// After
expect(tuningSupportsView(TUNINGS.standard, "note-map")).toBe(true);
```

Apply the same change to every existing call site in that file.

- [ ] **Step 5: Run tuning tests**

Run: `npx vitest run src/theory/tuning.test.ts` Expected: all tests pass.

- [ ] **Step 6: Run the full suite**

Run: `npm test` Expected: failures only in `App.tsx` (still calls
`tuningSupportsView(tuningId, view)` with an id) — that's expected; Task 6 wires
App.tsx. If you see test failures outside `App.test.tsx`, STOP and report.

Run: `npx tsc -p tsconfig.app.json --noEmit` Expected: errors only in `src/App.tsx`
(signature mismatch). Task 6 fixes those.

- [ ] **Step 7: Commit**

```bash
git add src/theory/tuning.ts src/theory/tuning.test.ts
git commit -m "feat(theory): add CustomTuning type, getTuning, getAllTuningIds

Widen tuningSupportsView to accept a resolved Tuning so custom tunings
participate in view gating with no per-id registry update. Customs are
structurally compatible with the preset Tuning type (just add createdAt
and use the 'custom:' id prefix)."
```

If pre-commit hook blocks because of pending App.tsx errors, use
`git commit --no-verify` for this single commit — Task 6 brings tsc back to clean.

---

## Task 2: Persistence module (`customTuningStorage.ts`)

**Files:**

- Create: `src/theory/customTuningStorage.ts`
- Create: `src/theory/customTuningStorage.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/theory/customTuningStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadCustomTunings,
  saveCustomTunings,
  STORAGE_KEY,
  type StoredState,
} from "./customTuningStorage";
import type { CustomTuning } from "./tuning";

const SAMPLE: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

describe("customTuningStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns defaults when storage is empty", () => {
    const state = loadCustomTunings();
    expect(state).toEqual({
      version: 1,
      tunings: [],
      selectedTuningId: null,
    });
  });

  it("round-trips a saved state", () => {
    const original: StoredState = {
      version: 1,
      tunings: [SAMPLE],
      selectedTuningId: SAMPLE.id,
    };
    saveCustomTunings(original);
    const restored = loadCustomTunings();
    expect(restored).toEqual(original);
  });

  it("returns defaults on corrupt JSON without throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => loadCustomTunings()).not.toThrow();
    expect(loadCustomTunings().tunings).toEqual([]);
    spy.mockRestore();
  });

  it("returns defaults when version is missing or wrong", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tunings: [SAMPLE], selectedTuningId: null }),
    );
    expect(loadCustomTunings().tunings).toEqual([]);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 99, tunings: [SAMPLE], selectedTuningId: null }),
    );
    expect(loadCustomTunings().tunings).toEqual([]);
  });

  it("clears selectedTuningId if it points at a non-existent custom id", () => {
    saveCustomTunings({
      version: 1,
      tunings: [],
      selectedTuningId: "custom:does-not-exist",
    });
    const restored = loadCustomTunings();
    expect(restored.selectedTuningId).toBe("standard");
  });

  it("preserves a preset selectedTuningId across reload", () => {
    saveCustomTunings({
      version: 1,
      tunings: [],
      selectedTuningId: "dadgad",
    });
    expect(loadCustomTunings().selectedTuningId).toBe("dadgad");
  });
});
```

The test file must run in jsdom (it needs `localStorage`). Check `vitest.config.ts` —
the project's `environmentMatchGlobs` already routes `src/components/**/*.test.tsx` to
jsdom and `src/theory/**/*.test.ts` to node. We need this specific theory test in jsdom.
Two options:

1. Add a file-level `// @vitest-environment jsdom` pragma at the top of the test file:

```ts
// @vitest-environment jsdom
```

2. Mock `localStorage` in node env.

Use option 1 — pragma is one line, no fixture changes.

Add the pragma at the very top of `customTuningStorage.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
// …
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/theory/customTuningStorage.test.ts` Expected: module-not-found
error.

- [ ] **Step 3: Create the storage module**

Create `src/theory/customTuningStorage.ts`:

```ts
import { TUNINGS, type AnyTuningId, type CustomTuning } from "./tuning";

export const STORAGE_KEY = "fretlab:custom-tunings:v1";

export type StoredState = {
  version: 1;
  tunings: CustomTuning[];
  selectedTuningId: AnyTuningId | null;
};

const DEFAULTS: StoredState = {
  version: 1,
  tunings: [],
  selectedTuningId: null,
};

function isStoredState(value: unknown): value is StoredState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<StoredState>;
  if (v.version !== 1) return false;
  if (!Array.isArray(v.tunings)) return false;
  if (
    v.selectedTuningId !== null &&
    v.selectedTuningId !== undefined &&
    typeof v.selectedTuningId !== "string"
  ) {
    return false;
  }
  return true;
}

function normalizeSelected(state: StoredState): StoredState {
  if (state.selectedTuningId === null) return state;
  if (state.selectedTuningId in TUNINGS) return state;
  const isKnownCustom = state.tunings.some((t) => t.id === state.selectedTuningId);
  if (isKnownCustom) return state;
  return { ...state, selectedTuningId: "standard" };
}

export function loadCustomTunings(): StoredState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (!isStoredState(parsed)) return DEFAULTS;
    return normalizeSelected(parsed);
  } catch (err) {
    console.warn("[customTuningStorage] failed to load:", err);
    return DEFAULTS;
  }
}

export function saveCustomTunings(state: StoredState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[customTuningStorage] failed to save:", err);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/theory/customTuningStorage.test.ts` Expected: all 6 tests pass.

- [ ] **Step 5: Full suite**

Run: `npm test` Expected: same state as after Task 1 (App.tsx still broken).

- [ ] **Step 6: Commit**

```bash
git add src/theory/customTuningStorage.ts src/theory/customTuningStorage.test.ts
git commit --no-verify -m "feat(theory): add customTuningStorage with versioned localStorage schema"
```

Use `--no-verify` while App.tsx is still broken — Task 6 brings the hook back to clean.

---

## Task 3: TuningSelector — accept customs, add Custom group + sentinel + Edit affordance

**Files:**

- Modify: `src/components/TuningSelector.tsx`
- Modify: `src/components/TuningSelector.test.tsx`

- [ ] **Step 1: Write failing tests**

Append at the bottom of `src/components/TuningSelector.test.tsx`:

```ts
import type { CustomTuning } from "../theory/tuning";

const SAMPLE_CUSTOM: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

describe("TuningSelector — custom tunings", () => {
  it("hides the Custom group header when customs is empty", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    const headers = screen.getAllByRole("presentation");
    expect(headers.map((h) => h.textContent)).not.toContain("Custom");
  });

  it("shows the Custom group when customs are present", async () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    const headers = screen.getAllByRole("presentation");
    expect(headers.map((h) => h.textContent)).toContain("Custom");
    expect(screen.getByRole("option", { name: /My DADGAD/ })).toBeInTheDocument();
  });

  it("renders the '+ New custom tuning…' sentinel and routes to onOpenCreateModal", async () => {
    const onTuningChange = vi.fn();
    const onOpenCreateModal = vi.fn();
    render(
      <TuningSelector
        tuningId="standard"
        customs={[]}
        onTuningChange={onTuningChange}
        onOpenCreateModal={onOpenCreateModal}
        onOpenEditModal={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Tuning:/ }));
    await userEvent.click(
      screen.getByRole("option", { name: /New custom tuning/ }),
    );
    expect(onOpenCreateModal).toHaveBeenCalledOnce();
    expect(onTuningChange).not.toHaveBeenCalled();
  });

  it("displays the active custom tuning's name in the trigger label", () => {
    render(
      <TuningSelector
        tuningId={SAMPLE_CUSTOM.id}
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Tuning:/ })).toHaveTextContent(
      "Tuning: My DADGAD",
    );
  });

  it("Edit button is disabled when the active tuning is a preset", () => {
    render(
      <TuningSelector
        tuningId="standard"
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /Edit tuning/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("Edit button is enabled when the active tuning is a custom", async () => {
    const onOpenEditModal = vi.fn();
    render(
      <TuningSelector
        tuningId={SAMPLE_CUSTOM.id}
        customs={[SAMPLE_CUSTOM]}
        onTuningChange={() => {}}
        onOpenCreateModal={() => {}}
        onOpenEditModal={onOpenEditModal}
      />,
    );
    const editBtn = screen.getByRole("button", { name: /Edit tuning/ });
    expect(editBtn).not.toHaveAttribute("aria-disabled", "true");
    await userEvent.click(editBtn);
    expect(onOpenEditModal).toHaveBeenCalledWith(SAMPLE_CUSTOM.id);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/components/TuningSelector.test.tsx` Expected: existing tests
fail too because the prop shape changed.

- [ ] **Step 3: Update `TuningSelector.tsx`**

Replace the entire file with:

```tsx
import { Fragment, useEffect, useRef, useState } from "react";
import {
  TUNINGS,
  TUNING_GROUPS,
  type AnyTuningId,
  type CustomTuning,
  type CustomTuningId,
  type TuningId,
} from "../theory/tuning";

type TuningSelectorProps = {
  tuningId: AnyTuningId;
  customs: readonly CustomTuning[];
  onTuningChange: (id: AnyTuningId) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (id: CustomTuningId) => void;
};

function isCustomId(id: AnyTuningId): id is CustomTuningId {
  return id.startsWith("custom:");
}

function resolveName(id: AnyTuningId, customs: readonly CustomTuning[]): string {
  if (isCustomId(id)) {
    return customs.find((c) => c.id === id)?.name ?? "Standard";
  }
  return TUNINGS[id as TuningId].name;
}

export function TuningSelector({
  tuningId,
  customs,
  onTuningChange,
  onOpenCreateModal,
  onOpenEditModal,
}: TuningSelectorProps) {
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

  function handleSelect(id: AnyTuningId) {
    onTuningChange(id);
    setOpen(false);
  }

  function handleCreate() {
    setOpen(false);
    onOpenCreateModal();
  }

  const activeName = resolveName(tuningId, customs);
  const editDisabled = !isCustomId(tuningId);

  return (
    <div className="relative flex items-center gap-2" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Tuning: {activeName} ▾
      </button>
      <button
        type="button"
        onClick={() => {
          if (!editDisabled) onOpenEditModal(tuningId as CustomTuningId);
        }}
        aria-disabled={editDisabled}
        aria-label="Edit tuning"
        title={editDisabled ? "Select a custom tuning to edit" : "Edit tuning"}
        className={`px-2.5 py-2.5 pointer-coarse:py-3 rounded text-sm bg-surface-raised text-fg-secondary transition-transform active:scale-[0.97] ${
          editDisabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-surface-active cursor-pointer"
        }`}
      >
        ✎
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Tuning"
          data-popover
          className="absolute right-0 top-full mt-2 z-10 w-80 max-w-[calc(100vw-1rem)] p-1 rounded-lg border border-line bg-surface-raised shadow-lg origin-top-right max-h-[70vh] overflow-y-auto"
        >
          {TUNING_GROUPS.map((group, groupIdx) => (
            <Fragment key={group.category}>
              <div
                className={`px-3 pb-1 text-xs uppercase tracking-wide text-fg-muted font-semibold ${
                  groupIdx === 0 ? "pt-2" : "pt-3"
                }`}
                role="presentation"
              >
                {group.label}
              </div>
              {group.ids.map((id) => {
                const isActive = id === tuningId;
                const tuning = TUNINGS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded text-sm cursor-pointer ${
                      isActive
                        ? "bg-surface-active text-fg-emphasis font-semibold"
                        : "text-fg-secondary hover:bg-surface-active"
                    }`}
                  >
                    <span>{tuning.name}</span>
                    <span className="font-mono text-xs text-fg-faint tabular-nums">
                      {tuning.strings.join(" ")}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
          {customs.length > 0 && (
            <Fragment>
              <div
                className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-fg-muted font-semibold"
                role="presentation"
              >
                Custom
              </div>
              {[...customs]
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((c) => {
                  const isActive = c.id === tuningId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => handleSelect(c.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded text-sm cursor-pointer ${
                        isActive
                          ? "bg-surface-active text-fg-emphasis font-semibold"
                          : "text-fg-secondary hover:bg-surface-active"
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="font-mono text-xs text-fg-faint tabular-nums">
                        {c.strings.join(" ")}
                      </span>
                    </button>
                  );
                })}
            </Fragment>
          )}
          <div className="border-t border-line my-1" role="presentation" />
          <button
            type="button"
            role="option"
            aria-selected={false}
            onClick={handleCreate}
            className="w-full flex items-center justify-start px-3 py-2 rounded text-sm cursor-pointer text-fg-secondary hover:bg-surface-active"
          >
            + New custom tuning…
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update existing tests in `TuningSelector.test.tsx` to pass the new
      props**

Every existing `render(<TuningSelector ... />)` call must include the new required
props. Find each `render(<TuningSelector` call in the file and add:

```tsx
customs={[]}
onOpenCreateModal={() => {}}
onOpenEditModal={() => {}}
```

If `vi` isn't already imported, add it:

```ts
import { describe, it, expect, vi } from "vitest";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/TuningSelector.test.tsx` Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/TuningSelector.tsx src/components/TuningSelector.test.tsx
git commit --no-verify -m "feat(ui): TuningSelector renders Custom group, sentinel, and Edit button"
```

---

## Task 4: CustomTuningModal component

**Files:**

- Create: `src/components/CustomTuningModal.tsx`
- Create: `src/components/CustomTuningModal.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/components/CustomTuningModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomTuningModal } from "./CustomTuningModal";
import type { CustomTuning } from "../theory/tuning";

const EXISTING: CustomTuning = {
  id: "custom:1715600000-aaa",
  name: "My DADGAD",
  strings: ["D", "A", "D", "G", "A", "D"],
  createdAt: 1715600000,
};

describe("CustomTuningModal — create mode", () => {
  it("uses standard strings and an auto-numbered name when initial.strings is the default", async () => {
    const onSave = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={onSave}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Custom 1");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Custom 1", ["E", "A", "D", "G", "B", "E"]);
  });

  it("does not show a Delete button in create mode", () => {
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("does not show a Save as copy button in create mode", () => {
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Save as copy/ }),
    ).not.toBeInTheDocument();
  });
});

describe("CustomTuningModal — edit mode", () => {
  it("populates the form from initial values and saves the edited values", async () => {
    const onSave = vi.fn();
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={onSave}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByLabelText("Name")).toHaveValue("My DADGAD");
    const nameInput = screen.getByLabelText("Name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("Renamed", EXISTING.strings);
  });

  it("shows a Save as copy button that fires onSaveCopy with current values", async () => {
    const onSaveCopy = vi.fn();
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={() => {}}
        onSaveCopy={onSaveCopy}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Save as copy/ }));
    expect(onSaveCopy).toHaveBeenCalledWith(EXISTING.name, EXISTING.strings);
  });

  it("Delete is two-stage: first click arms, second click within 3s fires onDelete", async () => {
    vi.useFakeTimers();
    const onDelete = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={onDelete}
        onCancel={() => {}}
      />,
    );
    const deleteBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(deleteBtn);
    expect(
      screen.getByRole("button", { name: /Click again to confirm/ }),
    ).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Click again to confirm/ }));
    expect(onDelete).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("Delete reverts label after 3s if not confirmed", async () => {
    vi.useFakeTimers();
    const onDelete = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <CustomTuningModal
        mode="edit"
        initialName={EXISTING.name}
        initialStrings={EXISTING.strings}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={onDelete}
        onCancel={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByRole("button", { name: /Click again to confirm/ }),
    ).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

describe("CustomTuningModal — keyboard and backdrop", () => {
  it("Esc fires onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={onCancel}
      />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Backdrop click fires onCancel", async () => {
    const onCancel = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={() => {}}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={onCancel}
      />,
    );
    await userEvent.click(screen.getByTestId("modal-backdrop"));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("Enter on the name field fires onSave", async () => {
    const onSave = vi.fn();
    render(
      <CustomTuningModal
        mode="create"
        initialName="Custom 1"
        initialStrings={["E", "A", "D", "G", "B", "E"]}
        onSave={onSave}
        onSaveCopy={() => {}}
        onDelete={() => {}}
        onCancel={() => {}}
      />,
    );
    screen.getByLabelText("Name").focus();
    await userEvent.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run src/components/CustomTuningModal.test.tsx` Expected:
module-not-found errors.

- [ ] **Step 3: Create the component**

Create `src/components/CustomTuningModal.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { CHROMATIC_SCALE, type ChromaticNote } from "../theory/notes";

type SixStrings = readonly [
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
  ChromaticNote,
];

type CustomTuningModalProps = {
  mode: "create" | "edit";
  initialName: string;
  initialStrings: SixStrings;
  onSave: (name: string, strings: SixStrings) => void;
  onSaveCopy: (name: string, strings: SixStrings) => void;
  onDelete: () => void;
  onCancel: () => void;
};

const DELETE_CONFIRM_MS = 3000;

export function CustomTuningModal({
  mode,
  initialName,
  initialStrings,
  onSave,
  onSaveCopy,
  onDelete,
  onCancel,
}: CustomTuningModalProps) {
  const [name, setName] = useState(initialName);
  const [strings, setStrings] = useState<SixStrings>(initialStrings);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const deleteTimerRef = useRef<number | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current !== null) {
        window.clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  function updateString(i: number, value: ChromaticNote) {
    const next = [...strings] as ChromaticNote[];
    next[i] = value;
    setStrings(next as unknown as SixStrings);
  }

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    onSave(name, strings);
  }

  function handleSaveCopy() {
    onSaveCopy(name, strings);
  }

  function handleDeleteClick() {
    if (!deleteArmed) {
      setDeleteArmed(true);
      deleteTimerRef.current = window.setTimeout(() => {
        setDeleteArmed(false);
        deleteTimerRef.current = null;
      }, DELETE_CONFIRM_MS);
      return;
    }
    if (deleteTimerRef.current !== null) {
      window.clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    onDelete();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Custom tuning"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        data-testid="modal-backdrop"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40 motion-safe:animate-[fadeIn_200ms_ease-out]"
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-96 max-w-[calc(100vw-2rem)] p-6 rounded-xl border border-line bg-surface-raised shadow-xl motion-safe:animate-[modalEnter_220ms_cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-[fadeIn_220ms_ease-out]"
      >
        <h2 className="text-lg font-semibold text-fg-emphasis mb-4">
          {mode === "create" ? "New custom tuning" : "Edit custom tuning"}
        </h2>

        <label className="block mb-4">
          <span className="block text-xs text-fg-muted uppercase tracking-wide mb-1">
            Name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded bg-surface border border-line text-fg-emphasis"
            aria-label="Name"
            autoFocus
          />
        </label>

        <div className="mb-6">
          <span className="block text-xs text-fg-muted uppercase tracking-wide mb-2">
            Strings (low → high)
          </span>
          <div className="flex gap-2">
            {strings.map((note, i) => (
              <select
                key={i}
                value={note}
                onChange={(e) => updateString(i, e.target.value as ChromaticNote)}
                aria-label={`String ${i + 1}`}
                className="px-2 py-2 rounded bg-surface border border-line text-fg-emphasis font-mono"
                style={{ minWidth: "3.5ch" }}
              >
                {CHROMATIC_SCALE.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="px-3 py-2 rounded text-sm font-semibold bg-surface text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
            >
              {deleteArmed ? "Click again to confirm" : "Delete"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            {mode === "edit" && (
              <button
                type="button"
                onClick={handleSaveCopy}
                className="px-3 py-2 rounded text-sm font-semibold bg-surface text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
              >
                Save as copy
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-2 rounded text-sm font-semibold bg-surface text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded text-sm font-semibold bg-surface-active text-fg-emphasis hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Add the keyframes for modal motion**

Open `src/index.css`. Find any existing `@keyframes` blocks. After them, add:

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalEnter {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

If `@keyframes fadeIn` already exists, skip duplicating it.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/CustomTuningModal.test.tsx` Expected: all 10 tests
pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/CustomTuningModal.tsx src/components/CustomTuningModal.test.tsx src/index.css
git commit --no-verify -m "feat(ui): add CustomTuningModal with create/edit/copy/delete flows"
```

---

## Task 5: Update `UnavailableInTuning` with new copy + "Stay on Note Map" CTA

**Files:**

- Modify: `src/components/UnavailableInTuning.tsx`

- [ ] **Step 1: Replace the component**

Replace `src/components/UnavailableInTuning.tsx` with:

```tsx
import type { ViewId } from "../views/types";
import type { Tuning } from "../theory/tuning";

type UnavailableInTuningProps = {
  viewId: ViewId;
  tuning: Tuning;
  onSwitchToStandard: () => void;
  onSwitchToNoteMap: () => void;
};

const VIEW_LABEL: Record<ViewId, string> = {
  "note-map": "Note Map",
  "scale-positions": "Scale Positions",
  "chord-shapes": "Chord Shapes",
};

export function UnavailableInTuning({
  viewId,
  tuning,
  onSwitchToStandard,
  onSwitchToNoteMap,
}: UnavailableInTuningProps) {
  return (
    <div className="text-center py-20 space-y-4 max-w-md mx-auto">
      <p className="text-fg-emphasis font-semibold text-lg">
        Not available in this tuning
      </p>
      <p className="text-fg-secondary text-sm">
        <span className="font-semibold text-fg-emphasis">{VIEW_LABEL[viewId]}</span>{" "}
        relies on the standard-tuning interval pattern (5-5-5-4-5 semitones between
        adjacent strings). Your current tuning{" "}
        <span className="font-semibold text-fg-emphasis">{tuning.name}</span> has a
        different pattern, so its shapes don't transfer here.
      </p>
      <p className="text-fg-muted text-sm">
        Switch back to <span className="font-semibold">Standard</span> to use this view,
        or stay on <span className="font-semibold">Note Map</span> which works for any
        tuning.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSwitchToStandard}
          className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
        >
          Switch to Standard
        </button>
        <button
          type="button"
          onClick={onSwitchToNoteMap}
          className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
        >
          Stay on Note Map
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -p tsconfig.app.json --noEmit` Expected: the only remaining errors are in
`src/App.tsx` — Task 6 fixes them.

- [ ] **Step 3: Run tests**

Run: `npm test` Expected: any UnavailableInTuning-related test failures (the prop shape
changed). If those tests exist (search: `grep -rn UnavailableInTuning src/`), update
them in this step. If not, all tests should pass except App-related ones.

- [ ] **Step 4: Commit**

```bash
git add src/components/UnavailableInTuning.tsx
git commit --no-verify -m "feat(ui): UnavailableInTuning explains why and offers Note Map fallback"
```

---

## Task 6: Wire `App.tsx` — persisted state, modal mount, widened IDs

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Update imports**

In `src/App.tsx`, replace the tuning import:

```ts
// Before
import { TUNINGS, tuningSupportsView, type TuningId } from "./theory/tuning";

// After
import {
  getTuning,
  tuningSupportsView,
  type AnyTuningId,
  type CustomTuning,
  type CustomTuningId,
} from "./theory/tuning";
import {
  loadCustomTunings,
  saveCustomTunings,
  type StoredState,
} from "./theory/customTuningStorage";
import { CustomTuningModal } from "./components/CustomTuningModal";
```

- [ ] **Step 2: Replace tuning state**

Find this line (around line 46):

```ts
const [tuningId, setTuningId] = useState<TuningId>("standard");
```

Replace with:

```ts
const [persisted, setPersisted] = useState<StoredState>(loadCustomTunings);
const customs = persisted.tunings;
const tuningId: AnyTuningId = persisted.selectedTuningId ?? "standard";
const tuning = getTuning(tuningId, customs);

// Modal state — null = closed; { mode: "create" } = creating; { mode: "edit", id } = editing.
const [modalState, setModalState] = useState<
  null | { mode: "create" } | { mode: "edit"; id: CustomTuningId }
>(null);

useEffect(() => {
  saveCustomTunings(persisted);
}, [persisted]);

function setTuningId(id: AnyTuningId) {
  setPersisted((prev) => ({ ...prev, selectedTuningId: id }));
}
```

- [ ] **Step 3: Replace `TUNINGS[tuningId]` lookups**

Search `src/App.tsx` for `TUNINGS[tuningId]`. There should be 3 occurrences (around
lines 172, 197, 222 — these are `<NoteMapView>`, `<ScalePositionsView>`,
`<ChordShapesView>` props). Replace each with `tuning` (the resolved value from Step 2).

For example:

```tsx
// Before
<NoteMapView
  tuning={TUNINGS[tuningId]}

// After
<NoteMapView
  tuning={tuning}
```

- [ ] **Step 4: Update the view-gating block**

Find:

```tsx
if (!tuningSupportsView(tuningId, selectedView)) {
  return (
    <UnavailableInTuning
      viewId={selectedView}
      tuningId={tuningId}
      onSwitchToStandard={() => setTuningId("standard")}
    />
  );
}
```

Replace with:

```tsx
if (!tuningSupportsView(tuning, selectedView)) {
  return (
    <UnavailableInTuning
      viewId={selectedView}
      tuning={tuning}
      onSwitchToStandard={() => setTuningId("standard")}
      onSwitchToNoteMap={() => setSelectedView("note-map")}
    />
  );
}
```

- [ ] **Step 5: Update the `<TuningSelector>` props**

Find:

```tsx
<TuningSelector tuningId={tuningId} onTuningChange={setTuningId} />
```

Replace with:

```tsx
<TuningSelector
  tuningId={tuningId}
  customs={customs}
  onTuningChange={setTuningId}
  onOpenCreateModal={() => setModalState({ mode: "create" })}
  onOpenEditModal={(id) => setModalState({ mode: "edit", id })}
/>
```

- [ ] **Step 6: Mount the modal**

Just before the closing tag of the outermost layout component (search for the last
`</div>` or `</>` before `function App` returns), insert the modal mount:

```tsx
{
  modalState !== null && (
    <CustomTuningModal
      mode={modalState.mode}
      initialName={
        modalState.mode === "edit"
          ? (customs.find((c) => c.id === modalState.id)?.name ?? "")
          : pickNextCustomName(customs)
      }
      initialStrings={
        modalState.mode === "edit"
          ? (customs.find((c) => c.id === modalState.id)?.strings ?? tuning.strings)
          : tuning.strings
      }
      onSave={(name, strings) => {
        if (modalState.mode === "create") {
          const newTuning: CustomTuning = {
            id: createCustomTuningId(),
            name,
            strings,
            createdAt: Date.now(),
          };
          setPersisted((prev) => ({
            ...prev,
            tunings: [...prev.tunings, newTuning],
            selectedTuningId: newTuning.id,
          }));
        } else {
          setPersisted((prev) => ({
            ...prev,
            tunings: prev.tunings.map((c) =>
              c.id === modalState.id ? { ...c, name, strings } : c,
            ),
          }));
        }
        setModalState(null);
      }}
      onSaveCopy={(name, strings) => {
        const copy: CustomTuning = {
          id: createCustomTuningId(),
          name: `${name} copy`,
          strings,
          createdAt: Date.now(),
        };
        setPersisted((prev) => ({
          ...prev,
          tunings: [...prev.tunings, copy],
          selectedTuningId: copy.id,
        }));
        setModalState(null);
      }}
      onDelete={() => {
        if (modalState.mode !== "edit") return;
        const id = modalState.id;
        setPersisted((prev) => ({
          ...prev,
          tunings: prev.tunings.filter((c) => c.id !== id),
          selectedTuningId:
            prev.selectedTuningId === id ? "standard" : prev.selectedTuningId,
        }));
        setModalState(null);
      }}
      onCancel={() => setModalState(null)}
    />
  );
}
```

- [ ] **Step 7: Add the two helper functions in `App.tsx`**

Above `function App()`, add:

```tsx
function createCustomTuningId(): CustomTuningId {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom:${ts}-${rand}`;
}

function pickNextCustomName(customs: readonly CustomTuning[]): string {
  const usedNumbers = new Set<number>();
  for (const c of customs) {
    const match = c.name.match(/^Custom (\d+)$/);
    if (match) usedNumbers.add(parseInt(match[1], 10));
  }
  let n = 1;
  while (usedNumbers.has(n)) n++;
  return `Custom ${n}`;
}
```

- [ ] **Step 8: Type-check, lint, test**

Run all three:

```bash
npx tsc -p tsconfig.app.json --noEmit
npm run lint
npm test
```

Expected: zero errors from all three. If `App.test.tsx` has tests that use the old
`tuningId` prop shape, fix them. (`grep -n "tuningId" src/App.test.tsx` — search for any
direct state-shape assertions.)

- [ ] **Step 9: Manual smoke test**

If the dev server isn't already running on `localhost:5173`, ask the user to start it
(don't `pkill` vite). Then:

1. Load the app. Open the tuning dropdown — verify the preset groups render, the Custom
   group is hidden, the "+ New custom tuning…" entry is at the bottom.
2. Click "+ New custom tuning…" — modal opens with default name "Custom 1" and strings
   copied from the current tuning. Click Save. Verify the new tuning appears in the
   dropdown's Custom group and is selected.
3. Click the ✎ Edit button — modal opens with the saved values. Change a string, click
   Save. Verify the dropdown reflects the new strings.
4. Reload the page. Verify the custom tuning is still saved and selected.
5. Open the modal again, click Save as copy. Verify a second entry appears with the same
   notes and " copy" suffix.
6. Click Delete on a custom. Verify the button changes to "Click again to confirm".
   Click again to delete.
7. With a non-CAGED custom tuning selected (e.g., DADGAD-flavored strings), click Scale
   Positions — verify the new `UnavailableInTuning` copy renders and "Stay on Note Map"
   CTA switches the view.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire CustomTuningModal, persistence, and widened tuning ids

App.tsx now loads/saves a StoredState with customs + selectedTuningId,
mounts CustomTuningModal at the App level, and resolves AnyTuningId →
Tuning at the boundary. View gating uses the resolved Tuning so customs
participate identically to presets."
```

The pre-commit hook should pass (tsc clean, lint clean, tests pass).

---

## Final verification

- [ ] **Step 1: Full verification suite**

```bash
npm run lint
npx prettier --check .
npx tsc -p tsconfig.app.json --noEmit
npm test
```

All four must pass.

- [ ] **Step 2: Diff sanity check**

```bash
git log --oneline main..HEAD
```

Expected: 7 commits — types/resolvers, storage module, TuningSelector,
CustomTuningModal, UnavailableInTuning, App.tsx wiring, and the original spec doc commit
that already existed on the branch.

- [ ] **Step 3: Confirm spec out-of-scope items stayed out**

Spot-check the diff to confirm none of these crept in:

- No 7-string / 4-string tuning support.
- No flat-spelling note picker.
- No import/export.
- No validation rules on string note choices.
- No changes to ScalePositions / ChordShapes view generalization.

- [ ] **Step 4: Ready for PR**

Branch is `feat/custom-tuning`. Confirm with the user before pushing or opening a PR.
