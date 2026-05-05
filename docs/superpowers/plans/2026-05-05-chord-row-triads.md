# Diatonic Chord Row Triads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `Triads | Sevenths` toggle to the existing diatonic chord row so it can
show the 7 diatonic triads (R/3/5) alongside the 7 diatonic seventh chords (R/3/5/7) it
shows today. Triad mode integrates with the chord-tone-targeting pipeline used by Note
Map and Scale Positions.

**Architecture:** Theory layer gains `getDiatonicTriads` mirroring `getDiatonicChords`.
The chord-tone resolution helper (`roleFromChordTone`) widens its `chord` parameter to
accept either type, with a runtime length check on the seventh branch. App-level
`chordRowMode` state branches the `selectedChord` `useMemo` between the two source
lists; the widened `selectedChord` flows unchanged through Note Map and Scale Positions.

**Tech Stack:** React 19, Vite, Vitest, Tailwind v4, TypeScript. Pure functions in
`src/theory/`, components in `src/components/`. No state-management library.

**Spec:** `docs/superpowers/specs/2026-05-05-chord-row-triads-design.md`.

---

## File Structure

**Modified files (no new files):**

- `src/theory/scales.ts` — add `TriadQuality`, `DiatonicTriad`, `getDiatonicTriads`.
- `src/theory/scales.test.ts` — add unit tests for `getDiatonicTriads`.
- `src/theory/chordTones.ts` — widen `roleFromChordTone` and
  `BuildChordToneMarkersInput.chord` types; add length check for seventh.
- `src/theory/chordTones.test.ts` — add triad cases.
- `src/App.tsx` — add `chordRowMode` state, branch `selectedChord` `useMemo`, pass new
  props to both `DiatonicChords` instances.
- `src/components/DiatonicChords.tsx` — accept new props, render mode toggle in section
  header, branch chord list source, extend `QUALITY_ACCENT` for triad qualities.
- `docs/design/2026-05-05-app-vision-and-view-designs.md` — flip the "Diatonic chord row
  triads" row of the View completion map to "Done".

---

## Task 1: `getDiatonicTriads` in theory layer (TDD)

**Files:**

- Modify: `src/theory/scales.ts` (append after `getDiatonicChords`)
- Modify: `src/theory/scales.test.ts` (append a new `describe`)

The new helper mirrors `getDiatonicChords` but returns 3-note R/3/5 triads with
triad-style Roman numerals (`I`, `ii`, `iii`, `IV`, `V`, `vi`, `vii°`) and triad-style
symbols (`C`, `Dm`, `B°`).

- [ ] **Step 1: Write the failing tests**

Append to `src/theory/scales.test.ts`:

