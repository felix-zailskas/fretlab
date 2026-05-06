# Chord Shapes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the **Chord Shapes** tab — a focused diatonic-chord practice view that
renders the 7 diatonic chords as compact 3-note voicings (Triads R/3/5 or Shells R/3/7)
walking up the neck on user-selected string sets, with a cap-at-fits rule that drops
chords whose shape places notes past `FRET_COUNT`.

**Architecture:** New pure-function theory module (`chordShapes.ts`) encodes the shape
vocabulary (36 triad + 8 shell shapes) and a marker-generation pipeline. Two new small
components (`StringSetToggles`, `InversionPicker`) plus a `readOnly` prop on the
existing `Legend`. New view (`ChordShapesView.tsx`) composes them. App and ViewSelector
get wired up; the stale "Diatonic Chords / Shell Voicings / Triad Shapes" entries in
`ViewSelector` are replaced by the single Chord Shapes tab per the consolidation in the
vision doc.

**Tech Stack:** React 19, Vite, Vitest, Tailwind v4, TypeScript. Pure functions in
`src/theory/`, components in `src/components/`, views in `src/views/`. No
state-management library.

**Spec:** `docs/superpowers/specs/2026-05-06-chord-shapes-design.md`.

---

## File Structure

**New files:**

- `src/theory/chordShapes.ts` — exports `StringSet`, `RootString`, `Inversion`,
  `ChordShapesMode`, `TRIAD_SHAPES`, `SHELL_SHAPES`, `BuildChordShapeMarkersInput`,
  `buildChordShapeMarkers`. Pure functions and static data.
- `src/theory/chordShapes.test.ts` — structure tests for the shape data and pipeline
  tests for `buildChordShapeMarkers`.
- `src/components/StringSetToggles.tsx` — generic multi-toggle, used for both Triads'
  string groups and Shells' root strings.
- `src/components/InversionPicker.tsx` — single-pick segmented control (Root / 1st /
  2nd), Triads only.
- `src/views/ChordShapesView.tsx` — composition view, owns local state for mode /
  selectedStringSets / selectedRootStrings / inversion.

**Modified files:**

- `src/components/Legend.tsx` — add a discriminated-union `readOnly` mode that renders
  the swatches as static spans without click handlers.
- `src/App.tsx` — import `ChordShapesView`, add a `selectedView === "chord-shapes"`
  branch, drop the now-stale `<DiatonicChords>` rendering for the new tab (Chord Shapes
  does **not** show the chord row).
- `src/components/ViewSelector.tsx` — remove the stale `diatonic-chords` /
  `shell-voicings` / `triad-shapes` entries; add a single `chord-shapes` entry. Final
  tab list: Note Map → Scale Positions → Chord Shapes.
- `docs/design/2026-05-05-app-vision-and-view-designs.md` — flip the View completion map
  row for "Chord Shapes" from "Not started" to "Done".

**Untouched (out of scope):**

- `src/theory/scales.ts` — `getDiatonicTriads` (Phase A) and `getDiatonicChords`
  (Step 1) are used as-is.
- `src/theory/chordTones.ts` — Chord Shapes uses its own marker pipeline; the existing
  one stays for the chord-tone-targeting views.
- `src/components/Fretboard/*` — the dumb renderer consumes the new pipeline's
  `NoteMarker[]` unchanged.

---

## String-index conventions

Two conventions exist in the codebase:

- **Shape data convention:** strings 1..6, where 1 = high E, 6 = low E. This matches
  standard guitar nomenclature (chord charts, tablature). Used in `TRIAD_SHAPES`,
  `SHELL_SHAPES`, and `ShapePosition`.
- **NoteMarker convention:** strings 0..5, where 0 = low E, 5 = high E. This matches
  `STANDARD_TUNING` indexing (`STANDARD_TUNING[0] === "E"` is the low E) and the
  existing `Fretboard` renderer.

`buildChordShapeMarkers` converts when emitting markers:
`markerStringIndex = 6 - shapeStringIndex`. So shape string 6 (low E) → marker
`string: 0`, shape string 1 (high E) → marker `string: 5`.

---

## Task 1: Types, `TRIAD_SHAPES`, `SHELL_SHAPES` (TDD)

**Files:**

- Create: `src/theory/chordShapes.ts`
- Create: `src/theory/chordShapes.test.ts`

This task delivers the shape vocabulary as pure data plus structure tests.
Marker-generation logic is Task 2.

- [ ] **Step 1: Write the failing structure tests**

Create `src/theory/chordShapes.test.ts` with the structure tests (note: imports
reference values defined in Step 3):

