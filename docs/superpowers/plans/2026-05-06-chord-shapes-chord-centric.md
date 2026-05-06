# Chord Shapes Chord-Centric Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot the Chord Shapes view from "all 7 diatonic chords walking up the neck"
to "one selected chord, all fitting placements across chosen string sets and
inversions," wiring into the shared chord row and interactive Legend already used by
Note Map and Scale Positions.

**Architecture:** `buildChordShapeMarkers` is rewritten to accept a single
`DiatonicTriad | DiatonicChord` instead of deriving all 7 chords internally, and emits
every placement that fits in the fret range (multi-octave, no ascending-root coupling).
`ChordShapesView` drops its local mode toggle and `InversionPicker` in favour of
`chordRowMode` prop + multi-pick `StringSetToggles` for inversions. `App.tsx` adds
`<Legend>` + `<DiatonicChords>` below `<ChordShapesView>`, mirroring the Note Map /
Scale Positions pattern. The `readOnly` arm of `Legend` is deleted;
`InversionPicker.tsx` is deleted.

**Tech Stack:** React 19, Vite, Vitest, Tailwind v4, TypeScript. Pure functions in
`src/theory/`, components in `src/components/`, views in `src/views/`.

---

## String-index conventions (unchanged)

- **Shape data:** strings 1..6, 1 = high E, 6 = low E.
- **Marker / `STANDARD_TUNING`:** strings 0..5, 0 = low E, 5 = high E.
- Conversion: `markerString = 6 - shapeString`.

---

## File Structure

**Modified:**

- `src/theory/chordShapes.ts` — update `BuildChordShapeMarkersInput` (chord-centric),
  remove `placeChordsOnAnchor`, add `placeChordOnCombo`, rewrite
  `buildChordShapeMarkers`; also remove the `getDiatonicTriads`/`getDiatonicChords`
  imports (no longer needed), add `DiatonicTriad`/`DiatonicChord` type imports.
- `src/theory/chordShapes.test.ts` — keep the 13 structure tests (lines 1–163)
  unchanged; replace the pipeline describe blocks (lines 165–409) with new chord-centric
  tests.
- `src/views/ChordShapesView.tsx` — full replacement: new props (`selectedChord`,
  `chordRowMode`, `enabledHighlights`), remove local `mode` state and `InversionPicker`,
  add multi-pick `selectedInversions` state, use interactive `Legend` for filtering
  markers.
- `src/components/Legend.tsx` — delete the `readOnly` discriminant arm; simplify to a
  single props shape.
- `src/App.tsx` — update `chord-shapes` branch: pass new props to `ChordShapesView`, add
  `<Legend>` + `<DiatonicChords>` below it.

**Deleted:**

- `src/components/InversionPicker.tsx` — replaced by `StringSetToggles` configured with
  inversion options in `ChordShapesView`.

**Untouched:**

- `src/theory/chordShapes.ts` — `TRIAD_SHAPES`, `SHELL_SHAPES`,
  `shapeStringToMarkerString`, `getRootFrets`, all types except
  `BuildChordShapeMarkersInput`.
- `src/components/StringSetToggles.tsx` — reused as-is for string sets, root strings,
  and inversions.
- `src/components/DiatonicChords.tsx`, `src/components/ViewSelector.tsx`, all other
  files.

---

## Task 1: Rewrite `buildChordShapeMarkers` — chord-centric pipeline (TDD)

**Files:**

- Modify: `src/theory/chordShapes.ts`
- Modify: `src/theory/chordShapes.test.ts`

The pipeline now receives a single pre-resolved chord and emits all placements across
every `(stringSet, inversion)` or `(rootString)` combo that fits. Multi-octave emission
is allowed; no ascending-root coupling between combos.

- [ ] **Step 1: Replace the pipeline tests in `chordShapes.test.ts`**

Delete everything from line 165 to the end of the file (the
`import { buildChordShapeMarkers }` line through the final `}`). Replace it with:

