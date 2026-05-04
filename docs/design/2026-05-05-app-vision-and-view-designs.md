# Fretlab — App Vision and View Designs

This document captures the full design intent for Fretlab: the product vision, the
six view tabs, the priority order in which they should be built, and the shared
infrastructure several of them depend on.

It was reconstructed from the original product spec (delivered in the project's
first Claude session) plus the Step 1 design spec at
`docs/superpowers/specs/2026-05-03-fretlab-step1-design.md`. As of writing, only
the **Note Map** view is implemented; the other five render a "Coming soon"
placeholder.

---

## Vision and methodology

- **Reference tool, not a tutorial.** Aimed at intermediate-to-advanced players.
  The app sits next to the user during practice (laptop or iPad on a music stand)
  as a key-aware "cheat sheet."
- **Practice areas it supports:** fretboard memorization, chord-tone soloing,
  diatonic harmony, shell voicings, diatonic triads, CAGED scale-position
  connection. Mirrors the practice plan in `docs/practice/guitar-practice-plan.md`.
- **Fast switching is a core constraint.** Changing key or view must be instant.
  No animations that interrupt practice flow.
- **Consistent coloring across all views.** Root / 3rd / 5th / 7th have fixed
  interval colors; other scale tones muted; out-of-key notes hidden or faint. The
  Legend is always visible.
- **Dark theme** preferred (evening practice). Large fretboard — UI chrome should
  not shrink it.

---

## Build priority order

The tab-bar order (Note Map → Scale Positions → Chord Tones → Diatonic Chords →
Shell Voicings → Triad Shapes) is **not** the build order. Build priority is by
practice value:

1. **Fretboard + key selector** — done as Step 1, with Note Map as the proof view.
2. **Chord Tones in Scale Positions** — highest practice value (target-tone
   soloing reference).
3. **Diatonic Chord Reference** — quick scannable harmony reference.
4. **Scale Positions** — CAGED boxes and transition-zone visualization.
5. **Shell Voicing Diagrams** — comping reference with neck mapping.
6. **Diatonic Triad Shapes** — triad inversions across string groups.
7. **Note Map** — lowest priority; partially superseded by the Step 1
   implementation already on screen.

---

## View designs

### Scale Positions

- Shows the **5 CAGED major-scale positions** for the selected key.
- A position selector lets the user pick position 1–5, or overlay all.
- When a single position is selected, only that box renders. Notes are color-coded
  by interval function across all 7 scale degrees (1, 2, 3, 4, 5, 6, 7) — not just
  chord tones.
- When **two adjacent positions are selected, the overlap zone is highlighted**
  (the shared notes between boxes). This is the explicit transition-practice
  feature.
- CAGED encoding is anchored to C major, with shapes shifting by key:
  - P1 (E shape) ≈ frets 0–3
  - P2 (D shape) ≈ frets 2–5
  - P3 (C shape) ≈ frets 4–8
  - P4 (A shape) ≈ frets 7–10
  - P5 (G shape) ≈ frets 9–13
  - The interval *shape* stays constant; only the fret offset moves with key.

### Chord Tones in Scale Positions *(highest practice value)*

- Inputs: global key + chord degree (I, ii, iii, IV, V, vi, vii°) + optional
  scale position (1–5 or all).
- The full major scale renders muted/faint as background context.
- The selected chord's **R / 3 / 5** light up in interval colors.
- A toggle adds the **7th** of that chord.
- Worked example: in G major, ii (Am), the notes A / C / E are highlighted as
  R / 3 / 5; toggling the 7th adds G as ♭7 (since Am7 = A C E G).
- Answers the question: *"I'm soloing over ii in G in position 3 — which notes do
  I target?"*

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

- **CAGED position model** — used by Scale Positions and Chord Tones in Scale
  Positions. Build once, share.
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

- **Scale Positions → Chord Tones in Scale Positions:** the CAGED model and
  position selector built for Scale Positions are reused.
- **Shell Voicings ↔ Triad Shapes:** share the chord-diagram-box component and
  the "ascending up the neck" rendering pattern.
- **Diatonic Chord Reference:** standalone — least dependency on existing code.
  Could be built in parallel with any other view.

---

## References

- Practice plan: `docs/practice/guitar-practice-plan.md`
- Step 1 design spec: `docs/superpowers/specs/2026-05-03-fretlab-step1-design.md`
- Step 1 implementation plan: `docs/superpowers/plans/2026-05-03-fretlab-step1.md`
- Original product spec: prior session transcript at
  `~/.claude/projects/-Users-felixzailskas-Code-fretlab/177a2f68-9ffb-4cf1-b18f-1f3b1d23e5cf.jsonl`
  (first user message contains the full spec).