```ts
import { getDiatonicTriads } from "./scales";

describe("getDiatonicTriads", () => {
  it("returns the 7 diatonic triads for C major", () => {
    const triads = getDiatonicTriads("C");
    expect(triads).toHaveLength(7);
    expect(triads[0]).toMatchObject({
      degree: 1,
      romanNumeral: "I",
      quality: "maj",
      symbol: "C",
      notes: ["C", "E", "G"],
    });
    expect(triads[1]).toMatchObject({
      degree: 2,
      romanNumeral: "ii",
      quality: "min",
      symbol: "Dm",
      notes: ["D", "F", "A"],
    });
    expect(triads[2]).toMatchObject({
      degree: 3,
      romanNumeral: "iii",
      quality: "min",
      symbol: "Em",
      notes: ["E", "G", "B"],
    });
    expect(triads[3]).toMatchObject({
      degree: 4,
      romanNumeral: "IV",
      quality: "maj",
      symbol: "F",
      notes: ["F", "A", "C"],
    });
    expect(triads[4]).toMatchObject({
      degree: 5,
      romanNumeral: "V",
      quality: "maj",
      symbol: "G",
      notes: ["G", "B", "D"],
    });
    expect(triads[5]).toMatchObject({
      degree: 6,
      romanNumeral: "vi",
      quality: "min",
      symbol: "Am",
      notes: ["A", "C", "E"],
    });
    expect(triads[6]).toMatchObject({
      degree: 7,
      romanNumeral: "vii°",
      quality: "dim",
      symbol: "B°",
      notes: ["B", "D", "F"],
    });
  });

  it("returns correct triads for G major (sharps)", () => {
    const triads = getDiatonicTriads("G");
    expect(triads[0].symbol).toBe("G");
    expect(triads[0].notes).toEqual(["G", "B", "D"]);
    expect(triads[4].symbol).toBe("D");
    expect(triads[6].symbol).toBe("F#°");
    expect(triads[6].notes).toEqual(["F#", "A", "C"]);
  });

  it("returns correct triads for F major (flats)", () => {
    const triads = getDiatonicTriads("F");
    expect(triads[0].symbol).toBe("F");
    expect(triads[3].symbol).toBe("Bb");
    expect(triads[3].notes).toEqual(["Bb", "D", "F"]);
    expect(triads[6].symbol).toBe("E°");
    expect(triads[6].notes).toEqual(["E", "G", "Bb"]);
  });

  it("respects accidentalStyle override (sharp on a flat-keyed scale)", () => {
    const triads = getDiatonicTriads("F", "sharp");
    expect(triads[3].symbol).toBe("A#");
    expect(triads[3].notes).toEqual(["A#", "D", "F"]);
  });

  it("respects accidentalStyle override (flat on a sharp-keyed scale)", () => {
    const triads = getDiatonicTriads("G", "flat");
    expect(triads[6].symbol).toBe("Gb°");
    expect(triads[6].notes).toEqual(["Gb", "A", "C"]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/theory/scales.test.ts` Expected: FAIL — `getDiatonicTriads` is
not exported from `./scales`.

- [ ] **Step 3: Implement `getDiatonicTriads` in `scales.ts`**

Append to `src/theory/scales.ts` (after the existing `getDiatonicChords` function,
before `getIntervalRole`):

```ts
export type TriadQuality = "maj" | "min" | "dim";

export type DiatonicTriad = {
  degree: number; // 1-7
  romanNumeral: string; // 'I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'
  quality: TriadQuality;
  symbol: string; // 'C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'
  notes: [string, string, string];
};

const DIATONIC_TRIAD_TEMPLATE: { numeral: string; quality: TriadQuality }[] = [
  { numeral: "I", quality: "maj" },
  { numeral: "ii", quality: "min" },
  { numeral: "iii", quality: "min" },
  { numeral: "IV", quality: "maj" },
  { numeral: "V", quality: "maj" },
  { numeral: "vi", quality: "min" },
  { numeral: "vii°", quality: "dim" },
];

const TRIAD_QUALITY_SUFFIX: Record<TriadQuality, string> = {
  maj: "",
  min: "m",
  dim: "°",
};

export function getDiatonicTriads(
  key: string,
  accidentalStyle?: AccidentalStyle,
): DiatonicTriad[] {
  const scale = getMajorScaleNotes(key, accidentalStyle);
  return DIATONIC_TRIAD_TEMPLATE.map(({ numeral, quality }, i) => {
    const root = scale[i];
    const third = scale[(i + 2) % 7];
    const fifth = scale[(i + 4) % 7];
    return {
      degree: i + 1,
      romanNumeral: numeral,
      quality,
      symbol: root + TRIAD_QUALITY_SUFFIX[quality],
      notes: [root, third, fifth],
    };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/theory/scales.test.ts` Expected: PASS — all existing tests plus
the 5 new `getDiatonicTriads` tests.