```ts
import { buildChordShapeMarkers } from "./chordShapes";
import { getDiatonicTriads, getDiatonicChords } from "./scales";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { DEFAULT_END_FRET } from "./constants";

describe("buildChordShapeMarkers — chord-centric", () => {
  it("returns [] when key is ALL_NOTES_KEY (triads)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        chord,
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        stringSets: ["1-2-3"],
        inversions: ["root"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when key is ALL_NOTES_KEY (shells)", () => {
    const chord = getDiatonicChords("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "shells",
        chord,
        key: ALL_NOTES_KEY,
        accidentalStyle: "sharp",
        rootStrings: ["6th"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when stringSets is empty (triads)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        stringSets: [],
        inversions: ["root"],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when inversions is empty (triads)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "triads",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        stringSets: ["1-2-3"],
        inversions: [],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("returns [] when rootStrings is empty (shells)", () => {
    const chord = getDiatonicChords("C", "sharp")[0];
    expect(
      buildChordShapeMarkers({
        mode: "shells",
        chord,
        key: "C",
        accidentalStyle: "sharp",
        rootStrings: [],
        startFret: 0,
        endFret: DEFAULT_END_FRET,
      }),
    ).toEqual([]);
  });

  it("C major I (Triads), [1-2-3], all inversions → 12 markers (two-octave in 2nd inv)", () => {
    // root inv: C on G-string (marker 3) at fret 5 → 1 placement × 3 = 3
    // first inv: C on high-E (marker 5) at fret 8 → 1 × 3 = 3
    // second inv: C on B-string (marker 4) at frets 1 and 13 → 2 × 3 = 6
    const chord = getDiatonicTriads("C", "sharp")[0]; // C major (I)
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversions: ["root", "first", "second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(12);
    // Second inversion root (B-string = marker 4) appears at fret 1 and 13.
    const secondInvRoots = markers
      .filter((m) => m.role === "root" && m.string === 4)
      .map((m) => m.fret);
    expect(secondInvRoots).toEqual([1, 13]);
  });

  it("C major I (Triads), [1-2-3], inversions=[root,second] → 9 markers (first inv absent)", () => {
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversions: ["root", "second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    // root(3) + second(6) = 9; first inv was at str=5 fret=8 — must be absent.
    expect(markers).toHaveLength(9);
    expect(
      markers.find((m) => m.string === 5 && m.fret === 8 && m.role === "root"),
    ).toBeUndefined();
  });

  it("C major I (Triads), [1-2-3, 4-5-6], all inversions → 24 markers, ordered by stringSet then inversion", () => {
    // 1-2-3: root@str3f5, first@str5f8, second@str4f1, second@str4f13 → 12 markers
    // 4-5-6: root@str0f8, first@str2f10, second@str1f3, second@str1f15 → 12 markers
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversions: ["root", "first", "second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(24);
    // First 12 from 1-2-3 (shape strings 1,2,3 → marker strings 5,4,3; all ≥ 3).
    expect(markers.slice(0, 12).every((m) => m.string >= 3)).toBe(true);
    // Next 12 from 4-5-6 (shape strings 4,5,6 → marker strings 2,1,0; all ≤ 2).
    expect(markers.slice(12).every((m) => m.string <= 2)).toBe(true);
    // Canonical inversion order within 1-2-3: root → first → second (asc fret per combo).
    const first12Roots = markers
      .slice(0, 12)
      .filter((m) => m.role === "root")
      .map((m) => ({ string: m.string, fret: m.fret }));
    expect(first12Roots).toEqual([
      { string: 3, fret: 5 }, // root inv
      { string: 5, fret: 8 }, // first inv
      { string: 4, fret: 1 }, // second inv, low octave
      { string: 4, fret: 13 }, // second inv, high octave
    ]);
  });

  it("F major V (Shells), [6th] → C7 root at fret 8 on low E", () => {
    const chord = getDiatonicChords("F", "flat")[4]; // V = C7
    const markers = buildChordShapeMarkers({
      mode: "shells",
      chord,
      key: "F",
      accidentalStyle: "flat",
      rootStrings: ["6th"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(3); // 1 placement × 3 markers
    const root = markers.find((m) => m.role === "root");
    expect(root).toBeDefined();
    expect(root!.string).toBe(0); // low E = marker string 0
    expect(root!.fret).toBe(8);
    expect(root!.note).toBe("C");
  });

  it("cap-at-fits: combos outside fret range produce no markers; others unaffected", () => {
    // C major I, [1-2-3, 4-5-6], root inv, endFret=5.
    // 1-2-3/root: C on G-string (marker 3) at fret 5 → fits [0,5] → 3 markers.
    // 4-5-6/root: C on low E at fret 8 → 8 > 5 → 0 markers.
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3", "4-5-6"],
      inversions: ["root"],
      startFret: 0,
      endFret: 5,
    });
    expect(markers).toHaveLength(3); // only 1-2-3/root contributed
    expect(markers.every((m) => m.string >= 3)).toBe(true); // all from 1-2-3
    expect(markers.every((m) => m.fret <= 5)).toBe(true);
  });

  it("two-octave emission: both root-fret candidates emitted when both fit", () => {
    // 2nd inv on 1-2-3: rootString=2 (B, marker 4). C on B: fret 1 and fret 13.
    // Shape offsets [0,-1,-1] → frets [1,0,0] and [13,12,12]; both sets in [0,15].
    const chord = getDiatonicTriads("C", "sharp")[0];
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "C",
      accidentalStyle: "sharp",
      stringSets: ["1-2-3"],
      inversions: ["second"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    expect(markers).toHaveLength(6); // 2 placements × 3 markers
    const rootFrets = markers.filter((m) => m.role === "root").map((m) => m.fret);
    expect(rootFrets).toEqual([1, 13]);
  });

  it("accidental style: F# in D major shown as Gb with flat style", () => {
    // D major iii = F#m. With flat accidentalStyle, root displays as Gb.
    // Root pos on 1-2-3: C on G-string. Gb on G-string (marker 3) at fret 11.
    const chord = getDiatonicTriads("D", "flat")[2]; // iii = Gbm
    const markers = buildChordShapeMarkers({
      mode: "triads",
      chord,
      key: "D",
      accidentalStyle: "flat",
      stringSets: ["1-2-3"],
      inversions: ["root"],
      startFret: 0,
      endFret: DEFAULT_END_FRET,
    });
    const rootMarker = markers.find(
      (m) => m.role === "root" && m.string === 3 && m.fret === 11,
    );
    expect(rootMarker).toBeDefined();
    expect(rootMarker!.note).toBe("Gb");
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npx vitest run src/theory/chordShapes.test.ts`

