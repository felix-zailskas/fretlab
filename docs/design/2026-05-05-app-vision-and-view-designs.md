# Fretlab — App Vision and View Designs

This document captures the initial design intent for Fretlab.

---

## Vision and methodology

- **Reference tool, not a tutorial.** Aimed at intermediate-to-advanced players. The app
  sits next to the user during practice (laptop or iPad on a music stand) as a key-aware
  "cheat sheet."
- **Practice areas it supports:** fretboard memorization, chord-tone soloing, diatonic
  harmony, shell voicings, diatonic triads, CAGED scale-position connection.
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
   Diagrams (#4) and Diatonic Triad Shapes (#5). Vertical chord-diagram boxes on top,
   ascending-up-the-neck fretboard on bottom, with a top-level Shells/Triads selector.
   One tab, one mental model: _look up a shape, see it ascend the neck._
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
> the same lookup intent without a dedicated tab; (b) **Shell Voicing Diagrams** and
> **Diatonic Triad Shapes** merge into a single **Chord Shapes** view because both share
> the same two-part skeleton (chord-diagram box grid on top, ascending-up-the-neck
> fretboard on bottom). The per-view sections below describe the underlying material
> that the consolidated views render.

### Note Map _(implemented in Step 1)_

- The default landing view and the proof artifact for the Step 1 fretboard + theory
  layer.
- For the selected key, all in-key notes render across frets 0–15 with Root / 3rd / 5th
  / 7th in interval colors and the remaining scale tones muted. An "All notes" mode
  disables key filtering.
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
  window with a compact label (e.g., `P1 — E`) above it. The box is a visible artifact,
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
- CAGED encoding is anchored to C major, with shapes shifting by key:
  - P1 (E shape) ≈ frets 0–3
  - P2 (D shape) ≈ frets 2–5
  - P3 (C shape) ≈ frets 4–8
  - P4 (A shape) ≈ frets 7–10
  - P5 (G shape) ≈ frets 9–13
  - The interval _shape_ stays constant; only the fret offset moves with key.
- Worked example: in G major, ii (Am7), with P1 selected, the notes A / C / E are
  highlighted as R / 3 / 5; toggling the 7 in the Legend adds G as ♭7.
- Answers two questions in one view: _"What does the C-shape (P3) box look like in this
  key, and where does it overlap with the A-shape (P4)?"_ and _"I'm soloing over ii in G
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

A consolidated view that handles both **shell-voicing lookup** (#4 in the original plan)
and **triad-shape lookup** (#5). Originally planned as two separate tabs; merged because
both share the same two-part skeleton — a grid of vertical chord-diagram boxes on top,
an ascending-up-the-neck fretboard on bottom — and a single tab covering both is shorter
to navigate during practice.

- **Top-level selector:** Shells / Triads. Swaps the grid contents and the
  bottom-section logic.
- **Top section — chord-diagram box grid.** Shape contents depend on the selector:
  - **Shells:** root + 3rd + 7th. Two families × four chord types = 8 boxes.
    - Two families indexed by root string: 6th-string-root, 5th-string-root.
    - Four chord types per family: maj7, m7, dom7, m7♭5.
    - m7♭5 has the same fingering shape as m7 in some contexts — call this out
      explicitly so the user understands the difference is harmonic, not visual.
  - **Triads:** root + 3rd + 5th. Four string groups × three qualities × three
    inversions = 36 boxes.
    - Four string groups: 1-2-3, 2-3-4, 3-4-5, 4-5-6.
    - Three qualities per string group: major, minor, diminished.
    - Three inversions per quality: root position, 1st, 2nd.
  - Per-shape display: vertical chord-diagram boxes (4–5 frets tall) showing fingers,
    interval labels (R, 3, 5/7), and the chord-type/inversion label.
- **Bottom section — ascending up the neck.** A fretboard rendering of the 7 diatonic
  shapes ascending up the neck in the selected key.
  - **Shells mode:** the 7 diatonic shell voicings (e.g. C major: Cmaj7 at fret 8
    6th-string, Dm7 at 10, Em7 at 12, …) — "the shell voicing scale." Sub-selector:
    which root string (6th or 5th).
  - **Triads mode:** the 7 diatonic triads on a chosen string group ascending up the
    neck — "the triad scale." Sub-selector: which string group (1-2-3, 2-3-4, 3-4-5,
    4-5-6).
- Layout matches the other fretboard views: the bottom section sits where Note Map /
  Scale Positions place their fretboard. The Shells/Triads selector and the
  mode-specific sub-selector sit above it.
- Shared building blocks (now internal to this view):
  - **`ChordDiagramBox` component** — vertical 4–5-fret diagram with R/3/X labels and a
    chord-symbol header, used by both modes.
  - **Ascending-up-the-neck rendering** — fretboard slice showing 7 markers up the neck
    with chord-symbol labels, used by both modes.

### Future: Modal practice mode

The Scale Positions view today operates in what we'd call **Mode 1**: chord selection
drives chord-tone-relative coloring (Dm7's R/3/5/7 light up as blue/orange/green/purple,
regardless of which scale degree they happen to be in the key). The colors are tied to
the active chord's relative tonic.

A natural complement is a **modal practice mode** that re-anchors the tonic to the
selected chord's root and reinterprets the surrounding scale notes as a _mode_ of the
original major scale. The diatonic chord row becomes a mode selector:

| Chord degree | Mode (if treated as the new tonic) |
| ------------ | ---------------------------------- |
| I            | Ionian (the original major scale)  |
| ii           | Dorian                             |
| iii          | Phrygian                           |
| IV           | Lydian                             |
| V            | Mixolydian                         |
| vi           | Aeolian (natural minor)            |
| vii°         | Locrian                            |

**Worked example.** In C major, selecting Dm7 in modal mode treats D as the new tonic of
D Dorian. The neck still shows the same physical notes (C major scale = D Dorian = E
Phrygian etc.), but the visual contract shifts: D becomes the displayed root, the
scale-degree numbers in the ScaleDisplay relabel themselves around D (D=1, E=2, F=3,
G=4, A=5, B=6, C=7), and any chord-tone highlighting is interpreted relative to the
modal tonic.

**Why this matters for practice.** Modal soloing is a separate skill from chord-tone
targeting. When you're playing over a Dm7 vamp for an extended section, you're not just
"in C major over a ii chord" — you're _in D Dorian_. Practicing the sound of each mode
means treating its root note as home and feeling the characteristic intervals (Dorian's
natural 6, Lydian's ♯4, Phrygian's ♭2, etc.). A dedicated mode that re-anchors
visualization helps internalize that.

**Open design questions** (to resolve when this is scoped for implementation):

- Is this a separate tab, or a toggle on the existing Scale Positions view?
- How does the chord row interaction change in modal mode — does selecting ii still
  highlight Dm7's chord tones, or does it switch into D Dorian visualization with no
  chord highlighted?
- Are the 7 modes shown as a separate selector, or always inferred from the chord row?
- Does the CAGED position framing change when the tonic shifts? In Dorian, the "P1 / E
  shape" of C major becomes a different shape relative to D as root.
- A characteristic-tones overlay (e.g., highlight ♯4 in Lydian, ♭2 in Phrygian) would
  meaningfully add to mode practice — worth scoping alongside the basic re-anchor.

Status: not yet designed in detail. Reach for this section when starting the brainstorm.

---

## Technical decisions and constraints

- The **fretboard renderer is dumb.** It accepts `NoteMarker[]` and renders; computing
  which markers to display is the responsibility of each view, using the theory layer
  (per the Step 1 spec).
- **Frets 0–15 minimum.** The Step 1 spec allows 0–15 or 0–17 — Step 1 chose 15.
- All theory in **pure functions** under `src/theory/`. No state-management library;
  React `useState` lifted to `App` is sufficient.
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
  5 fret-windows anchored to C major (one per CAGED shape) plus a per-key wrap rule that
  prefers high-neck placement and only octave-wraps when the natural window is entirely
  past `FRET_COUNT`.
- **`FRET_COUNT` constant** — global single source of truth for the highest fret
  rendered (currently 15).
- **`roleFromChordTone` helper** — pure-function chord-tone-role resolution, shared
  across Note Map and Scale Positions.

What still needs building, per the consolidated 3-tab plan:

- **`getDiatonicTriads(key)`** — sibling of `getDiatonicChords`, returning R/3/5 (no
  7th). Used by both the chord-row triads extension and the Chord Shapes view's bottom
  section in Triads mode.
- **`ChordDiagramBox` component** — vertical 4–5-fret diagram with R/3/X labels and a
  chord-symbol header. Internal to Chord Shapes; used by both Shells and Triads modes.
- **Ascending-up-the-neck fretboard rendering** — the bottom section of Chord Shapes.
  Different rendering contract from the existing `Fretboard` (key-anchored 7-marker
  progression vs. all-notes-on-neck); decide during design whether this is a new
  component or a configuration of the existing `Fretboard`.

---

## Dependencies between views

After consolidation the dependency map is short:

- **Diatonic chord row triads** — extends the existing `DiatonicChords` component.
  Touches Note Map and Scale Positions only insofar as both render that component.
- **Chord Shapes** — standalone new view. Internally shares `ChordDiagramBox` and the
  ascending-up-the-neck rendering between its Shells and Triads modes. Independent of
  Note Map / Scale Positions.

---

## View completion map

| View                      | Status      | Notes                                                                                                                                                                                                       |
| ------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Note Map                  | Done        | Step 1 proof view; rendered by [NoteMapView.tsx](src/views/NoteMapView.tsx).                                                                                                                                |
| Scale Positions           | Done        | Consolidated CAGED-box + chord-tone view; rendered by [ScalePositionsView.tsx](src/views/ScalePositionsView.tsx). Spec: [design](../superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md). |
| Chord Shapes              | Not started | Consolidates the originally-separate Shell Voicings (#4) and Triad Shapes (#5) tabs. Shells/Triads selector swaps the chord-diagram box grid and the ascending-up-the-neck section.                         |
| Diatonic chord row triads | Not started | Small extension to the existing `DiatonicChords` component: triads alongside sevenths. Replaces the originally-planned "Diatonic Chord Reference" tab.                                                      |

---

## References

- Practice plan: `docs/practice/guitar-practice-plan.md`
- Step 1 design spec: `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md`
- Step 1 implementation plan: `docs/superpowers/plans/2026-05-03-fretlab-step1.md`
