# String Toggle — Design

## Goal

Let users mute individual strings to focus on the rest. When a string is muted, the
notes that would have rendered on that string still render — but in the muted color
(`var(--color-muted)`), the same dim treatment already used for out-of-window context
notes in Scale Positions. Muting does not reveal additional notes; it only demotes the
visual role of notes that were already going to render.

## Scope

### In scope

- Global `enabledStrings: Set<number>` state in `App.tsx`, ephemeral (no persistence).
- Eye-icon column on the left side of the fretboard, one icon per string row, always
  visible regardless of `startFret`. Open eye = enabled; eye-with-slash = muted.
- Click an eye to toggle that string's enabled state.
- Marker pipelines for all three views (NoteMap, Scale Positions, Chord Shapes) override
  role to `"muted"` for markers on disabled strings.
- A11y: HTML `<button>` elements over the SVG, `aria-pressed`, `aria-label`.
- Tests at fast tier (theory + component) and slow tier (one E2E covering global state
  survives view switch).

### Out of scope (deferred)

- Persistence across reloads. (Per Q5 — matches ephemeral semantics of
  `enabledHighlights`.)
- Per-tuning string state.
- Left-handed (horizontal mirror) support — separate spec.
- Hiding muted-string notes entirely (the spec explicitly chose dim-not-hide).
- Keyboard shortcuts for individual string toggles.

## Background

The marker pipelines in all three views already loop by `stringIndex` and emit
`NoteMarker[]` objects with a `string` field (0 = low E, 5 = high E, matching
`Tuning.strings` indexing). The `NoteDisplayRole` union already includes `"muted"`,
which renders via `--color-muted` at 40% opacity with shrunk radius and font size
(`src/components/Fretboard/NoteCircle.tsx`).

The existing `Legend` toggles for root/3rd/5th/7th demote markers to `"scale"` when a
role is disabled — the same shape we want for string-mute, except the override target is
`"muted"` (not `"scale"`) and applies regardless of the marker's original role.

The Fretboard SVG has a left padding of 50px (`PADDING.left`) before the nut, which
gives us room for the eye column without changing existing geometry.

## State

```ts
// src/App.tsx
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

State is global so muting a string carries across view switches. State is ephemeral
(resets on page reload) to match how `enabledHighlights` behaves today.

`enabledStrings` and `toggleString` are threaded as props to each view alongside the
existing `enabledHighlights` / `onToggleRole` pair.

## Marker pipeline changes

The rule: **if a marker's `stringIndex` is not in `enabledStrings`, override its role to
`"muted"`**. Disabled-string takes precedence over root/3rd/5th/7th/scale and the
existing window-context demotion. The check never adds markers — it only changes the
role of markers that would have rendered anyway.

### `src/theory/chordTones.ts` (Scale Positions)

Extend `BuildChordToneMarkersInput`:

```ts
export type BuildChordToneMarkersInput = {
  // …existing fields
  enabledStrings: ReadonlySet<number>;
};
```

Inside `buildChordToneMarkers`, just before each `result.push(...)`, apply:

```ts
const finalRole = enabledStrings.has(stringIndex) ? role : "muted";
result.push({ string: stringIndex, fret, note: spelled, role: finalRole, … });
```

The existing in-window and `showContext` filters stay unchanged. The muted override is
the last step before pushing.

### `src/theory/chordShapes.ts` (Chord Shapes)

Extend `BuildChordShapeMarkersInput`:

```ts
export type BuildChordShapeMarkersInput = {
  // …existing fields
  enabledStrings: ReadonlySet<number>;
};
```

Thread `enabledStrings` into `placeChordOnCombo`. At the marker push site:

```ts
const finalRole = enabledStrings.has(markerString) ? p.role : "muted";
result.push({
  string: markerString,
  fret: absFret,
  note: spelled,
  role: finalRole,
  ...(isCharacteristic ? { isCharacteristic: true } : {}),
});
```

Shape geometry is unchanged. Notes outside the shape stay absent on disabled strings —
muting never widens the visible set.

### `src/views/NoteMapView.tsx` (Note Map)

This view doesn't go through a separate theory module — it builds markers inline. In the
existing string/fret loop, change the role assignment to a final-role computation:

```ts
// existing role logic determines `role`
const finalRole = enabledStrings.has(stringIndex) ? role : "muted";
result.push({ string: stringIndex, fret, note, role: finalRole, ... });
```

The existing `continue` paths (out-of-key when a key is selected) stay unchanged. So on
a key-selected NoteMap, muting a string dims the in-key notes that string had —
out-of-key notes stay invisible.

## UI

### Layout

The Fretboard component renders the existing SVG. We wrap it in a
`<div className="relative">` (the wrapper does not change the visible bounding box — the
SVG keeps its existing dimensions). On top of the wrapper, an absolutely-positioned
column of 6 HTML `<button>` elements sits at the left edge:

- Buttons are stacked vertically, aligned with each string's `stringY(stringIndex)`.
- Each button is ~32×24 px (above the 24px mobile touch target minimum).
- The buttons live inside the 50px left padding (`PADDING.left = 50`), positioned at
  `left: 8px`.
- Each button contains an inline SVG icon — open eye when the string is enabled,
  eye-with-slash when muted.

### Icon source

Use hand-rolled inline SVG paths (no new dependency). Two 16×16 icons matching Lucide's
visual style:

```tsx
// Enabled
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
  <circle cx="12" cy="12" r="3" />
