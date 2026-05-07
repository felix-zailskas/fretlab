# Fretlab

[![CI](https://github.com/felix-zailskas/fretlab/actions/workflows/ci.yml/badge.svg)](https://github.com/felix-zailskas/fretlab/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/felix-zailskas/fretlab/actions/workflows/deploy.yml/badge.svg)](https://github.com/felix-zailskas/fretlab/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/github/license/felix-zailskas/fretlab?cacheSeconds=0)](LICENSE)

A key-aware fretboard reference for guitarists. Sits next to you during practice —
laptop or iPad on a music stand — and answers questions like _"which notes do I target
soloing over ii in G in position 3?"_ fast enough not to interrupt your flow.

Fretlab is a **reference tool, not a tutorial.** It is aimed at intermediate and
advanced players who already know what they want to practice and need a clean visual
lookup.

![Hero screenshot — the Note Map tab in C major with the I chord (Cmaj7) selected. The fretboard shows all in-key notes across 16 frets: C is highlighted as the root (blue), E as the 3rd (orange), G as the 5th (green), B as the 7th (purple); the rest of the scale (D, F, A) renders in muted gray. The diatonic chord row sits below the fretboard with Cmaj7 highlighted, and the C major scale display above the board shows whole/half step intervals between scale degrees.](docs/images/hero.png)

## About

Fretlab visualizes music theory directly on the guitar neck. Pick a key, pick a chord,
pick one or more CAGED positions, and the relevant notes light up in interval colors
(root / 3rd / 5th / 7th) against a faint scale background. A header-level mode selector
extends practice to the seven parallel modes — switching to Dorian, Lydian, Phrygian,
etc. re-anchors every view to the modal scale.

The whole interface is designed for **fast switching during practice**: instant key,
mode, chord, and position changes; no animations that interrupt you; consistent coloring
across all views (R / 3rd / 5th / 7th have fixed colors, and out-of-key notes are hidden
by default). The Legend stays on screen so you always know what each color means.

A header **theme toggle** cycles Auto / Light / Dark — Auto follows the system
`prefers-color-scheme`, with a small icon and label that reveals which mode Auto is
currently resolving to so you can tell at a glance.

## Views

Each tab in Fretlab answers a different practice question. Three views ship today, plus
the cross-cutting [Modal practice mode](#modal-practice-mode) that augments all of them
(see the [vision document](docs/design/2026-05-05-app-vision-and-view-designs.md) for
the full roadmap and what's deferred).

### Note Map

![Short recording of the Note Map tab — cycling through keys (C → G → D → E♭) to show how the in-key notes shift across the neck. Then clicking through the diatonic chord row to watch each chord's R / 3 / 5 / 7 light up. Toggling individual roles (3rd, 5th, 7th) in the Legend to demote them to plain scale tones. Switching the accidental toggle from sharp to flat. Switching the key to "All Notes" to disable key filtering and see every note on the neck.](docs/images/note-map.gif)

The default landing view. For the selected key, all in-key notes render across the
visible fret range (default 0–15, user-configurable via the FretRangeControl popover up
to fret 24). Root / 3rd / 5th / 7th appear in their interval colors; the rest of the
scale (2nd / 4th / 6th) is muted.

A row of diatonic chord cards (I through vii°) sits below the fretboard. Selecting a
chord remaps the highlights so that chord's R / 3 / 5 / 7 light up against the muted
scale background — useful for spotting chord tones across the entire neck at once.
Clicking the currently-selected card again deselects it, clearing all chord-tone
highlights so every in-key note renders as a plain scale tone.

**Features**

- 12-key selector plus an "All Notes" mode that disables key filtering
- Sharp / flat accidental toggle (with automatic enharmonic key swap so you stay on the
  same scale)
- Configurable fret range (default 0–15, ceiling 24) via a header popover; the chosen
  range applies to every view
- 7 diatonic chord cards with a triads / sevenths toggle (R/3/5 or R/3/5/7 highlighting)
- Legend with R / 3 / 5 / 7 toggles to selectively show or hide chord-tone roles

**During practice**

- Get familiar with where notes sit in a given key across the entire fretboard.
- Quickly check where a chord's R / 3 / 5 / 7 live when you're improvising or arranging.

### Scale Positions

![Short recording of the Scale Positions tab — starting in C major with P1 selected (corner-bracketed at frets 0–3, labeled "P1 — C" above the board). Toggling P2 on, second box appears at frets 2–5 with a brighter outlined overlap rectangle at frets 2–3. Toggling P3 on, three boxes total with two overlap zones. Toggling the I chord card off — markers shift from chord-tone highlighting to plain major-scale R / 3 / 5 / 7. Switching key to G — boxes shift up the neck; P5 wraps to the low frets. Toggling "Show context notes" on — out-of-position in-key notes render in muted color.](docs/images/scale-positions.gif)

A consolidated CAGED-box practice tool. Each selected position renders as a framed
region on the neck with a label (e.g. `P1 — C` for the first position, C-shape). When
two or more boxes overlap, the shared frets render as a brighter outlined zone —
reinforcing that the CAGED shapes are connected pieces of one continuous map, not
isolated islands.

The view supports two complementary practice modes via the same controls:

- **Chord-tone targeting** — pick a chord from the diatonic row. The chord's R / 3 / 5 /
  7 light up _inside_ the selected positions, against the scale-tone background.
- **Pure scale-position study** — click the currently-selected chord card again to
  deselect it. With no chord active, no chord tones highlight at all — every in-key note
  renders as a plain scale tone, leaving just the box framing on the neck. The Legend's
  R / 3 / 5 / 7 toggles stay enabled, but with no chord context they have nothing to
  demote.

**Features**

- Independent toggles for the 5 CAGED positions (P1 C-shape through P5 D-shape, the
  canonical CAGED order ascending from open in C major); any combination is valid
- Multi-octave window placement: every octave that fits fully inside the configured
  visible fret range renders as its own bracketed box, so a wide range can show the same
  position twice on the neck
- Corner-bracket framing on each selected position
- Brighter outlined fill for overlap zones between adjacent boxes
- "Show context notes" toggle: render in-key notes outside the selected positions in
  muted color, useful when practicing transitions

**During practice**

- _Box study_ — _"What does the C-shape (P3) look like in G major? Where does it overlap
  with the A-shape (P4)?"_ Toggle on adjacent positions and the overlap zone shows you
  exactly which frets connect them.
- _Target-tone soloing_ — _"Soloing over Am7 in P3 — where do I aim?"_ Pick the chord,
  pick the position, and the chord's R / 3 / 5 / 7 light up only inside the box.
- _Position transitions_ — toggle two adjacent positions and use the overlap zone as a
  pivot region to practice moving between boxes.

### Chord Shapes

![Short recording of the Chord Shapes tab — starting in C major with the I chord (Cmaj7) selected and the 7th chord shapes mode active. Cycling the voicing-system selector through Close → Drop 2 → Drop 3 → Drop 2&4 to watch the same chord render as four different 4-note shapes ascending the neck. Adding a second string-position toggle to render the same voicing on a different anchor string. Adding a second inversion (1st Inversion) to render both voicings stacked. Switching the chord-row mode to Triads — the voicing selector hides, the string-set toggles switch to 1-2-3 / 2-3-4 / 3-4-5 / 4-5-6, and triad shapes ascend the neck. Toggling 3rd off in the Legend — the third markers dim to muted gray instead of disappearing, keeping the reference signal visible.](docs/images/chord-shapes.gif)

A chord-centric ascending-neck view: pick a chord from the diatonic row and Fretlab
renders every fitting placement of that chord across the visible fret range. The view
has two modes (driven by the same triads / sevenths toggle that drives the chord row):

- **Triad shapes** — major / minor / diminished triad inversions across four 3-string
  groups (1-2-3, 2-3-4, 3-4-5, 4-5-6) and three inversions (root / 1st / 2nd).
- **7th chord shapes** — full 4-note voicings (R / 3 / 5 / 7) generated from a unified
  close-voicing → drop pipeline. A voicing-system selector (Close / Drop 2 / Drop 3 /
  Drop 2&4) sits above the sub-selectors. Each system exposes its own valid string sets
  (e.g. drop-2 uses the adjacent 4-string sets, drop-3 uses skipped-middle sets like
  6-4-3-2). All four inversions (root / 1st / 2nd / 3rd) are available.

String-set and inversion selections are **shared across voicing systems** via a low /
mid / high position abstraction — switching from drop-2 to drop-3 with the "low"
position selected automatically maps `3-4-5-6` to `6-4-3-2` so your hand stays in the
same neck region. Drop-3 and Drop-2&4 only have low and mid positions; if your active
selection includes "high", those systems silently render nothing for that toggle.

**Features**

- Triads / sevenths mode toggle (shared with the diatonic chord row below the fretboard,
  so changing mode in either place stays in sync)
- Voicing-system selector in sevenths mode: Close, Drop 2, Drop 3, Drop 2&4 — 160 total
  voicings across 4 systems × valid string sets × 4 inversions × 4 qualities
- String-set + inversion sub-selectors; multiple toggles ON stack their voicings on the
  same fretboard
- **Dim, don't hide:** unselected Legend roles render as muted gray on this view instead
  of disappearing, so the chord shape stays recognizable when you're focused on a single
  role

**During practice**

- _Voicing comparison_ — _"What does Cmaj7 look like as a drop-2 vs. drop-3?"_ Same
  chord, swap the voicing-system toggle, see both shapes side-by-side as you cycle.
- _Inversion drilling_ — _"Where do I find Cmaj7 with the 3 in the bass?"_ Toggle 1st
  inversion only and the view shows every placement that fits the visible fret range.
- _Diatonic comping_ — _"Which 7th chord shapes ascend the neck for a I-vi-ii-V in G?"_
  Pick each chord in turn; the same string-set + inversion stays selected so the shapes
  render at comparable positions.

The originally-planned _Diatonic Chord Reference_ tab was folded into the existing
diatonic chord row's triads / sevenths toggle, so the reference content is available
directly in Note Map and Scale Positions without an extra tab.

## Modal practice mode

![Short recording of Modal practice mode — starting in C Ionian, then cycling through the seven modes (Ionian → Dorian → Phrygian → Lydian → Mixolydian → Aeolian → Locrian) using the Mode selector in the header. As each mode is selected, the ScaleDisplay relabels the degree pills with modal accidentals (♭3, ♯4, ♭2, etc.), the diatonic chord row recomputes with modal Roman numerals (i7 / ♭IIImaj7 / ♯ivø7 / etc.), and a subtle gold ring appears on the fretboard around each mode's characteristic note (Dorian's ♮6, Lydian's ♯4, Phrygian's ♭2, Mixolydian's ♭7, Locrian's ♭5). Switching keys to D Lydian shows the spelling auto-flipping to sharps (parent A major); switching to D Phrygian flips back to flats (parent B♭ major). Manually toggling the accidental override and watching it stick until the next mode change.](docs/images/modal-mode.gif)

A header-level **Mode selector** sits next to the Key selector and turns Fretlab into a
parallel-modes practice tool. The seven modes of the major scale — Ionian, Dorian,
Phrygian, Lydian, Mixolydian, Aeolian, Locrian — are all reachable by clicking once.
Whenever a non-Ionian mode is active, the entire app re-anchors:

- **Diatonic chord row** recomputes against the modal scale (e.g. C Dorian shows
  `i7, ii7, ♭IIImaj7, IV7, v7, viø7, ♭VIImaj7`).
- **ScaleDisplay** relabels degrees with modal accidentals (`♭3`, `♯4`, etc.) so the
  difference from same-root major is immediately visible.
- **Scale Positions** reanchors its CAGED windows to the mode's _parent major scale_
  (e.g. C Dorian uses B♭ major's CAGED positions). Position labels drop the C/A/G/E/D
  shape suffix in non-Ionian modes since those names refer to major-scale fingerings.
- **Characteristic-tone overlay** — a subtle gold ring on the fretboard around each
  mode's defining tone: Dorian's ♮6, Lydian's ♯4, Phrygian's ♭2, Mixolydian's ♭7,
  Locrian's ♭5. Ionian and Aeolian (the references) have no characteristic-tone ring.
- **Spelling auto-adjusts** to the parent major's natural preference. Picking D Lydian
  flips the accidental toggle to sharps (parent A major); picking D Phrygian flips it to
  flats (parent B♭ major). Manual override is still available — toggle the accidental
  yourself and the override sticks until the next key/mode change.

For Ionian (the default), behavior is byte-identical to a non-modal Fretlab — modal mode
adds capability without disturbing major-scale practice.

**Features**

- 7-mode selector in the app header alongside Key
- Cross-cutting effect: Note Map, Scale Positions, and Chord Shapes all respect the
  active mode
- Modal Roman numerals on the chord row (`♭IIImaj7`, `viø7`, `♯ivø7`, etc.)
- Modal degree labels (`1, 2, ♭3, 4, 5, 6, ♭7` for Dorian, etc.) with whole/half-step
  pattern reshuffled per mode
- Parent-major-anchored CAGED windows in Scale Positions for non-Ionian modes
- Characteristic-tone gold ring on the fretboard
- Accidental auto-set: spelling follows the parent major scale; user override sticks
  until next key/mode change

**During practice**

- _Modal jam_ — vamp on Dm7 in D Dorian; the modal chord row + characteristic ♮6 are
  visible without leaving the view.
- _Mode comparison_ — flip between C Lydian and C Mixolydian; the ♯4 ↔ ♭7 swap is
  visible on the fretboard ring overlay and in the ScaleDisplay degree labels.
- _Working with modal harmony_ — `♭IIImaj7` in Dorian or `♯ivø7` in Lydian read directly
  off the chord row, no mental transposition.

## Keyboard shortcuts

A few shortcuts speed up the most common practice flows. They're disabled while focus is
in a text input, and modifier keys (⌘ / Ctrl / Alt) are ignored so they don't interfere
with browser shortcuts.

| Key     | Action                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| `1`–`7` | Select diatonic chord degree I through vii° (press the active degree to clear) |
| `t`     | Switch the chord row to **Triads**                                             |
| `s`     | Switch the chord row to **Sevenths**                                           |

## Getting started

Fretlab is a Vite + React + TypeScript app. To run it locally:

```bash
git clone https://github.com/felix-zailskas/fretlab.git
cd fretlab
npm install
npm run dev
```

The dev server prints a local URL (typically `http://localhost:5173/`).

### Available scripts

| Script               | Description                                          |
| -------------------- | ---------------------------------------------------- |
| `npm run dev`        | Start the Vite dev server with HMR                   |
| `npm run build`      | Type-check and produce a production build in `dist/` |
| `npm run preview`    | Preview the production build locally                 |
| `npm run lint`       | Run ESLint                                           |
| `npm test`           | Run the Vitest suite once                            |
| `npm run test:watch` | Run Vitest in watch mode                             |

### Tech stack

- **React 19** + **TypeScript ~6.0**
- **Vite 8** for the dev server and build
- **Tailwind v4** with semantic color tokens defined via `@theme`
- **Vitest 3** for the theory-layer and pure-function tests

## Documentation

- [`docs/design/`](docs/design) — vision and per-view design notes
- [`docs/superpowers/specs/`](docs/superpowers/specs) — implementation specs for
  completed work
- [`docs/superpowers/plans/`](docs/superpowers/plans) — implementation plans tracked
  task-by-task
- [`docs/practice/`](docs/practice) — the practice plan that motivates this tool

## Theory references

The 4-system 7th-chord voicing taxonomy in Chord Shapes (close, drop-2, drop-3,
drop-2&4) was cross-checked against these sources during design:

- [jazzguitar.be — Drop 2 Chords](https://www.jazzguitar.be/blog/drop-2-chords/) —
  drop-2 inversions and string-set conventions on adjacent 4-string sets.
- [learnjazzstandards.com — Drop 2 Voicings](https://www.learnjazzstandards.com/blog/drop-2-voicings/)
  — the close-voicing → drop-2 derivation, with the four bass-position labels.
- [fundamental-changes.com — Jazz Guitar Voicings](https://www.fundamental-changes.com/jazz-guitar-voicings/)
  — overview of close, drop-2, drop-3, and drop-2&4 with worked Cmaj7 examples.
- [guitarwiz.app — Drop 3 Voicings on Guitar](https://guitarwiz.app/articles/drop-3-voicings-guitar/)
  — the skipped-middle-string convention for drop-3 (`6-4-3-2`, `5-3-2-1`).
- [jazz-guitar-licks.com — Drop 2&4 Voicings](https://www.jazz-guitar-licks.com/blog/what-are-drop-2-4-chords-advanced-guitar-voicings.html)
  — drop-2&4 stacking and string-skip layout.

The shape table itself isn't copied from any source; it's generated by a single
algorithm in [`src/theory/chordShapes.ts`](src/theory/chordShapes.ts) (close-voicing
pitches → drop indices → sort → normalize) and spot-checked against known voicings from
the references above.

## Music-theory references

The modal-practice-mode design draws on these sources:

- [Mode (music) — Wikipedia](<https://en.wikipedia.org/wiki/Mode_(music)>)
- [Music Modes: Major and Minor — Berklee Online](https://online.berklee.edu/takenote/music-modes-major-and-minor/)
- [The Seven Modes — The Nandi Method](https://thenandimethod.com/lesson/the-seven-modes/)
- [Modal Schemas — Open Music Theory](https://viva.pressbooks.pub/openmusictheory/chapter/modal-schemas/)
- [Roman Numerals of Diatonic Seventh Chords — University of Puget Sound](https://musictheory.pugetsound.edu/mt21c/RomanNumeralsOfDiatonicSeventhChords.html)

## License

Released under the [MIT License](LICENSE). Copyright © 2026 Felix Zailskas.
