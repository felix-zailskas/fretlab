# Color Token Refactor — Design

## Goal

Replace all hardcoded color values in the React components with a coherent set of semantic CSS custom properties defined via Tailwind v4's `@theme` directive. Outcome: every color a component renders comes from a named token, call sites read as utility classes (`bg-surface-raised`, `text-muted`), and the same tokens remain usable as `var(--name)` in SVG attributes.

## Tailwind Integration

All tokens live inside a single `@theme {}` block in `src/index.css`. Tailwind v4 emits each token as a CSS custom property AND auto-generates utilities (`bg-*`, `text-*`, `border-*`, etc.) for each. Opacity modifiers work natively — `bg-root/25` produces `--color-root` at 25% alpha. SVG attributes that use `fill="var(--color-fret)"` continue to work because the underlying custom properties are still emitted.

## Token Taxonomy

```css
@theme {
  /* Surfaces — backgrounds, dark to active */
  --color-surface:         #111827;
  --color-surface-raised:  #1F2937;
  --color-surface-active:  #374151;

  /* Borders — subtle to strong. Named "line" so utilities don't double up the border- prefix. */
  --color-line:          #374151;
  --color-line-emphasis: #4B5563;
  --color-line-hover:    #6B7280;
  --color-line-selected: rgb(255 255 255 / 0.9);

  /* Foreground (text) — emphasis to faint */
  --color-fg-primary:    #F9FAFB;
  --color-fg-secondary:  #D1D5DB;
  --color-fg-muted:      #9CA3AF;
  --color-fg-faint:      #6B7280;
  --color-fg-emphasis:   #FFFFFF;

  /* Theory roles — chord/scale interval colors (existing) */
  --color-root:    #3B82F6;
  --color-third:   #F59E0B;
  --color-fifth:   #10B981;
  --color-seventh: #8B5CF6;
  --color-scale:   #6B7280;
  --color-muted:   #374151;

  /* Fretboard render (existing) */
  --color-fretboard: #292524;
  --color-string:    #9CA3AF;
  --color-fret:      #6B7280;
}
```

Total: 17 tokens. The `--color-bg` token is renamed to `--color-surface`. The `--color-text` token is renamed to `--color-fg-primary` (foreground convention; produces clean `text-fg-primary` / `text-fg-muted` utilities without the `text-text-…` doubling).

## Replacement Mapping

Mechanical class replacements applied across `src/`:

| Current | New |
|---|---|
| `bg-gray-900` | `bg-surface` |
| `bg-[var(--color-bg)]` | `bg-surface` |
| `bg-gray-800`, `bg-gray-800/80` | `bg-surface-raised` |
| `bg-gray-700` | `bg-surface-active` |
| `hover:bg-gray-700` | `hover:bg-surface-active` |
| `hover:bg-gray-800` | `hover:bg-surface-raised` |
| `border-gray-700` | `border-line` |
| `border-gray-600` | `border-line-emphasis` |
| `hover:border-gray-500` | `hover:border-line-hover` |
| `border-white/90` | `border-line-selected` |
| `text-[var(--color-text)]` | `text-fg-primary` |
| `text-gray-100`, `text-gray-200`, `text-gray-300` | `text-fg-secondary` |
| `text-gray-400` | `text-fg-muted` |
| `text-gray-500` | `text-fg-faint` |
| `text-white` | `text-fg-emphasis` |
| `bg-blue-900/25 text-blue-300/80 border-blue-800/40` (half-step pill) | `bg-root/25 text-root/80 border-root/40` |
| `bg-emerald-900/25 text-emerald-300/80 border-emerald-800/40` (whole-step pill) | `bg-fifth/25 text-fifth/80 border-fifth/40` |

The `gray-800/80` shade variant collapses into solid `surface-raised`, and `gray-100`/`gray-200`/`gray-300` collapse into a single `text-secondary` tier — both deliberate, agreed during brainstorming. Visual delta is minor.

## Visual Side Effects

1. **`gray-800/80` → solid `surface-raised`**: minor (`m7`, `7`, `m7b5`) chord-card backgrounds become identical to major (`maj7`) backgrounds. Quality distinction lives entirely in the border now.
2. **Step indicator pills**: instead of three distinct `blue-300/800/900` shades the pill uses a single `--color-root` value at 25% / 80% / 40% alpha. Lightness gradient flattens slightly — visually near-identical, not pixel-identical.
3. **`gray-100/200/300` text**: shades collapse to `#D1D5DB` (the gray-300 value). The brightest text usages (note name in scale chip, chord notes line) lose ~10% perceived brightness.

> Note: per-call-site `text-fg-primary` (`#F9FAFB`) is still available — used wherever the spec explicitly maps to it. Only the gray-100/200 → secondary collapse is the visual change above; `--color-fg-primary` and `--color-fg-secondary` remain distinct tokens.

## Files Touched

- `src/index.css` — replace `:root` block with `@theme` block containing the full token set
- `src/App.tsx`
- `src/components/AccidentalToggle.tsx`
- `src/components/DiatonicChords.tsx`
- `src/components/KeySelector.tsx`
- `src/components/Legend.tsx`
- `src/components/ScaleDisplay.tsx`
- `src/components/ViewSelector.tsx`
- `src/components/Fretboard/Fretboard.tsx` *(SVG `fill`/`stroke` references stay as `var(--color-…)`; only updated if any name changed — none did in the SVG layer)*
- `src/components/Fretboard/FretMarkers.tsx` *(unchanged)*
- `src/components/Fretboard/FretboardString.tsx` *(unchanged)*
- `src/components/Fretboard/NoteCircle.tsx` *(unchanged)*
- `src/views/NoteMapView.tsx` *(no color usage; unchanged)*

Tests do not reference colors and are not touched.

## Migration Strategy

Single-shot refactor in one PR/commit batch. The substitution is purely mechanical — partial migration would leave components inconsistent. Steps:

1. Rewrite `src/index.css` `:root` → `@theme` with full token set.
2. Apply replacement mapping component by component.
3. `npm run build && npm run lint && npm run test` after each component to catch typos early.

## Verification

- `npm run build` succeeds.
- `npm run lint` clean.
- `npm run test` — all 36 tests pass.
- `grep -rE '(bg|text|border)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white)' src/components src/views src/App.tsx` returns nothing (no leftover Tailwind palette references).
- `grep -rE 'var\(--color-bg\)|var\(--color-text\)' src/` returns nothing (old names fully replaced).
- Manual: open the dev server, switch keys, toggle accidentals, click chords — confirm visual parity with the documented side effects.