</svg>

// Muted (eye-off — same shape with a diagonal slash)
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
  <line x1="2" x2="22" y1="2" y2="22" />
</svg>
```

### Visual states

| State             | Color                                                                | Opacity | Notes                                |
| ----------------- | -------------------------------------------------------------------- | ------- | ------------------------------------ |
| Enabled (default) | `var(--fg-muted)`                                                    | 60%     | Hover: `var(--fg-secondary)` at 100% |
| Muted             | `var(--fg-faint)`                                                    | 40%     | Hover: 60%                           |
| `:active` (press) | `transform: scale(0.92)` for 100ms, `ease-out`                       |         |                                      |
| Focus             | `outline: 2px solid var(--ring)` (visible only via `:focus-visible`) |         |                                      |

### Accessibility

- Each toggle is a real `<button type="button">`.
- `aria-pressed={!enabledStrings.has(i)}` — pressed = muted (true) so screen readers
  announce "pressed" when the user has actively muted the string.
- `aria-label="String {N}: {openNote}, {muted ? 'muted' : 'enabled'}"` where N is the
  guitarist-convention string number (1 = high E, 6 = low E). For standard tuning the
  label for string index 0 reads "String 6: E, enabled".
- Tab order is natural top-to-bottom (DOM order = visual order, top-row first).

### Data hooks for E2E

Each toggle button:

```tsx
<button
  data-testid="string-toggle"
  data-string-index={stringIndex}
  data-enabled={enabledStrings.has(stringIndex)}
  aria-pressed={!enabledStrings.has(stringIndex)}
  aria-label={`String ${6 - stringIndex}: ${tuning.strings[stringIndex]}, ${
    enabledStrings.has(stringIndex) ? "enabled" : "muted"
  }`}
>
```

### Prop flow

`Fretboard` gains two new props:

```ts
type FretboardProps = {
  // …existing fields
  enabledStrings: ReadonlySet<number>;
  onToggleString: (stringIndex: number) => void;
  tuning: Tuning; // needed to surface the open-note in aria-label
};
```

The three views each thread `enabledStrings` / `toggleString` from `App.tsx` to their
`<Fretboard>` render. `tuning` is already available in each view.

## Testing

Fast tier:

**`src/components/Fretboard/Fretboard.test.tsx`** (extend or create):

- Renders exactly 6 buttons with `data-testid="string-toggle"`.
- Each button has the correct `data-string-index` (0..5) and `data-enabled` reflecting
  the prop.
- Each button has `aria-pressed` equal to `!enabledStrings.has(i)`.
- Each button's `aria-label` contains the open-string note from the passed tuning.
- Clicking a button calls `onToggleString` with the correct index.

**`src/theory/chordTones.test.ts`** (extend):

- Disabling string 5 demotes every marker with `string === 5` to `role: "muted"`.
- Markers on other strings keep their original role.
- The total marker count does not change vs. a baseline with all strings enabled (no
  widening).

**`src/theory/chordShapes.test.ts`** (extend):

- Same three properties as `chordTones.test.ts` for `buildChordShapeMarkers`.
- A chord shape that touches strings 0-3 produces zero markers on string 5 — disabling
  string 5 does not change that.

**`src/views/NoteMapView.test.tsx`** (extend or add light test):

- Selecting key "C", disabling string 0 → all `data-string="0"` markers carry
  `data-role="muted"`. Other strings' markers unchanged.
- "All" key + string 0 disabled → all 12 frets on string 0 carry `data-role="muted"`.

**`src/App.test.tsx`** (extend):

- Toggle string 5 on Scale Positions view; switch to Chord Shapes view; assert markers
  on string 5 are still muted (proves global state survives the view switch).

Slow tier — **`tests/e2e/string-toggle.spec.ts`** (new):

- Open the app at Scale Positions; click the toggle for string 5; assert markers with
  `data-string="5"` carry `data-role="muted"`.
- Switch to Note Map; assert string 5's markers remain muted.
- Click the toggle again; assert string 5's markers return to a non-muted role.

## File map

New files:

- `tests/e2e/string-toggle.spec.ts`

Modified files:

- `src/App.tsx` — `enabledStrings` state + `toggleString` callback; thread to views.
- `src/components/Fretboard/Fretboard.tsx` — new toggle column; new props
  (`enabledStrings`, `onToggleString`, `tuning`).
- `src/components/Fretboard/Fretboard.test.tsx` — new tests per testing section.
- `src/theory/chordTones.ts` — `BuildChordToneMarkersInput.enabledStrings`; role
  override at push site.
- `src/theory/chordTones.test.ts` — new tests per testing section.
- `src/theory/chordShapes.ts` — `BuildChordShapeMarkersInput.enabledStrings`; thread to
  `placeChordOnCombo`; role override at push site.
- `src/theory/chordShapes.test.ts` — new tests per testing section.
- `src/views/NoteMapView.tsx` — role override at push site; thread props.
- `src/views/NoteMapView.test.tsx` (if exists) — new tests per testing section.
- `src/views/ScalePositionsView.tsx` — thread `enabledStrings` prop to its marker call.
- `src/views/ChordShapesView.tsx` — thread `enabledStrings` prop to its marker call.
- `src/App.test.tsx` — new integration test.
