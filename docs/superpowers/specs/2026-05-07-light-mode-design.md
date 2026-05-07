# Light Mode Design

**Date:** 2026-05-07 **Status:** Approved

## Goal

Add a light color theme that auto-syncs with the OS/browser `prefers-color-scheme`
preference, with a manual override toggle in the header.

## Approach

CSS custom property override via media query and `data-theme` attribute. No changes to
any component's color classes — all 40+ token usages update automatically.

## CSS Changes (`src/index.css`)

The existing `@theme` block (dark values) remains as the default. Two blocks are added
after it:

### Auto-sync block

```css
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
```

### Manual override blocks

```css
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
  /* identical to the @theme defaults */
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

`:root[data-theme="..."]` combines a pseudo-class [0,1,0] and an attribute selector
[0,1,0] for total specificity [0,2,0], which beats the plain `:root` [0,1,0] inside the
media query. This means the explicit override always wins over the OS preference.

### Tokens that do NOT change between modes

- `--color-root`, `--color-third`, `--color-fifth`, `--color-seventh`, `--color-scale`,
  `--color-muted`, `--color-characteristic`, `--color-mode` — theory interval colors
  work on both light and dark backgrounds.
- `--color-fretboard`, `--color-string`, `--color-fret` — the fretboard stays dark in
  both modes (realistic dark wood appearance; white note-circle text remains legible
  against the dark board regardless of UI chrome mode).

## React State (`src/App.tsx`)

One new state field:

```tsx
const [themeMode, setThemeMode] = useState<"auto" | "light" | "dark">("auto");

useEffect(() => {
  if (themeMode === "auto") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = themeMode;
  }
}, [themeMode]);
```

- `"auto"` (default): no `data-theme` attribute on `<html>`; OS media query controls the
  theme.
- `"light"` / `"dark"`: sets `data-theme` attribute, overriding the media query.
- Session-only: resets to `"auto"` on page reload (no `localStorage`).

## New Component (`src/components/ThemeToggle.tsx`)

A single button that cycles through the three states on each click:

```
Auto → Light → Dark → Auto → …
```

Props:

```ts
type ThemeToggleProps = {
  mode: "auto" | "light" | "dark";
  onCycle: () => void;
};
```

Button label shows current state: `"Auto"`, `"Light"`, or `"Dark"`. Styled identically
to `AccidentalToggle` and `FretRangeControl`
(`px-3 py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer`).

Note: uses `py-3` (44px touch target) consistent with the in-progress iPad polish pass.

## Header Placement (`src/App.tsx`)

Placed in the top bar between AccidentalToggle and FretRangeControl:

```
[ Fretlab ]    [ ♭  ♯ ]  [ Auto ]  [ Frets: 0–12 ▾ ]
```

The `onCycle` handler in App.tsx cycles the state:

```ts
const cycleTheme = useCallback(() => {
  setThemeMode((prev) =>
    prev === "auto" ? "light" : prev === "light" ? "dark" : "auto",
  );
}, []);
```

## Out of Scope

- Persisting the user's override in `localStorage` (session-only by design).
- Per-component `dark:` Tailwind variants.
- System indicator in the title bar or favicon.
