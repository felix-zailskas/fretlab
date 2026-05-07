# Fretlab — App Vision and View Designs

This document captures the initial design intent for Fretlab.

---

## Vision and methodology

- **Reference tool, not a tutorial.** Aimed at intermediate-to-advanced players. The app
  sits next to the user during practice (laptop or iPad on a music stand) as a key-aware
  "cheat sheet."
- **Practice areas it supports:** fretboard memorization, chord-tone soloing, diatonic
  harmony, 7th-chord voicings (close / drop-2 / drop-3 / drop-2&4), diatonic triads,
  CAGED scale-position connection.
- **Fast switching is a core constraint.** Changing key or view must be instant. No
  animations that interrupt practice flow.
- **Consistent coloring across all views.** Root / 3rd / 5th / 7th have fixed interval
  colors; other scale tones muted; out-of-key notes hidden or faint. The Legend is
  always visible.

---

## Build priority order

The originally-planned 5-tab order (Note Map → Scale Positions → Diatonic Chords → Shell
Voicings → Triad Shapes) has been consolidated to 3 tabs (Note Map → Scale Positions →
Chord Shapes). See the consolidation rationale at the top of _View designs_. Build
priority is by practice value:

1. **Fretboard + key selector** — done as Step 1, with Note Map as the proof view.
2. **Scale Positions** — CAGED boxes with chord-tone targeting _and_ transition-zone
   visualization in one view (originally split across "Chord Tones in Scale Positions"
   and "Scale Positions"; consolidated once the multi-position implementation made the
   split redundant).