Expected: FAIL — the new describe block references `buildChordShapeMarkers` with a
`chord` field and `inversions` array that don't exist in the current API. The 13
structure tests should still pass.

- [ ] **Step 3: Rewrite `chordShapes.ts` — update imports and pipeline**

The shape data (`TRIAD_SHAPES`, `SHELL_SHAPES`), types (`StringSet`, `RootString`,
`Inversion`, `ChordShapesMode`, `ShapePosition`, `TriadShape`, `ShellShape`), and
helpers (`shapeStringToMarkerString`, `getRootFrets`) are unchanged. Only the imports,
`BuildChordShapeMarkersInput`, and the main function body need to change.

**Replace the imports section** (lines 1–11) with:

```ts
import { ALL_NOTES_KEY } from "../components/KeySelector";
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from "./notes";
import type {
  TriadQuality,
  ChordQuality,
  DiatonicTriad,
  DiatonicChord,
} from "./scales";
import type { NoteMarker } from "./types";
```

**Replace `BuildChordShapeMarkersInput`** (currently at lines 458–475) with:

```ts
export type BuildChordShapeMarkersInput =
  | {
      mode: "triads";
      chord: DiatonicTriad;
      key: string;
      accidentalStyle: AccidentalStyle;
      stringSets: ReadonlyArray<StringSet>;
      inversions: ReadonlyArray<Inversion>;
      startFret: number;
      endFret: number;
    }
  | {
      mode: "shells";
      chord: DiatonicChord;
      key: string;
      accidentalStyle: AccidentalStyle;
      rootStrings: ReadonlyArray<RootString>;
      startFret: number;
      endFret: number;
    };
```

**Delete** the `ChordSource` type, `ShapeLookup` type, and the entire
`placeChordsOnAnchor` function (lines 501–565).

**Replace** `buildChordShapeMarkers` (lines 567–619) with:

