# Fretlab — App Vision and View Designs

This document captures the initial design intent for Fretlab.

---

## Vision and methodology

- **Reference tool, not a tutorial.** Aimed at intermediate-to-advanced players.
  The app sits next to the user during practice (laptop or iPad on a music stand)
  as a key-aware "cheat sheet."
- **Practice areas it supports:** fretboard memorization, chord-tone soloing,
  diatonic harmony, shell voicings, diatonic triads, CAGED scale-position
  connection.
- **Fast switching is a core constraint.** Changing key or view must be instant.
  No animations that interrupt practice flow.
- **Consistent coloring across all views.** Root / 3rd / 5th / 7th have fixed
  interval colors; other scale tones muted; out-of-key notes hidden or faint. The
  Legend is always visible.

---

## Build priority order

The tab-bar order (Note Map → Scale Positions → Diatonic Chords → Shell
Voicings → Triad Shapes) is **not** the build order. Build priority is by
practice value:

1. **Fretboard + key selector** — done as Step 1, with Note Map as the proof view.
2. **Scale Positions** — CAGED boxes with chord-tone targeting *and* transition-zone visualization in one view (originally split across "Chord Tones in Scale Positions" and "Scale Positions"; consolidated once the multi-position implementation made the split redundant).
3. **Diatonic Chord Reference** — quick scannable harmony reference.
4. **Shell Voicing Diagrams** — comping reference with neck mapping.
5. **Diatonic Triad Shapes** — triad inversions across string groups.
6. **Note Map** — lowest priority; partially superseded by the Step 1
   implementation already on screen.

---

## View designs

### Note Map *(implemented in Step 1)*

- The default landing view and the proof artifact for the Step 1 fretboard +
  theory layer.
- For the selected key, all in-key notes render across frets 0–15 with
  Root / 3rd / 5th / 7th in interval colors and the remaining scale tones
  muted. An "All notes" mode disables key filtering.
- A diatonic chord row sits above the fretboard. Selecting a chord remaps the
  highlights so that chord's R / 3 / 5 / 7 light up against the muted scale
  background — the same visual contract the other views will follow.
- An accidental toggle switches sharp / flat spelling; the Legend is always on
  screen.
- Scope-wise this view is a superset of what the dedicated tabs need; later
  tabs slice it down (chord-tones-only, position-only, etc.).

### Scale Positions *(highest practice value)*

A consolidated view that handles both CAGED-box exploration *and* chord-tone
targeting within a box. Originally split across two planned tabs; merged once
the multi-position toggle + box-annotation implementation made the split
redundant — the same data and controls serve both practice intents.

- **The view's identity is the box.** Note Map answers *where are the notes?*
  globally; this view answers *inside this box, what's my hand doing?*
  Without a position selected the view becomes a degenerate Note Map, so a
  position must always be picked.
- Inputs: global key + a set of CAGED positions (P1–P5, independently
  toggleable; default just **P1**, no "All" option) + an optional chord
  degree (I, ii, iii, IV, V, vi, vii°).
- The fretboard renders a soft tinted rectangle behind each selected
  position's fret window with a compact label (e.g., `P1 — E`) above it. The
  box is a visible artifact, not just inferred from where markers happen to
  appear.
- **Overlap zones get explicit emphasis** when two or more selected positions
  share frets — a brighter fill plus a defined border highlights the
  transition area. Reinforces that the CAGED shapes are connected pieces of
  one continuous musical map, not isolated islands.
- **Chord-tone mode (chord selected):** the chord's R / 3 / 5 / 7 light up
  inside the union of selected position windows, against the in-key scale
  tones (faint). The Legend's R / 3 / 5 / 7 toggles control which chord-tone
  roles light up.
- **Scale-position mode (no chord selected):** clicking the currently-selected
  chord card again clears it. With no chord active, no chord-tone highlights
  render — every in-key note inside the selected positions falls back to the
  plain `scale` role, leaving the box framing as the dominant visual. This is
  the explicit "clear highlights" shortcut for box-only practice. The
  Legend's R / 3 / 5 / 7 toggles remain enabled (they're orthogonal to chord
  selection), but with no chord context they have nothing to demote.
- A **"Show context notes"** toggle (off by default) renders in-key notes
  outside the selected positions with role `muted` (very faint context).
  Default off keeps the box visually focused.