```ts
import { describe, it, expect } from "vitest";
import {
  TRIAD_SHAPES,
  SHELL_SHAPES,
  type StringSet,
  type RootString,
  type Inversion,
} from "./chordShapes";
import type { TriadQuality, ChordQuality } from "./scales";

const STRING_SETS: StringSet[] = ["1-2-3", "2-3-4", "3-4-5", "4-5-6"];
const INVERSIONS: Inversion[] = ["root", "first", "second"];
const TRIAD_QUALITIES: TriadQuality[] = ["maj", "min", "dim"];
const ROOT_STRINGS: RootString[] = ["6th", "5th"];
const CHORD_QUALITIES: ChordQuality[] = ["maj7", "m7", "7", "m7b5"];

describe("TRIAD_SHAPES — structure", () => {
  it("has all 4 string sets, 3 inversions, 3 qualities (36 entries)", () => {
    let count = 0;
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          expect(shape).toBeDefined();
          count++;
        }
      }
    }
    expect(count).toBe(36);
  });

  it("each shape has exactly 3 positions on unique strings", () => {
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          expect(shape.positions).toHaveLength(3);
          const strings = shape.positions.map((p) => p.string);
          expect(new Set(strings).size).toBe(3);
        }
      }
    }
  });

  it("each shape has exactly one of root/third/fifth", () => {
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          const roles = shape.positions.map((p) => p.role).sort();
          expect(roles).toEqual(["fifth", "root", "third"]);
        }
      }
    }
  });

  it("the position with role=root has fretOffset 0 and string === rootString", () => {
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          const root = shape.positions.find((p) => p.role === "root")!;
          expect(root.fretOffset).toBe(0);
          expect(root.string).toBe(shape.rootString);
        }
      }
    }
  });

  it("rootString is one of the 3 strings in the string set", () => {
    const stringsInSet: Record<StringSet, number[]> = {
      "1-2-3": [1, 2, 3],
      "2-3-4": [2, 3, 4],
      "3-4-5": [3, 4, 5],
      "4-5-6": [4, 5, 6],
    };
    for (const stringSet of STRING_SETS) {
      for (const inv of INVERSIONS) {
        for (const q of TRIAD_QUALITIES) {
          const shape = TRIAD_SHAPES[stringSet][inv][q];
          expect(stringsInSet[stringSet]).toContain(shape.rootString);
        }
      }
    }
  });

  it("spot-check: 1-2-3 root major matches expected", () => {
    expect(TRIAD_SHAPES["1-2-3"]["root"]["maj"]).toEqual({
      rootString: 3,
      positions: [
        { string: 3, fretOffset: 0, role: "root" },
        { string: 2, fretOffset: 0, role: "third" },
        { string: 1, fretOffset: -2, role: "fifth" },
      ],
    });
  });

  it("spot-check: 2-3-4 second-inversion major has all-zero offsets (barre)", () => {
    const shape = TRIAD_SHAPES["2-3-4"]["second"]["maj"];
    expect(shape.rootString).toBe(3);
    expect(shape.positions.every((p) => p.fretOffset === 0)).toBe(true);
  });
});

describe("SHELL_SHAPES — structure", () => {
  it("has all 2 root strings, 4 chord qualities (8 entries)", () => {
    let count = 0;
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SHELL_SHAPES[rs][q];
        expect(shape).toBeDefined();
        count++;
      }
    }
    expect(count).toBe(8);
  });

  it("each shape has exactly 3 positions with role root/third/seventh", () => {
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SHELL_SHAPES[rs][q];
        expect(shape.positions).toHaveLength(3);
        const roles = shape.positions.map((p) => p.role).sort();
        expect(roles).toEqual(["root", "seventh", "third"]);
      }
    }
  });

  it("the position with role=root has fretOffset 0 and string === rootString", () => {
    for (const rs of ROOT_STRINGS) {
      for (const q of CHORD_QUALITIES) {
        const shape = SHELL_SHAPES[rs][q];
        const root = shape.positions.find((p) => p.role === "root")!;
        expect(root.fretOffset).toBe(0);
        expect(root.string).toBe(shape.rootString);
      }
    }
  });

  it("6th-string-root has rootString 6; 5th has rootString 5", () => {
    for (const q of CHORD_QUALITIES) {
      expect(SHELL_SHAPES["6th"][q].rootString).toBe(6);
      expect(SHELL_SHAPES["5th"][q].rootString).toBe(5);
    }
  });

  it("spot-check: 6th-string-root maj7 matches expected", () => {
    expect(SHELL_SHAPES["6th"]["maj7"]).toEqual({
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    });
  });

  it("m7 and m7b5 shells are identical (both R-♭3-♭7); difference is harmonic, not visual", () => {
    for (const rs of ROOT_STRINGS) {
      expect(SHELL_SHAPES[rs]["m7"]).toEqual(SHELL_SHAPES[rs]["m7b5"]);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: FAIL — module
`./chordShapes` not found.

- [ ] **Step 3: Implement `chordShapes.ts` with types and shape data**

Create `src/theory/chordShapes.ts`:

```ts
import type { TriadQuality, ChordQuality } from "./scales";

// String numbering follows standard guitar nomenclature: string 1 = high E,
// string 6 = low E. The marker pipeline (buildChordShapeMarkers, see follow-up
// task) converts to the codebase's 0-indexed-low-E convention when emitting
// NoteMarker[].
export type StringSet = "1-2-3" | "2-3-4" | "3-4-5" | "4-5-6";
export type RootString = "6th" | "5th";
export type Inversion = "root" | "first" | "second";
export type ChordShapesMode = "triads" | "shells";

// One note's placement within a shape, expressed relative to the chord's root
// fret on the shape's anchor string.
export type ShapePosition = {
  string: number; // 1..6 (1=high E, 6=low E)
  fretOffset: number; // offset from the root's fret on its anchor string
  role: "root" | "third" | "fifth" | "seventh";
};

export type TriadShape = {
  rootString: number;
  positions: ShapePosition[]; // exactly 3 entries (root, third, fifth)
};

export type ShellShape = {
  rootString: number;
  positions: ShapePosition[]; // exactly 3 entries (root, third, seventh)
};

// Triad shape vocabulary. 4 string sets × 3 inversions × 3 qualities = 36 entries.
//
// Convention reminders:
// - Root position: root note has the lowest pitch in the trio (sits on the
//   lowest-pitch string of the string set).
// - 1st inversion: third has the lowest pitch (root sits on the highest-pitch
//   string of the string set).
// - 2nd inversion: fifth has the lowest pitch (root sits on the middle string).
// - Adjacent string pitch offsets at the same fret: 6→5 = +5 semitones,
//   5→4 = +5, 4→3 = +5, 3→2 = +4 (B-string oddity), 2→1 = +5.
export const TRIAD_SHAPES: Record<
  StringSet,
  Record<Inversion, Record<TriadQuality, TriadShape>>
