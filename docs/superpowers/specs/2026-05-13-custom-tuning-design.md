# Custom Tuning — Design

## Goal

Let users define their own tunings by picking a note for each of the 6 open strings,
save multiple named custom tunings, and have those tunings persist across page reloads.
Custom tunings participate in the existing tuning system as first-class entries: they
appear in the tuning selector, are passed to views via the same `Tuning` prop, and are
gated against view compatibility by the same `isCagedCompatible` derivation as presets.

## Scope

### In scope

- A `CustomTuning` data model and a runtime registry separate from the preset `TUNINGS`.
- Multiple saved custom tunings per user, each with a user-given name.
- Persistence to `localStorage` (single key, versioned schema).
- A modal UI (`CustomTuningModal`) for creating, editing, forking, and deleting custom
  tunings.
- A "Custom" group added to the tuning dropdown, plus a `+ New custom tuning…` sentinel.
- An `✎ Edit` button next to the selector, enabled only when a custom tuning is
  selected.
- Improved copy on the existing `UnavailableInTuning` screen to explain _why_ a tuning
  blocks a view and offer a "Stay on Note Map" CTA.
- Persistence of the currently-selected tuning id (preset or custom) so reload restores
  the last view.

### Out of scope (deferred)

- Generalizing ScalePositions and ChordShapes to non-CAGED tunings (vision doc).
- Algorithmizing hardcoded music-theory tables — modes, intervals, degree labels — from
  a single source of truth (vision doc).
- Scale-degree spelling fix: C# Ionian should spell B# rather than the enharmonic C
  (vision doc).
- Custom tunings with a string count other than 6.
- Enharmonic (flat) note spellings in the note picker. v1 uses the same sharp-only set
  already in `TUNINGS`.
- Import / export of custom tunings.
- Validation rules on string note choices. Any combination of 6 notes is allowed.

## Background

The existing tuning system (see `src/theory/tuning.ts`) defines:

- A `Tuning` type with `{ id, name, strings: readonly [Note × 6] }` ordered low → high.
- A `TUNINGS: Record<TuningId, Tuning>` registry of presets.
- `TUNING_GROUPS` driving the selector's grouped layout.
- `isCagedCompatible(tuning)` derived from adjacent-string semitone deltas vs.
  `STANDARD_INTERVALS = [5, 5, 5, 4, 5]`.
- `VIEWS_BY_TUNING` derived at module load: CAGED-compatible tunings unlock all three
  views; others unlock only NoteMap.
- `tuningSupportsView(tuningId, view)` — single predicate consumed by view gating in
  `App.tsx`.

The `Fretboard` component and all theory modules that consume `tuning` already accept a
fully-resolved `Tuning` object as a prop. They never look tunings up by id, so they need
no changes to support custom tunings — the resolution from id to `Tuning` happens at the
`App.tsx` boundary.

## Data model

```ts
// src/theory/tuning.ts (additions)

export type CustomTuningId = `custom:${string}`; // opaque, stable across edits
export type AnyTuningId = TuningId | CustomTuningId;

export type CustomTuning = {
  id: CustomTuningId;
  name: string;
  strings: readonly [Note, Note, Note, Note, Note, Note]; // low → high
  createdAt: number; // sort key
};

export function getTuning(id: AnyTuningId, customs: readonly CustomTuning[]): Tuning;

export function getAllTuningIds(
  customs: readonly CustomTuning[],
): readonly AnyTuningId[];
```

**Decisions:**

- IDs are opaque (`custom:${createdAt}-${shortRandom}`) and stable across edits. A
  content-addressed alternative was considered and rejected: it would rewrite the id on
  every edit and forbid two saved tunings with identical notes.
- `CustomTuning` is structurally compatible with `Tuning` (just adds `createdAt`), so
  `isCagedCompatible`, `tuningSupportsView`, and `Fretboard` keep working unchanged.
- No per-tuning override flag for view compatibility. `isCagedCompatible` is always
  derived from the string intervals.
- `AnyTuningId` widens `TuningId` at the `App.tsx` state boundary; downstream code
  receives a resolved `Tuning` and is unaware of the distinction.

## Persistence

```ts
// src/theory/customTuningStorage.ts (new module)

const STORAGE_KEY = "fretlab:custom-tunings:v1";

type StoredState = {
  version: 1;
  tunings: CustomTuning[];
  selectedTuningId: AnyTuningId | null;
};

export function loadCustomTunings(): StoredState; // defaults on parse failure
export function saveCustomTunings(s: StoredState): void;
```

**Decisions:**

- Single key, atomic read/write. Versioned (`:v1`) so a future schema change is a new
  key, not a migration.