```ts
// Places all fitting occurrences of a single chord's shape on one (stringSet, inversion)
// or (rootString) combo. Returns clusters in ascending root-fret order within the combo.
function placeChordOnCombo(
  chord: { quality: string; notes: readonly string[] },
  shape: TriadShape | ShellShape,
  key: string,
  accidentalStyle: AccidentalStyle,
  startFret: number,
  endFret: number,
): NoteMarker[] {
  const anchorMarkerString = shapeStringToMarkerString(shape.rootString);
  const openAnchorNote = STANDARD_TUNING[anchorMarkerString];
  const candidates = getRootFrets(chord.notes[0], openAnchorNote, startFret, endFret);
  const result: NoteMarker[] = [];

  for (const candidate of candidates) {
    const allFit = shape.positions.every(
      (p) =>
        candidate + p.fretOffset >= startFret && candidate + p.fretOffset <= endFret,
    );
    if (!allFit) continue;

    for (const p of shape.positions) {
      const absFret = candidate + p.fretOffset;
      const markerString = shapeStringToMarkerString(p.string);
      const openNote = STANDARD_TUNING[markerString];
      result.push({
        string: markerString,
        fret: absFret,
        note: getDisplayName(getNoteAtFret(openNote, absFret), key, accidentalStyle),
        role: p.role,
      });
    }
  }

  return result;
}

// Canonical order for iteration — outer loop respects this so output is stable.
const INVERSION_ORDER: Inversion[] = ["root", "first", "second"];

// Pure: given one diatonic chord and the view's sub-selector state, returns
// every NoteMarker[] the Fretboard should render. Returns [] for ALL_NOTES_KEY
// or when the active sub-selector set is empty. Drops placements whose shape
// doesn't fit inside [startFret, endFret].
export function buildChordShapeMarkers(
  input: BuildChordShapeMarkersInput,
): NoteMarker[] {
  if (input.key === ALL_NOTES_KEY) return [];

  if (input.mode === "triads") {
    if (input.stringSets.length === 0 || input.inversions.length === 0) return [];
    const result: NoteMarker[] = [];
    for (const stringSet of input.stringSets) {
      for (const inv of INVERSION_ORDER) {
        if (!input.inversions.includes(inv)) continue;
        const shape = (TRIAD_SHAPES[stringSet][inv] as Record<string, TriadShape>)[
          input.chord.quality
        ];
        if (!shape) continue;
        result.push(
          ...placeChordOnCombo(
            input.chord,
            shape,
            input.key,
            input.accidentalStyle,
            input.startFret,
            input.endFret,
          ),
        );
      }
    }
    return result;
  }

  // shells
  if (input.rootStrings.length === 0) return [];
  const result: NoteMarker[] = [];
  for (const rootString of input.rootStrings) {
    const shape = (SHELL_SHAPES[rootString] as Record<string, ShellShape>)[
      input.chord.quality
    ];
    if (!shape) continue;
    result.push(
      ...placeChordOnCombo(
        input.chord,
        shape,
        input.key,
        input.accidentalStyle,
        input.startFret,
        input.endFret,
      ),
    );
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/theory/chordShapes.test.ts`

Expected: all 24 tests pass (13 structure + 11 pipeline).

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint` — Expected: clean.

Run: `npx tsc -b` — Expected: clean. (Note: `ChordShapesView.tsx` will have type errors
because it still calls the old API. That is expected and will be fixed in Task 2. If the
build fails because `tsc -b` exits non-zero, that is fine — proceed to Task 2.)

Actually `tsc -b` will fail because `ChordShapesView` still passes the old props. Run it
anyway to see the errors, then proceed.

- [ ] **Step 6: Run prettier and commit**

```bash
npx prettier --write src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git add src/theory/chordShapes.ts src/theory/chordShapes.test.ts
git commit -m "feat(theory): rewrite buildChordShapeMarkers to chord-centric model"
```

---

## Task 2: Rewrite UI — `ChordShapesView`, `App.tsx`, `Legend`, delete `InversionPicker`

**Files:**

- Modify: `src/views/ChordShapesView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/Legend.tsx`
- Delete: `src/components/InversionPicker.tsx`

No unit tests (matches existing component convention). Manual smoke verification at the
end.

- [ ] **Step 1: Replace `src/views/ChordShapesView.tsx`**

```tsx
import { useCallback, useMemo, useState } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { ALL_NOTES_KEY } from "../components/KeySelector";
import { type HighlightableRole } from "../components/Legend";
import { StringSetToggles } from "../components/StringSetToggles";
import { type ChordRowMode } from "../components/DiatonicChords";
import {
  buildChordShapeMarkers,
  type Inversion,
  type RootString,
  type StringSet,
} from "../theory/chordShapes";
import type { AccidentalStyle } from "../theory/notes";
import type { DiatonicTriad, DiatonicChord } from "../theory/scales";

type ChordShapesViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  startFret: number;
  endFret: number;
  selectedChord: DiatonicTriad | DiatonicChord | null;
  chordRowMode: ChordRowMode;
  enabledHighlights: Set<HighlightableRole>;
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

const INVERSION_OPTIONS: ReadonlyArray<{ id: Inversion; label: string }> = [
  { id: "root", label: "Root" },
  { id: "first", label: "1st" },
  { id: "second", label: "2nd" },
];