> = {
  "1-2-3": {
    root: {
      maj: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: 0, role: "third" },
          { string: 1, fretOffset: -2, role: "fifth" },
        ],
      },
      min: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: -1, role: "third" },
          { string: 1, fretOffset: -2, role: "fifth" },
        ],
      },
      dim: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: -1, role: "third" },
          { string: 1, fretOffset: -3, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 1,
        positions: [
          { string: 1, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: 1, role: "third" },
        ],
      },
      min: {
        rootString: 1,
        positions: [
          { string: 1, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: 0, role: "third" },
        ],
      },
      dim: {
        rootString: 1,
        positions: [
          { string: 1, fretOffset: 0, role: "root" },
          { string: 2, fretOffset: -1, role: "fifth" },
          { string: 3, fretOffset: 0, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 1, fretOffset: -1, role: "third" },
        ],
      },
      min: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 1, fretOffset: -2, role: "third" },
        ],
      },
      dim: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "fifth" },
          { string: 1, fretOffset: -2, role: "third" },
        ],
      },
    },
  },
  "2-3-4": {
    root: {
      maj: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "third" },
          { string: 2, fretOffset: -2, role: "fifth" },
        ],
      },
      min: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "third" },
          { string: 2, fretOffset: -2, role: "fifth" },
        ],
      },
      dim: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "third" },
          { string: 2, fretOffset: -3, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 4, fretOffset: 1, role: "third" },
        ],
      },
      min: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -1, role: "fifth" },
          { string: 4, fretOffset: 0, role: "third" },
        ],
      },
      dim: {
        rootString: 2,
        positions: [
          { string: 2, fretOffset: 0, role: "root" },
          { string: 3, fretOffset: -2, role: "fifth" },
          { string: 4, fretOffset: 0, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 2, fretOffset: 0, role: "third" },
        ],
      },
      min: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 2, fretOffset: -1, role: "third" },
        ],
      },
      dim: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -1, role: "fifth" },
          { string: 2, fretOffset: -1, role: "third" },
        ],
      },
    },
  },
  "3-4-5": {
    root: {
      maj: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -1, role: "third" },
          { string: 3, fretOffset: -3, role: "fifth" },
        ],
      },
      min: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -2, role: "third" },
          { string: 3, fretOffset: -3, role: "fifth" },
        ],
      },
      dim: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -2, role: "third" },
          { string: 3, fretOffset: -4, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 5, fretOffset: 2, role: "third" },
        ],
      },
      min: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: 0, role: "fifth" },
          { string: 5, fretOffset: 1, role: "third" },
        ],
      },
      dim: {
        rootString: 3,
        positions: [
          { string: 3, fretOffset: 0, role: "root" },
          { string: 4, fretOffset: -1, role: "fifth" },
          { string: 5, fretOffset: 1, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: -1, role: "third" },
        ],
      },
      min: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 3, fretOffset: -2, role: "third" },
        ],
      },
      dim: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -1, role: "fifth" },
          { string: 3, fretOffset: -2, role: "third" },
        ],
      },
    },
  },
  "4-5-6": {
    root: {
      maj: {
        rootString: 6,
        positions: [
          { string: 6, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -1, role: "third" },
          { string: 4, fretOffset: -3, role: "fifth" },
        ],
      },
      min: {
        rootString: 6,
        positions: [
          { string: 6, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -2, role: "third" },
          { string: 4, fretOffset: -3, role: "fifth" },
        ],
      },
      dim: {
        rootString: 6,
        positions: [
          { string: 6, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -2, role: "third" },
          { string: 4, fretOffset: -4, role: "fifth" },
        ],
      },
    },
    first: {
      maj: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 6, fretOffset: 2, role: "third" },
        ],
      },
      min: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: 0, role: "fifth" },
          { string: 6, fretOffset: 1, role: "third" },
        ],
      },
      dim: {
        rootString: 4,
        positions: [
          { string: 4, fretOffset: 0, role: "root" },
          { string: 5, fretOffset: -1, role: "fifth" },
          { string: 6, fretOffset: 1, role: "third" },
        ],
      },
    },
    second: {
      maj: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 6, fretOffset: 0, role: "fifth" },
          { string: 4, fretOffset: -1, role: "third" },
        ],
      },
      min: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 6, fretOffset: 0, role: "fifth" },
          { string: 4, fretOffset: -2, role: "third" },
        ],
      },
      dim: {
        rootString: 5,
        positions: [
          { string: 5, fretOffset: 0, role: "root" },
          { string: 6, fretOffset: -1, role: "fifth" },
          { string: 4, fretOffset: -2, role: "third" },
        ],
      },
    },
  },
};

