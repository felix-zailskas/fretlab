# Modal practice mode — parent-scale extension (design note)

## Status

Design note. Captured during Phase A implementation of the V1 modal practice mode (modes
of the major scale only). Not yet specced. Reach for this when V1 ships and the demand
for additional parent scales is real.

## Motivation

V1 covers the 7 modes of the major scale. The natural follow-up is supporting modes of
the two other commonly-used heptatonic scales:

- **Harmonic minor** — yields Phrygian Dominant (V), Locrian ♮6 (II), Lydian ♯2 (VI),
  and 4 others. Used in flamenco, Eastern European and Middle Eastern music, metal, jazz
  over altered dominants.
- **Melodic minor** (ascending form) — yields Lydian Dominant (IV), the Altered scale
  (VII), the half-diminished / Locrian ♯2 (VI), and 4 others. Core jazz vocabulary.

Together, these add 14 modes for ~21 total. Each is a real practice target, not
theoretical curiosity.

## Scope intent

Do this **fully**: extend not just the theory layer but also the position- based
practice view (Scale Positions). The cheap fallback — degrade to a full-neck
Note-Map-style display for non-major parents — leaves Fretlab's most-used practice view
dead-weight in V2. The position-system question is solvable (see
[Position systems](#position-systems) below); we just have to do the work.

## The 14 additional modes

### Modes of the harmonic minor scale (rooted at C, parallel form)

| #   | Mode name                         | Formula              | Notes (C-rooted)     |
| --- | --------------------------------- | -------------------- | -------------------- |
| 1   | Harmonic minor                    | 1 2 ♭3 4 5 ♭6 7      | C D E♭ F G A♭ B      |
| 2   | Locrian ♮6                        | 1 ♭2 ♭3 4 ♭5 6 ♭7    | C D♭ E♭ F G♭ A B♭    |
| 3   | Ionian ♯5 (Augmented major)       | 1 2 3 4 ♯5 6 7       | C D E F G♯ A B       |
| 4   | Dorian ♯4 (Romanian / Ukrainian)  | 1 2 ♭3 ♯4 5 6 ♭7     | C D E♭ F♯ G A B♭     |
| 5   | Phrygian Dominant                 | 1 ♭2 3 4 5 ♭6 ♭7     | C D♭ E F G A♭ B♭     |
| 6   | Lydian ♯2                         | 1 ♯2 3 ♯4 5 6 7      | C D♯ E F♯ G A B      |
| 7   | Ultralocrian (altered diminished) | 1 ♭2 ♭3 ♭4 ♭5 ♭6 ♭♭7 | C D♭ E♭ F♭ G♭ A♭ B♭♭ |

### Modes of the melodic minor scale (ascending form, rooted at C)

| #   | Mode name                     | Formula             | Notes (C-rooted)    |
| --- | ----------------------------- | ------------------- | ------------------- |
| 1   | Melodic minor (Jazz minor)    | 1 2 ♭3 4 5 6 7      | C D E♭ F G A B      |
| 2   | Dorian ♭2 (Phrygian ♮6)       | 1 ♭2 ♭3 4 5 6 ♭7    | C D♭ E♭ F G A B♭    |
| 3   | Lydian augmented              | 1 2 3 ♯4 ♯5 6 7     | C D E F♯ G♯ A B     |
| 4   | Lydian Dominant               | 1 2 3 ♯4 5 6 ♭7     | C D E F♯ G A B♭     |
| 5   | Mixolydian ♭6                 | 1 2 3 4 5 ♭6 ♭7     | C D E F G A♭ B♭     |
| 6   | Locrian ♯2 (half-diminished)  | 1 2 ♭3 4 ♭5 ♭6 ♭7   | C D E♭ F G♭ A♭ B♭   |
| 7   | Altered scale (Super Locrian) | 1 ♭2 ♭3 ♭4 ♭5 ♭6 ♭7 | C D♭ E♭ F♭ G♭ A♭ B♭ |

## Architecture

### Type & data model

Recommended: **Option A — Flat `Mode` union extended.**

```ts
type ParentScale = "major" | "harmonic-minor" | "melodic-minor";

type Mode =
  // Major (7 modes — V1)
  | "ionian"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "aeolian"
  | "locrian"
  // Harmonic minor (7 modes — V2)
  | "harmonic-minor"
  | "locrian-natural-6"
  | "ionian-sharp-5"
  | "dorian-sharp-4"
  | "phrygian-dominant"
  | "lydian-sharp-2"
  | "ultralocrian"
  // Melodic minor (7 modes — V2)
  | "melodic-minor"
  | "dorian-flat-2"
  | "lydian-augmented"
  | "lydian-dominant"
  | "mixolydian-flat-6"
  | "locrian-sharp-2"
  | "altered";

const MODE_PARENT: Record<Mode, ParentScale>;
```

The existing data tables (`MODE_INTERVALS`, `MODE_DEGREE_LABELS`, `MODE_STEPS`,
`CHARACTERISTIC_DEGREES`) all extend by adding 14 new rows — no structural change.
`PARENT_MAJOR_OFFSET` becomes `PARENT_TONIC_OFFSET` and gets a partner value indicating
which parent scale's tonic the offset targets, so `parentMajorOf` becomes
`parentScaleOf(tonic, mode): { tonic, parentScale }`.

Hierarchical state (Option B — `(parentScale, mode)` as separate state pieces) is also
viable but reshapes App state and every component that reads `mode`. The flat union is
the smaller diff and lets the parent-scale grouping live in metadata (and the UI), not
in the type.

### UI: mode selector

The 7-button pill row from V1 doesn't scale to 21 options. Two viable patterns:

- **Two-tier picker:** parent-scale tab strip (`Major | Harmonic minor | Melodic minor`)
  above a 7-button mode row that re-renders when the parent changes. Maps the user's
  mental model literally.
- **Grouped dropdown:** native `<select>` with `<optgroup>`s for the three parents.
  Compact but less practice-friendly when switching frequently.

Lean: two-tier picker. The header is already growing in V1; keeping the mode row visible
aids fast modal switching during practice.

### Position systems

CAGED is specifically a major-scale construct — its 5 shapes are the barre positions of
the major triad (`C`, `A`, `G`, `E`, `D` shapes). It does not generalize cleanly to
harmonic or melodic minor.

The well-established alternative is **3-notes-per-string (3NPS)**: 7 patterns covering
the entire fretboard, one starting on each scale degree, every string carrying exactly 3
notes. 3NPS is the de-facto standard for non-major heptatonic-scale practice on guitar —
used widely by Berklee/jazz/shred pedagogy because it works identically for any 7-note
scale (major, harmonic minor, melodic minor, and beyond).

Recommendation:

- Per-parent `positionSystem`: `'caged' | '3nps'`.
- **Major** stays on CAGED (preserves V1 behavior; CAGED is a strict practice target for
  major-scale players).
- **Harmonic minor** and **melodic minor** use 3NPS.
- 3NPS positions are derivable from the parent scale's intervals + standard 3NPS
  conventions — encoding is data, not new theory.
- Open: do we expose `positionSystem` as a user override (let major-scale players opt
  into 3NPS too), or strictly auto-pick from parent? Default auto-pick; user override is
  V3-or-never.

This means the existing `CAGED_POSITIONS` data and `getPositionWindows` helper stay
scoped to major. A sibling `THREE_NPS_POSITIONS` data set + a `get3NPSWindows` helper
power the non-major parents. `ScalePositionsView` chooses between them based on the
active parent scale.

## Characteristic-tone overlay

The V1 overlay already handles the modes-of-major case. Extending to harmonic/melodic
minor parents requires defining characteristic intervals for the 14 new modes:

- **Phrygian Dominant** — major 3rd (the scale's defining color, against the ♭2 / ♭6
  darkness of Phrygian).
- **Lydian Dominant** — ♯4 over ♭7 (combined Lydian-and-dominant flavor).
- **Altered scale** — every alterable note is altered (♭9, ♯9, ♯11, ♭13);
  characteristic-tone overlay highlights the cluster.
- **Locrian ♮6** — natural 6 (raises Phrygian's ♭6, defining the mode against Locrian).
- Other 10 modes — define case by case during specing.

The existing `CHARACTERISTIC_DEGREES` table extends naturally; only the data-entry work
is new.

## Open questions for spec

1. **Diatonic 7th-chord qualities** for harmonic and melodic minor modes produce some
   unusual chord types (augmented major 7, diminished 7, m6, altered 7s). The chord
   row's `QUALITY_ACCENT` map and the underlying `ChordQuality` union may need to grow.
   Need to enumerate the 14 modes' 7 diatonic 7th chords and decide how exotic types
   render.
2. **Roman numeral conventions** for non-major modes are less standardized than for
   major modes. Need to settle on a notation pattern (e.g., do we write Phrygian
   Dominant's i7♭9 or ♭II as `♭IImaj7` or `♭II maj7`).
3. **Mode-selector default state** when the user switches parent scales: reset to the
   parent's first mode (Harmonic minor / Melodic minor)? Try to preserve degree
   position?
4. **Characteristic-tone choice** for the 10 modes not covered above.
5. **Position-system override**: does the user get a toggle, or is `positionSystem`
   auto-derived from `parentScale`?

## Pre-spec research

Before specing this work, refresh the following:

- 3NPS standard pattern reference for major / harmonic minor / melodic minor
  (especially: which scale degree starts each pattern; canonical fingerings; whether the
  7-pattern set generalizes cleanly to all heptatonic scales).
- Diatonic chord qualities of harmonic and melodic minor modes (Mark Levine _The Jazz
  Theory Book_, online references).
- Most common practical applications of each mode (when do players actually reach for
  Lydian ♯2 vs. Lydian augmented? Which modes are "everyone uses these constantly" vs.
  "rare, dark, situational"?). May inform whether the V2 scope ships all 14 or a curated
  subset (e.g. Phrygian Dominant + Harmonic minor + Lydian Dominant + Altered as the
  "core 4 add-ons").

## Estimated scope

Roughly 1.5× V1's surface area. The bulk:

- Theory layer: 14 new mode entries across all data tables; `parentScaleOf`
  generalization; new `ChordQuality` types if exotic 7ths appear.
- Position system: new 3NPS data + helper module; routing logic in `ScalePositionsView`.
- UI: two-tier mode selector; chord row growing additional Roman-numeral / quality
  glyphs for the new chord types.
- Tests: theory-layer coverage proportional to V1 (lots of canonical scale
  - chord assertions across the 14 new modes).
- Docs: vision-doc update + spec.

## Sources

- [The Seven Modes of Harmonic Minor — Jazz Guitar Licks](https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-harmonic-minor-scale/)
- [Phrygian Dominant Scale — Wikipedia](https://en.wikipedia.org/wiki/Phrygian_dominant_scale)
- [Modes of the Melodic Minor Scale — Jazz Guitar Licks](https://www.jazz-guitar-licks.com/pages/guitar-scales-modes/modes-of-the-melodic-minor-scale/)
- [The Modes of the Melodic Minor and their Usage in Jazz — London Piano Institute](https://www.londonpianoinstitute.co.uk/the-modes-of-the-melodic-minor-and-their-usage-in-jazz/)
- [3 Note Per String Scale Patterns — Study Guitar](https://www.study-guitar.com/blog/3-note-per-string-scale-patterns/)
- [3 Notes Per String Major Scale Patterns — Applied Guitar Theory](https://appliedguitartheory.com/lessons/3-notes-per-string-major-scale-patterns/)
- [3 Notes Per String Minor Scale Patterns — Applied Guitar Theory](https://appliedguitartheory.com/lessons/3-notes-per-string-minor-scale-patterns/)
- [All Modes Explained — Ruth Pheasant Piano Lessons](https://ruthpheasantpianolessons.com/blog/complete-guide-to-modes-of-the-major-melodic-minor-and-harmonic-minor-scale/)