export function ChordShapesView({
  selectedKey,
  accidentalStyle,
  startFret,
  endFret,
  selectedChord,
  chordRowMode,
  enabledHighlights,
}: ChordShapesViewProps) {
  const [selectedStringSets, setSelectedStringSets] = useState<Set<StringSet>>(
    () => new Set<StringSet>(["1-2-3"]),
  );
  const [selectedRootStrings, setSelectedRootStrings] = useState<Set<RootString>>(
    () => new Set<RootString>(["6th"]),
  );
  const [selectedInversions, setSelectedInversions] = useState<Set<Inversion>>(
    () => new Set<Inversion>(["root", "first", "second"]),
  );

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

  const toggleInversion = useCallback((id: Inversion) => {
    setSelectedInversions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const mode = chordRowMode === "sevenths" ? "shells" : "triads";

  const markers = useMemo(() => {
    if (!selectedChord) return [];
    if (mode === "triads") {
      return buildChordShapeMarkers({
        mode: "triads",
        chord: selectedChord as DiatonicTriad,
        key: selectedKey,
        accidentalStyle,
        stringSets: Array.from(selectedStringSets),
        inversions: Array.from(selectedInversions),
        startFret,
        endFret,
      });
    }
    return buildChordShapeMarkers({
      mode: "shells",
      chord: selectedChord as DiatonicChord,
      key: selectedKey,
      accidentalStyle,
      rootStrings: Array.from(selectedRootStrings),
      startFret,
      endFret,
    });
  }, [
    mode,
    selectedChord,
    selectedKey,
    accidentalStyle,
    selectedStringSets,
    selectedRootStrings,
    selectedInversions,
    startFret,
    endFret,
  ]);

  const visibleMarkers = useMemo(
    () => markers.filter((m) => enabledHighlights.has(m.role as HighlightableRole)),
    [markers, enabledHighlights],
  );

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord shapes.
      </div>
    );
  }

  if (!selectedChord) {
    return (
      <div className="space-y-4">
        <SubSelectorRow
          mode={mode}
          selectedStringSets={selectedStringSets}
          selectedRootStrings={selectedRootStrings}
          selectedInversions={selectedInversions}
          onToggleStringSet={toggleStringSet}
          onToggleRootString={toggleRootString}
          onToggleInversion={toggleInversion}
        />
        <div className="text-fg-faint text-center py-20">
          Select a chord to view shapes.
        </div>
      </div>
    );
  }

  const activeSubSelectorEmpty =
    mode === "triads"
      ? selectedStringSets.size === 0 || selectedInversions.size === 0
      : selectedRootStrings.size === 0;

  return (
    <div className="space-y-4">
      <SubSelectorRow
        mode={mode}
        selectedStringSets={selectedStringSets}
        selectedRootStrings={selectedRootStrings}
        selectedInversions={selectedInversions}
        onToggleStringSet={toggleStringSet}
        onToggleRootString={toggleRootString}
        onToggleInversion={toggleInversion}
      />
      {activeSubSelectorEmpty ? (
        <div className="text-fg-faint text-center py-20">
          Select a string set to begin.
        </div>
      ) : (
        <Fretboard markers={visibleMarkers} startFret={startFret} endFret={endFret} />
      )}
    </div>
  );
}

type SubSelectorRowProps = {
  mode: "triads" | "shells";
  selectedStringSets: Set<StringSet>;
  selectedRootStrings: Set<RootString>;
  selectedInversions: Set<Inversion>;
  onToggleStringSet: (id: StringSet) => void;
  onToggleRootString: (id: RootString) => void;
  onToggleInversion: (id: Inversion) => void;
};

