# Fretlab UX Issues Tracker

Living document tracking design and interaction polish opportunities, audited against
[Emil Kowalski's design engineering principles](https://animations.dev/). Each table
follows Before / After / Why format.

**Status legend:** _open_ = needs work, _fixed_ = shipped, _deferred_ = scoped out for
now, _wont-fix_ = considered and rejected.

---

## 1. Universal button interactions

**Priority: high.** These rules apply to every interactive button in the app — fixing
them once at the root level lifts the whole interface.

| Before                                                       | After                                                                                                                                      | Why                                                                                                                                                          | Status |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| No `:active` state on any button                             | Add `transform: scale(0.97)` on `:active` to all interactive buttons                                                                       | Buttons must feel responsive to press. Without it, the UI doesn't acknowledge the user's tap.                                                                | fixed  |
| `transition-colors` (no duration specified)                  | `transition: background-color 160ms ease-out, color 160ms ease-out` (or explicit Tailwind: `transition-colors duration-150 ease-out`)      | Tailwind's default `transition-colors` resolves to 150ms but cubic-bezier(0.4, 0, 0.2, 1) — sluggish ease-in-out. Switch to ease-out with explicit duration. | fixed  |
| `cursor-pointer` everywhere with no `:focus-visible` ring    | Add a visible focus ring (e.g. `focus-visible:ring-2 focus-visible:ring-root focus-visible:outline-none`) on every interactive element     | Keyboard navigation is invisible right now. WCAG 2.1 SC 2.4.7 requires a visible focus indicator.                                                            | fixed  |
| Hover states (`hover:bg-surface-active` etc.) apply on touch | Gate hover with `@media (hover: hover) and (pointer: fine)` or use the Tailwind v4 `hover:` variant configured to respect `(hover: hover)` | Touch taps trigger hover, leaving controls in a "stuck active" visual state until another tap clears them.                                                   | fixed  |
| No `prefers-reduced-motion` handling                         | Add `@media (prefers-reduced-motion: reduce)` block disabling transforms; keep opacity transitions                                         | Vestibular disorders trigger on motion. Required for accessibility.                                                                                          | fixed  |

Shipped as a single `@layer components` block in `src/index.css`.

---

## 2. Theme transitions

**Priority: medium.** The whole app re-paints when the toggle cycles — currently abrupt.

| Before                                                                                                      | After                                                                                                                                                             | Why                                                                                                                                            | Status |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Theme switch is instantaneous (CSS variable swap)                                                           | Add `transition: background-color 200ms ease-out, color 200ms ease-out, border-color 200ms ease-out, fill 200ms ease-out` to body                                 | A 200ms eased crossfade communicates "the app changed mode" instead of "the page reloaded." Limit to color properties so layout stays instant. | fixed  |
| `ThemeToggle` label cycles `Auto → Light → Dark` but doesn't show which mode Auto is currently resolving to | When `mode === "auto"`, show "Auto · Light" or "Auto · Dark" based on the resolved `prefers-color-scheme`, OR add a small icon (sun/moon glyph) next to the label | Users in Auto mode have no visual cue whether they're currently being served light or dark — they have to look at the rest of the UI to infer. | fixed  |

Both ship: resolved-state label _and_ system/sun/moon icon.

---

## 3. KeySelector

| Before                                                               | After                                                                                                                            | Why                                                                                               | Status |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------ |
| "All" pill visually identical to A-B note pills                      | Separate "All" with a thin divider, OR style it with a different shape (e.g. wider, ghost outline)                               | "All" is functionally a meta-toggle (clear key), not a key. Visual sameness encourages misclicks. | fixed  |
| Pill widths vary unpredictably (`#` keys are wider than naturals)    | Add `min-w-[2.5rem]` to pills so all keys reserve equal width                                                                    | Eye scans uneven-width pills more slowly. Even 2-3px variance is visible.                         | fixed  |
| Active key uses `bg-root` (musical interval blue)                    | Move active key to a dedicated UI-blue token (e.g. `--color-selection: #2563eb`), reserving `--color-root` for note circles only | Same blue meaning two different things (root note vs selected key) creates semantic ambiguity.    | fixed  |
| 13 pills + flex-wrap can leave a single orphan pill on the next line | Use `min-w-[2.5rem]` (above) + container `flex-wrap` calculations, OR commit to a fixed grid (`grid-cols-13`) at xl breakpoint   | Orphan pills look broken at certain viewport widths.                                              | fixed  |

---

## 4. ModeSelector

| Before                                                          | After                                                                                                                              | Why                                                                     | Status                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------- |
| "Mixolydian" pill is ~50% wider than "Ionian" — uneven row      | Add `min-w-[6.5rem]` so all 7 mode pills share width, OR truncate to abbreviations (Ion, Dor, Phr, Lyd, Mix, Aeo, Loc) at sm sizes | Visual rhythm is broken when one button dwarfs the rest.                | fixed                 |
| Disabled state (when key=All): `opacity-40 pointer-events-none` | Add a tooltip on hover explaining "Select a key first" + cursor-not-allowed                                                        | The user sees the buttons fade but doesn't know why.                    | fixed                 |
| Modal-active state (amber bg) flips instantly when mode changes | Add `transition: background-color 160ms ease-out` (covered by §1)                                                                  | Color jumps without easing feel like a page reload, not a state change. | fixed (covered by §1) |

---

## 5. AccidentalToggle (♭/♯)

| Before                                         | After                                                                                                                                                     | Why                                                                                                      | Status |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------ |
| Two tiny pills with just ♭/♯ glyphs, no labels | Add tooltips: "Flat spelling" / "Sharp spelling"                                                                                                          | Beginners may not know what the symbols mean as toggle states.                                           | fixed  |
| Toggle change is instant (binary class swap)   | Animate the active background sliding from one pill to the other (clip-path or absolute-positioned indicator with `transition: transform 200ms ease-out`) | Sliding indicator pattern is more communicative — users see where focus moved, not just where it landed. | fixed  |

---

## 6. ViewSelector (Note Map / Scale Positions / Chord Shapes)

| Before                                                        | After                                                                                            | Why                                                                                                                             | Status   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Active tab uses solid background; inactive tabs are bare text | Add an animated underline or background pill that slides between tabs (Layout Animation pattern) | Tab switches happen tens of times per session — the slide tells the user "you moved here from there" without re-reading labels. | fixed    |
| Tab content swap is instant                                   | Crossfade content with `opacity` transition (200ms ease-out) when switching tabs                 | Hard cuts feel like navigation; crossfades feel like state change. Tab switch is the latter.                                    | deferred |

---

## 7. FretRangeControl

| Before                                     | After                                                                                                                                                                                    | Why                                                                                        | Status   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------- |
| Popover appears instantly when opened      | Animate with `@starting-style` or `data-state` attribute: `opacity 0 → 1`, `transform: scale(0.95) → scale(1)`, `transform-origin: top right` (matches trigger position), 180ms ease-out | Popovers should scale from their trigger, not pop into existence. Origin-aware = polished. | fixed    |
| Popover dismiss is instant                 | Add same animation in reverse on close (slightly faster, ~120ms ease-out)                                                                                                                | Asymmetric timing (slow open, fast close) makes the close feel responsive.                 | deferred |
| Number inputs have default browser styling | Custom number input with stepper buttons matching the app's button style                                                                                                                 | Native number input arrows don't match the cohesive visual language.                       | deferred |

---

## 8. ThemeToggle

| Before                                             | After                                                                                                      | Why                                                                                   | Status   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- |
| Single button cycles 3 states with text-only label | Optionally: small icon (sun/moon/system) next to the label, with `transition: opacity 150ms` between icons | Icon + label is more glanceable than label alone, especially at music-stand distance. | fixed    |
| Cycle order Auto → Light → Dark → Auto             | Could be a 3-segment toggle/segmented control instead of a cycler                                          | Segmented control shows all states at once; cycler hides 2/3 of options.              | wont-fix |

---

## 9. DiatonicChords (chord cards)

| Before                                                                                                       | After                                                                                                          | Why                                                                           | Status |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| Cards have `hover:border-line-hover` but no press feedback                                                   | Add `active:scale-[0.98]` + `transition: transform 100ms ease-out`                                             | The card is a clickable region; pressing must feel responsive.                | fixed  |
| Selected card uses `border-line-selected bg-surface-active` — looks identical in both modes to a hover state | Add a subtle inset glow or ring (e.g. `ring-2 ring-root ring-inset`) when selected to differentiate from hover | Selected vs hover should be unambiguous. Currently both states look "lifted." | fixed  |
| Triads/Sevenths toggle button group has no animated indicator                                                | Slide an indicator pill between Triads and Sevenths (clip-path or transform)                                   | Same rationale as AccidentalToggle — sliding indicator is more communicative. | fixed  |
| Long border-2 + shadow-lg on cards looks heavy in light mode                                                 | Reduce shadow to `shadow-sm` in light mode and rely on the warm-cream background contrast                      | Heavy shadows fight with the warm parchment palette.                          | fixed  |

---

## 10. Legend (Root / 3rd / 5th / 7th)

| Before                                                | After                                                                                | Why                                                           | Status |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------ |
| Toggle is `opacity-40` ↔ `opacity-100` binary         | Add `transition: opacity 150ms ease-out`                                             | Opacity flip without ease is jarring.                         | fixed  |
| No tooltip explaining what "3rd" / "5th" / "7th" mean | Add tooltips: "Major/minor third (chord-defining)", "Perfect/diminished fifth", etc. | Beginners may not know which chord tones map to which colors. | fixed  |
| Color swatches are 12px circles                       | Bump to 14-16px and align baseline with text                                         | Small swatches make the legend harder to scan.                | fixed  |

---

## 11. PositionToggles / StringSetToggles

| Before                                              | After                                                      | Why                                                                                     | Status |
| --------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| Same `opacity-40` ↔ `opacity-100` binary as Legend  | Same fix — add `transition: opacity 150ms ease-out`        | Same reason.                                                                            | fixed  |
| CAGED shape names (C/A/G/E/D) shown without context | Add tooltips: "C-shape position", "A-shape position", etc. | The CAGED system is jargon — users not familiar with it see meaningless single letters. | fixed  |

---

## 12. ScaleDisplay (C major / 1 C / 2 D / ...)

| Before                                          | After                                                                                                         | Why                                                                        | Status                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------- |
| Pills update instantly on key/mode change       | Animate role-color crossfade with `transition: background-color, border-color 200ms ease-out` (covered by §1) | Same as theme — abrupt color flips read as page reload.                    | fixed (covered by §1) |
| W / H step indicators are 10px text below pills | Promote to small inline letter glyphs (12-14px) with subtle background for visibility                         | Step pattern is core music-theory information, currently almost invisible. | fixed                 |

---

## 13. Fretboard / NoteCircle

| Before                                                             | After                                                                                             | Why                                                                                            | Status   |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| All note circles are radius 13                                     | Make root circles slightly larger (radius 14) for emphasis                                        | Roots are the eye's anchor — slightly bigger reinforces the visual hierarchy.                  | fixed    |
| Note circles have no entry animation when key/mode changes         | Stagger in: `opacity 0 → 1, scale(0.85) → 1`, 200ms ease-out, 20-30ms stagger left-to-right       | Currently the whole board flips. Stagger creates a sense of "scale spreading across the neck." | deferred |
| Strings are flat lines, no depth hint                              | Add subtle gradient or 1px shadow below each string                                               | Real strings reflect light. A 1px highlight + shadow makes them feel physical.                 | fixed    |
| Fret markers are `r=5 opacity=0.4` flat dots                       | Add subtle radial gradient or inset shadow                                                        | Same: real inlays have depth. Flat dots look like print, not inlay.                            | fixed    |
| Empty-message overlay is bare white text on transparent background | Wrap in a styled container (rounded surface card with subtle shadow)                              | The overlay currently floats — looks broken, not designed.                                     | fixed    |
| Position-window labels are 12px — small at iPad portrait scale     | Increase to 13-14px or scale relative to viewBox                                                  | Labels carry the "what position is this" information — must be readable.                       | fixed    |
| `shadow-lg` on fretboard wrapper is generic Tailwind               | Custom shadow tuned to the rosewood/cream palette: `shadow: 0 8px 32px -4px rgb(60 32 16 / 0.25)` | Tailwind's default shadows are gray-tinted; a warm-tinted shadow coheres with the palette.     | fixed    |

---

## 14. Spacing & layout

| Before                                                                        | After                                                                                                | Why                                                                                     | Status |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| `py-3` (44px) buttons look chunky on desktop                                  | Use responsive padding: `py-2.5 lg:py-2` (still ≥36px) on hover-capable devices, keep py-3 for touch | iPad target compliance preserved; desktop feels less inflated.                          | fixed  |
| `gap-4` between Key and Mode columns at xl breakpoint                         | Increase to `gap-8` or `gap-12` to visually separate the two distinct controls                       | At xl widths the two columns sit too close, making them read as one continuous toolbar. | fixed  |
| "DIATONIC CHORDS" heading uses heavy `tracking-wider font-semibold uppercase` | Soften to `tracking-wide font-medium` or use sentence case                                           | Heavy treatment fights with the friendly warm palette.                                  | fixed  |

Shipped via Tailwind v4's `pointer-coarse:` variant — desktop gets py-2.5, touch gets
py-3.

---

## 15. First-run / discoverability

| Before                                                         | After                                                                                  | Why                                                                          | Status                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| No keyboard shortcuts                                          | Add: arrow keys for key, number keys 1-7 for chord degree, `t`/`s` for triads/sevenths | Power users (a likely subset of guitar students) want fast navigation.       | partial (arrow keys deferred)     |
| No tooltips for music-theory shorthand (W, H, ♭, ♯, ii°, maj7) | System-wide tooltip pass once primitives exist                                         | Glossary-style hover help dramatically lowers the beginner's learning curve. | partial (chord cards + W/H + ♭/♯) |
| No empty-state guidance when "All" key is selected             | Add a one-line hint: "Pick a key to see scales and chords"                             | Users who land on All might not realize they need to pick a key.             | fixed                             |

---

## 16. Accessibility

| Before                                                          | After                                                                                                             | Why                                                                                                                                      | Status |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `aria-pressed` used on toggle buttons (good)                    | Audit for completeness: ScaleDisplay pills lack any role/aria, View tabs use `<button>` not `<button role="tab">` | Screen readers will navigate the View tabs as generic buttons, missing the tab-list semantic.                                            | fixed  |
| No skip-link for keyboard users                                 | Add `<a href="#main" className="sr-only focus:not-sr-only">Skip to fretboard</a>`                                 | Long header (key pills + mode pills + tabs + scale display) means keyboard users tab through ~25 elements before reaching the fretboard. | fixed  |
| `aria-disabled` on ModeSelector (good) but no live announcement | Add `<div aria-live="polite">` for state changes (e.g. "Selected D Dorian")                                       | Screen reader users get no feedback when they pick a key or chord.                                                                       | fixed  |

---

## Cross-cutting next-steps

Remaining items to revisit:

- **§6 row 2** — tab content crossfade (needs route transition state machinery).
- **§7 rows 2-3** — popover asymmetric exit animation, custom number stepper.
- **§13 row 2** — note-circle stagger entry on key/mode change.
- **§15 row 1** — arrow-key key cycling (needs to share key-list arrays with KeySelector).
- **§15 row 2** — system-wide tooltip pass for ii°, maj7, mode names, etc.