- [ ] **Step 5: Run lint and typecheck**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/theory/scales.ts src/theory/scales.test.ts
git commit -m "feat(theory): add getDiatonicTriads helper"
```

---

## Task 2: Widen chord-tone resolution to accept triads (TDD)

**Files:**

- Modify: `src/theory/chordTones.ts` (widen `roleFromChordTone` signature; widen
  `BuildChordToneMarkersInput.chord`; add length check on seventh branch)
- Modify: `src/theory/chordTones.test.ts` (append triad cases)

`roleFromChordTone` currently reads `chord.notes[3]` unconditionally. After widening to
`DiatonicChord | DiatonicTriad | null`, it must check `chord.notes.length === 4` before
reading the seventh, otherwise the triad branch (3-tuple) would compile-error and
runtime-misbehave.

- [ ] **Step 1: Append the failing tests to `chordTones.test.ts`**

Add at the bottom of `src/theory/chordTones.test.ts` (after the existing
`buildChordToneMarkers` describe). First add the new import alongside the existing one:

Find:

```ts
import { getDiatonicChords } from "./scales";
```

Replace with:

```ts
import { getDiatonicChords, getDiatonicTriads } from "./scales";
```

Then append the new describe blocks at the bottom of the file:

```ts
describe("roleFromChordTone with triads", () => {
  it("resolves root/third/fifth correctly for a triad input (C major, ii = Dm)", () => {
    const triad = getDiatonicTriads("C")[1]; // ii = Dm — notes [D, F, A]
    expect(roleFromChordTone("D", triad)).toBe("root");
    expect(roleFromChordTone("F", triad)).toBe("third");
    expect(roleFromChordTone("A", triad)).toBe("fifth");
  });

  it('never returns "seventh" for a triad input', () => {
    // C is the seventh of Dm7 in sevenths mode, but is not a chord tone of
    // the Dm triad. Should fall back to 'scale'.
    const triad = getDiatonicTriads("C")[1];
    expect(roleFromChordTone("C", triad)).toBe("scale");
  });

  it('returns "scale" for in-key non-chord-tone notes (E in Dm triad, C major)', () => {
    const triad = getDiatonicTriads("C")[1];
    expect(roleFromChordTone("E", triad)).toBe("scale");
  });

  it("handles enharmonic equivalence in triad mode (B° in C major, F vs E#)", () => {
    // vii° in C is B° = B D F. F and E# are enharmonic — both should resolve
    // as the chord's third.
    const triad = getDiatonicTriads("C")[6];
    expect(roleFromChordTone("F", triad)).toBe("third");
    expect(roleFromChordTone("E#", triad)).toBe("third");
  });
});