function SubSelectorRow({
  mode,
  selectedStringSets,
  selectedRootStrings,
  selectedInversions,
  onToggleStringSet,
  onToggleRootString,
  onToggleInversion,
}: SubSelectorRowProps) {
  if (mode === "triads") {
    return (
      <div className="flex flex-wrap items-center gap-4">
        <StringSetToggles
          options={STRING_SET_OPTIONS}
          selected={selectedStringSets}
          onToggle={onToggleStringSet}
          ariaLabel="String groups"
        />
        <StringSetToggles
          options={INVERSION_OPTIONS}
          selected={selectedInversions}
          onToggle={onToggleInversion}
          ariaLabel="Inversions"
        />
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-4">
      <StringSetToggles
        options={ROOT_STRING_OPTIONS}
        selected={selectedRootStrings}
        onToggle={onToggleRootString}
        ariaLabel="Root strings"
      />
    </div>
  );
}
```

- [ ] **Step 2: Update `src/App.tsx` — chord-shapes branch**

Find in `src/App.tsx`:

```tsx
{
  selectedView === "chord-shapes" && (
    <ChordShapesView
      selectedKey={selectedKey}
      accidentalStyle={accidentalStyle}
      startFret={startFret}
      endFret={endFret}
    />
  );
}
```

Replace with:

```tsx
{
  selectedView === "chord-shapes" && (
    <>
      <ChordShapesView
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        startFret={startFret}
        endFret={endFret}
        selectedChord={selectedChord}
        chordRowMode={chordRowMode}
        enabledHighlights={enabledHighlights}
      />
      <div className="mt-4">
        <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
      </div>
      <DiatonicChords
        selectedKey={selectedKey}
        accidentalStyle={accidentalStyle}
        selectedDegree={selectedChordDegree}
        onSelectDegree={handleChordSelect}
        mode={chordRowMode}
        onModeChange={setChordRowMode}
      />
    </>
  );
}
```

- [ ] **Step 3: Simplify `src/components/Legend.tsx` — remove `readOnly` arm**

Replace the entire file with:

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

type LegendProps = {
  enabledRoles: Set<HighlightableRole>;
  onToggleRole: (role: HighlightableRole) => void;
};

export function Legend({ enabledRoles, onToggleRole }: LegendProps) {
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

- [ ] **Step 4: Delete `src/components/InversionPicker.tsx`**

```bash
rm src/components/InversionPicker.tsx
```

- [ ] **Step 5: Run lint, typecheck, full test suite, build**

Run: `npm run lint` — Expected: clean.

Run: `npx tsc -b` — Expected: clean.

Run: `npm test` — Expected: all 24 tests green.

Run: `npm run build` — Expected: successful build.

- [ ] **Step 6: Manual smoke verification**

Run: `npm run dev`. Open the app in a browser.

1. **Tab presence.** Three tabs: Note Map | Scale Positions | Chord Shapes. ✓
2. **Default state.** Click Chord Shapes. Key = C, chord row shows triads with I
   selected by default.
   - Sub-selector row: `[1-2-3 | 2-3-4 | 3-4-5 | 4-5-6]` toggles + `[Root | 1st | 2nd]`
     toggles (all lit). No Triads/Shells mode toggle visible.
   - Fretboard renders multiple C major clusters at root, first, and second inversions
     on string set 1-2-3.
   - Interactive Legend (R / 3 / 5 / 7) is below the fretboard; clicking a swatch
     dims/restores that role's markers.
   - Chord row with Triads/Sevenths toggle is visible at the bottom.
3. **Toggle inversions.** Uncheck "1st". First-inversion clusters disappear from the
   fretboard.
4. **Toggle string sets.** Check "4-5-6". Clusters from 4-5-6 appear alongside 1-2-3.
5. **Deselect chord.** Click the active chord card (I). Chord row deselects; "Select a
   chord to view shapes." message appears. Sub-selector row stays visible.
6. **Switch chord-row mode.** Click "Sevenths" in the chord row toggle. Sub-selector row
   swaps to `[6th-string-root | 5th-string-root]`; inversion toggles disappear;
   fretboard shows shell voicings for the re-selected chord.
7. **Toggle Legend role.** Uncheck 5th. All fifth-role markers disappear in Chord Shapes
   **and** in Note Map (shared state).
8. **All Notes key.** Change key to "All Notes". "Select a key to view chord shapes."
   empty-state replaces the fretboard.
9. **Back to Note Map.** Switch to Note Map. Confirm it works normally with Legend and
   chord row still functional.

Stop the dev server.

- [ ] **Step 7: Format and commit**

```bash
npx prettier --write src/views/ChordShapesView.tsx src/App.tsx src/components/Legend.tsx
git add src/views/ChordShapesView.tsx src/App.tsx src/components/Legend.tsx
git rm src/components/InversionPicker.tsx
git commit -m "feat(view): chord-centric ChordShapesView, interactive Legend, remove InversionPicker"
```

---

## Final verification

Before declaring done, run the full pre-commit gate:

- [ ] `npm run lint` — clean
- [ ] `npx tsc -b` — clean
- [ ] `npm test` — all 24 tests green
- [ ] `npm run build` — successful build