- `selectedTuningId` is persisted alongside the list. On load, if it references a custom
  id that no longer exists, fall back to `"standard"`.
- Parse failure (corrupt JSON, missing fields) returns defaults; we log to console for
  visibility during dev but never throw to the caller.
- `localStorage` access is guarded by `typeof window !== "undefined"` so the module can
  be imported by node-environment unit tests without exploding.

App-level integration:

```ts
const [state, setState] = useState<StoredState>(loadCustomTunings);
useEffect(() => {
  saveCustomTunings(state);
}, [state]);
```

## UI

### Tuning dropdown

The existing `TuningSelector` gains one new group (rendered only when populated) and one
always-present sentinel item:

```
Standard
  └─ Standard (E A D G B E)
Open
  └─ Open D, Open G, …
Drop
  └─ Drop D, …
Modal
  └─ DADGAD, …
Custom                              ← only rendered when customs.length > 0
  ├─ My DADGAD
  └─ Weird thing
+ New custom tuning…                ← always-present sentinel; opens modal in create mode
```

Next to the dropdown:

- **✎ Edit** button. Enabled only when the current selection is a custom tuning. When
  disabled, rendered with `opacity: 0.5; cursor: not-allowed` and `aria-disabled`.
  Clicking opens the modal in edit mode for the selected tuning.

### CustomTuningModal

A new component, `src/components/CustomTuningModal.tsx`.

Layout:

```
┌─ Custom tuning ──────────────────────────┐
│  Name: [ My DADGAD              ]        │
│                                          │
│  Strings (low → high):                   │
│  [D▾] [A▾] [D▾] [G▾] [A▾] [D▾]           │
│                                          │
│  [Delete]            [Cancel]   [Save]   │
│                              [Save as copy]  ← edit mode only
└──────────────────────────────────────────┘
```

**Create mode** (entered via `+ New custom tuning…`):

- Name pre-filled with `"Custom 1"`, `"Custom 2"`, … picking the smallest unused index.
- Strings default to the currently-selected tuning.
- No `Delete` button.
- On Save: add to list, select the new tuning, close the modal.

**Edit mode** (entered via ✎):

- Name and strings populated from the current custom tuning.
- On Save: mutate the existing entry in place. Selection stays on the same id.
- `[Save as copy]` secondary button: creates a new entry with the current name + " copy"
  (deduped) and the current strings; selects the new entry.
- `Delete`: two-stage inline confirm. First click swaps the button label to
  `Click again to confirm` for 3 seconds; second click within that window removes the
  tuning. If the deleted tuning was selected, fall back to `"standard"`.

**Note picker:**

- 12-note chromatic dropdown using the same sharp spellings used by the existing
  `TUNINGS` registry: `C, C#, D, D#, E, F, F#, G, G#, A, A#, B`.
- Width fixed (`min-width: 3.5ch`) so changing a value doesn't reflow the row.

**Validation:** none. Any combination of 6 notes is accepted, including duplicates and
non-monotonic orderings. The fretboard renders correctly regardless.

### Motion and interaction

These choices are baked into the spec rather than discovered during implementation:

| Element                                             | Behavior                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Modal enter                                         | `opacity 0 → 1`, `scale 0.96 → 1`, 220ms, `cubic-bezier(0.23, 1, 0.32, 1)`, `transform-origin: center`                                   |
| Modal exit                                          | 160ms, same easing                                                                                                                       |
| Buttons (Save / Cancel / Delete / Save as copy / ✎) | `:active { transform: scale(0.97) }`, `transition: transform 160ms ease-out`                                                             |
| Note pickers                                        | Native `<select>` for v1. Skip custom dropdown styling.                                                                                  |
| `prefers-reduced-motion`                            | Drop the scale on modal enter/exit; keep the opacity fade                                                                                |
| Keyboard                                            | `Esc` cancels and closes. `Enter` saves (when focus is in the name field or any string picker). `Tab` order: name → 6 strings → `[Save]` |
| Backdrop click                                      | Cancels and closes                                                                                                                       |
| Stagger on string pickers                           | None — they're a single semantic group                                                                                                   |

### `UnavailableInTuning` copy update

Current screen explains the view isn't available. Updated copy names the user's tuning
and explains the underlying constraint, and adds a second CTA pointing at Note Map:

> **Not available in this tuning**
>
> This view relies on the standard-tuning interval pattern (5-5-5-4-5 semitones between
> adjacent strings). Your current tuning **{tuning.name}** has a different pattern, so
> its shapes don't transfer here.
>
> Switch back to **Standard** to use this view, or stay on **Note Map** which works for
> any tuning.
>
> `[Switch to Standard]` `[Stay on Note Map]`

