# Fretlab

A key-aware fretboard reference for guitarists. Sits next to you during practice — laptop or iPad on a music stand — and answers questions like *"which notes do I target soloing over ii in G in position 3?"* fast enough not to interrupt your flow.

Fretlab is a **reference tool, not a tutorial.** It is aimed at intermediate and advanced players who already know what they want to practice and need a clean visual lookup.

![Hero screenshot — the Note Map tab in C major with the I chord (Cmaj7) selected. The fretboard shows all in-key notes across 16 frets: C is highlighted as the root (blue), E as the 3rd (orange), G as the 5th (green), B as the 7th (purple); the rest of the scale (D, F, A) renders in muted gray. The diatonic chord row sits below the fretboard with Cmaj7 highlighted, and the C major scale display above the board shows whole/half step intervals between scale degrees.](docs/images/hero.png)

## About

Fretlab visualizes music theory directly on the guitar neck. Pick a key, pick a chord, pick one or more CAGED positions, and the relevant notes light up in interval colors (root / 3rd / 5th / 7th) against a faint scale background.

The whole interface is designed for **fast switching during practice**: instant key, chord, and position changes; no animations that interrupt you; consistent coloring across all views (R / 3rd / 5th / 7th have fixed colors, and out-of-key notes are hidden by default). The Legend stays on screen so you always know what each color means.

## Views

Each tab in Fretlab answers a different practice question. Two views are implemented today; more are planned (see the [vision document](docs/design/2026-05-05-app-vision-and-view-designs.md) for the full roadmap).

### Note Map

![Short recording of the Note Map tab — cycling through keys (C → G → D → E♭) to show how the in-key notes shift across the neck. Then clicking through the diatonic chord row to watch each chord's R / 3 / 5 / 7 light up. Toggling individual roles (3rd, 5th, 7th) in the Legend to demote them to plain scale tones. Switching the accidental toggle from sharp to flat. Switching the key to "All Notes" to disable key filtering and see every note on the neck.](docs/images/note-map.gif)

The default landing view. For the selected key, all in-key notes render across frets 0–15. Root / 3rd / 5th / 7th appear in their interval colors; the rest of the scale (2nd / 4th / 6th) is muted.

A row of diatonic chord cards (I through vii°) sits below the fretboard. Selecting a chord remaps the highlights so that chord's R / 3 / 5 / 7 light up against the muted scale background — useful for spotting chord tones across the entire neck at once.

**Features**
- 12-key selector plus an "All Notes" mode that disables key filtering
- Sharp / flat accidental toggle (with automatic enharmonic key swap so you stay on the same scale)
- 7 diatonic chord cards (triads + sevenths)
- Legend with R / 3 / 5 / 7 toggles to selectively show or hide chord-tone roles

**During practice**
- Get familiar with where notes sit in a given key across the entire fretboard.
- Quickly check where a chord's R / 3 / 5 / 7 live when you're improvising or arranging.

### Scale Positions

![Short recording of the Scale Positions tab — starting in C major with P1 selected (corner-bracketed at frets 0–3, labeled "P1 — E" above the board). Toggling P2 on, second box appears at frets 2–5 with a brighter outlined overlap rectangle at frets 2–3. Toggling P3 on, three boxes total with two overlap zones. Toggling the I chord card off — markers shift from chord-tone highlighting to plain major-scale R / 3 / 5 / 7. Switching key to G — boxes shift up the neck; P5 wraps to the low frets. Toggling "Show context notes" on — out-of-position in-key notes render in muted color.](docs/images/scale-positions.gif)

A consolidated CAGED-box practice tool. Each selected position renders as a framed region on the neck with a label (e.g. `P1 — E` for the first position, E-shape). When two or more boxes overlap, the shared frets render as a brighter outlined zone — reinforcing that the CAGED shapes are connected pieces of one continuous map, not isolated islands.

The view supports two complementary practice modes via the same controls:

- **Chord-tone targeting** — pick a chord from the diatonic row. The chord's R / 3 / 5 / 7 light up *inside* the selected positions, against the scale-tone background.
- **Pure scale-position study** — deselect the chord. The major scale's 1 / 3 / 5 / 7 light up — the same view, but no chord-aware re-mapping.

**Features**
- Independent toggles for the 5 CAGED positions (P1 E-shape through P5 G-shape); any combination is valid
- Per-key window placement with smart wrap (high-neck preferred; only octave-wraps when the natural window falls past the visible neck)
- Corner-bracket framing on each selected position
- Brighter outlined fill for overlap zones between adjacent boxes
- "Show context notes" toggle: render in-key notes outside the selected positions in muted color, useful when practicing transitions

**During practice**
- *Box study* — *"What does the C-shape (P3) look like in G major? Where does it overlap with the A-shape (P4)?"* Toggle on adjacent positions and the overlap zone shows you exactly which frets connect them.
- *Target-tone soloing* — *"Soloing over Am7 in P3 — where do I aim?"* Pick the chord, pick the position, and the chord's R / 3 / 5 / 7 light up only inside the box.
- *Position transitions* — toggle two adjacent positions and use the overlap zone as a pivot region to practice moving between boxes.

### Coming soon

Three additional views are on the roadmap — see the [vision document](docs/design/2026-05-05-app-vision-and-view-designs.md) for full descriptions:

- **Diatonic Chord Reference** — scannable card layout of the 7 triads and 7 seventh chords in the selected key (Roman numerals, qualities, spelled notes).
- **Shell Voicing Diagrams** — root + 3 + 7 voicings on the 6th and 5th strings (maj7, m7, dom7, m7♭5), plus the diatonic shell-voicing scale ascending up the neck.
- **Diatonic Triad Shapes** — major / minor / diminished triad inversions across four string groups, plus the diatonic-triad scale ascending up the neck.

## Getting started

Fretlab is a Vite + React + TypeScript app. To run it locally:

```bash
git clone https://github.com/<your-handle>/fretlab.git
cd fretlab
npm install
npm run dev
```

The dev server prints a local URL (typically `http://localhost:5173/`).

### Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server with HMR |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

### Tech stack

- **React 19** + **TypeScript ~6.0**
- **Vite 8** for the dev server and build
- **Tailwind v4** with semantic color tokens defined via `@theme`
- **Vitest 3** for the theory-layer and pure-function tests

## Documentation

- [`docs/design/`](docs/design) — vision and per-view design notes
- [`docs/superpowers/specs/`](docs/superpowers/specs) — implementation specs for completed work
- [`docs/superpowers/plans/`](docs/superpowers/plans) — implementation plans tracked task-by-task
- [`docs/practice/`](docs/practice) — the practice plan that motivates this tool

## License

Released under the [MIT License](LICENSE). Copyright © 2026 Felix Zailskas.
