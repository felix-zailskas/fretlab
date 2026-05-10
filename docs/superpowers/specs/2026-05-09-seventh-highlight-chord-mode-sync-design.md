# Seventh Highlight / Chord Mode Sync

**Date:** 2026-05-09

## Problem

All three views expose a "R 3 5 7" highlight toggle (Legend component) and a
Triads/Sevenths chord mode toggle (DiatonicChords component). When chord mode is
"triads", no 7th note ever exists in the selected chord, so the 7th highlight toggle is
meaningless — it silently promises something it cannot deliver.

## Goal

Disable the 7th highlight toggle when chord mode is "triads", and have the fretboard
never highlight 7th-role notes in that mode, without losing the user's 7th toggle
preference when they switch back to "sevenths".

## Decisions

- **One-directional gate:** chord mode controls 7th toggle availability; the 7th toggle
  does not change chord mode.
- **Preserve preference:** the stored `enabledHighlights` set is never mutated by a
  chord mode change. Derived state handles the exclusion.
- **Disabled, not hidden:** the 7th button stays visible but is greyed out and
  non-interactive in triads mode, so users can see it exists.

## Design

### State & derivation — `App.tsx`

`enabledHighlights: Set<HighlightableRole>` is unchanged. A new derived value is
computed:

```ts
const effectiveHighlights = useMemo(
  () =>
    chordRowMode === "triads"
      ? new Set([...enabledHighlights].filter((r) => r !== "seventh"))
      : enabledHighlights,
  [enabledHighlights, chordRowMode],
);
```

All three view components receive `effectiveHighlights` (not `enabledHighlights`) as
their highlight prop. The `toggleHighlight` callback and `enabledHighlights` state
remain unchanged.

### Legend component — `Legend.tsx`

Add an optional prop:

```ts
disabledRoles?: Set<HighlightableRole>
```

When rendering each role button, if `disabledRoles?.has(role)` is true:

- The button has the `disabled` HTML attribute.
- A greyed-out CSS class is applied.
- `aria-pressed` still reflects the stored `enabledHighlights` value (visual memory of
  prior state).

`App.tsx` passes
`disabledRoles={chordRowMode === "triads" ? new Set(["seventh"]) : undefined}` to every
Legend instance.

### No other changes

- `toggleHighlight` in `App.tsx` is untouched — disabled buttons do not fire click
  events.
- Keyboard shortcuts (`t` / `s`) only affect `chordRowMode`, not highlights.
- `ChordShapesView`, `ScalePositionsView`, and `FretboardView` each pass
  `effectiveHighlights` through to `Legend` and to note-rendering logic — no structural
  changes needed beyond swapping the prop name.

## Testing

- Unit: `Legend` renders the 7th button as `disabled` when `disabledRoles` contains
  `"seventh"`.
- Unit: `Legend` renders the 7th button as enabled when `disabledRoles` is undefined.
- Unit: `effectiveHighlights` derivation excludes `"seventh"` in triads mode and
  preserves it in sevenths mode.
- Component: switching chord mode to triads greys out the 7th button without removing it
  from stored state; switching back to sevenths restores the prior toggle state.
