# Fretlab v1 Polish Pass Design Spec

**Date:** 2026-05-07 **Status:** Retroactive (plan written first; this spec is the
decision record)

---

## Goal

Make Fretlab reliably usable on an iPad on a music stand by fixing touch targets, header
layout, and modal-state visual ambiguity; extract a testable pure reducer as a side
effect of touching that code.

---

## Context

Fretlab's primary deployment target is an iPad propped on a music stand during practice.
This means:

- **Viewport**: iPad portrait ~768×1024px, landscape ~1024×768px. The app must render
  without horizontal overflow and remain fully operable at both orientations.
- **Input**: Finger taps, not mouse clicks. Apple HIG minimum touch target is 44×44pt.
  All interactive controls must meet this.
- **Viewing distance**: Header controls are read from arm's length. Visually similar
  controls must be distinguishable at a glance.
- **Context**: v1 release cleanup — no new features, no new views. Fixes and testability
  only.

---

## Scope

**In scope:**

1. iPad responsive layout — focal row and touch targets
2. Modal-active color distinction — ModeSelector vs KeySelector visual ambiguity
3. `tonalReducer` extraction and unit tests

**Out of scope:**

- V2 modal parent-scale extension (harmonic/melodic minor)
- Reference tab (circle of fifths, chord diagrams)
- Theory layer restructuring
- New features of any kind

---

## Area 1: iPad Responsiveness

### Problem

Three separate issues combine to degrade the iPad experience:

**A. Focal row overflow.** The focal-control row wraps Mode below Key on iPad portrait.
`flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap` switches to row layout at `sm`
(640px). But KeySelector (~542px) + ModeSelector (~553px) = ~1095px — far exceeding iPad
portrait's ~736px available width. The Mode div wraps to a second line, which is
acceptable layout-wise but creates an awkward visual gap between the two selectors, and
the orphaned appearance can confuse users reading the header quickly.

**B. Undersized touch targets.** All pill buttons and toggles use `py-1.5` (6px each
side). With `text-sm` (20px line-height): 6+20+6 = 32px total height — well below Apple
HIG's 44pt minimum. On a touch screen this results in tap misses, especially for
sharps/flats keys and mode names.

**C. Fretboard scaling** (observation, no fix needed). The SVG uses
`className="w-full"` + `viewBox="0 0 970 230"` + `preserveAspectRatio="xMidYMid meet"`.
At iPad portrait, scale ≈ 736/970 = 0.759×. Note circles scale from r=13→10px, text from
11→8px. This is readable for practice use. No code change is made; a `min-w-[640px]` +
`overflow-x-auto` fix is documented as a fallback if visual testing proves otherwise.

### Design Decisions

**Focal row:** Change breakpoint from `sm:flex-row` to `xl:flex-row`. The `xl`
breakpoint (1280px) is the first viewport width where both selectors fit side by side
(1280 − 32px padding = 1248px > 1095px). Below xl they stack cleanly as two labeled
rows. Remove `flex-wrap` since at xl they no longer need it.

```
Before: flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap
After:  flex flex-col xl:flex-row xl:items-end gap-4
```

**Touch targets:**

- Primary interactive buttons: `py-1.5` → `py-3` (12+20+12 = 44px, exactly HIG minimum)
- Secondary toggles (Legend, PositionToggles — less frequently accessed): `py-1` →
  `py-2` (8+20+8 = 36px, acceptable for lower-frequency controls)
- Chord cards: unchanged — already have `min-h-[6.5rem]` (104px)
- Chord row mode toggle (Triads/Sevenths): classified as primary, `py-1.5` → `py-3`
- FretRangeControl: trigger button only (`py-1.5` → `py-3`); inner number inputs are not
  interactive in the same tap-target sense and are unchanged

**Non-changes considered:**

- Chord row grid (`grid-cols-2 sm:grid-cols-4 lg:grid-cols-7`): already correct. 4
  columns at iPad portrait (768px), 7 at iPad landscape (1024px). No change.
- ScaleDisplay: already has `overflow-x-auto overflow-y-clip`. Pills fit within 736px.
  No change.

### Touch Target Summary

| Component                  | File                                  | Change            |
| -------------------------- | ------------------------------------- | ----------------- |
| KeySelector pills          | `src/components/KeySelector.tsx`      | `py-1.5` → `py-3` |
| ModeSelector pills         | `src/components/ModeSelector.tsx`     | `py-1.5` → `py-3` |
| AccidentalToggle           | `src/components/AccidentalToggle.tsx` | `py-1.5` → `py-3` |
| ViewSelector tabs          | `src/components/ViewSelector.tsx`     | `py-1.5` → `py-3` |
| FretRangeControl trigger   | `src/components/FretRangeControl.tsx` | `py-1.5` → `py-3` |
| DiatonicChords mode toggle | `src/components/DiatonicChords.tsx`   | `py-1.5` → `py-3` |
| Legend toggles             | `src/components/Legend.tsx`           | `py-1` → `py-2`   |
| PositionToggles            | `src/components/PositionToggles.tsx`  | `py-1` → `py-2`   |

---

## Area 2: Modal-Active Color Distinction

### Problem

When a non-Ionian mode is active, both the active KeySelector pill and the active
ModeSelector pill render with `bg-root` (`--color-root: #3b82f6`, blue-500). They sit
adjacent in the header's focal row. From arm's length, the user cannot distinguish
"which of these two controls I'm looking at is the Key selector and which is the Mode
selector" — they appear to be the same kind of control in the same state.