3. **Chord Shapes** — consolidated view replacing the originally-planned Shell Voicing
   Diagrams (#4) and Diatonic Triad Shapes (#5). Chord-centric: pick a chord, every
   fitting placement renders ascending up the neck in the visible fret range. Triads
   mode covers 3-note inversions across 4 string groups; 7th chord shapes mode covers
   4-note voicings under a Close / Drop 2 / Drop 3 / Drop 2&4 voicing-system selector.
   One tab, one mental model: _pick a chord, see it ascend the neck._
4. **Diatonic chord row triads** — small extension. The chord row already on screen in
   Note Map / Scale Positions gains a triad mode alongside the existing seventh-chord
   mode. Replaces what was originally a standalone "Diatonic Chord Reference" tab — the
   dedicated tab was redundant with the chord row already in the practice view.
5. **Note Map** — lowest priority; partially superseded by the Step 1 implementation
   already on screen.

---

## View designs

> **Consolidation note.** The originally-planned 5 tabs collapse to 3 (Note Map → Scale
> Positions → Chord Shapes). Two consolidations underlie this: (a) the
> originally-separate **Diatonic Chord Reference** is folded into the chord row already
> rendered in Note Map / Scale Positions — adding a triads/sevenths toggle there serves
> the same lookup intent without a dedicated tab; (b) the originally-planned **Shell
> Voicing Diagrams** and **Diatonic Triad Shapes** merge into a single **Chord Shapes**
> view, chord-centric: pick a chord, every fitting placement renders ascending up the
> neck. Triads mode covers 3-note inversions across 4 string groups; 7th chord shapes
> mode covers 4-note voicings under a 4-system voicing selector (close / drop-2 / drop-3
> / drop-2&4). The chord-diagram-box grid that V0 envisioned was deferred — see the
> Reference tab section below. The per-view sections below describe the underlying
> material that the consolidated views render.

### Note Map _(implemented in Step 1)_

- The default landing view and the proof artifact for the Step 1 fretboard + theory
  layer.
- For the selected key, all in-key notes render across the visible fret range (default
  0–15, user-configurable via the global FretRangeControl up to fret 24) with Root / 3rd
  / 5th / 7th in interval colors and the remaining scale tones muted. An "All notes"
  mode disables key filtering.
- A diatonic chord row sits above the fretboard. Selecting a chord remaps the highlights
  so that chord's R / 3 / 5 / 7 light up against the muted scale background — the same
  visual contract the other views will follow. Clicking the selected card again
  deselects it; with no chord active, every in-key note renders as a plain scale tone
  (the explicit "clear highlights" shortcut, consistent with the Scale Positions view).
- An accidental toggle switches sharp / flat spelling; the Legend is always on screen.
- Scope-wise this view is a superset of what the dedicated tabs need; later tabs slice
  it down (chord-tones-only, position-only, etc.).

### Scale Positions _(highest practice value)_

A consolidated view that handles both CAGED-box exploration _and_ chord-tone targeting
within a box. Originally split across two planned tabs; merged once the multi-position
toggle + box-annotation implementation made the split redundant — the same data and
controls serve both practice intents.

- **The view's identity is the box.** Note Map answers _where are the notes?_ globally;
  this view answers _inside this box, what's my hand doing?_ Without a position selected
  the view becomes a degenerate Note Map, so a position must always be picked.
- Inputs: global key + a set of CAGED positions (P1–P5, independently toggleable;
  default just **P1**, no "All" option) + an optional chord degree (I, ii, iii, IV, V,
  vi, vii°).
- The fretboard renders a soft tinted rectangle behind each selected position's fret
  window with a compact label (e.g., `P1 — C`) above it. The box is a visible artifact,
  not just inferred from where markers happen to appear.
- **Overlap zones get explicit emphasis** when two or more selected positions share
  frets — a brighter fill plus a defined border highlights the transition area.
  Reinforces that the CAGED shapes are connected pieces of one continuous musical map,
  not isolated islands.
- **Chord-tone mode (chord selected):** the chord's R / 3 / 5 / 7 light up inside the
  union of selected position windows, against the in-key scale tones (faint). The
  Legend's R / 3 / 5 / 7 toggles control which chord-tone roles light up.
- **Scale-position mode (no chord selected):** clicking the currently-selected chord
  card again clears it. With no chord active, no chord-tone highlights render — every
  in-key note inside the selected positions falls back to the plain `scale` role,
  leaving the box framing as the dominant visual. This is the explicit "clear
  highlights" shortcut for box-only practice. The Legend's R / 3 / 5 / 7 toggles remain
  enabled (they're orthogonal to chord selection), but with no chord context they have
  nothing to demote.
- A **"Show context notes"** toggle (off by default) renders in-key notes outside the
  selected positions with role `muted` (very faint context). Default off keeps the box
  visually focused.
- **Zero positions toggled** → empty-state message ("Toggle a position to begin"). The
  position toggles stay visible above the message so the user can re-enable.
- **"All Notes" key** → empty-state message ("Select a key to view scale positions").
  The view requires a key.
- Layout matches Note Map: fretboard, then Legend below it, then the diatonic chord row.
  View-specific controls (position toggles, context toggle) sit inside the view above
  the fretboard.
- CAGED encoding is anchored to C major, with shapes shifting by key. Positions follow
  the canonical CAGED order ascending the neck from open in C major: C → A → G → E → D
  (then C again one octave up).
  - P1 (C shape) ≈ frets 0–3
  - P2 (A shape) ≈ frets 2–5
  - P3 (G shape) ≈ frets 4–8
  - P4 (E shape) ≈ frets 7–10
  - P5 (D shape) ≈ frets 9–13
  - The interval _shape_ stays constant; only the fret offset moves with key.
- Worked example: in G major, ii (Am7), with P1 selected, the notes A / C / E are
  highlighted as R / 3 / 5; toggling the 7 in the Legend adds G as ♭7.
- Answers two questions in one view: _"What does the G-shape (P3) box look like in this
  key, and where does it overlap with the E-shape (P4)?"_ and _"I'm soloing over ii in G
  in position 3 — which notes do I target?"_.
- Implementation spec:
  `docs/superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md`.

### Diatonic chord row (extension, replaces standalone reference tab)

- Per the consolidation note, this no longer becomes a standalone tab. The reference
  content lives in the existing `DiatonicChords` chord row already rendered in Note Map
  and Scale Positions.
- Extension scope: the chord row gains a **triads / sevenths toggle** so the same
  component covers both lookup intents. Triad mode renders 7 cards (Roman numerals +
  quality + R/3/5 spelled); sevenths mode renders the 7 cards already there today
  (Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7 with R/3/5/7).
- Optimized for fast scanning. Supports Roman-numeral speed drills and song analysis
  directly from the practice view, no tab switch.
- Card selection behavior is the same in either mode: clicking a card selects that
  degree, driving chord-tone highlights on the active fretboard view.

### Chord Shapes

A consolidated view that handles both shell-voicing lookup (#4 in the original plan) and
triad-shape lookup (#5). The view is **chord-centric**: the user picks a single chord
from the diatonic row and the fretboard renders every fitting placement of that chord
across the visible fret range — no global "the 7 diatonic shapes ascending" contract.
Compared to the V0 design (chord-diagram box grid on top, ascending-neck fretboard on
bottom) this dropped the box grid; that fingering reference is deferred to the Reference
tab section.

- **Mode toggle (shared with the diatonic chord row).** A
  `Triad shapes / 7th chord shapes` toggle drives both this view and the chord row below
  the fretboard. The two stay in sync — changing the toggle in either place updates
  both.
- **Triad shapes mode.** Major / minor / diminished triad inversions across 4 3-string
  groups (1-2-3, 2-3-4, 3-4-5, 4-5-6) and 3 inversions (root / 1st / 2nd) — 36 entries
  in the shape table. Sub-selectors: string group (multi-toggle) + inversion
  (multi-toggle).
- **7th chord shapes mode.** Full 4-note voicings (R / 3 / 5 / 7) under a voicing-system
  selector with 4 options:
  - **Close** — 1-3-5-7 stacked within an octave, on the 3 adjacent 4-string sets.
  - **Drop 2** — 2nd-from-top dropped an octave; on the same 3 adjacent 4-string sets.
    The standard E-shape and A-shape barre voicings are root-position drop-2 on 3-4-5-6
    and 2-3-4-5.
  - **Drop 3** — 3rd-from-top dropped an octave; played on string sets that skip an
    inner string (`6-4-3-2`, `5-3-2-1`).
  - **Drop 2&4** — both 2nd and 4th from top dropped; very wide voicings on `6-5-3-2`
    and `5-4-2-1` (skip between the dropped pair and the upper pair).
  - All systems support all 4 inversions (root / 1st / 2nd / 3rd) and all 4 chord
    qualities (maj7, m7, 7, m7♭5) → 160 voicings total in the generated table.
- **Cross-system shared selection.** String-set and inversion selections persist as the
  user toggles the voicing system. String-set sharing uses a `low / mid / high` position
  abstraction: "low" = bass on string 6, "mid" = bass on 5, "high" = bass on 4. The same
  position selection maps to the corresponding system-specific id (e.g. drop-2's
  `3-4-5-6` ↔ drop-3's `6-4-3-2`). Drop-3 and Drop-2&4 only have low and mid positions;
  "high" stays in the user's set but renders nothing in those systems.
- **Cap-at-fits rule.** A voicing is rendered only if every note's fret falls inside
  `[startFret, endFret]`. Voicings whose shape doesn't fit are silently dropped.
- **Generator, not a hand-typed table.** `SEVENTH_SHAPES` is built at module load by a
  single algorithm: take the close-position pitches for the requested close inversion,
  drop the configured indices an octave, sort low → high, normalize so the bass is at
  pitch 0. Cross-checked in tests against the known E-shape barre, A-shape barre,
  stairstep close root on 1-2-3-4, drop-3 root on 6-4-3-2, and drop-2&4 root on 6-5-3-2.
- **Legend treatment: dim, don't hide.** Unlike Note Map / Scale Positions where
  unselected Legend roles disappear, Chord Shapes demotes them to `muted` so the chord
  shape stays recognizable when the user is focused on a single role. The reference
  signal of the surrounding chord tones doesn't vanish.
- Layout matches the other fretboard views. The view-specific controls stack above the
  fretboard: chord-shape language (Triads / 7ths) → voicing-system selector (sevenths
  only) → string-set + inversion sub-selectors.
- Implementation specs:
  [`2026-05-06-chord-shapes-design.md`](../superpowers/specs/2026-05-06-chord-shapes-design.md)
  for the original V1 (drop-2 + triads),
  [`2026-05-06-chord-shapes-chord-centric-design.md`](../superpowers/specs/2026-05-06-chord-shapes-chord-centric-design.md)
  for the chord-centric redesign that produced today's view.

### Future: Modal practice mode

Implemented. See
[`docs/superpowers/specs/2026-05-07-modal-practice-mode-design.md`](../superpowers/specs/2026-05-07-modal-practice-mode-design.md)
for the full design and
[`docs/superpowers/plans/2026-05-07-modal-practice-mode.md`](../superpowers/plans/2026-05-07-modal-practice-mode.md)
for the implementation plan.

Resolved decisions:

- **Placement:** global ModeSelector in the app header alongside the key selector. (Key,
  mode) is the global tonal-center state; defaults to `(selectedKey, ionian)`. Affects
  every view.
- **Chord-row interaction:** the chord row recomputes against the modal scale (e.g., C
  Dorian shows `i7, ii7, ♭IIImaj7, IV7, v7, viø7, ♭VIImaj7`). Selected chord degree
  persists across mode changes.
- **Mode picker:** explicit mode selector in the header, not inferred from the chord
  row.
- **CAGED framing:** in non-Ionian modes, position windows reanchor to the mode's parent
  major scale (e.g., C Dorian's windows use B♭ major's CAGED). Position labels drop the
  C/A/G/E/D shape suffix and show just `P1`-`P5`.
- **Characteristic-tones overlay:** subtle gold outer ring on every characteristic note
  (Dorian's ♮6, Lydian's ♯4, etc.). Always-on when `mode !== 'ionian'`; renders nothing
  for Ionian and Aeolian (the references).
- **Accidental spelling:** the user's flat/sharp toggle auto-sets to the natural
  preference of the mode's parent major scale on every key/mode change. The user can
  manually override; the override sticks until the next key/mode change. The global
  default is `sharp`.

For follow-up V2 work — extending to harmonic minor and melodic minor parent scales —
see
[`docs/design/2026-05-07-modal-parent-scales-extension.md`](2026-05-07-modal-parent-scales-extension.md).

### Future: Reference tab

A theoretical-lookup tab — a distinct cognitive job from the existing practice-flow tabs
(Note Map, Scale Positions, Chord Shapes), which are all key-aware and fretboard-driven.
The Reference tab would consolidate look-up content that doesn't naturally belong on a
fretboard and isn't needed at every glance during practice.

**Candidate features.** None of these are scoped yet; ordering is rough priority:

- **Circle of fifths.** All 12 keys arranged in canonical positions, with the
  currently-selected key highlighted and the **diatonic-chord arc** for that key
  emphasised — the 7 diatonic chords are always contiguous on the circle, a property
  worth visualising. Clicking a position switches the global key. Doubles as a learning
  tool for relative minors and key-signature relationships. Considered (and rejected) as
  a replacement for the linear key selector in the shared header — a circle costs too
  much vertical space in the always-visible chrome, especially on iPad-on-music-stand
  layouts. The Reference tab gives it the room to earn its size.
- **Chord-diagram box grid.** The static fingering reference originally scoped for V0 of
  Chord Shapes, deferred when V1 narrowed to the ascending neck view. Two families:
  shells (8 boxes, 2 root strings × 4 chord types) and triads (36 boxes, 4 string groups
  × 3 qualities × 3 inversions). Pure fingering reference, not key-anchored — answers
  _"how do I play an m7♭5 shape?"_ regardless of the current key.
- **Non-diatonic chord lookup.** Pick any chord type and root and see its shapes /
  shells, even when not diatonic in the current key.
- **Theory formulas.** Chord construction (maj7 = 1 3 5 7, m7♭5 = 1 ♭3 ♭5 ♭7, etc.),
  scale formulas, mode formulas. Static text reference.

**Why this matters.** The existing practice tabs share a cognitive frame: key + visual +
neck. Stuffing static lookup content into them dilutes that frame; the chord-diagram box
grid was an early casualty (Chord Shapes V1 explicitly drops it). A separate Reference
tab gives that content a home where its theoretical-lookup framing reads correctly
without competing with the practice flow.

**Open design questions** (to resolve when this is scoped):

- Is the circle of fifths the primary chrome of the tab, or one section among many?
- Does the Reference tab override the global key selector when a key is picked from the
  circle, or run as a parallel "scratch" mode that doesn't disturb the practice tabs'
  state?
- How does the chord-diagram box grid integrate with the non-diatonic lookup — one
  unified search/filter, or separate sub-sections?
- Diatonic-chord row ordering on the circle: clockwise from I (F-C-G-D-A-E-B for C major
  when including relative minors) reads cleanly, but it's worth confirming this matches
  the way intermediate-to-advanced players already visualise it.

Status: not yet designed in detail. The earliest concrete trigger for scoping is when V1
Chord Shapes ships and we start missing the box-grid fingering reference in practice —
that's when the Reference tab earns priority.

---

## Technical decisions and constraints

- The **fretboard renderer is dumb.** It accepts `NoteMarker[]` and renders; computing
  which markers to display is the responsibility of each view, using the theory layer
  (per the Step 1 spec).
- **Visible fret range is user-configurable.** Default 0–15; ceiling is `MAX_FRET = 24`.
  The global FretRangeControl in the header lets the user narrow the view (for box
  drilling) or widen it (to see octave-up shapes). Step 1 picked 15 as the default; the
  Configurable Fret Range work later turned that into a default rather than a hard
  ceiling.
- All theory in **pure functions** under `src/theory/`. No state-management library;
  React `useState` lifted to `App` is sufficient. Per-view selector state is bundled
  into custom hooks (`useChordShapesState`, `useScalePositionsState`) that live next to
  the view file and are instantiated once at the App level — keeps `App.tsx` from
  bloating as views grow more selectors, and means selections survive tab switches.
- **Chord construction formulas** are explicit:
  - Triads: maj = 1, 3, 5; min = 1, ♭3, 5; dim = 1, ♭3, ♭5.
  - Sevenths: maj7 = 1, 3, 5, 7; m7 = 1, ♭3, 5, ♭7; dom7 = 1, 3, 5, ♭7; m7♭5 = 1, ♭3,
    ♭5, ♭7.
- **CAGED position fret ranges** are encoded relative to C major. Positions shift with
  key but the interval shape is constant — encode once, transpose for any key.

---

## Shared infrastructure to build

Pieces of shared infrastructure that earlier views needed are now in place:

- **CAGED position model** — built and validated by the Scale Positions view. Encoded as
  5 fret-windows anchored to C major (one per CAGED shape). `getPositionWindows` returns
  every octave that fits fully inside the user-configured `[startFret, endFret]` range,
  so wide ranges show the same box twice (e.g., P1 in C major at `[0,3]` and `[12,15]`)
  and narrow ranges drop boxes that don't fit.
- **`DEFAULT_END_FRET` and `MAX_FRET` constants** — `DEFAULT_END_FRET = 15` is the
  default upper bound; `MAX_FRET = 24` is the absolute UI ceiling. Both live in
  `src/theory/constants.ts`. Replaces the original single `FRET_COUNT` constant.
- **`FretRangeControl` popover** — global header control that owns the user-selected
  `[startFret, endFret]` range. The range threads through every theory pipeline
  (`buildChordToneMarkers`, `buildChordShapeMarkers`, `getPositionWindows`,
  `computeOverlapZones`) and the renderer (`Fretboard`, `FretMarkers`).
- **`roleFromChordTone` helper** — pure-function chord-tone-role resolution, shared
  across Note Map and Scale Positions.

What was added since the original list:

- **`getDiatonicTriads(key)`** — sibling of `getDiatonicChords`, returning R/3/5 (no
  7th). Powers the chord-row triads toggle and the Chord Shapes view's Triads mode.
- **`buildChordShapeMarkers`** — chord-centric pipeline in
  [`src/theory/chordShapes.ts`](../../src/theory/chordShapes.ts). Takes one
  `DiatonicTriad | DiatonicChord` plus the view's sub-selector state and emits every
  fitting placement on the fretboard. Reuses the existing `Fretboard` component as-is
  (no separate ascending-neck renderer needed; the chord-centric pipeline produces the
  markers and the same dumb renderer draws them).
- **Drop-voicing generator** — `SEVENTH_SHAPES` is built at module load by a single
  algorithm parameterized by `(system, stringSet, inversion, quality)`: take the
  close-position pitches, drop the configured indices an octave, sort, normalize. Adding
  a new voicing system or string set is a data change, not a code change.
- **Per-view state hooks** — `useChordShapesState` and `useScalePositionsState` bundle
  each view's `useState` calls + handlers and live next to the view. App instantiates
  them once so state survives tab switches.

The originally-planned `ChordDiagramBox` component was not built — V1 Chord Shapes
narrowed to the ascending-neck section, deferring the box-grid fingering reference to
the Reference tab (see "Future: Reference tab").

---

## Dependencies between views

After consolidation the dependency map is short:

- **Diatonic chord row triads** — extends the existing `DiatonicChords` component.
  Touches Note Map and Scale Positions only insofar as both render that component.
- **Chord Shapes** — standalone view that reuses the `Fretboard` renderer; theory
  pipeline (`buildChordShapeMarkers`) is shared between Triads and 7th chord shapes
  modes. Independent of Note Map / Scale Positions.

---

## View completion map

| View                      | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Note Map                  | Done   | Step 1 proof view; rendered by [NoteMapView.tsx](src/views/NoteMapView.tsx).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Scale Positions           | Done   | Consolidated CAGED-box + chord-tone view; rendered by [ScalePositionsView.tsx](src/views/ScalePositionsView.tsx). Spec: [design](../superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md).                                                                                                                                                                                                                                                                                                                                                                                           |
| Chord Shapes              | Done   | Chord-centric ascending-neck view; rendered by [ChordShapesView.tsx](src/views/ChordShapesView.tsx). Triads / 7th chord shapes modes; 7ths exposes a Close / Drop 2 / Drop 3 / Drop 2&4 voicing-system selector with cross-system shared low/mid/high position state and shared inversion state. Multi-toggle string-set + multi-toggle inversion sub-selectors. Cap-at-fits drop rule. Legend roles dim instead of hide. Specs: [V1 design](../superpowers/specs/2026-05-06-chord-shapes-design.md), [chord-centric redesign](../superpowers/specs/2026-05-06-chord-shapes-chord-centric-design.md). |
| Diatonic chord row triads | Done   | Triads/sevenths toggle in [DiatonicChords.tsx](src/components/DiatonicChords.tsx); `getDiatonicTriads` in [scales.ts](src/theory/scales.ts). Spec: [design](../superpowers/specs/2026-05-05-chord-row-triads-design.md).                                                                                                                                                                                                                                                                                                                                                                              |

---

## References

- Practice plan: `docs/practice/guitar-practice-plan.md`
- Step 1 design spec: `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md`
- Step 1 implementation plan: `docs/superpowers/plans/2026-05-03-fretlab-step1.md`