describe("buildChordToneMarkers with triads", () => {
  const cMajor_ii_triad = () => getDiatonicTriads("C")[1]; // Dm — notes [D, F, A]
  const allRoles: Set<HighlightableRole> = new Set([
    "root",
    "third",
    "fifth",
    "seventh",
  ]);

  it('produces no markers with role "seventh" when the chord is a triad', () => {
    const markers = buildChordToneMarkers({
      key: "C",
      chord: cMajor_ii_triad(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
    });
    expect(markers.length).toBeGreaterThan(0);
    for (const m of markers) {
      expect(m.role).not.toBe("seventh");
    }
  });

  it("marks the triad notes correctly (D=root, F=third, A=fifth in C major P1)", () => {
    const markers = buildChordToneMarkers({
      key: "C",
      chord: cMajor_ii_triad(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
    });
    // String index convention: 0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E.
    const find = (string: number, fret: number) =>
      markers.find((m) => m.string === string && m.fret === fret);
    expect(find(2, 0)?.role).toBe("root"); // D string open = D
    expect(find(0, 1)?.role).toBe("third"); // low E + 1 = F
    expect(find(1, 0)?.role).toBe("fifth"); // A string open = A
  });

  it("treats C (the would-be seventh) as scale tone in triad mode", () => {
    const markers = buildChordToneMarkers({
      key: "C",
      chord: cMajor_ii_triad(),
      accidentalStyle: "sharp",
      positions: ["P1"],
      showContext: false,
      enabledHighlights: allRoles,
    });
    // A string + fret 3 = C. In sevenths mode this would be 'seventh' of Dm7;
    // in triads mode it should be 'scale'.
    const c = markers.find((m) => m.string === 1 && m.fret === 3);
    expect(c?.role).toBe("scale");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/theory/chordTones.test.ts` Expected: FAIL with TypeScript
compilation errors — `roleFromChordTone` and `buildChordToneMarkers` don't accept
`DiatonicTriad`. The error will name `DiatonicTriad` as not assignable to
`DiatonicChord | null`.

- [ ] **Step 3: Widen `roleFromChordTone` in `chordTones.ts`**

Find this import in `src/theory/chordTones.ts`:

```ts
import { getIntervalRole, type DiatonicChord } from "./scales";
```

Replace with:

```ts
import { getIntervalRole, type DiatonicChord, type DiatonicTriad } from "./scales";
```

Then find the `roleFromChordTone` function:

```ts
export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | null,
): NoteDisplayRole {
  if (!chord) return "scale";
  const noteIdx = getNoteIndex(note);
  const rootIdx = getNoteIndex(chord.notes[0]);
  const thirdIdx = getNoteIndex(chord.notes[1]);
  const fifthIdx = getNoteIndex(chord.notes[2]);
  const seventhIdx = getNoteIndex(chord.notes[3]);

  if (noteIdx === rootIdx) return "root";
  if (noteIdx === thirdIdx) return "third";
  if (noteIdx === fifthIdx) return "fifth";
  if (noteIdx === seventhIdx) return "seventh";
  return "scale";
}
```

Replace with:

```ts
export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | DiatonicTriad | null,
): NoteDisplayRole {
  if (!chord) return "scale";
  const noteIdx = getNoteIndex(note);
  if (noteIdx === getNoteIndex(chord.notes[0])) return "root";
  if (noteIdx === getNoteIndex(chord.notes[1])) return "third";
  if (noteIdx === getNoteIndex(chord.notes[2])) return "fifth";
  if (chord.notes.length === 4 && noteIdx === getNoteIndex(chord.notes[3]))
    return "seventh";
  return "scale";
}
```

The `chord.notes.length === 4` check narrows the union type so `chord.notes[3]` is
type-safe (only the `DiatonicChord` 4-tuple variant has `length: 4`).

- [ ] **Step 4: Widen `BuildChordToneMarkersInput.chord` type**

Find in `src/theory/chordTones.ts`:

```ts
export type BuildChordToneMarkersInput = {
  key: string;
  chord: DiatonicChord | null;
  accidentalStyle: AccidentalStyle;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: Set<HighlightableRole>;
};
```

Replace with:

```ts
export type BuildChordToneMarkersInput = {
  key: string;
  chord: DiatonicChord | DiatonicTriad | null;
  accidentalStyle: AccidentalStyle;
  positions: ReadonlyArray<PositionId>;
  showContext: boolean;
  enabledHighlights: Set<HighlightableRole>;
};
```

The function body is unchanged — it passes `chord` straight to `roleFromChordTone`,
which now handles the union.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/theory/chordTones.test.ts` Expected: PASS — all existing tests
still pass (the type widening is non-breaking for the 4-tuple case) plus the 7 new triad
cases.

- [ ] **Step 6: Run lint and typecheck**

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green (full suite).

- [ ] **Step 7: Commit**

```bash
git add src/theory/chordTones.ts src/theory/chordTones.test.ts
git commit -m "feat(theory): widen roleFromChordTone to accept triads"
```

---

## Task 3: Wire triads/sevenths toggle through App + DiatonicChords

**Files:**

- Modify: `src/App.tsx` (add `ChordRowMode` import + state, branch `selectedChord`
  `useMemo`, pass new props to both `DiatonicChords` instances)
- Modify: `src/components/DiatonicChords.tsx` (export `ChordRowMode`, add new props,
  render toggle in section header, branch chord list source, extend `QUALITY_ACCENT`)

The component change is verified manually — the codebase has no jsdom / @testing-library
setup, so component-level interactions are not unit-tested (matches existing convention;
see how `AccidentalToggle.tsx` and `ViewSelector.tsx` are also untested).

- [ ] **Step 1: Update `DiatonicChords.tsx` — exports and props**

Open `src/components/DiatonicChords.tsx`. Replace the entire file with:

```tsx
import type { AccidentalStyle } from "../theory/notes";
import {
  getDiatonicChords,
  getDiatonicTriads,
  type ChordQuality,
  type TriadQuality,
} from "../theory/scales";
import { ALL_NOTES_KEY } from "./KeySelector";

export type ChordRowMode = "triads" | "sevenths";

type DiatonicChordsProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedDegree: number | null;
  onSelectDegree: (degree: number) => void;
  mode: ChordRowMode;
  onModeChange: (mode: ChordRowMode) => void;
};

const QUALITY_ACCENT: Record<ChordQuality | TriadQuality, string> = {
  // Sevenths
  maj7: "border-line-emphasis bg-surface-raised",
  m7: "border-line bg-surface-raised",
  "7": "border-line bg-surface-raised",
  m7b5: "border-line bg-surface-raised",
  // Triads — major variants get the emphasized border to mirror the
  // sevenths' maj7 treatment; minor and diminished get the plain line.
  maj: "border-line-emphasis bg-surface-raised",
  min: "border-line bg-surface-raised",
  dim: "border-line bg-surface-raised",
};

const MODE_OPTIONS: { value: ChordRowMode; label: string }[] = [
  { value: "triads", label: "Triads" },
  { value: "sevenths", label: "Sevenths" },
];

export function DiatonicChords({
  selectedKey,
  accidentalStyle,
  selectedDegree,
  onSelectDegree,
  mode,
  onModeChange,
}: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const chords =
    mode === "sevenths"
      ? getDiatonicChords(selectedKey, accidentalStyle)
      : getDiatonicTriads(selectedKey, accidentalStyle);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3 gap-4">
        <h2 className="text-sm text-fg-secondary uppercase tracking-wider font-semibold">
          Diatonic chords
        </h2>
        <div
          className="inline-flex rounded overflow-hidden border border-line"
          role="radiogroup"
          aria-label="Chord row mode"
        >
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={mode === opt.value}
              onClick={() => onModeChange(opt.value)}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                mode === opt.value
                  ? "bg-surface-active text-fg-emphasis"
                  : "bg-surface text-fg-muted hover:bg-surface-raised"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {chords.map((chord) => {
          const isSelected = selectedDegree === chord.degree;
          return (
            <button
              key={chord.degree}
              type="button"
              onClick={() => onSelectDegree(chord.degree)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-3 px-4 py-8 min-h-[10rem] rounded-xl border-2 shadow-lg cursor-pointer transition-colors ${
                isSelected
                  ? "border-line-selected bg-surface-active"
                  : `${QUALITY_ACCENT[chord.quality]} hover:border-line-hover`
              }`}
            >
              <span className="text-lg text-fg-muted font-mono font-semibold">
                {chord.romanNumeral}
              </span>
              <span className="text-3xl font-bold text-fg-emphasis leading-none">
                {chord.symbol}
              </span>
              <span className="text-lg text-fg-secondary tracking-wider font-medium">
                {chord.notes.join(" – ")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

The toggle styling mirrors `AccidentalToggle.tsx` (same
`inline-flex rounded overflow-hidden border border-line` wrapper, same per-button
classes). The mode toggle sits to the right of the section heading on the same row via
`flex justify-between`.

- [ ] **Step 2: Update `App.tsx` — import the new type**

Open `src/App.tsx`. Find the existing imports (around lines 1-11). Specifically find:

```ts
import { DiatonicChords } from "./components/DiatonicChords";
```

Replace with:

```ts
import { DiatonicChords, type ChordRowMode } from "./components/DiatonicChords";
```

And find:

```ts
import { getDiatonicChords } from "./theory/scales";
```

Replace with:

```ts
import { getDiatonicChords, getDiatonicTriads } from "./theory/scales";
```

- [ ] **Step 3: Add `chordRowMode` state to `App.tsx`**

Find the existing state declarations in `App()` (around lines 21-27):

```ts
function App() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedView, setSelectedView] = useState('note-map')
  const [accidentalStyle, setAccidentalStyle] = useState<AccidentalStyle>('flat')
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  )
  const [selectedChordDegree, setSelectedChordDegree] = useState<number | null>(1)
```

Add one line after `selectedChordDegree`:

```ts
const [chordRowMode, setChordRowMode] = useState<ChordRowMode>("sevenths");
```

- [ ] **Step 4: Branch the `selectedChord` useMemo in `App.tsx`**

Find the existing `selectedChord` useMemo (around lines 29-33):

```ts
const selectedChord = useMemo(() => {
  if (selectedChordDegree === null || selectedKey === ALL_NOTES_KEY) return null;
  const chords = getDiatonicChords(selectedKey, accidentalStyle);
  return chords[selectedChordDegree - 1] ?? null;
}, [selectedChordDegree, selectedKey, accidentalStyle]);
```

Replace with:

```ts
const selectedChord = useMemo(() => {
  if (selectedChordDegree === null || selectedKey === ALL_NOTES_KEY) return null;
  const chords =
    chordRowMode === "sevenths"
      ? getDiatonicChords(selectedKey, accidentalStyle)
      : getDiatonicTriads(selectedKey, accidentalStyle);
  return chords[selectedChordDegree - 1] ?? null;
}, [selectedChordDegree, chordRowMode, selectedKey, accidentalStyle]);
```

`selectedChord`'s inferred type widens to `DiatonicChord | DiatonicTriad | null`. The
downstream views (`NoteMapView`, `ScalePositionsView`, `ScaleDisplay`) currently type
their `selectedChord` prop as `DiatonicChord | null`. The TypeScript checker will
surface these mismatches in Step 6 — fix each by widening the prop type to
`DiatonicChord | DiatonicTriad | null` to match the new union.

- [ ] **Step 5: Pass new props through to both `DiatonicChords` instances**

In `App.tsx`, find the first `<DiatonicChords>` (in the `note-map` branch, around lines
96-101):

```tsx
<DiatonicChords
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  selectedDegree={selectedChordDegree}
  onSelectDegree={handleChordSelect}
/>
```

Replace with:

```tsx
<DiatonicChords
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  selectedDegree={selectedChordDegree}
  onSelectDegree={handleChordSelect}
  mode={chordRowMode}
  onModeChange={setChordRowMode}
/>
```

Find the second `<DiatonicChords>` (in the `scale-positions` branch, around lines
115-120):

```tsx
<DiatonicChords
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  selectedDegree={selectedChordDegree}
  onSelectDegree={handleChordSelect}
/>
```

Replace with:

```tsx
<DiatonicChords
  selectedKey={selectedKey}
  accidentalStyle={accidentalStyle}
  selectedDegree={selectedChordDegree}
  onSelectDegree={handleChordSelect}
  mode={chordRowMode}
  onModeChange={setChordRowMode}
/>
```

- [ ] **Step 6: Widen downstream `selectedChord` prop types**

The widened `selectedChord` flows into `NoteMapView`, `ScalePositionsView`, and
`ScaleDisplay`. Their prop types currently say `DiatonicChord | null`. Run typecheck to
surface the exact set:

Run: `npx tsc -b` Expected: errors naming `DiatonicTriad` as not assignable to
`DiatonicChord | null` in the prop types of `NoteMapView`, `ScalePositionsView`, and
`ScaleDisplay`.

For each file flagged, find the prop type definition and widen it. Specifically:

In `src/views/NoteMapView.tsx`, find:

```tsx
import { getIntervalRole, type DiatonicChord } from "../theory/scales";
```

Replace with:

```tsx
import {
  getIntervalRole,
  type DiatonicChord,
  type DiatonicTriad,
} from "../theory/scales";
```

Find the prop type:

```tsx
type NoteMapViewProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  enabledHighlights: Set<HighlightableRole>;
  selectedChord: DiatonicChord | null;
};
```

Replace `selectedChord: DiatonicChord | null` with
`selectedChord: DiatonicChord | DiatonicTriad | null`.

In `src/views/ScalePositionsView.tsx`, do the same: widen the `DiatonicChord` import and
the `selectedChord` prop type.

In `src/components/ScaleDisplay.tsx`, do the same: widen the `DiatonicChord` import and
the `selectedChord` prop type.

Run typecheck again:

Run: `npx tsc -b` Expected: clean.

- [ ] **Step 7: Run lint, typecheck, full test suite**

`NoteMapView`, `ScalePositionsView`, and `ScaleDisplay` all consume `selectedChord`
exclusively via `roleFromChordTone` / `buildChordToneMarkers` (neither accesses
`chord.notes[3]` directly), so the prop widening in Step 6 is sufficient — no logic
change needed in any of the three.

Run: `npm run lint` Expected: clean.

Run: `npx tsc -b` Expected: clean.

Run: `npm test` Expected: all green.

- [ ] **Step 8: Run the build to catch anything `tsc -b` missed**

Run: `npm run build` Expected: successful build.

- [ ] **Step 9: Manual verification — golden path**

Run: `npm run dev`. Open the app:

1. **Default state.** Confirm the app loads on Note Map, key C, with the chord row
   showing `Imaj7` / `ii7` / ... / `viiø7` (sevenths mode default). The toggle in the
   chord-row header reads `Triads | Sevenths` with `Sevenths` highlighted.
2. **Switch to Triads.** Click the `Triads` segment of the toggle. Chord row re-renders
   to `I` / `ii` / `iii` / `IV` / `V` / `vi` / `vii°`. Symbols: `C`, `Dm`, `Em`, `F`,
   `G`, `Am`, `B°`. Three-note spelled lines (e.g. `C – E – G`).
3. **Selection persists across the toggle.** With `I` selected (highlighted card), click
   Sevenths. The selected card stays on `Imaj7` (degree 1, just rendered as the seventh
   chord now). Toggle back to Triads — still degree 1.
4. **Chord-tone highlighting in triads mode.** With Triads selected and `I` selected,
   the fretboard should show C/E/G lit as R/3/5 (no B as seventh). Toggle Legend's `7`
   button — no visual change because no seventh markers exist (acceptable per spec).
5. **Switch chord in triads mode.** Click `V` (G triad). Fretboard now lights G/B/D as
   R/3/5.
6. **Switch view.** Switch tab to Scale Positions. Toggle and selected chord persist.
   Fretboard now shows the same triad chord tones inside the selected CAGED position
   window.
7. **Switch key.** Change key to G. Chord row re-renders with G major triads (`G`, `Am`,
   `Bm`, `C`, `D`, `Em`, `F#°`). Selected degree (5) stays selected — now shows `D`.
8. **Toggle accidentals.** With key G in triads mode, toggle accidental to flat: `F#°`
   becomes `Gb°`. Other triads stay unchanged because only F# is a sharp in G major's
   scale; the rest are naturals.
9. **All Notes key.** Switch key to "All Notes". The chord row (and its toggle) hide
   entirely.
10. **Switch back to Note Map.** Confirm everything still works with the new state.

Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/components/DiatonicChords.tsx src/views/NoteMapView.tsx src/views/ScalePositionsView.tsx src/components/ScaleDisplay.tsx
git commit -m "feat(view): add triads/sevenths toggle to chord row"
```

---

## Task 4: Mark triad row as done in the vision doc

**Files:**

- Modify: `docs/design/2026-05-05-app-vision-and-view-designs.md` (View completion map
  row)

- [ ] **Step 1: Update the status entry**

In `docs/design/2026-05-05-app-vision-and-view-designs.md`, find the table row:

```markdown
| Diatonic chord row triads | Not started | Small extension to the existing
`DiatonicChords` component: triads alongside sevenths. Replaces the originally-planned
"Diatonic Chord Reference" tab. |
```

Replace with:

```markdown
| Diatonic chord row triads | Done | Triads/sevenths toggle in
[DiatonicChords.tsx](src/components/DiatonicChords.tsx); `getDiatonicTriads` in
[scales.ts](src/theory/scales.ts). Spec:
[design](../superpowers/specs/2026-05-05-chord-row-triads-design.md). |
```

- [ ] **Step 2: Commit**

```bash
git add docs/design/2026-05-05-app-vision-and-view-designs.md
git commit -m "docs(vision): mark chord row triads as done"
```

---

## Final verification

Before declaring done, run the full pre-commit gate one more time:

- [ ] `npm run lint` — clean
- [ ] `npx tsc -b` — clean
- [ ] `npm test` — all green
- [ ] `npm run build` — successful build (catches anything `tsc -b` doesn't)

If any of those fail, fix the underlying issue before claiming the work complete (per
the user's CLAUDE.md guidance: don't skip verification).