The `[Stay on Note Map]` CTA invokes the existing `setSelectedView("note-map")` path.

## State flow

1. `App.tsx` loads persisted state on mount via `loadCustomTunings()`.
2. State shape in `App.tsx`:
   ```ts
   const [persisted, setPersisted] = useState<StoredState>(loadCustomTunings);
   const { tunings: customs, selectedTuningId } = persisted;
   ```
3. `selectedTuningId: AnyTuningId | null` replaces the existing
   `useState<TuningId>("standard")`. `null` is normalized to `"standard"` at read time.
4. The resolved `Tuning` is computed via `getTuning(selectedTuningId, customs)` and
   passed to views as it is today.
5. `useEffect` writes the full `StoredState` back to localStorage on any change.
6. `TuningSelector` receives `customs`, `selectedTuningId`, `onSelectTuning`,
   `onOpenCreateModal`. The selector handles the `+ New custom tuning…` sentinel by
   calling `onOpenCreateModal()` instead of `onSelectTuning()`.
7. `CustomTuningModal` is rendered at the App level (so it can see `customs` /
   `setPersisted`) and is opened in create mode via `onOpenCreateModal` or in edit mode
   via a separate `onOpenEditModal(id)` from the ✎ button.

## Testing

Fast tier only. No Playwright additions.

**`src/theory/customTuningStorage.test.ts`** (node env):

- Round-trip save/load preserves all fields.
- Corrupt JSON in `localStorage` returns defaults without throwing.
- Missing `version` field returns defaults.
- `selectedTuningId` pointing at a non-existent custom id falls back to `"standard"` on
  load.
- Importing the module in a no-`window` environment doesn't throw.

**`src/theory/tuning.test.ts`** (extension, node env):

- `getTuning(id, customs)` resolves preset ids and custom ids correctly.
- `getAllTuningIds(customs)` returns preset ids in their canonical order followed by
  custom ids in `createdAt` order.
- `isCagedCompatible` returns `true` for a custom tuning whose intervals match
  `[5, 5, 5, 4, 5]` (e.g., `E A D G B E`) and `false` for one that doesn't (e.g.,
  `D A D G A D`).

**`src/components/CustomTuningModal.test.tsx`** (jsdom env, RTL):

- Create flow: open in create mode, fill name and strings, Save → new entry exists in
  the list and is selected.
- Edit flow: open in edit mode, change a string, Save → entry mutated in place, id
  unchanged.
- Save as copy: in edit mode, click `[Save as copy]` → a second entry exists with the
  copied notes; original is unchanged; the new copy becomes selected.
- Delete: first click arms the button; second click within 3s removes the entry; if it
  was selected, selection falls back to `"standard"`.
- Delete revert: first click arms the button; waiting >3s reverts the label without
  deleting.
- Keyboard: `Esc` cancels (no mutation), `Enter` saves.

**`src/components/TuningSelector.test.tsx`** (extension, jsdom env):

- `+ New custom tuning…` sentinel calls `onOpenCreateModal`, not `onSelectTuning`.
- Saved customs appear in a "Custom" group.
- "Custom" group header is hidden when `customs.length === 0`.
- ✎ Edit button is disabled when the current selection is a preset; enabled when it's a
  custom.

**`src/App.test.tsx`** (light integration, jsdom env):

- Selecting a non-CAGED-compatible custom tuning shows `UnavailableInTuning` for
  ScalePositions and ChordShapes.
- Selecting a CAGED-compatible custom tuning unlocks all three views.
- `UnavailableInTuning`'s "Stay on Note Map" CTA switches the view to Note Map.

## File map

New files:

- `src/theory/customTuningStorage.ts`
- `src/theory/customTuningStorage.test.ts`
- `src/components/CustomTuningModal.tsx`
- `src/components/CustomTuningModal.test.tsx`

Modified files:

- `src/theory/tuning.ts` — add `CustomTuningId`, `AnyTuningId`, `CustomTuning`,
  `getTuning`, `getAllTuningIds`.
- `src/theory/tuning.test.ts` — extend per testing section.
- `src/components/TuningSelector.tsx` — accept `customs`, render Custom group and
  sentinel, expose `onOpenCreateModal` / `onOpenEditModal`.
- `src/components/TuningSelector.test.tsx` — extend per testing section.
- `src/components/UnavailableInTuning.tsx` (or wherever the component lives) — updated
  copy, second CTA wired to `onSwitchToNoteMap`.
- `src/App.tsx` — replace tuning state with persisted `StoredState`, mount
  `CustomTuningModal`, widen ids to `AnyTuningId`, wire up CTAs.
- `src/App.test.tsx` — extend per testing section.