// Shell shape vocabulary. 2 root strings × 4 chord qualities = 8 entries.
//
// 6th-string-root layout: R on string 6, 7 on string 4, 3 on string 3.
// 5th-string-root layout: R on string 5, 7 on string 3, 3 on string 2.
//
// Quality differences come from whether the third is M3 or m3 and whether the
// seventh is M7 or m7. m7 and m7b5 share the same R-♭3-♭7 layout — the
// difference between them lives in the (omitted) 5th, so the shells are
// visually identical. The display surfaces this by labelling the chord with
// the correct symbol (e.g., Bm7b5 vs. a hypothetical Bm7) while reusing the
// same fingering data.
export const SHELL_SHAPES: Record<RootString, Record<ChordQuality, ShellShape>> = {
  "6th": {
    maj7: {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 1, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    },
    m7: {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 0, role: "seventh" },
        { string: 3, fretOffset: 0, role: "third" },
      ],
    },
    "7": {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 0, role: "seventh" },
        { string: 3, fretOffset: 1, role: "third" },
      ],
    },
    m7b5: {
      rootString: 6,
      positions: [
        { string: 6, fretOffset: 0, role: "root" },
        { string: 4, fretOffset: 0, role: "seventh" },
        { string: 3, fretOffset: 0, role: "third" },
      ],
    },
  },
  "5th": {
    maj7: {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 1, role: "seventh" },
        { string: 2, fretOffset: 2, role: "third" },
      ],
    },
    m7: {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 0, role: "seventh" },
        { string: 2, fretOffset: 1, role: "third" },
      ],
    },
    "7": {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 0, role: "seventh" },
        { string: 2, fretOffset: 2, role: "third" },
      ],
    },
    m7b5: {
      rootString: 5,
      positions: [
        { string: 5, fretOffset: 0, role: "root" },
        { string: 3, fretOffset: 0, role: "seventh" },
        { string: 2, fretOffset: 1, role: "third" },
      ],
    },
  },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: PASS — all structure
tests plus spot-checks.

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git add src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git commit -m "feat(theory): add TRIAD_SHAPES and SHELL_SHAPES vocabulary"
```

---

## Task 2: `buildChordShapeMarkers` (TDD)

**Files:**

- Modify: `src/theory/chordShapes.ts` (append the input type, helper, and main function)
- Modify: `src/theory/chordShapes.test.ts` (append pipeline tests)

The marker pipeline takes a view-config input and emits `NoteMarker[]` for the renderer.
Implements the **ascending root rule** (lowest root fret strictly greater than the
previous rendered chord, that fits inside `[0, FRET_COUNT]`) and the **cap-at-fits**
drop behaviour.

- [ ] **Step 1: Append the failing pipeline tests**

Append to `src/theory/chordShapes.test.ts` (after the existing describes):

```ts
import { buildChordShapeMarkers } from "./chordShapes";
import { ALL_NOTES_KEY } from "../components/KeySelector";

