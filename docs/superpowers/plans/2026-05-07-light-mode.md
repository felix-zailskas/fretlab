# Light Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a light color theme that auto-syncs with the OS `prefers-color-scheme`
preference and can be manually overridden via a header toggle cycling Auto → Light →
Dark.

**Architecture:** All color tokens are already CSS custom properties in `@theme`; light
mode redefines the surface/fg subset via a media query and `[data-theme]` attribute
selector. React state (`"auto" | "light" | "dark"`) drives
`document.documentElement.dataset.theme`; a new `ThemeToggle` component lives in the
header alongside the existing `AccidentalToggle`.

**Tech Stack:** React 18, Tailwind CSS v4 (`@theme` custom tokens), TypeScript strict.

---

## Task 1: CSS — add light palette and manual-override selectors

**Files:**

- Modify: `src/index.css`

- [ ] **Step 1: Add the light-mode media query block**

After the closing `}` of the `@theme { … }` block in `src/index.css`, append:

```css
/* Light mode — follows OS preference */
@media (prefers-color-scheme: light) {
  :root {
    --color-surface: #ffffff;
    --color-surface-raised: #f3f4f6;
    --color-surface-active: #e5e7eb;
    --color-line: #e5e7eb;
    --color-line-emphasis: #d1d5db;
    --color-line-hover: #9ca3af;
    --color-line-selected: rgba(0 0 0 / 0.9);
    --color-fg-primary: #111827;
    --color-fg-secondary: #374151;
    --color-fg-muted: #6b7280;
    --color-fg-faint: #9ca3af;
    --color-fg-emphasis: #030712;
  }
}

/* Manual override — higher specificity ([0,2,0]) beats media-query :root ([0,1,0]) */
:root[data-theme="light"] {
  --color-surface: #ffffff;
  --color-surface-raised: #f3f4f6;
  --color-surface-active: #e5e7eb;
  --color-line: #e5e7eb;
  --color-line-emphasis: #d1d5db;
  --color-line-hover: #9ca3af;
  --color-line-selected: rgba(0 0 0 / 0.9);
  --color-fg-primary: #111827;
  --color-fg-secondary: #374151;
  --color-fg-muted: #6b7280;
  --color-fg-faint: #9ca3af;
  --color-fg-emphasis: #030712;
}

:root[data-theme="dark"] {
  --color-surface: #111827;
  --color-surface-raised: #1f2937;
  --color-surface-active: #374151;
  --color-line: #374151;
  --color-line-emphasis: #4b5563;
  --color-line-hover: #6b7280;
  --color-line-selected: rgb(255 255 255 / 0.9);
  --color-fg-primary: #f9fafb;
  --color-fg-secondary: #d1d5db;
  --color-fg-muted: #9ca3af;
  --color-fg-faint: #6b7280;
  --color-fg-emphasis: #ffffff;
}
```

Theory tokens (`--color-root`, `--color-third`, `--color-fifth`, `--color-seventh`,
`--color-scale`, `--color-muted`, `--color-characteristic`, `--color-mode`) and
fretboard tokens (`--color-fretboard`, `--color-string`, `--color-fret`) are
intentionally omitted — they work on both light and dark backgrounds, and the fretboard
stays dark in both modes.

- [ ] **Step 2: Lint, format, test**

```bash
npm run lint -- --fix
npx prettier --write .
npm test
```

Expected: all 149 tests pass, no lint errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
feat(ui): add light mode CSS palette via media query and data-theme override

Redefines surface/fg custom properties for light mode. Auto-syncs with OS
via prefers-color-scheme; [data-theme] attribute selectors (specificity
[0,2,0]) allow manual override. Theory and fretboard colors unchanged.
EOF
)"
```

---

## Task 2: ThemeToggle component

**Files:**

- Create: `src/components/ThemeToggle.tsx`

- [ ] **Step 1: Create the component**

```tsx
type ThemeToggleProps = {
  mode: "auto" | "light" | "dark";
  onCycle: () => void;
};

export function ThemeToggle({ mode, onCycle }: ThemeToggleProps) {
  const label = mode === "auto" ? "Auto" : mode === "light" ? "Light" : "Dark";
  return (
    <button
      type="button"
      onClick={onCycle}
      className="px-3 py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
    >
      {label}
    </button>
  );
}
```

`py-3` gives a 44px touch target (12 + 20 + 12), consistent with the iPad polish pass.

- [ ] **Step 2: Lint, format, test**

```bash
npm run lint -- --fix
npx prettier --write .
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "$(cat <<'EOF'
feat(ui): add ThemeToggle component

Cycles Auto → Light → Dark → Auto on each click. Styled to match the
existing AccidentalToggle pill (py-3 for 44px touch target).
EOF
)"
```

---

## Task 3: Wire state and toggle into App.tsx

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Add import**

At the top of `src/App.tsx`, add `ThemeToggle` to the existing component imports:

```tsx
import { ThemeToggle } from "./components/ThemeToggle";
```

- [ ] **Step 2: Add themeMode state**

After the existing `useState` calls (around line 106, after `endFret` state), add:

```tsx
const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");
```

- [ ] **Step 3: Add useEffect to sync data-theme attribute**

After the `themeMode` state line, add:

```tsx
useEffect(() => {
  if (themeMode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = themeMode;
  }
}, [themeMode]);
```

- [ ] **Step 4: Add cycleTheme handler**

After the existing `handleFretRangeChange` callback, add:

```tsx
const cycleTheme = useCallback(() => {
  setThemeMode((prev) =>
    prev === "auto" ? "light" : prev === "light" ? "dark" : "auto",
  );
}, []);
```

- [ ] **Step 5: Insert ThemeToggle into the top bar JSX**

Locate the top-bar `<div className="flex items-center gap-4">` (around line 152). It
currently contains `<AccidentalToggle>` followed by `<FretRangeControl>`. Insert
`<ThemeToggle>` between them:

```tsx
<div className="flex items-center gap-4">
  <AccidentalToggle
    accidentalStyle={accidentalStyle}
    onChange={(style) => dispatchTonal({ type: "set-accidental", style })}
  />
  <ThemeToggle mode={themeMode} onCycle={cycleTheme} />
  <FretRangeControl
    startFret={startFret}
    endFret={endFret}
    onChange={handleFretRangeChange}
  />
</div>
```

- [ ] **Step 6: Lint, format, test**

```bash
npm run lint -- --fix
npx prettier --write .
npm test
```

Expected: all tests pass, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx
git commit -m "$(cat <<'EOF'
feat(ui): wire ThemeToggle into App header

Adds themeMode state ("auto" | "light" | "dark"), a useEffect that sets
or removes document.documentElement.dataset.theme, and a cycleTheme
handler. ThemeToggle placed in the top bar between AccidentalToggle and
FretRangeControl. Session-only — resets to "auto" on reload.
EOF
)"
```