- **Zero positions toggled** → empty-state message ("Toggle a position to
  begin"). The position toggles stay visible above the message so the user
  can re-enable.
- **"All Notes" key** → empty-state message ("Select a key to view scale
  positions"). The view requires a key.
- Layout matches Note Map: fretboard, then Legend below it, then the
  diatonic chord row. View-specific controls (position toggles, context
  toggle) sit inside the view above the fretboard.
- CAGED encoding is anchored to C major, with shapes shifting by key:
  - P1 (E shape) ≈ frets 0–3
  - P2 (D shape) ≈ frets 2–5
  - P3 (C shape) ≈ frets 4–8
  - P4 (A shape) ≈ frets 7–10
  - P5 (G shape) ≈ frets 9–13
  - The interval *shape* stays constant; only the fret offset moves with key.
- Worked example: in G major, ii (Am7), with P1 selected, the notes A / C /
  E are highlighted as R / 3 / 5; toggling the 7 in the Legend adds G as ♭7.
- Answers two questions in one view: *"What does the C-shape (P3) box look
  like in this key, and where does it overlap with the A-shape (P4)?"* and
  *"I'm soloing over ii in G in position 3 — which notes do I target?"*.
- Implementation spec:
  `docs/superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md`.

### Diatonic Chord Reference

- **Not a fretboard view.** Table/card layout.
- For the selected key, shows:
  - 7 triads (Roman numerals + quality + spelled notes).
  - 7 diatonic seventh chords (Imaj7, ii7, iii7, IVmaj7, V7, vi7, viiø7) with
    notes spelled out.
- Optimized for fast scanning. Supports Roman-numeral speed drills and song
  analysis.
- Note: a chord-row variant of this is already on screen in the Note Map view.
  The dedicated tab is the scannable reference table version.

### Shell Voicing Diagrams

- A **shell voicing** = root + 3rd + 7th (3 notes).
- Two families, indexed by root string:
  - **6th-string-root** voicings.
  - **5th-string-root** voicings.
- For each family, four chord types: maj7, m7, dom7, m7b5.
  - m7b5 has the same fingering shape as m7 in some contexts — call this out
    explicitly so the user understands the difference is harmonic, not visual.
- Per-shape display: **vertical chord-diagram boxes** (4–5 frets tall) showing
  fingers, interval labels (R, 3, 7), and the chord-type label.
- Below the box grid: a **fretboard view mapping all 7 diatonic shell voicings
  ascending up the neck** in the selected key.
  - Example for C major: Cmaj7 at fret 8 on the 6th string, Dm7 at 10, Em7 at 12,
    and so on. The "shell voicing scale."

### Diatonic Triad Shapes

- Triad shapes (R, 3, 5) on **four string groups**: 1-2-3, 2-3-4, 3-4-5, 4-5-6.
- For each string group, three qualities (major, minor, diminished), each in
  **3 inversions** (root position, 1st, 2nd).
- Display as **small chord-diagram boxes** with R / 3 / 5 labels.
- Below the diagrams: a **fretboard view mapping all 7 diatonic triads** on a
  chosen string group, ascending up the neck — I, ii, iii, IV, V, vi, vii° as
  triads ("the triad scale").

---

## Technical decisions and constraints

- The **fretboard renderer is dumb.** It accepts `NoteMarker[]` and renders;
  computing which markers to display is the responsibility of each view, using
  the theory layer (per the Step 1 spec).
- **Frets 0–15 minimum.** The Step 1 spec allows 0–15 or 0–17 — Step 1 chose 15.
- All theory in **pure functions** under `src/theory/`. No state-management
  library; React `useState` lifted to `App` is sufficient.
- **Chord construction formulas** are explicit:
  - Triads: maj = 1, 3, 5; min = 1, ♭3, 5; dim = 1, ♭3, ♭5.
  - Sevenths: maj7 = 1, 3, 5, 7; m7 = 1, ♭3, 5, ♭7; dom7 = 1, 3, 5, ♭7;
    m7♭5 = 1, ♭3, ♭5, ♭7.
- **CAGED position fret ranges** are encoded relative to C major. Positions shift
  with key but the interval shape is constant — encode once, transpose for any
  key.

---

## Shared infrastructure to build

Several views depend on building blocks that don't exist yet. Identifying these
keeps work efficient:

- **CAGED position model** — built and validated by the Scale Positions
  view. Encoded as 5 fret-windows anchored to C major (one per CAGED shape)
  plus a per-key wrap rule that prefers high-neck placement and only
  octave-wraps when the natural window is entirely past `FRET_COUNT`.
- **`FRET_COUNT` constant** — global single source of truth for the highest
  fret rendered (currently 15). Replaces the inline literals in
  `NoteMapView.tsx` and `Fretboard.tsx`.
- **`roleFromChordTone` helper** — extracted from the chord-tone-resolution
  block currently inline in `NoteMapView.tsx`. Same logic reused by the
  Scale Positions view.
- **Vertical chord-diagram box component** — used by Shell Voicings and Triad
  Shapes. A natural shared subcomponent.
- **Chord-degree → chord-tone computation** — partially present already in the
  Note Map view (`getDiatonicChords`, the role mapping in `NoteMapView`); will
  expand for chord-tone-only filtering and 7th toggling.
- **"Ascending up the neck" view** — used by both Shell Voicings and Triad
  Shapes (the diatonic-progression-on-a-string-set rendering). Different
  rendering strategy than the existing Note Map; might need a new view component.

---

## Dependencies between views

- **Shell Voicings ↔ Triad Shapes:** share the chord-diagram-box component and
  the "ascending up the neck" rendering pattern.
- **Diatonic Chord Reference:** standalone — least dependency on existing code.
  Could be built in parallel with any other view.

---

## View completion map

| View                     | Status      | Notes                                                                          |
| ------------------------ | ----------- | ------------------------------------------------------------------------------ |
| Note Map                 | Done        | Step 1 proof view; rendered by [NoteMapView.tsx](src/views/NoteMapView.tsx).   |
| Scale Positions          | Done        | Consolidated CAGED-box + chord-tone view; rendered by [ScalePositionsView.tsx](src/views/ScalePositionsView.tsx). Spec: [design](../superpowers/specs/2026-05-05-chord-tones-in-scale-positions-design.md). |
| Diatonic Chord Reference | Not started | Standalone; reference-table version of the chord row already in Note Map.      |
| Shell Voicing Diagrams   | Not started | Needs a vertical chord-diagram box and the ascending-up-the-neck view.         |
| Diatonic Triad Shapes    | Not started | Shares the chord-diagram box and ascending-up-the-neck view with Shell Voicings. |

---

## References

- Practice plan: `docs/practice/guitar-practice-plan.md`
- Step 1 design spec: `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md`
- Step 1 implementation plan: `docs/superpowers/plans/2026-05-03-fretlab-step1.md`