describe("buildChordShapeMarkers", () => {
  it("returns [] when key is ALL_NOTES_KEY (triads)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        stringSets: ["1-2-3"],
        inversion: "root",
      }),
    ).toEqual([]);
  });

  it("returns [] when key is ALL_NOTES_KEY (shells)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "shells",
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        rootStrings: ["6th"],
      }),
    ).toEqual([]);
  });

  it("returns [] when stringSets is empty (triads)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        key: "C",
        accidentalStyle: "sharp",
        stringSets: [],
        inversion: "root",
      }),
    ).toEqual([]);
  });

  it("returns [] when rootStrings is empty (shells)", () => {
    expect(
      buildChordShapeMarkers({
        mode: "shells",
        key: "C",
        accidentalStyle: "sharp",
        rootStrings: [],
      }),
    ).toEqual([]);
  });

  it("C major Triads, [1-2-3], root inv → 6 chords (vii° drops past fret 15)", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversion: "root",
    });
    // 6 chords × 3 markers = 18 markers (vii° = B° at fret 16+ doesn't fit).
    expect(markers).toHaveLength(18);
    for (const m of markers) {
      expect(m.fret).toBeGreaterThanOrEqual(0);
      expect(m.fret).toBeLessThanOrEqual(15);
    }

    // Marker convention: 0 = low E, 5 = high E. Shape's string 3 (G) → marker 3.
    // I (C maj root pos): root C on G string fret 5.
    const iRoot = markers.find(
      (m) => m.string === 3 && m.fret === 5 && m.role === "root",
    );
    expect(iRoot).toBeDefined();
    expect(iRoot!.note).toBe("C");

    // ii (Dm root pos): root D on G string fret 7.
    const iiRoot = markers.find(
      (m) => m.string === 3 && m.fret === 7 && m.role === "root",
    );
    expect(iiRoot).toBeDefined();

    // vii° should not appear: no marker on the G string at fret 16.
    const viiRoot = markers.find((m) => m.string === 3 && m.fret === 16);
    expect(viiRoot).toBeUndefined();

    // Strict ascending order on string 3 (the rootString for root inv on 1-2-3).
    const rootMarkers = markers
      .filter((m) => m.role === "root" && m.string === 3)
      .map((m) => m.fret);
    expect(rootMarkers).toEqual([5, 7, 9, 10, 12, 14]);
  });

  it("C major Triads, [1-2-3, 4-5-6], root inv → markers from both string sets", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversion: "root",
    });
    // 1-2-3 contributes 6 chords × 3 = 18; 4-5-6 contributes 5 chords × 3 = 15
    // (in C major, root pos on 4-5-6 fits I-V; vi at fret 17 drops, vii° at 19 drops).
    expect(markers).toHaveLength(33);
    // 4-5-6 root inv has rootString 6 (low E). Marker convention: string 0.
    const fromLowE = markers.filter((m) => m.string === 0);
    expect(fromLowE.length).toBeGreaterThan(0);
    // 1-2-3 root inv has rootString 3 (G). Marker convention: string 3.
    const fromG = markers.filter((m) => m.string === 3 && m.role === "root");
    expect(fromG.length).toBe(6); // I..vi
  });

  it("C major Triads, [4-5-6], root inv → 5 chords (vi, vii° drop)", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["4-5-6"],
      inversion: "root",
    });
    expect(markers).toHaveLength(15); // 5 chords × 3 markers
    // Roots on low E string (marker.string = 0): C(8), D(10), E(12), F(13), G(15).
    const rootFrets = markers
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).toEqual([8, 10, 12, 13, 15]);
  });

  it("F major Shells, [6th] → 7 chords × 3 markers, V (C7) root at fret 8 on low E", () => {
    const markers = buildChordShapeMarkers({
      mode: "shells",
      key: "F",
      accidentalStyle: "flat",
      rootStrings: ["6th"],
    });
    expect(markers).toHaveLength(21); // 7 chords × 3 markers
    // V in F major is C7. Lowest C on low E above the previous chord (Bb at
    // fret 6): C is at fret 8.
    const v = markers.find((m) => m.role === "root" && m.string === 0 && m.fret === 8);
    expect(v).toBeDefined();
    // Roots ascend: F(1), Gm(3), Am(5), Bb(6), C(8), Dm(10), Em(12).
    const rootFrets = markers
      .filter((m) => m.role === "root" && m.string === 0)
      .map((m) => m.fret);
    expect(rootFrets).toEqual([1, 3, 5, 6, 8, 10, 12]);
  });

  it("respects accidentalStyle in marker note labels", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "G",
      accidentalStyle: "flat",
      stringSets: ["1-2-3"],
      inversion: "root",
    });
    // vii° in G major = F#°. With flat style, F# becomes Gb.
    const viiRoot = markers.find(
      (m) => m.role === "root" && m.fret === 11 && m.string === 3,
    );
    // In G major the I chord (G) has root fret = (7-7+12)%12=0... no, wait,
    // string 3 (G) open is G, so G's root fret on G string is 0.
    // ascending: I(0), ii(2), iii(4), IV(5), V(7), vi(9), vii°(11)... they all fit!
    expect(viiRoot).toBeDefined();
    expect(viiRoot!.note).toBe("Gb");
  });

  it("output ordering: markers grouped by string-set, then by ascending degree", () => {
    const markers = buildChordShapeMarkers({
      mode: "triads",
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversion: "root",
    });
    // First group of 18 markers should be from 1-2-3 (rootString=3, marker.string=3
    // for the root markers); the next 15 from 4-5-6 (rootString=6, marker.string=0).
    const firstGroupRoots = markers.slice(0, 18).filter((m) => m.role === "root");
    const secondGroupRoots = markers.slice(18).filter((m) => m.role === "root");
    expect(firstGroupRoots.every((m) => m.string === 3)).toBe(true);
    expect(secondGroupRoots.every((m) => m.string === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: FAIL —
`buildChordShapeMarkers` is not exported.

- [ ] **Step 3: Implement `buildChordShapeMarkers` and helper in `chordShapes.ts`**

Append to `src/theory/chordShapes.ts` (after `SHELL_SHAPES`):

```ts
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { FRET_COUNT } from "./constants";
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import { getDiatonicTriads, getDiatonicChords } from "./scales";
import type { NoteMarker } from "./types";

export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversion: Inversion;
    }
  | {
      mode: "shells";
      key: string;
      accidentalStyle: AccidentalStyle;
      rootStrings: ReadonlyArray<RootString>;
    };

// Convert a 1..6 (high-E-first) shape-string index to the codebase's 0..5
// (low-E-first) marker-string index used by the Fretboard renderer and
// STANDARD_TUNING.
function shapeStringToMarkerString(shapeString: number): number {
  return 6 - shapeString;
}

// Returns the playable frets for a target note on a given open string,
// inside [0, FRET_COUNT]. A note repeats every 12 frets, so this returns
// either 1 or 2 entries.
function getRootFrets(targetNote: string, openStringNote: string): number[] {
  const baseFret = (getNoteIndex(targetNote) - getNoteIndex(openStringNote) + 12) % 12;
  const result: number[] = [];
  if (baseFret <= FRET_COUNT) result.push(baseFret);
  if (baseFret + 12 <= FRET_COUNT) result.push(baseFret + 12);
  return result;
}

type ChordSource = {
  quality: string;
  notes: readonly string[];
};

type ShapeLookup = (quality: string) => TriadShape | ShellShape | undefined;

// Walk the 7 diatonic chords in degree order, placing each on the given
// shape's anchor string using the ascending root rule. Returns NoteMarker[]
// in degree-ascending order. Drops chords whose shape doesn't fit cleanly.
function placeChordsOnAnchor(
  chords: ReadonlyArray<ChordSource>,
  shapeLookup: ShapeLookup,
  key: string,
  accidentalStyle: AccidentalStyle,
): NoteMarker[] {
  const result: NoteMarker[] = [];
  let previousFret = -1;

  for (const chord of chords) {
    const shape = shapeLookup(chord.quality);
    if (!shape) continue;

    const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
    const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
    const rootNote = chord.notes[0];

    const candidateRootFrets = getRootFrets(rootNote, openAnchorNote);

    for (const candidate of candidateRootFrets) {
      if (candidate <= previousFret) continue;

      const allFit = shape.positions.every((p) => {
        const absFret = candidate + p.fretOffset;
        return absFret >= 0 && absFret <= FRET_COUNT;
      });
      if (!allFit) continue;

      // Place the cluster.
      for (const p of shape.positions) {
        const absFret = candidate + p.fretOffset;
        const markerString = shapeStringToMarkerString(p.string);
        const openNote = STANDARD_TUNING[markerString];
        const noteAtFret = getNoteAtFret(openNote, absFret);
        result.push({
          string: markerString,
          fret: absFret,
          note: getDisplayName(noteAtFret, key, accidentalStyle),
          role: p.role,
        });
      }
      previousFret = candidate;
      break;
    }
  }

  return result;
}

// Pure: given the Chord Shapes view's full input, returns the NoteMarker[]
// the Fretboard should render. Returns [] for ALL_NOTES_KEY or when the
// active sub-selector set is empty. Drops chords whose shape doesn't fit
// inside [0, FRET_COUNT] per the cap-at-fits rule.
export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[] {
  if (input.key === ALL_NOTES_KEY) return [];

  if (input.mode === "triads") {
    if (input.stringSets.length === 0) return [];
    const triads = getDiatonicTriads(input.key, input.accidentalStyle);
    const result: NoteMarker[] = [];
    for (const stringSet of input.stringSets) {
      // The cast to Record<string, TriadShape> sidesteps a TS narrowing
      // issue where indexing a Record<TriadQuality, …> with a plain string
      // fails. The runtime call site always passes a TriadQuality.
      const lookup: ShapeLookup = (q) =>
        (TRIAD_SHAPES[stringSet][input.inversion] as Record<string, TriadShape>)[q];
      result.push(
        ...placeChordsOnAnchor(triads, lookup, input.key, input.accidentalStyle),
      );
    }
    return result;
  }

  // shells mode
  if (input.rootStrings.length === 0) return [];
  const chords = getDiatonicChords(input.key, input.accidentalStyle);
  const result: NoteMarker[] = [];
  for (const rootString of input.rootStrings) {
    const lookup: ShapeLookup = (q) =>
      (SHELL_SHAPES[rootString] as Record<string, ShellShape>)[q];
    result.push(
      ...placeChordsOnAnchor(chords, lookup, input.key, input.accidentalStyle),
    );
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/theory/chordShapes.test.ts` Expected: PASS — all structure
tests plus the new pipeline tests.

- [ ] **Step 5: Run lint, typecheck, full test suite**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git add src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git commit -m "feat(theory): add buildChordShapeMarkers pure pipeline"
```

---

## Task 3: `Legend` `readOnly` mode (discriminated union)

**Files:**

- Modify: `src/components/Legend.tsx`

Adds a read-only display mode for views that don't need toggle behaviour (Chord Shapes
uses this — there's no scale-tone background to demote, so a clickable Legend would be a
false affordance). Keeps the existing interactive behaviour for Note Map / Scale
Positions.

Manual verification only — the existing app surfaces (Note Map, Scale Positions) confirm
the interactive path; the Chord Shapes view (Task 5) confirms the read-only path.

- [ ] **Step 1: Update `Legend.tsx` to a discriminated-union prop**

Replace the entire file `src/components/Legend.tsx`:

```tsx
import type { NoteDisplayRole } from "../theory/types";

export type HighlightableRole = Extract<
  NoteDisplayRole,
  "root" | "third" | "fifth" | "seventh"
>;

const LEGEND_ITEMS: { label: string; role: HighlightableRole; color: string }[] = [
  { label: "Root", role: "root", color: "var(--color-root)" },
  { label: "3rd", role: "third", color: "var(--color-third)" },
  { label: "5th", role: "fifth", color: "var(--color-fifth)" },
  { label: "7th", role: "seventh", color: "var(--color-seventh)" },
];

type LegendProps =
  | {
      readOnly: true;
    }
  | {
      readOnly?: false;
      enabledRoles: Set<HighlightableRole>;
      onToggleRole: (role: HighlightableRole) => void;
    };

export function Legend(props: LegendProps) {
  if (props.readOnly) {
    // Static color reference — no click handlers, all swatches always lit.
    return (
      <div className="flex gap-3 text-sm">
        {LEGEND_ITEMS.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-1.5 px-2 py-1 rounded"
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-fg-secondary">{item.label}</span>
          </span>
        ))}
      </div>
    );
  }

  // Interactive mode — click toggles the role's display.
  const { enabledRoles, onToggleRole } = props;
  return (
    <div className="flex gap-3 text-sm">
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role);
        return (
          <button
            key={item.label}
            onClick={() => onToggleRole(item.role)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-opacity cursor-pointer hover:bg-surface-raised ${
              isEnabled ? "opacity-100" : "opacity-40"
            }`}
            aria-pressed={isEnabled}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-fg-secondary">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Run lint, typecheck**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean — existing call sites in `App.tsx`
(`<Legend enabledRoles={…} onToggleRole={…} />`) still type-check via the second union
arm.

Run: `npm test` Expected: all green.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/components/Legend.tsx
git add src/components/Legend.tsx
git commit -m "refactor(legend): add read-only display mode via discriminated union"
```

---

## Task 4: `StringSetToggles` and `InversionPicker` components

**Files:**

- Create: `src/components/StringSetToggles.tsx`
- Create: `src/components/InversionPicker.tsx`

`StringSetToggles` is a generic multi-toggle that mirrors `PositionToggles`'s
opacity-driven visual; the caller passes the option list so it works for both Triads (4
string groups) and Shells (2 root strings). `InversionPicker` is a single-pick segmented
control mirroring `AccidentalToggle`'s styling.

No unit tests (matches existing component convention — manual verification in Task 5's
smoke run).

- [ ] **Step 1: Create `StringSetToggles.tsx`**

```tsx
type Option<Id extends string> = {
  id: Id;
  label: string;
};

type StringSetTogglesProps<Id extends string> = {
  options: ReadonlyArray<Option<Id>>;
  selected: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
  ariaLabel: string;
};

export function StringSetToggles<Id extends string>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: StringSetTogglesProps<Id>) {
  return (
    <div className="flex flex-wrap gap-3 text-sm" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isOn = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`px-2 py-1 rounded transition-opacity cursor-pointer hover:bg-surface-raised ${
              isOn ? "opacity-100" : "opacity-40"
            }`}
            aria-pressed={isOn}
          >
            <span className="font-medium text-fg-primary">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Create `InversionPicker.tsx`**

```tsx
import type { Inversion } from "../theory/chordShapes";

const OPTIONS: { value: Inversion; label: string }[] = [
  { value: "root", label: "Root" },
  { value: "first", label: "1st" },
  { value: "second", label: "2nd" },
];

type InversionPickerProps = {
  inversion: Inversion;
  onChange: (inversion: Inversion) => void;
};

export function InversionPicker({ inversion, onChange }: InversionPickerProps) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-line"
      role="radiogroup"
      aria-label="Inversion"
    >
      {OPTIONS.map((opt) => {
        const isSelected = inversion === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              isSelected
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Lint, typecheck, full test suite**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

- [ ] **Step 4: Commit**

```bash
npx prettier --write src/components/StringSetToggles.tsx src/components/InversionPicker.tsx
git add src/components/StringSetToggles.tsx src/components/InversionPicker.tsx
git commit -m "feat(ui): add StringSetToggles and InversionPicker components"
```

---

## Task 5: `ChordShapesView`

**Files:**

- Create: `src/views/ChordShapesView.tsx`

Composition view. Owns local state for `mode`, `selectedStringSets`,
`selectedRootStrings`, `inversion`. Renders the mode toggle, sub-selectors, fretboard,
and read-only Legend.

- [ ] **Step 1: Create `ChordShapesView.tsx`**

```tsx
import { useCallback, useMemo, useState } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { Legend } from "../components/Legend";
import { StringSetToggles } from "../components/StringSetToggles";
import { InversionPicker } from "../components/InversionPicker";
import { FRET_COUNT } from "../theory/constants";
import {
  buildChordShapeMarkers,
  type ChordShapesMode,
  type Inversion,
  type RootString,
  type StringSet,
} from "../theory/chordShapes";
import type { AccidentalStyle } from "../theory/notes";

type ChordShapesViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
};

const STRING_SET_OPTIONS: ReadonlyArray<{ id: StringSet; label: string }> = [
  { id: "1-2-3", label: "1-2-3" },
  { id: "2-3-4", label: "2-3-4" },
  { id: "3-4-5", label: "3-4-5" },
  { id: "4-5-6", label: "4-5-6" },
];

const ROOT_STRING_OPTIONS: ReadonlyArray<{ id: RootString; label: string }> = [
  { id: "6th", label: "6th-string-root" },
  { id: "5th", label: "5th-string-root" },
];

export function ChordShapesView({
  selectedKey,
  accidentalStyle,
}: ChordShapesViewProps) {
  const [mode, setMode] = useState<ChordShapesMode>("triads");
  const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
    () => new Set<StringSet>(["1-2-3"]),
  );
  const [selectedRootStrings, setSelectedRootStrings] = useState<Set<RootString>>(
    () => new Set<RootString>(["6th"]),
  );
  const [inversion, setInversion] = useState<Inversion>("root");

  const toggleStringSet = useCallback((id: StringSet) => {
    setSelectedStringSets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleRootString = useCallback((id: RootString) => {
    setSelectedRootStrings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const markers = useMemo(() => {
    if (mode === "triads") {
      return buildChordShapeMarkers({
        mode: "triads",
        key: selectedKey,
        accidentalStyle,
        stringSets: Array.from(selectedStringSets),
        inversion,
      });
    }
    return buildChordShapeMarkers({
      mode: "shells",
      key: selectedKey,
      accidentalStyle,
      rootStrings: Array.from(selectedRootStrings),
    });
  }, [
    mode,
    selectedKey,
    accidentalStyle,
    selectedStringSets,
    selectedRootStrings,
    inversion,
  ]);

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord shapes.
      </div>
    );
  }

  const activeSubSelectorEmpty =
    mode === "triads" ? selectedStringSets.size === 0 : selectedRootStrings.size === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div
          className="inline-flex rounded overflow-hidden border border-line"
          role="radiogroup"
          aria-label="Mode"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === "triads"}
            onClick={() => setMode("triads")}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "triads"
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            Triads
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "shells"}
            onClick={() => setMode("shells")}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              mode === "shells"
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            Shells
          </button>
        </div>

        {mode === "triads" ? (
          <StringSetToggles
            options={STRING_SET_OPTIONS}
            selected={selectedStringSets}
            onToggle={toggleStringSet}
            ariaLabel="String groups"
          />
        ) : (
          <StringSetToggles
            options={ROOT_STRING_OPTIONS}
            selected={selectedRootStrings}
            onToggle={toggleRootString}
            ariaLabel="Root strings"
          />
        )}

        {mode === "triads" && (
          <InversionPicker inversion={inversion} onChange={setInversion} />
        )}
      </div>

      {activeSubSelectorEmpty ? (
        <div className="text-fg-faint text-center py-20">
          Select a string set to begin.
        </div>
      ) : (
        <Fretboard markers={markers} fretCount={FRET_COUNT} />
      )}

      <Legend readOnly />
    </div>
  );
}
```

- [ ] **Step 2: Lint, typecheck, full test suite**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

- [ ] **Step 3: Commit**

```bash
npx prettier --write src/views/ChordShapesView.tsx
git add src/views/ChordShapesView.tsx
git commit -m "feat(view): add ChordShapesView composition"
```

---

## Task 6: Wire `ChordShapesView` into `App.tsx` + clean up `ViewSelector`

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/ViewSelector.tsx`

Add the new tab and route. Replace the three stale `ViewSelector` entries
(`diatonic-chords`, `shell-voicings`, `triad-shapes`) with a single `chord-shapes` entry
per the consolidation in the vision doc.

- [ ] **Step 1: Update `ViewSelector.tsx`**

Replace the entire file `src/components/ViewSelector.tsx`:

```tsx
const VIEWS = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-shapes", label: "Chord Shapes" },
];

type ViewSelectorProps = {
  selectedView: string;
  onViewChange: (view: string) => void;
};

export function ViewSelector({ selectedView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
            selectedView === view.id
              ? "bg-surface-active text-fg-emphasis"
              : "bg-transparent text-fg-muted hover:text-fg-secondary"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add `ChordShapesView` import in `App.tsx`**

Find in `src/App.tsx`:

```ts
import { NoteMapView } from "./views/NoteMapView";
import { ScalePositionsView } from "./views/ScalePositionsView";
```

Replace with:

```ts
import { ChordShapesView } from "./views/ChordShapesView";
import { NoteMapView } from "./views/NoteMapView";
import { ScalePositionsView } from "./views/ScalePositionsView";
```

- [ ] **Step 3: Add the `chord-shapes` route branch in `App.tsx`**

Find the existing main block in `src/App.tsx`:

```tsx
{
  selectedView !== "note-map" && selectedView !== "scale-positions" && (
    <div className="text-fg-faint text-center py-20">Coming soon</div>
  );
}
```

Replace with:

```tsx
{
  selectedView === "chord-shapes" && (
    <ChordShapesView selectedKey={selectedKey} accidentalStyle={accidentalStyle} />
  );
}
{
  selectedView !== "note-map" &&
    selectedView !== "scale-positions" &&
    selectedView !== "chord-shapes" && (
      <div className="text-fg-faint text-center py-20">Coming soon</div>
    );
}
```

Note: Chord Shapes intentionally does **not** render `<Legend>` outside the view (the
view renders its own read-only Legend) and does **not** render `<DiatonicChords>` (no
chord row in this view per the spec).

- [ ] **Step 4: Run lint, typecheck, full test suite, build**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

Run: `npm run build` Expected: successful build.

- [ ] **Step 5: Manual verification — golden path**

Run: `npm run dev`. Open the app:

1. **Tab presence.** Confirm exactly three tabs: Note Map | Scale Positions | Chord
   Shapes. The previously-shown "Diatonic Chords / Shell Voicings / Triad Shapes" tabs
   are gone.
2. **Chord Shapes default state.** Click Chord Shapes. Confirm:
   - Mode toggle shows `Triads | Shells` with Triads highlighted.
   - String-set toggles show `1-2-3 / 2-3-4 / 3-4-5 / 4-5-6`, with `1-2-3` selected
     (others dim).
   - Inversion picker shows `Root | 1st | 2nd` with Root highlighted.
   - Fretboard renders 6 chord clusters (I through vi) on string set 1-2-3 in C major.
     vii° is absent (its root-position fret is past 15).
   - Read-only Legend at the bottom shows R / 3 / 5 / 7 swatches; clicking does nothing.
3. **Toggle a second string set.** Click `4-5-6` so both `1-2-3` and `4-5-6` are on.
   Confirm 5 more clusters appear on strings 4-5-6 (I through V); vi/vii° on 4-5-6 are
   absent because their roots run past fret 15.
4. **Switch inversion.** Click `1st` inversion. Cluster fret positions change; the count
   of fitting chords may differ.
5. **Switch to Shells mode.** Click Shells. Confirm:
   - Sub-selector swaps to `6th-string-root / 5th-string-root` (multi-toggle).
   - Inversion picker disappears.
   - Fretboard renders 7 shell clusters in C major on the 6th-string-root.
6. **Switch keys.** Change key to G. Confirm clusters shift up the neck. Change to F
   (flat key). Confirm chord symbols and notes use flat spellings.
7. **All Notes key.** Switch key to "All Notes". Confirm the empty-state message
   ("Select a key to view chord shapes.") replaces the fretboard.
8. **Empty string-set state.** With key = C and Triads mode, toggle off `1-2-3`. Confirm
   the empty-state message ("Select a string set to begin.") replaces the fretboard
   while the toggle row stays visible.
9. **Switch back to Note Map.** Confirm Note Map still works as before, including the
   chord-row triads/sevenths toggle from Phase A.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/App.tsx src/components/ViewSelector.tsx
git add src/App.tsx src/components/ViewSelector.tsx
git commit -m "feat(view): wire Chord Shapes tab and clean up stale ViewSelector entries"
```

---

## Task 7: Mark Chord Shapes as done in the vision doc

**Files:**

- Modify: `docs/design/2026-05-05-app-vision-and-view-designs.md` (View completion map
  row)

- [ ] **Step 1: Update the status entry**

In `docs/design/2026-05-05-app-vision-and-view-designs.md`, find the table row:

```markdown
| Chord Shapes | Not started | Consolidates the originally-separate Shell Voicings (#4)
and Triad Shapes (#5) tabs. Shells/Triads selector swaps the chord-diagram box grid and
the ascending-up-the-neck section. |
```

Replace with:

```markdown
| Chord Shapes | Done | Single-section ascending neck view; rendered by
[ChordShapesView.tsx](src/views/ChordShapesView.tsx). Triads/Shells modes, multi-toggle
string-set sub-selector, single-pick inversion (Triads only), cap-at-fits drop rule.
Spec: [design](../superpowers/specs/2026-05-06-chord-shapes-design.md). |
```

- [ ] **Step 2: Commit**

```bash
npx prettier --write docs/design/2026-05-05-app-vision-and-view-designs.md
git add docs/design/2026-05-05-app-vision-and-view-designs.md
git commit -m "docs(vision): mark Chord Shapes as done"
```

---

## Final verification

Before declaring done, run the full pre-commit gate one more time:

- [ ] `npm run lint` — clean
- [ ] `npx tsc -b` — clean
- [ ] `npm test` — all green (existing 81 tests + new structure and pipeline tests)
- [ ] `npm run build` — successful build

If any of those fail, fix the underlying issue before claiming the work complete (per
the project CLAUDE.md: don't skip verification).