The current ModeSelector behavior (non-Ionian → `bg-root text-fg-emphasis`) was
intentional: it signals "you're in a modal practice frame." That signal is valuable but
its execution produces the collision.

### Design Decision

Add a new semantic color token `--color-mode` for the modal-active state. The token is
amber (`#f59e0b`, Tailwind amber-400), which is:

- Visually orthogonal to root blue (#3b82f6) — maximally distinct at a glance
- High contrast with dark text: `text-surface` (`#111827`) on `#f59e0b` = contrast ratio
  ~7.4:1 (WCAG AA+)
- Warm — communicates "practice mode / altered state" rather than a theory-role meaning

ModeSelector active states after change:

- **Ionian active**: `bg-surface-active text-fg-emphasis` (gray) — signals "default, no
  modal color needed"
- **Non-Ionian active**: `bg-mode text-surface` (amber, dark text) — signals "modal
  practice frame"
- **Inactive pills**: unchanged
  (`bg-surface-raised text-fg-secondary hover:bg-surface-active`)

KeySelector active state: unchanged (`bg-root text-fg-emphasis`, blue/white). Key and
Mode are now visually distinct at a glance.

**Alternative considered:** A ring/border treatment on Mode instead of a fill change.
Rejected: a solid fill color is more legible at arm's length than a border; border
treatments require sufficient background contrast that the tab bg can't provide.

### New CSS Token

Added to `src/index.css` `@theme` block:

```css
--color-mode: #f59e0b; /* amber-400 — modal-active accent, distinct from root blue */
```

This follows the project's semantic-token convention (`--color-root`, `--color-third`,
etc.) and generates `bg-mode`, `text-mode`, `border-mode` Tailwind utilities.

### Files Affected

| File                              | Change                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| `src/index.css`                   | Add `--color-mode: #f59e0b` to `@theme`                                |
| `src/components/ModeSelector.tsx` | Non-Ionian active: `bg-root text-fg-emphasis` → `bg-mode text-surface` |

---

## Area 3: tonalReducer Extraction

### Problem

`src/App.tsx` contains `tonalReducer` inline alongside React component code. The reducer
is a pure function — it takes `(TonalState, TonalAction) → TonalState` with no React
dependencies. Pure functions in component files cannot be unit tested without a React
render environment.

The reducer manages three coupled pieces of state: `key`, `mode`, and `accidentalStyle`.
Its logic is non-trivial:

- Auto-sets `accidentalStyle` from the parent major scale's natural preference on
  `set-key` and `set-mode`
- Swaps the key to its enharmonic equivalent when style changes, so the active key stays
  visible in the `KeySelector` list (which filters by `accidentalStyle`)
- Short-circuits on neutral parent (C major → `null` → preserve current style)
- Manual `set-accidental` overrides stick until the next `set-key` or `set-mode`

### Design Decision

Extract to `src/tonalReducer.ts` (camelCase, following project convention for plain TS
modules). Export four names:

```ts
export const ENHARMONIC_KEY_SWAP: Record<string, string>;
export type TonalState = { key: string; mode: Mode; accidentalStyle: AccidentalStyle };
export type TonalAction =
  | { type: "set-key"; key: string }
  | { type: "set-mode"; mode: Mode }
  | { type: "set-accidental"; style: AccidentalStyle };
export function tonalReducer(state: TonalState, action: TonalAction): TonalState;
```

`App.tsx` imports `tonalReducer` from `"./tonalReducer"` and passes it to `useReducer`.
No behavior change.

**Location rationale:** `src/tonalReducer.ts` rather than `src/theory/tonalReducer.ts`.
The theory layer (`src/theory/`) holds raw music-theory calculations (note names,
intervals, chord formulas). `tonalReducer` owns _application state_ — it coordinates
user intent with theory outputs. It sits at the app layer, not the theory layer.

### Test Coverage

Unit tests in `src/tonalReducer.test.ts` (following `foo.ts → foo.test.ts` convention):

| Test group       | Cases                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `set-key`        | Basic key change (style matches); neutral parent preserves style; flat-natural key in sharp mode → swaps key + sets flat; sharp-natural key in flat mode → sets sharp, no swap; key matches current style → no swap |
| `set-mode`       | Basic mode change (style matches); neutral parent (D Dorian) preserves style; mode implies flat parent → sets flat; mode implies sharp parent + key has enharmonic → swaps key, sets sharp                          |
| `set-accidental` | No-op when style already matches (same reference returned); flat→sharp swaps Bb→A#; sharp→flat swaps A#→Bb; key without enharmonic (G) stays G; C#→Db on flat toggle                                                |
| Exhaustiveness   | All three action types execute without throwing (TypeScript compile-time exhaustiveness is the primary guard; this validates at runtime)                                                                            |

### Files Affected

| File                       | Change                                                               |
| -------------------------- | -------------------------------------------------------------------- |
| `src/tonalReducer.ts`      | New file — reducer, types, ENHARMONIC_KEY_SWAP                       |
| `src/tonalReducer.test.ts` | New file — 11 unit tests                                             |
| `src/App.tsx`              | Remove inline reducer, types, constant; import from `./tonalReducer` |

---

## Out of Scope

- `localStorage` persistence for any UI state
- V2 modal parent-scale extension (harmonic minor, melodic minor) — see
  `docs/design/2026-05-07-modal-parent-scales-extension.md`
- Reference tab (circle of fifths, theory formulas)
- Any new components or views
- Fretboard min-width / scroll fallback (implemented only if visual testing shows note
  text unreadable at iPad portrait scale)
