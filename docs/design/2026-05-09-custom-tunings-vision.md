# Custom Tunings — Vision

> **Status:** Future. Foundations are in place from the open-tunings feature (May 2026);
> UI and state-shape work deferred. Pick this up when ready to ship "set any note on any
> string."

## Goal

Let the user define an arbitrary 6-note tuning by setting each string's open-string note
manually, beyond the preset list.

## Why now is the right time later (not now)

The open-tunings feature shipped 18 preset tunings with a `Tuning` data model that's
already general — `strings` is a `readonly [ChromaticNote × 6]`, and every downstream
concern (note rendering, view gating, CAGED window offsets, ground-truth fret tests)
reads from `strings` rather than a preset id. **Custom tunings reuse that infrastructure
with no theory-layer changes.**

What's left is mostly UI and a state-shape decision in App. Worth its own focused PR
rather than tacking onto an already-large feature branch.

## What's already there (no work needed)

- `Tuning` type accepts any 6 chromatic notes — no enum constraint on `strings`.
- `isCagedCompatible(tuning)` in `src/theory/tuning.ts` derives from intervals
  automatically. A custom tuning that happens to preserve `[5,5,5,4,5]` unlocks
  ScalePositions and ChordShapes; otherwise it's Note Map only.
- `getPositionWindows` and `placeChordOnCombo` shift fret anchors by the tuning's offset
  from standard, so any custom CAGED-compatible tuning renders correctly without
  changes.
- Ground-truth fretboard test in `notes.test.ts` iterates `TUNINGS` and checks every
  (string × fret) against `FRET_NOTES_BY_OPEN_STRING`. If custom tunings end up in
  `TUNINGS` (Option A below), they auto-extend coverage. If not (Option B), a separate
  ad-hoc check covers them.
- `UnavailableInTuning` empty-state component already covers the "your custom tuning
  isn't CAGED-compatible" case via the same gating.

## What's left (the actual work)

### 1. State-shape decision

**Option A — `TuningId = "...|"custom"` with mutable `TUNINGS.custom`:** keep the
existing single-id App state. `TUNINGS.custom` becomes mutable (or replaced via
`setCustomTuning`). Smallest refactor; preset registry stops being purely immutable.

**Option B — App state holds a full `Tuning` object:** the active tuning is owned inline
by App state; presets become a lookup convenience. The `Tuning` may have
`id: "preset-something" | "custom"` for display logic. Keeps the preset registry pure;
bigger refactor across `App.tsx` and every consumer that reads `TUNINGS[tuningId]`.

**Recommendation: B.** The preset registry is conceptually a constant. Mutating it for a
single in-memory edit feels wrong — and a future feature like "save custom as preset"
would force B anyway.

### 2. Custom-editor UI

**Option α — inline section in the existing TuningSelector popover:** a "Custom" group
with six small note pickers. Compact but the popover gets crowded next to 18 presets.

**Option β — separate dialog opened from a "Customize…" entry in the selector:** click
the entry, modal opens with six dropdowns (one per string), low → high, plus a "Reset to
standard" button and a primary "Apply" / "Cancel" pair. Cleaner separation; one extra
click.

**Recommendation: β.** The per-string editor is its own interaction surface and deserves
real estate. Matches the pattern of `FretRangeControl`'s multi-input popover.

### 3. Sharp/flat picker behavior

The internal `ChromaticNote` type is sharp-only. The picker should mirror the global
`accidentalStyle` toggle: in sharp mode show 12 sharp options, in flat mode show 12 flat
options. Internally, store sharps regardless of display. Document this in the dialog
with a small inline note.

### 4. "Custom matches preset" detection (optional polish)

When the user's custom tuning happens to equal a preset's `strings`, show a subtle hint
in the editor or selector ("matches Standard"). Trivial; can ship in a follow-up.

### 5. Persistence (out of scope here)

Custom tuning lives in App state for the session. Persisting across reloads via
localStorage is a separate concern that should cover all global preferences (key, mode,
theme, fret range, accidental, tuning) at once — not solved per-feature.

## Open questions

- Should the dialog's note-pickers be searchable / type-ahead, or six plain `<select>`
  dropdowns? At 12 options each, plain dropdowns are fine.
- When the user picks a preset after editing custom, do we wipe the custom strings or
  remember them? **Recommend: remember**, so flipping back to "Custom…" restores the
  last edit.
- Validate-and-warn on UX-hostile tunings (e.g., all-unison `C C C C C C`)? Probably no
  — the user will see immediately that the fretboard looks weird. Don't paternalize.

## Non-goals

- Multi-tuning sharing or URL state.
- Saving custom tunings as named presets ("My Drop A").
- Bass / 7-string / other string-count support — `Tuning.strings` stays fixed at
  length 6.
- Persistence across reloads (see #5 above — separate concern).

## Version bump

Custom tunings completes the original "future vision" laid out in the open-tunings spec
("at some point users should be able to put a note on every string and everything else
derives off of that"). Shipping it warrants the **0.2.0** bump.
