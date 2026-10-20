# Progression Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progression player (PR 2 of the chord-map spec). You can add chords from
the chord map to a progression, reorder them by dragging, set each one's length in bars,
and play them back with a Web Audio metronome. The fretboard follows the current chord
live.

**Architecture:** Meter math (`meter.ts`) and persistence (`progressionStorage.ts`) are
pure modules in `src/theory/`. A new `src/audio/` folder holds the look-ahead
`metronome.ts` and a small `transport.ts`. The metronome takes an injectable
`AudioContext` factory. The transport turns scheduled beats into timeline positions on
animation frames. `useProgressionPlayer` (in `src/`, next to `tonalReducer.ts`) wires a
pure `progressionReducer` to the transport. App passes it to `ProgressionPanel`, which
renders `TransportControls` and a dnd-kit sortable strip of `ProgressionSlotCard`s.

**Tech Stack:** React 19, TypeScript (strict), Tailwind v4, Vitest + React Testing
Library (jsdom), Playwright, `@dnd-kit/core` / `@dnd-kit/sortable` /
`@dnd-kit/utilities`, Web Audio API.

**Spec:** `docs/superpowers/specs/2026-10-20-chord-map-progression-player-design.md`.
This plan covers sections 5–9, "New dependency", and the PR 2 tests.

## Prerequisite: PR 1 (chord map) is merged first

This plan is executed **after** the separate PR 1 plan, which delivers spec sections
1–4. It assumes these exist exactly as the spec names them:

- `src/theory/notes.ts`: `export type SpelledNote`.
- `src/theory/harmony.ts`:
  `export type ChordTier = "secondary" | "diatonic" | "borrowed"`,
  `export type ChordRef = { tier: ChordTier; degree: number }`,
  `export type MapChord = { ref; romanNumeral: string; symbol: string; quality; notes: readonly SpelledNote[] }`,
  `getChordMap(...)`, and
  `resolveChordRef(ref: ChordRef, key: string, mode: Mode, rowMode: ChordRowMode): MapChord | null`.
- `src/components/ChordMap.tsx`: `export function ChordMap(props)` with the props
  `selectedKey, modalMode, rowMode, onRowModeChange, selectedRef, onSelect, onAdd?`.
  `export type ChordRowMode = "triads" | "sevenths"` lives in `src/theory/harmony.ts`
  (PR 1 moved it there so theory code can use it). Cards have
  `data-testid="chord-card"`, `data-tier`, `data-degree` and `aria-pressed`.
  The ＋ button has `aria-label="Add <symbol> to progression"`. The Triads/Sevenths
  toggle is `role="radiogroup" aria-label="Chord row mode"`.
- `src/App.tsx`:
  `const [selectedChordRef, setSelectedChordRef] = useState<ChordRef | null>(...)`,
  `chordRowMode` / `setChordRowMode`, a ref-based select handler, and `<ChordMap … />`
  rendered after each of the three views in `renderView()`.

Before starting Task 1, run:

```bash
grep -n "export type ChordRef\|export function resolveChordRef\|export type MapChord\|export type ChordTier" src/theory/harmony.ts
grep -n "export type ChordRowMode" src/theory/harmony.ts
grep -n "export function ChordMap\|onAdd" src/components/ChordMap.tsx
grep -n "selectedChordRef\|<ChordMap" src/App.tsx
```

Expected: every symbol is found. If one is missing, stop and finish PR 1 first. If App's
select handler has a name other than `handleChordSelect`, use PR 1's name wherever this
plan writes `handleChordSelect`.

## Global Constraints

- New dependencies, and no others: `@dnd-kit/core` ^6.3.1, `@dnd-kit/sortable` ^10.0.0,
  `@dnd-kit/utilities` ^3.2.2. **No Tone.js.**
- BPM counts the time signature's unit (6/8 at 120 means 120 eighth notes per minute).
  BPM is clamped to 30–300.
- `TIME_SIGNATURE_PRESETS`: 2/4 3/4 4/4 5/4 6/8 7/8 9/8 12/8.
- Accents: beat 1 is `strong`. Compound meters (beats divisible by 3, more than 3, unit
  8 or 16) get `medium` on every third beat. 5 is grouped 3+2 and 7 is grouped 2+2+3,
  with `medium` at each group start. All other beats are `weak`.
- `allowedSlotLengths` returns `[0.5, 1, 2, 3, 4]` when `sig.beats` is even and
  `[1, 2, 3, 4]` otherwise. The unit is bars.
- Storage key `"fretlab:progression:v1"`, `version: 1`. Defaults: no slots, 4/4, 90 BPM,
  click off, loop on, visible. Invalid data or an unknown version falls back to the
  defaults. Disallowed `bars` snap to 1.
- Scheduler: a `setTimeout` loop every 25 ms schedules the beats in
  `beatsInWindow(now, now + 0.1)`. The click is a ~30 ms oscillator blip with descending
  pitch for strong, medium and weak beats. `AudioContext` is created lazily on the first
  `start()`.
- Copy: the empty state reads `Click ＋ on a chord below to start a progression`
  (fullwidth ＋, U+FF0B). An unplayable slot has the title `Not available in this mode`.
  The visibility toggle button is labelled `Progression`.
- Test hooks: `data-testid="progression-slot"`, `data-index`, `data-current`.
- Space toggles Play/Stop. It is ignored with meta/ctrl/alt and when focus is in an
  `input`, `textarea`, `select` or `button` (see Task 9).
- Theory logic lives only in `src/theory/` (meter and storage are pure, with no React or
  DOM audio). The audio scheduler lives in `src/audio/`.
- Use `type` aliases and named exports. Components stay under about 150 lines.
- Tailwind only. No hex or rgb in JSX. **One accepted inline style:** dnd-kit's drag
  `transform`/`transition` on `ProgressionSlotCard`. It follows the precedent of the
  indicator `style={{ transform }}` in `DiatonicChords.tsx` (now `ChordMap`).
- Tests over registries (`TIME_SIGNATURE_PRESETS`) iterate the registry.
- Before every commit: `npm run lint`, `npx prettier --write <touched files>`,
  `npx tsc -b`, `npm test`. All must pass. Playwright (`npm run test:e2e`) runs in CI
  only and is never added to pre-commit.

## Review Focus

1. **Typing a BPM value digit by digit** (e.g. clearing and typing `120`): the field
   must not clamp mid-typing to 30. It commits on blur or Enter and clamps then. An
   empty or non-numeric value reverts. The test is in Task 7.
2. **The tab is backgrounded during playback** (timers throttled to about 1 s): when it
   comes back, there is no burst of catch-up clicks, and beats resume on the grid. The
   test is in Task 4.
3. **The progression is edited, or the key or mode changes, while playing.** Examples:
   clearing, or every slot becoming unplayable. Playback continues over the slots that
   are still playable, or stops cleanly, and never crashes. The tests are in Task 5 (an
   empty timeline ends playback) and Task 6 (clear while playing stops).
4. **Space while a button or field has focus.** It must not double-toggle with a focused
   Play button, steal a dnd-kit keyboard drag, or type into the BPM field. The test is
   in Task 9.
5. **Corrupted or hand-edited localStorage.** Examples: duplicate slot ids (these break
   dnd-kit), degree 0 or 8, an unknown time signature, `bars: 0.75`. The result is
   defaults or snapped values, never a crash. The test is in Task 2.

---

## File Structure

| File                                            | Responsibility                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/theory/meter.ts` (+ test)                  | Time signatures, accents, slot lengths, timeline, `locate`, `beatsInWindow`. Pure.                 |
| `src/theory/progressionStorage.ts` (+ test)     | `StoredProgression` types, defaults, guards, `clampBpm`, load/save. Mirrors `customTuningStorage`. |
| `src/progressionReducer.ts` (+ test)            | Pure edit actions on `StoredProgression`, next to `tonalReducer.ts`.                               |
| `src/audio/metronome.ts` (+ test)               | Web Audio look-ahead scheduler with an injectable `AudioContext` factory.                          |
| `src/audio/transport.ts` (+ test)               | Beat queue plus frame loop that maps scheduled beats to timeline positions on time.                |
| `src/audio/testing.ts`                          | Test doubles: `FakeAudioContext`, `createFakeMetronome`. No vitest imports.                        |
| `src/useProgressionPlayer.ts` (+ test)          | React hook that owns the state, persistence, playback state and actions.                           |
| `src/components/TransportControls.tsx` (+ test) | Play/Stop, BPM, time signature, Click, Loop, Clear.                                                |
| `src/components/ProgressionSlotCard.tsx`        | One sortable slot: drag handle, select, length stepper, remove, beat dots.                         |
| `src/components/ProgressionPanel.tsx` (+ test)  | Panel shell, empty and disabled states, DndContext/SortableContext.                                |
| `src/components/ChordMap.tsx` (modify)          | Adds the `Progression` visibility toggle next to the Triads/Sevenths toggle.                       |
| `src/App.tsx` (modify)                          | Hook wiring, panel placement, `onAdd`, Space key.                                                  |
| `tests/e2e/progression.spec.ts`                 | Play, drag and reload, run in CI only.                                                             |

**Why `transport.ts` is a separate file:** the spec gives the hook the beat queue and
the `requestAnimationFrame` loop (§8). A plain-TS transport with an injectable frame
scheduler makes that logic testable without React. It also keeps the hook free of
self-referencing callbacks, which the `react-hooks` v7 compiler lint rejects.

---

### Task 1: Meter math (`src/theory/meter.ts`)

**Files:**

- Create: `src/theory/meter.ts`
- Test: `src/theory/meter.test.ts`

**Interfaces:**

- Consumes: nothing.
- Produces:
  - `type TimeSignature = { beats: number; unit: 2 | 4 | 8 | 16 }`
  - `type Accent = "strong" | "medium" | "weak"`
  - `type Timeline = { starts: number[]; totalBeats: number }`
  - `type TimelinePosition = { slotIndex: number; beatInBar: number }`
  - `const TIME_SIGNATURE_PRESETS: readonly TimeSignature[]`
  - `timeSignatureLabel(sig): string` (`"6/8"`)
  - `accentPattern(sig): Accent[]`
  - `allowedSlotLengths(sig): number[]`
  - `snapSlotLength(bars: number, sig): number`. It returns `bars` if allowed, else `1`.
  - `beatsPerSlot(bars, sig): number`
  - `buildTimeline(slotBars: readonly number[], sig): Timeline`
  - `locate(beat, timeline, sig): TimelinePosition`. It wraps modulo `totalBeats` and
    throws `RangeError` on an empty timeline. `beatInBar` counts from the start of the
    timeline, so a ½-bar slot does not reset the bar.
  - `secondsPerBeat(bpm): number`
  - `beatsInWindow(fromTime, toTime, startTime, bpm): number[]`. It returns beat indices
    `n ≥ 0` with `startTime + n·spb ∈ [fromTime, toTime)`.

- [ ] **Step 1: Write the failing test**

Create `src/theory/meter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  TIME_SIGNATURE_PRESETS,
  accentPattern,
  allowedSlotLengths,
  beatsInWindow,
  beatsPerSlot,
  buildTimeline,
  locate,
  secondsPerBeat,
  snapSlotLength,
  timeSignatureLabel,
  type Accent,
  type TimeSignature,
} from "./meter";

const sig = (beats: number, unit: TimeSignature["unit"]): TimeSignature => ({
  beats,
  unit,
});
const FOUR_FOUR = sig(4, 4);
const short = (a: Accent): string =>
  a === "strong" ? "S" : a === "medium" ? "M" : "w";
const PRESET_CASES = TIME_SIGNATURE_PRESETS.map(
  (p) => [timeSignatureLabel(p), p] as const,
);

describe("TIME_SIGNATURE_PRESETS", () => {
  it("has unique labels (they are the <select> values)", () => {
    const labels = TIME_SIGNATURE_PRESETS.map(timeSignatureLabel);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("labels as beats/unit", () => {
    expect(timeSignatureLabel(sig(6, 8))).toBe("6/8");
  });
});

describe.each(PRESET_CASES)("accentPattern(%s)", (_label, preset) => {
  it("has one accent per beat", () => {
    expect(accentPattern(preset)).toHaveLength(preset.beats);
  });

  it("starts on a strong beat", () => {
    expect(accentPattern(preset)[0]).toBe("strong");
  });

  it("has exactly one strong beat", () => {
    expect(accentPattern(preset).filter((a) => a === "strong")).toHaveLength(1);
  });
});

describe("accentPattern examples", () => {
  it.each([
    ["2/4", sig(2, 4), "S w"],
    ["3/4", sig(3, 4), "S w w"],
    ["4/4", sig(4, 4), "S w w w"],
    ["5/4 (3+2)", sig(5, 4), "S w w M w"],
    ["6/8", sig(6, 8), "S w w M w w"],
    ["7/8 (2+2+3)", sig(7, 8), "S w M w M w w"],
    ["9/8", sig(9, 8), "S w w M w w M w w"],
    ["12/8", sig(12, 8), "S w w M w w M w w M w w"],
    ["6/4 is not compound", sig(6, 4), "S w w w w w"],
  ])("%s", (_label, s, expected) => {
    expect(accentPattern(s).map(short).join(" ")).toBe(expected);
  });
});

describe.each(PRESET_CASES)("allowedSlotLengths(%s)", (_label, preset) => {
  it("only offers whole numbers of beats", () => {
    for (const bars of allowedSlotLengths(preset)) {
      expect(Number.isInteger(beatsPerSlot(bars, preset))).toBe(true);
    }
  });

  it("offers ½ bar exactly when the bar splits evenly", () => {
    expect(allowedSlotLengths(preset).includes(0.5)).toBe(preset.beats % 2 === 0);
  });

  it("snaps a disallowed length to 1", () => {
    expect(snapSlotLength(0.75, preset)).toBe(1);
  });

  it("keeps an allowed length", () => {
    for (const bars of allowedSlotLengths(preset)) {
      expect(snapSlotLength(bars, preset)).toBe(bars);
    }
  });
});

describe("allowedSlotLengths values", () => {
  it("even meters", () => {
    expect(allowedSlotLengths(sig(4, 4))).toEqual([0.5, 1, 2, 3, 4]);
  });

  it("odd meters", () => {
    expect(allowedSlotLengths(sig(3, 4))).toEqual([1, 2, 3, 4]);
  });
});

describe("buildTimeline", () => {
  it("accumulates slot starts in beats", () => {
    expect(buildTimeline([1, 0.5, 2], FOUR_FOUR)).toEqual({
      starts: [0, 4, 6],
      totalBeats: 14,
    });
  });

  it("is empty for no slots", () => {
    expect(buildTimeline([], FOUR_FOUR)).toEqual({ starts: [], totalBeats: 0 });
  });
});

describe("locate", () => {
  const timeline = buildTimeline([1, 0.5, 2], FOUR_FOUR); // starts 0, 4, 6; total 14

  it.each([
    [0, 0, 0],
    [3, 0, 3],
    [4, 1, 0],
    [5, 1, 1],
    [6, 2, 2],
    [13, 2, 1],
  ])("beat %i → slot %i, beatInBar %i", (beat, slotIndex, beatInBar) => {
    expect(locate(beat, timeline, FOUR_FOUR)).toEqual({ slotIndex, beatInBar });
  });

  it("wraps past the end (loop)", () => {
    expect(locate(14, timeline, FOUR_FOUR)).toEqual({ slotIndex: 0, beatInBar: 0 });
  });

  it("wraps more than once", () => {
    expect(locate(14 + 14 + 4, timeline, FOUR_FOUR)).toEqual({
      slotIndex: 1,
      beatInBar: 0,
    });
  });

  it("throws on an empty timeline", () => {
    expect(() => locate(0, buildTimeline([], FOUR_FOUR), FOUR_FOUR)).toThrow(
      RangeError,
    );
  });
});

describe("secondsPerBeat", () => {
  it("120 BPM is half a second", () => {
    expect(secondsPerBeat(120)).toBe(0.5);
  });
});

describe("beatsInWindow", () => {
  it("includes a beat exactly at the window start", () => {
    expect(beatsInWindow(1, 3, 0, 60)).toEqual([1, 2]);
  });

  it("excludes a beat exactly at the window end", () => {
    expect(beatsInWindow(0, 3, 0, 60)).toEqual([0, 1, 2]);
  });

  it("returns nothing for a window between beats", () => {
    expect(beatsInWindow(0.1, 0.9, 0, 60)).toEqual([]);
  });

  it("never returns negative beats for a window before the start", () => {
    expect(beatsInWindow(-1, 0.5, 0, 60)).toEqual([0]);
  });

  it("honours a non-zero start time", () => {
    expect(beatsInWindow(10, 11, 10.25, 120)).toEqual([0, 1]);
  });

  it("is robust to floating-point beat times", () => {
    const beat2 = 2 * secondsPerBeat(90);
    expect(beatsInWindow(beat2, beat2 + 0.1, 0, 90)).toEqual([2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theory/meter.test.ts` Expected: FAIL with
`Failed to resolve import "./meter"`.

- [ ] **Step 3: Write the implementation**

Create `src/theory/meter.ts`:

```ts
// Meter math for the progression player. Pure — no React, no audio.
// BPM always counts the time signature's unit (6/8 at 120 = 120 eighths/min).

export type TimeSignature = { beats: number; unit: 2 | 4 | 8 | 16 };
export type Accent = "strong" | "medium" | "weak";
export type Timeline = { starts: number[]; totalBeats: number };
export type TimelinePosition = { slotIndex: number; beatInBar: number };

export const TIME_SIGNATURE_PRESETS: readonly TimeSignature[] = [
  { beats: 2, unit: 4 },
  { beats: 3, unit: 4 },
  { beats: 4, unit: 4 },
  { beats: 5, unit: 4 },
  { beats: 6, unit: 8 },
  { beats: 7, unit: 8 },
  { beats: 9, unit: 8 },
  { beats: 12, unit: 8 },
];

// Irregular meters: group sizes, a medium accent at each group start.
const IRREGULAR_GROUPS: Partial<Record<number, readonly number[]>> = {
  5: [3, 2],
  7: [2, 2, 3],
};

// Floating-point tolerance for beat-time comparisons (seconds).
const EPSILON = 1e-9;

export function timeSignatureLabel(sig: TimeSignature): string {
  return `${sig.beats}/${sig.unit}`;
}

function isCompound(sig: TimeSignature): boolean {
  return sig.beats > 3 && sig.beats % 3 === 0 && (sig.unit === 8 || sig.unit === 16);
}

export function accentPattern(sig: TimeSignature): Accent[] {
  const pattern: Accent[] = Array.from({ length: sig.beats }, () => "weak");
  const groups = IRREGULAR_GROUPS[sig.beats];
  if (groups) {
    let start = 0;
    for (const size of groups) {
      pattern[start] = "medium";
      start += size;
    }
  } else if (isCompound(sig)) {
    for (let i = 3; i < sig.beats; i += 3) pattern[i] = "medium";
  }
  pattern[0] = "strong";
  return pattern;
}

export function allowedSlotLengths(sig: TimeSignature): number[] {
  return sig.beats % 2 === 0 ? [0.5, 1, 2, 3, 4] : [1, 2, 3, 4];
}

export function snapSlotLength(bars: number, sig: TimeSignature): number {
  return allowedSlotLengths(sig).includes(bars) ? bars : 1;
}

export function beatsPerSlot(bars: number, sig: TimeSignature): number {
  return bars * sig.beats;
}

export function buildTimeline(
  slotBars: readonly number[],
  sig: TimeSignature,
): Timeline {
  const starts: number[] = [];
  let totalBeats = 0;
  for (const bars of slotBars) {
    starts.push(totalBeats);
    totalBeats += beatsPerSlot(bars, sig);
  }
  return { starts, totalBeats };
}

export function locate(
  beat: number,
  timeline: Timeline,
  sig: TimeSignature,
): TimelinePosition {
  const total = timeline.totalBeats;
  if (total <= 0) throw new RangeError("locate: timeline is empty");
  const wrapped = ((beat % total) + total) % total;
  let slotIndex = 0;
  for (let i = timeline.starts.length - 1; i >= 0; i--) {
    if (timeline.starts[i] <= wrapped) {
      slotIndex = i;
      break;
    }
  }
  return { slotIndex, beatInBar: wrapped % sig.beats };
}

export function secondsPerBeat(bpm: number): number {
  return 60 / bpm;
}

export function beatsInWindow(
  fromTime: number,
  toTime: number,
  startTime: number,
  bpm: number,
): number[] {
  const spb = secondsPerBeat(bpm);
  const first = Math.max(0, Math.ceil((fromTime - startTime) / spb - EPSILON));
  const beats: number[] = [];
  for (let n = first; startTime + n * spb < toTime - EPSILON; n++) beats.push(n);
  return beats;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theory/meter.test.ts` Expected: PASS (all tests green).

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write src/theory/meter.ts src/theory/meter.test.ts
npx tsc -b
npm test
git add src/theory/meter.ts src/theory/meter.test.ts
git commit -m "feat(theory): meter math for the progression player"
```

Expected: lint, tsc and the full suite pass.

---

### Task 2: Progression persistence (`src/theory/progressionStorage.ts`)

**Files:**

- Create: `src/theory/progressionStorage.ts`
- Test: `src/theory/progressionStorage.test.ts`

**Interfaces:**

- Consumes: `ChordRef` from `./harmony` (PR 1). From Task 1: `TimeSignature`,
  `TIME_SIGNATURE_PRESETS` and `snapSlotLength`.
- Produces:
  - `type ProgressionSlot = { id: string; ref: ChordRef; bars: number }`
  - `type StoredProgression = { version: 1; slots: ProgressionSlot[]; timeSignature: TimeSignature; bpm: number; click: boolean; loop: boolean; visible: boolean }`
  - `const PROGRESSION_STORAGE_KEY = "fretlab:progression:v1"`
  - `const BPM_MIN = 30`, `const BPM_MAX = 300`
  - `const DEFAULT_PROGRESSION: StoredProgression`
  - `clampBpm(bpm: number): number`. It rounds to an integer and clamps to 30–300.
  - `loadProgression(): StoredProgression`
  - `saveProgression(state: StoredProgression): void`

- [ ] **Step 1: Write the failing test**

Create `src/theory/progressionStorage.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  BPM_MAX,
  BPM_MIN,
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  clampBpm,
  loadProgression,
  saveProgression,
  type ProgressionSlot,
  type StoredProgression,
} from "./progressionStorage";
import {
  TIME_SIGNATURE_PRESETS,
  allowedSlotLengths,
  timeSignatureLabel,
} from "./meter";

const F: ProgressionSlot = {
  id: "slot:1-a",
  ref: { tier: "diatonic", degree: 4 },
  bars: 2,
};
const A7: ProgressionSlot = {
  id: "slot:2-b",
  ref: { tier: "secondary", degree: 2 },
  bars: 0.5,
};

const SAMPLE: StoredProgression = {
  version: 1,
  slots: [F, A7],
  timeSignature: { beats: 4, unit: 4 },
  bpm: 120,
  click: true,
  loop: false,
  visible: false,
};

function prime(value: unknown) {
  localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(value));
}

describe("progressionStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the documented defaults when storage is empty", () => {
    expect(loadProgression()).toEqual({
      version: 1,
      slots: [],
      timeSignature: { beats: 4, unit: 4 },
      bpm: 90,
      click: false,
      loop: true,
      visible: true,
    });
  });

  it("round-trips a saved progression", () => {
    saveProgression(SAMPLE);
    expect(loadProgression()).toEqual(SAMPLE);
  });

  it("returns defaults on corrupt JSON without throwing", () => {
    localStorage.setItem(PROGRESSION_STORAGE_KEY, "{not json");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
    spy.mockRestore();
  });

  it("returns defaults when the version is missing", () => {
    prime({ ...SAMPLE, version: undefined }); // JSON.stringify drops it
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
  });

  it("returns defaults for an unknown version", () => {
    prime({ ...SAMPLE, version: 2 });
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
  });

  it.each([
    ["slots is not an array", { slots: {} }],
    ["unknown tier", { slots: [{ ...F, ref: { tier: "modal", degree: 1 } }] }],
    ["degree 0", { slots: [{ ...F, ref: { tier: "diatonic", degree: 0 } }] }],
    ["degree 8", { slots: [{ ...F, ref: { tier: "diatonic", degree: 8 } }] }],
    [
      "non-integer degree",
      { slots: [{ ...F, ref: { tier: "diatonic", degree: 2.5 } }] },
    ],
    ["empty slot id", { slots: [{ ...F, id: "" }] }],
    ["bars is a string", { slots: [{ ...F, bars: "2" }] }],
    ["duplicate slot ids", { slots: [F, { ...F }] }],
    ["unknown time signature", { timeSignature: { beats: 4, unit: 3 } }],
    ["bpm is not a number", { bpm: "fast" }],
    ["click is not a boolean", { click: "yes" }],
    ["loop is missing", { loop: undefined }],
    ["visible is null", { visible: null }],
  ])("returns defaults when %s", (_label, patch) => {
    prime({ ...SAMPLE, ...patch });
    expect(loadProgression()).toEqual(DEFAULT_PROGRESSION);
  });

  it("clamps a stored BPM below the minimum", () => {
    prime({ ...SAMPLE, bpm: 5 });
    expect(loadProgression().bpm).toBe(BPM_MIN);
  });

  it("clamps a stored BPM above the maximum", () => {
    prime({ ...SAMPLE, bpm: 1000 });
    expect(loadProgression().bpm).toBe(BPM_MAX);
  });

  it("swallows storage write errors", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveProgression(SAMPLE)).not.toThrow();
    set.mockRestore();
    warn.mockRestore();
  });
});

describe.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
  "loading under %s",
  (_label, preset) => {
    beforeEach(() => {
      localStorage.clear();
      prime({
        ...SAMPLE,
        timeSignature: preset,
        slots: [
          { ...F, id: "a", bars: 0.75 },
          { ...F, id: "b", bars: 0.5 },
        ],
      });
    });

    it("snaps every slot to an allowed length", () => {
      const allowed = allowedSlotLengths(preset);
      for (const slot of loadProgression().slots) {
        expect(allowed).toContain(slot.bars);
      }
    });

    it("snaps a disallowed length to 1", () => {
      expect(loadProgression().slots[0].bars).toBe(1);
    });
  },
);

describe("clampBpm", () => {
  it.each([
    [5, 30],
    [30, 30],
    [87.6, 88],
    [300, 300],
    [301, 300],
  ])("%d → %d", (input, expected) => {
    expect(clampBpm(input)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theory/progressionStorage.test.ts` Expected: FAIL with
`Failed to resolve import "./progressionStorage"`.

- [ ] **Step 3: Write the implementation**

Create `src/theory/progressionStorage.ts`:

```ts
import type { ChordRef } from "./harmony";
import { TIME_SIGNATURE_PRESETS, snapSlotLength, type TimeSignature } from "./meter";

export const PROGRESSION_STORAGE_KEY = "fretlab:progression:v1";
export const BPM_MIN = 30;
export const BPM_MAX = 300;

export type ProgressionSlot = { id: string; ref: ChordRef; bars: number };

export type StoredProgression = {
  version: 1;
  slots: ProgressionSlot[];
  timeSignature: TimeSignature;
  bpm: number;
  click: boolean;
  loop: boolean;
  visible: boolean;
};

export const DEFAULT_PROGRESSION: StoredProgression = {
  version: 1,
  slots: [],
  timeSignature: { beats: 4, unit: 4 },
  bpm: 90,
  click: false,
  loop: true,
  visible: true,
};

const TIERS: readonly string[] = ["secondary", "diatonic", "borrowed"];

export function clampBpm(bpm: number): number {
  return Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChordRef(value: unknown): value is ChordRef {
  if (!isObject(value)) return false;
  if (typeof value.tier !== "string" || !TIERS.includes(value.tier)) return false;
  const degree = value.degree;
  return (
    typeof degree === "number" && Number.isInteger(degree) && degree >= 1 && degree <= 7
  );
}

function isSlot(value: unknown): value is ProgressionSlot {
  if (!isObject(value)) return false;
  if (typeof value.id !== "string" || value.id === "") return false;
  if (!isChordRef(value.ref)) return false;
  return typeof value.bars === "number" && Number.isFinite(value.bars);
}

function isTimeSignature(value: unknown): value is TimeSignature {
  if (!isObject(value)) return false;
  return TIME_SIGNATURE_PRESETS.some(
    (p) => p.beats === value.beats && p.unit === value.unit,
  );
}

function isStoredProgression(value: unknown): value is StoredProgression {
  if (!isObject(value)) return false;
  if (value.version !== 1) return false;
  if (!Array.isArray(value.slots) || !value.slots.every(isSlot)) return false;
  // dnd-kit requires unique ids; duplicates would break reordering.
  const ids = value.slots.map((s: ProgressionSlot) => s.id);
  if (new Set(ids).size !== ids.length) return false;
  if (!isTimeSignature(value.timeSignature)) return false;
  if (typeof value.bpm !== "number" || !Number.isFinite(value.bpm)) return false;
  return (
    typeof value.click === "boolean" &&
    typeof value.loop === "boolean" &&
    typeof value.visible === "boolean"
  );
}

function normalize(state: StoredProgression): StoredProgression {
  return {
    ...state,
    bpm: clampBpm(state.bpm),
    slots: state.slots.map((s) => ({
      ...s,
      bars: snapSlotLength(s.bars, state.timeSignature),
    })),
  };
}

export function loadProgression(): StoredProgression {
  if (typeof window === "undefined") return DEFAULT_PROGRESSION;
  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (raw === null) return DEFAULT_PROGRESSION;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredProgression(parsed)) return DEFAULT_PROGRESSION;
    return normalize(parsed);
  } catch (err) {
    console.warn("[progressionStorage] failed to load:", err);
    return DEFAULT_PROGRESSION;
  }
}

export function saveProgression(state: StoredProgression): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("[progressionStorage] failed to save:", err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/theory/progressionStorage.test.ts` Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write src/theory/progressionStorage.ts src/theory/progressionStorage.test.ts
npx tsc -b
npm test
git add src/theory/progressionStorage.ts src/theory/progressionStorage.test.ts
git commit -m "feat(theory): versioned localStorage persistence for the progression"
```

---

### Task 3: Progression reducer (`src/progressionReducer.ts`)

**Files:**

- Create: `src/progressionReducer.ts`
- Test: `src/progressionReducer.test.ts`

**Interfaces:**

- Consumes: `ChordRef` (PR 1). From Task 1: `TimeSignature`, `allowedSlotLengths` and
  `snapSlotLength`. From Task 2: `StoredProgression` and `clampBpm`.
- Produces:
  - `type ProgressionAction =` `| { type: "add"; id: string; ref: ChordRef }`
    `| { type: "remove"; id: string }` `| { type: "move"; from: number; to: number }`
    `| { type: "set-bars"; id: string; bars: number }` `| { type: "clear" }`
    `| { type: "set-bpm"; bpm: number }`
    `| { type: "set-time-signature"; sig: TimeSignature }`
    `| { type: "set-click"; enabled: boolean }` `| { type: "set-loop"; loop: boolean }`
    `| { type: "set-visible"; visible: boolean }`
  - `progressionReducer(state: StoredProgression, action: ProgressionAction): StoredProgression`

- [ ] **Step 1: Write the failing test**

Create `src/progressionReducer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { progressionReducer } from "./progressionReducer";
import {
  DEFAULT_PROGRESSION,
  type StoredProgression,
} from "./theory/progressionStorage";
import {
  TIME_SIGNATURE_PRESETS,
  allowedSlotLengths,
  timeSignatureLabel,
} from "./theory/meter";

function withSlots(bars: number[]): StoredProgression {
  return {
    ...DEFAULT_PROGRESSION,
    slots: bars.map((b, i) => ({
      id: `s${i}`,
      ref: { tier: "diatonic", degree: i + 1 },
      bars: b,
    })),
  };
}

const ids = (s: StoredProgression) => s.slots.map((slot) => slot.id);

describe("progressionReducer — slots", () => {
  it("add appends a one-bar slot", () => {
    const next = progressionReducer(withSlots([2]), {
      type: "add",
      id: "new",
      ref: { tier: "borrowed", degree: 6 },
    });
    expect(next.slots[1]).toEqual({
      id: "new",
      ref: { tier: "borrowed", degree: 6 },
      bars: 1,
    });
  });

  it("remove drops the slot with that id", () => {
    expect(
      ids(progressionReducer(withSlots([1, 1, 1]), { type: "remove", id: "s1" })),
    ).toEqual(["s0", "s2"]);
  });

  it("move reorders (third → first)", () => {
    expect(
      ids(progressionReducer(withSlots([1, 1, 1]), { type: "move", from: 2, to: 0 })),
    ).toEqual(["s2", "s0", "s1"]);
  });

  it("move out of range is a no-op", () => {
    const state = withSlots([1, 1]);
    expect(progressionReducer(state, { type: "move", from: 0, to: 5 })).toBe(state);
  });

  it("set-bars applies an allowed length", () => {
    const next = progressionReducer(withSlots([1]), {
      type: "set-bars",
      id: "s0",
      bars: 0.5,
    });
    expect(next.slots[0].bars).toBe(0.5);
  });

  it("set-bars ignores a disallowed length", () => {
    const state = withSlots([1]);
    expect(progressionReducer(state, { type: "set-bars", id: "s0", bars: 5 })).toBe(
      state,
    );
  });

  it("clear empties the progression", () => {
    expect(progressionReducer(withSlots([1, 2]), { type: "clear" }).slots).toEqual([]);
  });
});

describe("progressionReducer — settings", () => {
  it("set-bpm clamps", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-bpm", bpm: 999 }).bpm,
    ).toBe(300);
  });

  it("set-click", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-click", enabled: true })
        .click,
    ).toBe(true);
  });

  it("set-loop", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-loop", loop: false }).loop,
    ).toBe(false);
  });

  it("set-visible", () => {
    expect(
      progressionReducer(DEFAULT_PROGRESSION, { type: "set-visible", visible: false })
        .visible,
    ).toBe(false);
  });
});

describe.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
  "set-time-signature to %s",
  (_label, preset) => {
    const next = progressionReducer(withSlots([0.5, 1, 4]), {
      type: "set-time-signature",
      sig: preset,
    });

    it("stores the new signature", () => {
      expect(next.timeSignature).toEqual(preset);
    });

    it("leaves every slot at an allowed length", () => {
      for (const slot of next.slots)
        expect(allowedSlotLengths(preset)).toContain(slot.bars);
    });

    it("keeps ½ bar only where it is allowed", () => {
      expect(next.slots[0].bars).toBe(
        allowedSlotLengths(preset).includes(0.5) ? 0.5 : 1,
      );
    });
  },
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/progressionReducer.test.ts` Expected: FAIL with
`Failed to resolve import "./progressionReducer"`.

- [ ] **Step 3: Write the implementation**

Create `src/progressionReducer.ts`:

```ts
import type { ChordRef } from "./theory/harmony";
import { allowedSlotLengths, snapSlotLength, type TimeSignature } from "./theory/meter";
import { clampBpm, type StoredProgression } from "./theory/progressionStorage";

export type ProgressionAction =
  | { type: "add"; id: string; ref: ChordRef }
  | { type: "remove"; id: string }
  | { type: "move"; from: number; to: number }
  | { type: "set-bars"; id: string; bars: number }
  | { type: "clear" }
  | { type: "set-bpm"; bpm: number }
  | { type: "set-time-signature"; sig: TimeSignature }
  | { type: "set-click"; enabled: boolean }
  | { type: "set-loop"; loop: boolean }
  | { type: "set-visible"; visible: boolean };

export function progressionReducer(
  state: StoredProgression,
  action: ProgressionAction,
): StoredProgression {
  switch (action.type) {
    case "add":
      return {
        ...state,
        slots: [...state.slots, { id: action.id, ref: action.ref, bars: 1 }],
      };
    case "remove":
      return { ...state, slots: state.slots.filter((s) => s.id !== action.id) };
    case "move": {
      const { from, to } = action;
      const n = state.slots.length;
      if (from === to || from < 0 || to < 0 || from >= n || to >= n) return state;
      const slots = [...state.slots];
      const [moved] = slots.splice(from, 1);
      slots.splice(to, 0, moved);
      return { ...state, slots };
    }
    case "set-bars":
      if (!allowedSlotLengths(state.timeSignature).includes(action.bars)) return state;
      return {
        ...state,
        slots: state.slots.map((s) =>
          s.id === action.id ? { ...s, bars: action.bars } : s,
        ),
      };
    case "clear":
      return { ...state, slots: [] };
    case "set-bpm":
      return { ...state, bpm: clampBpm(action.bpm) };
    case "set-time-signature":
      return {
        ...state,
        timeSignature: action.sig,
        slots: state.slots.map((s) => ({
          ...s,
          bars: snapSlotLength(s.bars, action.sig),
        })),
      };
    case "set-click":
      return { ...state, click: action.enabled };
    case "set-loop":
      return { ...state, loop: action.loop };
    case "set-visible":
      return { ...state, visible: action.visible };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/progressionReducer.test.ts` Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write src/progressionReducer.ts src/progressionReducer.test.ts
npx tsc -b
npm test
git add src/progressionReducer.ts src/progressionReducer.test.ts
git commit -m "feat: pure reducer for progression edits"
```

---

### Task 4: Metronome scheduler (`src/audio/metronome.ts`)

**Files:**

- Create: `src/audio/metronome.ts`
- Create: `src/audio/testing.ts` (test doubles shared by Tasks 4–9)
- Test: `src/audio/metronome.test.ts`

**Interfaces:**

- Consumes: from Task 1, `beatsInWindow`, `secondsPerBeat` and `Accent`.
- Produces:
  - `type Metronome = { start(opts: { bpm: number; onBeat: (beat: number, time: number) => void }): void; stop(): void; setBpm(bpm: number): void; setClick(enabled: boolean, accentOf: (beat: number) => Accent): void; now(): number }`
  - `type AudioContextFactory = () => AudioContext`
  - `createMetronome(createContext?: AudioContextFactory): Metronome`. The default is
    `() => new AudioContext()`.
  - `const CLICK_FREQUENCIES: Record<Accent, number>`
  - In `testing.ts`:
    - `class FakeAudioContext` with `currentTime`, `state`, `clicks` and `resumeCalls`.
    - `type FakeMetronome = Metronome & { currentTime; running; starts; bpm; click; accentOf; emit(beat, time) }`
    - `createFakeMetronome(): FakeMetronome`

**Design notes:**

- The scheduler keeps an anchor `(anchorTime, anchorBeat)`. Each tick it takes
  `beatsInWindow(now, now + 0.1, anchorTime, bpm)`, maps the window index `n` to the
  absolute beat `anchorBeat + n`, and emits only beats `≥ nextBeat`. Overlapping windows
  therefore never double-schedule.
- When timers were throttled, the window starts at `now`, so missed beats are skipped
  rather than burst-played.
- `setBpm` re-anchors at `nextBeat` using the old tempo. Only beats that are not yet
  scheduled use the new spacing.
- Clicks route through a per-run `GainNode` bus. `stop()` disconnects the bus, which
  silences clicks scheduled up to 100 ms ahead. `OscillatorNode.stop()` cannot be called
  twice.

- [ ] **Step 1: Write the test doubles**

Create `src/audio/testing.ts`:

```ts
// Test doubles for the audio layer. Imported only by tests; never by app code.
// jsdom has no AudioContext, so tests either inject these or stub the global:
//   vi.stubGlobal("AudioContext", FakeAudioContext)
import type { Accent } from "../theory/meter";
import type { Metronome } from "./metronome";

export type ScheduledClick = { frequency: number; startAt: number };

export class FakeAudioContext {
  currentTime = 0;
  state: AudioContextState = "running";
  resumeCalls = 0;
  readonly destination = {};
  readonly clicks: ScheduledClick[] = [];

  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }

  createGain() {
    return {
      gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      disconnect() {},
    };
  }

  createOscillator() {
    const clicks = this.clicks;
    const osc = {
      frequency: { value: 0 },
      connect() {},
      start(when: number) {
        clicks.push({ frequency: osc.frequency.value, startAt: when });
      },
      stop() {},
    };
    return osc;
  }
}

export type FakeMetronome = Metronome & {
  currentTime: number;
  running: boolean;
  starts: number;
  bpm: number;
  click: boolean;
  accentOf: ((beat: number) => Accent) | null;
  emit(beat: number, time: number): void;
};

export function createFakeMetronome(): FakeMetronome {
  let onBeat: ((beat: number, time: number) => void) | null = null;
  const fake: FakeMetronome = {
    currentTime: 0,
    running: false,
    starts: 0,
    bpm: 0,
    click: false,
    accentOf: null,
    start(opts) {
      onBeat = opts.onBeat;
      fake.running = true;
      fake.starts++;
      fake.bpm = opts.bpm;
    },
    stop() {
      onBeat = null;
      fake.running = false;
    },
    setBpm(bpm) {
      fake.bpm = bpm;
    },
    setClick(enabled, accentOf) {
      fake.click = enabled;
      fake.accentOf = accentOf;
    },
    now() {
      return fake.currentTime;
    },
    emit(beat, time) {
      onBeat?.(beat, time);
    },
  };
  return fake;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/audio/metronome.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import { CLICK_FREQUENCIES, createMetronome, type Metronome } from "./metronome";
import { FakeAudioContext } from "./testing";

let ctx: FakeAudioContext;
let factory: Mock<() => AudioContext>;
let metronome: Metronome;
let beats: [number, number][];
const onBeat = (beat: number, time: number) => beats.push([beat, time]);

function advanceTo(time: number) {
  ctx.currentTime = time;
  vi.advanceTimersByTime(25);
}

beforeEach(() => {
  vi.useFakeTimers();
  ctx = new FakeAudioContext();
  factory = vi.fn(() => ctx as unknown as AudioContext);
  metronome = createMetronome(factory);
  beats = [];
});

afterEach(() => {
  metronome.stop();
  vi.useRealTimers();
});

describe("createMetronome — context", () => {
  it("does not create an AudioContext before start()", () => {
    expect(factory).not.toHaveBeenCalled();
  });

  it("creates the context once across restarts", () => {
    metronome.start({ bpm: 120, onBeat });
    metronome.stop();
    metronome.start({ bpm: 120, onBeat });
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("resumes a suspended context", () => {
    ctx.state = "suspended";
    metronome.start({ bpm: 120, onBeat });
    expect(ctx.resumeCalls).toBe(1);
  });

  it("now() reads the audio clock", () => {
    metronome.start({ bpm: 120, onBeat });
    ctx.currentTime = 3.5;
    expect(metronome.now()).toBe(3.5);
  });
});

describe("createMetronome — scheduling", () => {
  it("schedules beat 0 shortly after start", () => {
    metronome.start({ bpm: 120, onBeat });
    expect(beats[0][0]).toBe(0);
    expect(beats[0][1]).toBeCloseTo(0.05);
  });

  it("schedules the next beat one beat later as the clock advances", () => {
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.5);
    expect(beats[1][0]).toBe(1);
    expect(beats[1][1]).toBeCloseTo(0.55);
  });

  it("never schedules a beat twice across overlapping windows", () => {
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.47);
    advanceTo(0.49);
    advanceTo(0.52);
    expect(beats.filter(([b]) => b === 1)).toHaveLength(1);
  });

  it("stops scheduling after stop()", () => {
    metronome.start({ bpm: 120, onBeat });
    metronome.stop();
    advanceTo(5);
    expect(beats).toHaveLength(1);
  });

  it("applies a BPM change from the next unscheduled beat", () => {
    metronome.start({ bpm: 120, onBeat }); // beat 0 @ 0.05
    advanceTo(0.5); // beat 1 @ 0.55
    metronome.setBpm(60); // beat 2 still @ 1.05, then 1 s apart
    advanceTo(1.0);
    advanceTo(2.0);
    expect(beats.map(([b, t]) => [b, Number(t.toFixed(3))])).toEqual([
      [0, 0.05],
      [1, 0.55],
      [2, 1.05],
      [3, 2.05],
    ]);
  });

  it("skips missed beats instead of bursting after a throttled gap", () => {
    metronome.start({ bpm: 120, onBeat }); // beat 0 @ 0.05
    advanceTo(10); // timers were throttled for ~10 s
    expect(beats.map(([b]) => b)).toEqual([0, 20]);
  });
});

describe("createMetronome — click", () => {
  it("is silent when click is disabled", () => {
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.5);
    expect(ctx.clicks).toEqual([]);
  });

  it("schedules a click at each beat's time with its accent pitch", () => {
    metronome.setClick(true, (beat) => (beat === 0 ? "strong" : "weak"));
    metronome.start({ bpm: 120, onBeat });
    advanceTo(0.5);
    expect(ctx.clicks.map((c) => c.frequency)).toEqual([
      CLICK_FREQUENCIES.strong,
      CLICK_FREQUENCIES.weak,
    ]);
  });

  it("uses descending pitches for strong, medium, weak", () => {
    expect(CLICK_FREQUENCIES.strong).toBeGreaterThan(CLICK_FREQUENCIES.medium);
    expect(CLICK_FREQUENCIES.medium).toBeGreaterThan(CLICK_FREQUENCIES.weak);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/audio/metronome.test.ts` Expected: FAIL with
`Failed to resolve import "./metronome"`.

- [ ] **Step 4: Write the implementation**

Create `src/audio/metronome.ts`:

```ts
// Web Audio look-ahead scheduler ("A Tale of Two Clocks"): a coarse
// setTimeout loop schedules beats a little ahead on the precise audio clock.
// Not theory and not React — the timing core (beatsInWindow) lives in meter.ts.
import { beatsInWindow, secondsPerBeat, type Accent } from "../theory/meter";

export type Metronome = {
  start(opts: { bpm: number; onBeat: (beat: number, time: number) => void }): void;
  stop(): void;
  setBpm(bpm: number): void;
  setClick(enabled: boolean, accentOf: (beat: number) => Accent): void;
  now(): number; // AudioContext.currentTime
};

export type AudioContextFactory = () => AudioContext;

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.1;
const START_DELAY_S = 0.05;
const CLICK_LENGTH_S = 0.03;
const CLICK_GAIN = 0.5;

export const CLICK_FREQUENCIES: Record<Accent, number> = {
  strong: 1500,
  medium: 1100,
  weak: 800,
};

export function createMetronome(
  createContext: AudioContextFactory = () => new AudioContext(),
): Metronome {
  let ctx: AudioContext | null = null;
  let bus: GainNode | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let onBeat: ((beat: number, time: number) => void) | null = null;
  let bpm = 120;
  let anchorTime = 0;
  let anchorBeat = 0;
  let nextBeat = 0;
  let clickEnabled = false;
  let accentOf: (beat: number) => Accent = () => "weak";

  function timeOf(beat: number): number {
    return anchorTime + (beat - anchorBeat) * secondsPerBeat(bpm);
  }

  function scheduleClick(time: number, accent: Accent) {
    if (!ctx || !bus) return;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.frequency.value = CLICK_FREQUENCIES[accent];
    env.gain.setValueAtTime(CLICK_GAIN, time);
    env.gain.exponentialRampToValueAtTime(0.001, time + CLICK_LENGTH_S);
    osc.connect(env);
    env.connect(bus);
    osc.start(time);
    osc.stop(time + CLICK_LENGTH_S);
  }

  function tick() {
    if (!ctx || !onBeat) return;
    const now = ctx.currentTime;
    for (const n of beatsInWindow(now, now + SCHEDULE_AHEAD_S, anchorTime, bpm)) {
      const beat = anchorBeat + n;
      if (beat < nextBeat) continue;
      const time = timeOf(beat);
      if (clickEnabled) scheduleClick(time, accentOf(beat));
      onBeat(beat, time);
      nextBeat = beat + 1;
    }
    timer = setTimeout(tick, LOOKAHEAD_MS);
  }

  function stop() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    onBeat = null;
    if (bus) {
      bus.disconnect();
      bus = null;
    }
  }

  return {
    start(opts) {
      stop();
      if (!ctx) ctx = createContext();
      if (ctx.state === "suspended") void ctx.resume();
      bus = ctx.createGain();
      bus.connect(ctx.destination);
      bpm = opts.bpm;
      onBeat = opts.onBeat;
      anchorBeat = 0;
      nextBeat = 0;
      anchorTime = ctx.currentTime + START_DELAY_S;
      tick();
    },
    stop,
    setBpm(next) {
      if (onBeat) {
        anchorTime = timeOf(nextBeat);
        anchorBeat = nextBeat;
      }
      bpm = next;
    },
    setClick(enabled, accent) {
      clickEnabled = enabled;
      accentOf = accent;
    },
    now() {
      return ctx ? ctx.currentTime : 0;
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/audio/metronome.test.ts` Expected: PASS.

- [ ] **Step 6: Verify and commit**

```bash
npm run lint
npx prettier --write src/audio/metronome.ts src/audio/metronome.test.ts src/audio/testing.ts
npx tsc -b
npm test
git add src/audio/metronome.ts src/audio/metronome.test.ts src/audio/testing.ts
git commit -m "feat(audio): look-ahead Web Audio metronome with injectable context"
```

---

### Task 5: Transport (`src/audio/transport.ts`)

**Files:**

- Create: `src/audio/transport.ts`
- Test: `src/audio/transport.test.ts`

**Interfaces:**

- Consumes: from Task 1, `accentPattern`, `locate`, `Accent`, `TimeSignature`,
  `Timeline` and `TimelinePosition`. From Task 4, `Metronome` and `createFakeMetronome`
  (in the test).
- Produces:
  - `type TransportSnapshot = { timeline: Timeline; sig: TimeSignature; loop: boolean }`
  - `type TransportStartOptions = { bpm: number; click: boolean; startBeat: number; snapshot: () => TransportSnapshot; onPosition: (pos: TimelinePosition) => void; onEnd: () => void }`
  - `type FrameScheduler = { request(cb: () => void): number; cancel(handle: number): void }`
  - `type Transport = { start(opts: TransportStartOptions): void; stop(): void; setBpm(bpm: number): void; setClick(enabled: boolean): void }`
  - `createTransport(metronome: Metronome, frames?: FrameScheduler): Transport`. The
    default `frames` uses `requestAnimationFrame`.

**Behaviour:**

- Each scheduled beat is queued as `{ beat: startBeat + n, time }`.
- On every frame, beats whose `time ≤ metronome.now()` are drained. For each one,
  `snapshot()` is read fresh, so edits made mid-play apply on the next beat.
- An empty timeline ends playback. So does `!loop && beat ≥ totalBeats`. Ending calls
  `stop()` and then `onEnd()`. Otherwise the transport reports
  `locate(beat, timeline, sig)`.

- [ ] **Step 1: Write the failing test**

Create `src/audio/transport.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTransport, type TransportSnapshot } from "./transport";
import { createFakeMetronome, type FakeMetronome } from "./testing";
import { buildTimeline, type TimeSignature } from "../theory/meter";

const FOUR_FOUR: TimeSignature = { beats: 4, unit: 4 };

function manualFrames() {
  let pending: (() => void) | null = null;
  let handle = 0;
  return {
    request(cb: () => void) {
      pending = cb;
      return ++handle;
    },
    cancel() {
      pending = null;
    },
    flush() {
      const cb = pending;
      pending = null;
      cb?.();
    },
  };
}

let metronome: FakeMetronome;
let frames: ReturnType<typeof manualFrames>;
let snapshot: TransportSnapshot;
const onPosition = vi.fn();
const onEnd = vi.fn();

function start(startBeat = 0) {
  const transport = createTransport(metronome, frames);
  transport.start({
    bpm: 120,
    click: false,
    startBeat,
    snapshot: () => snapshot,
    onPosition,
    onEnd,
  });
  return transport;
}

beforeEach(() => {
  metronome = createFakeMetronome();
  frames = manualFrames();
  snapshot = { timeline: buildTimeline([1, 1], FOUR_FOUR), sig: FOUR_FOUR, loop: true };
  onPosition.mockReset();
  onEnd.mockReset();
});

describe("createTransport", () => {
  it("starts the metronome at the given BPM", () => {
    start();
    expect(metronome.bpm).toBe(120);
  });

  it("waits until the audio clock reaches a beat before reporting it", () => {
    start();
    metronome.emit(0, 0.05);
    metronome.currentTime = 0.01;
    frames.flush();
    expect(onPosition).not.toHaveBeenCalled();
  });

  it("reports the position once the beat's time has passed", () => {
    start();
    metronome.emit(0, 0.05);
    metronome.currentTime = 0.05;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 0, beatInBar: 0 });
  });

  it("offsets metronome beats by startBeat", () => {
    start(4);
    metronome.emit(0, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 1, beatInBar: 0 });
  });

  it("wraps to the first slot when loop is on", () => {
    start();
    metronome.emit(8, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 0, beatInBar: 0 });
  });

  it("ends after the last slot when loop is off", () => {
    snapshot = { ...snapshot, loop: false };
    start();
    metronome.emit(8, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(metronome.running).toBe(false);
  });

  it("ends when the timeline becomes empty mid-play", () => {
    start();
    snapshot = { ...snapshot, timeline: buildTimeline([], FOUR_FOUR) };
    metronome.emit(1, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("locates against the latest snapshot after an edit", () => {
    start();
    snapshot = { ...snapshot, timeline: buildTimeline([0.5, 1], FOUR_FOUR) };
    metronome.emit(2, 0);
    metronome.currentTime = 1;
    frames.flush();
    expect(onPosition).toHaveBeenCalledWith({ slotIndex: 1, beatInBar: 2 });
  });

  it("gives the metronome accents from the timeline beat", () => {
    start(2);
    expect([metronome.accentOf?.(0), metronome.accentOf?.(2)]).toEqual([
      "weak",
      "strong",
    ]);
  });

  it("stop() halts the metronome and ignores later beats", () => {
    const transport = start();
    transport.stop();
    metronome.emit(0, 0);
    frames.flush();
    expect([metronome.running, onPosition.mock.calls.length]).toEqual([false, 0]);
  });

  it("setClick forwards to the metronome", () => {
    const transport = start();
    transport.setClick(true);
    expect(metronome.click).toBe(true);
  });

  it("setBpm forwards to the metronome", () => {
    const transport = start();
    transport.setBpm(200);
    expect(metronome.bpm).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/audio/transport.test.ts` Expected: FAIL with
`Failed to resolve import "./transport"`.

- [ ] **Step 3: Write the implementation**

Create `src/audio/transport.ts`:

```ts
// Bridges the audio clock and the UI: the metronome schedules beats ~100 ms
// ahead; the transport holds them in a queue and reports each one on the
// animation frame where the audio clock reaches it, so visuals line up with
// the click.
import {
  accentPattern,
  locate,
  type Accent,
  type TimeSignature,
  type Timeline,
  type TimelinePosition,
} from "../theory/meter";
import type { Metronome } from "./metronome";

export type TransportSnapshot = {
  timeline: Timeline;
  sig: TimeSignature;
  loop: boolean;
};

export type TransportStartOptions = {
  bpm: number;
  click: boolean;
  startBeat: number;
  snapshot: () => TransportSnapshot;
  onPosition: (pos: TimelinePosition) => void;
  onEnd: () => void;
};

export type FrameScheduler = {
  request(cb: () => void): number;
  cancel(handle: number): void;
};

export type Transport = {
  start(opts: TransportStartOptions): void;
  stop(): void;
  setBpm(bpm: number): void;
  setClick(enabled: boolean): void;
};

const browserFrames: FrameScheduler = {
  request: (cb) => requestAnimationFrame(() => cb()),
  cancel: (handle) => cancelAnimationFrame(handle),
};

export function createTransport(
  metronome: Metronome,
  frames: FrameScheduler = browserFrames,
): Transport {
  let opts: TransportStartOptions | null = null;
  let queue: { beat: number; time: number }[] = [];
  let frame: number | null = null;

  function accentOf(beat: number): Accent {
    if (!opts) return "weak";
    const { timeline, sig } = opts.snapshot();
    if (timeline.totalBeats === 0) return "weak";
    return accentPattern(sig)[locate(opts.startBeat + beat, timeline, sig).beatInBar];
  }

  function stop() {
    metronome.stop();
    if (frame !== null) frames.cancel(frame);
    frame = null;
    queue = [];
    opts = null;
  }

  function onFrame() {
    frame = null;
    const current = opts;
    if (!current) return;
    const now = metronome.now();
    while (queue.length > 0 && queue[0].time <= now) {
      const next = queue.shift();
      if (!next) break;
      const { timeline, sig, loop } = current.snapshot();
      if (timeline.totalBeats === 0 || (!loop && next.beat >= timeline.totalBeats)) {
        stop();
        current.onEnd();
        return;
      }
      current.onPosition(locate(next.beat, timeline, sig));
    }
    frame = frames.request(onFrame);
  }

  return {
    start(next) {
      stop();
      opts = next;
      metronome.setClick(next.click, accentOf);
      metronome.start({
        bpm: next.bpm,
        onBeat: (beat, time) => queue.push({ beat: next.startBeat + beat, time }),
      });
      frame = frames.request(onFrame);
    },
    stop,
    setBpm: (bpm) => metronome.setBpm(bpm),
    setClick: (enabled) => metronome.setClick(enabled, accentOf),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/audio/transport.test.ts` Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write src/audio/transport.ts src/audio/transport.test.ts
npx tsc -b
npm test
git add src/audio/transport.ts src/audio/transport.test.ts
git commit -m "feat(audio): transport that syncs scheduled beats to animation frames"
```

---

### Task 6: Player hook (`src/useProgressionPlayer.ts`)

**Files:**

- Create: `src/useProgressionPlayer.ts`
- Test: `src/useProgressionPlayer.test.ts`

**Interfaces:**

- Consumes:
  - From PR 1: `resolveChordRef`, `ChordRef`, `MapChord`, `ChordRowMode`, and
    `ALL_NOTES_KEY` (`src/components/KeySelector.tsx`).
  - From Task 1: `buildTimeline`, `snapSlotLength`, `TimeSignature`, `TimelinePosition`.
  - From Task 2: `loadProgression`, `saveProgression`, `clampBpm`, `ProgressionSlot`,
    `StoredProgression`.
  - From Task 3: `progressionReducer`.
  - From Tasks 4 and 5: `createMetronome`, `Metronome`, `createTransport`,
    `TransportSnapshot`.
- Produces:
  - `type ResolvedSlot = { slot: ProgressionSlot; chord: MapChord | null }`
  - `type UseProgressionPlayerOptions = { selectedKey: string; mode: Mode; rowMode: ChordRowMode; onChordChange: (ref: ChordRef) => void; metronomeFactory?: () => Metronome }`
  - `type ProgressionPlayer` with:
    - `state: StoredProgression`
    - `resolvedSlots: ResolvedSlot[]`
    - `canPlay: boolean`
    - `isPlaying: boolean`
    - `currentSlot: number | null` (index into `state.slots`, only while playing)
    - `nextSlot: number | null`
    - `beatInBar: number`
    - `add(ref: ChordRef): void`
    - `remove(id: string): void`
    - `move(from: number, to: number): void`
    - `setBars(id: string, bars: number): void`
    - `clear(): void`
    - `play(): void`
    - `stop(): void`
    - `toggle(): void`
    - `jumpTo(index: number): void`
    - `setBpm(bpm: number): void`
    - `setTimeSignature(sig: TimeSignature): void`
    - `setClick(enabled: boolean): void`
    - `setLoop(loop: boolean): void`
    - `setVisible(visible: boolean): void`
  - `useProgressionPlayer(options: UseProgressionPlayerOptions): ProgressionPlayer`

**Notes:**

- A slot is playable when `resolveChordRef` returns a chord. Under `ALL_NOTES_KEY`, no
  slot is playable.
- `live` is a ref that the transport's `snapshot()` reads. An effect refreshes it after
  every render. `startFrom` also writes it directly, so a restart after a time-signature
  change uses the new timeline before React re-renders.
- `onChordChange` fires when the current slot changes. App passes `setSelectedChordRef`,
  so every view follows the progression. Stop does not touch the selection.
- Loop off: the transport calls `onEnd`, `isPlaying` becomes false, and the selection
  stays on the last chord.

- [ ] **Step 1: Write the failing test**

Create `src/useProgressionPlayer.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useProgressionPlayer } from "./useProgressionPlayer";
import { createFakeMetronome } from "./audio/testing";
import {
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  type StoredProgression,
} from "./theory/progressionStorage";
import type { ChordRef } from "./theory/harmony";

const F: ChordRef = { tier: "diatonic", degree: 4 };
const G: ChordRef = { tier: "diatonic", degree: 5 };
// Column 1 of the secondary tier is always null (spec §2), so this never resolves.
const NEVER: ChordRef = { tier: "secondary", degree: 1 };

function prime(patch: Partial<StoredProgression>) {
  localStorage.setItem(
    PROGRESSION_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_PROGRESSION, ...patch }),
  );
}

function setup(selectedKey = "C") {
  const metronome = createFakeMetronome();
  const onChordChange = vi.fn();
  const hook = renderHook(() =>
    useProgressionPlayer({
      selectedKey,
      mode: "ionian",
      rowMode: "triads",
      onChordChange,
      metronomeFactory: () => metronome,
    }),
  );
  return { ...hook, metronome, onChordChange };
}

beforeEach(() => {
  localStorage.clear();
});

describe("useProgressionPlayer — state", () => {
  it("loads the stored progression", () => {
    prime({ bpm: 140, slots: [{ id: "a", ref: F, bars: 2 }] });
    const { result } = setup();
    expect([result.current.state.bpm, result.current.state.slots.length]).toEqual([
      140, 1,
    ]);
  });

  it("saves edits to localStorage", () => {
    const { result } = setup();
    act(() => result.current.add(F));
    const stored = JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY) ?? "{}");
    expect(stored.slots[0].ref).toEqual(F);
  });

  it("resolves slots against the current key and mode", () => {
    const { result } = setup();
    act(() => result.current.add(F));
    act(() => result.current.add(NEVER));
    expect(result.current.resolvedSlots.map((r) => r.chord?.symbol ?? null)).toEqual([
      "F",
      null,
    ]);
  });

  it("setBpm clamps and forwards to the metronome", () => {
    const { result, metronome } = setup();
    act(() => result.current.setBpm(1000));
    expect([result.current.state.bpm, metronome.bpm]).toEqual([300, 300]);
  });
});

describe("useProgressionPlayer — playback", () => {
  it("cannot play when no slot resolves", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(NEVER));
    act(() => result.current.play());
    expect([result.current.canPlay, metronome.running]).toEqual([false, false]);
  });

  it("cannot play under the All key", () => {
    const { result } = setup("all");
    act(() => result.current.add(F));
    expect(result.current.canPlay).toBe(false);
  });

  it("announces the slot's chord when its first beat sounds", async () => {
    const { result, metronome, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    metronome.currentTime = 1;
    act(() => metronome.emit(0, 0.05));
    await waitFor(() => expect(onChordChange).toHaveBeenCalledWith(F));
    expect(result.current.currentSlot).toBe(0);
  });

  it("moves to the next slot after one bar of 4/4", async () => {
    const { result, metronome, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.add(G));
    act(() => result.current.play());
    metronome.currentTime = 10;
    act(() => {
      for (let beat = 0; beat <= 4; beat++) metronome.emit(beat, beat * 0.5);
    });
    await waitFor(() => expect(onChordChange).toHaveBeenLastCalledWith(G));
    expect(result.current.currentSlot).toBe(1);
  });

  it("jumpTo selects the chord without starting playback", () => {
    const { result, onChordChange } = setup();
    act(() => result.current.add(F));
    act(() => result.current.jumpTo(0));
    expect([onChordChange.mock.calls[0][0], result.current.isPlaying]).toEqual([
      F,
      false,
    ]);
  });

  it("jumpTo while playing restarts from that slot", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.add(G));
    act(() => result.current.play());
    act(() => result.current.jumpTo(1));
    expect(metronome.starts).toBe(2);
  });

  it("changing the time signature while playing restarts playback", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    act(() => result.current.setTimeSignature({ beats: 3, unit: 4 }));
    expect([metronome.starts, result.current.state.timeSignature.beats]).toEqual([
      2, 3,
    ]);
  });

  it("clear while playing stops", () => {
    const { result, metronome } = setup();
    act(() => result.current.add(F));
    act(() => result.current.play());
    act(() => result.current.clear());
    expect([result.current.isPlaying, metronome.running]).toEqual([false, false]);
  });

  it("toggle starts and stops", () => {
    const { result } = setup();
    act(() => result.current.add(F));
    act(() => result.current.toggle());
    const afterFirst = result.current.isPlaying;
    act(() => result.current.toggle());
    expect([afterFirst, result.current.isPlaying]).toEqual([true, false]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/useProgressionPlayer.test.ts` Expected: FAIL with
`Failed to resolve import "./useProgressionPlayer"`.

- [ ] **Step 3: Write the implementation**

Create `src/useProgressionPlayer.ts`:

```ts
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ALL_NOTES_KEY } from "./components/KeySelector";
import type { ChordRowMode } from "./theory/harmony";
import { createMetronome, type Metronome } from "./audio/metronome";
import { createTransport, type TransportSnapshot } from "./audio/transport";
import { resolveChordRef, type ChordRef, type MapChord } from "./theory/harmony";
import {
  buildTimeline,
  snapSlotLength,
  type TimeSignature,
  type TimelinePosition,
} from "./theory/meter";
import type { Mode } from "./theory/modes";
import {
  clampBpm,
  loadProgression,
  saveProgression,
  type ProgressionSlot,
  type StoredProgression,
} from "./theory/progressionStorage";
import { progressionReducer } from "./progressionReducer";

export type ResolvedSlot = { slot: ProgressionSlot; chord: MapChord | null };

export type UseProgressionPlayerOptions = {
  selectedKey: string;
  mode: Mode;
  rowMode: ChordRowMode;
  onChordChange: (ref: ChordRef) => void;
  metronomeFactory?: () => Metronome;
};

export type ProgressionPlayer = {
  state: StoredProgression;
  resolvedSlots: ResolvedSlot[];
  canPlay: boolean;
  isPlaying: boolean;
  currentSlot: number | null;
  nextSlot: number | null;
  beatInBar: number;
  add(ref: ChordRef): void;
  remove(id: string): void;
  move(from: number, to: number): void;
  setBars(id: string, bars: number): void;
  clear(): void;
  play(): void;
  stop(): void;
  toggle(): void;
  jumpTo(index: number): void;
  setBpm(bpm: number): void;
  setTimeSignature(sig: TimeSignature): void;
  setClick(enabled: boolean): void;
  setLoop(loop: boolean): void;
  setVisible(visible: boolean): void;
};

type PlaybackState = {
  isPlaying: boolean;
  currentSlotId: string | null;
  beatInBar: number;
};
type LiveState = TransportSnapshot & {
  playable: ProgressionSlot[];
  onChordChange: (ref: ChordRef) => void;
};

const IDLE: PlaybackState = { isPlaying: false, currentSlotId: null, beatInBar: 0 };

function createSlotId(): string {
  return `slot:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useProgressionPlayer({
  selectedKey,
  mode,
  rowMode,
  onChordChange,
  metronomeFactory = createMetronome,
}: UseProgressionPlayerOptions): ProgressionPlayer {
  const [state, dispatch] = useReducer(progressionReducer, undefined, loadProgression);
  const [transport] = useState(() => createTransport(metronomeFactory()));
  const [playback, setPlayback] = useState<PlaybackState>(IDLE);

  useEffect(() => {
    saveProgression(state);
  }, [state]);
  useEffect(() => () => transport.stop(), [transport]);

  const resolvedSlots = useMemo<ResolvedSlot[]>(
    () =>
      state.slots.map((slot) => ({
        slot,
        chord:
          selectedKey === ALL_NOTES_KEY
            ? null
            : resolveChordRef(slot.ref, selectedKey, mode, rowMode),
      })),
    [state.slots, selectedKey, mode, rowMode],
  );
  const playable = useMemo(
    () => resolvedSlots.filter((r) => r.chord !== null).map((r) => r.slot),
    [resolvedSlots],
  );
  const timeline = useMemo(
    () =>
      buildTimeline(
        playable.map((s) => s.bars),
        state.timeSignature,
      ),
    [playable, state.timeSignature],
  );

  // Read by the transport on every beat, so edits made mid-play take effect.
  const live = useRef<LiveState>({
    timeline,
    sig: state.timeSignature,
    loop: state.loop,
    playable,
    onChordChange,
  });
  useEffect(() => {
    live.current = {
      timeline,
      sig: state.timeSignature,
      loop: state.loop,
      playable,
      onChordChange,
    };
  }, [timeline, state.timeSignature, state.loop, playable, onChordChange]);
  const lastAnnounced = useRef<string | null>(null);

  const stop = useCallback(() => {
    transport.stop();
    setPlayback(IDLE);
  }, [transport]);

  const startFrom = useCallback(
    (slotId: string, sig: TimeSignature) => {
      const slots = playable.map((s) => ({ ...s, bars: snapSlotLength(s.bars, sig) }));
      if (slots.length === 0) {
        stop();
        return;
      }
      const startIndex = Math.max(
        0,
        slots.findIndex((s) => s.id === slotId),
      );
      const nextTimeline = buildTimeline(
        slots.map((s) => s.bars),
        sig,
      );
      live.current = { ...live.current, timeline: nextTimeline, sig, playable: slots };
      lastAnnounced.current = null;
      transport.start({
        bpm: state.bpm,
        click: state.click,
        startBeat: nextTimeline.starts[startIndex],
        snapshot: () => live.current,
        onPosition: (pos: TimelinePosition) => {
          const slot = live.current.playable[pos.slotIndex];
          if (!slot) return;
          setPlayback({
            isPlaying: true,
            currentSlotId: slot.id,
            beatInBar: pos.beatInBar,
          });
          if (lastAnnounced.current !== slot.id) {
            lastAnnounced.current = slot.id;
            live.current.onChordChange(slot.ref);
          }
        },
        onEnd: () => setPlayback((p) => ({ ...p, isPlaying: false })),
      });
      setPlayback({
        isPlaying: true,
        currentSlotId: slots[startIndex].id,
        beatInBar: 0,
      });
    },
    [playable, state.bpm, state.click, transport, stop],
  );

  const play = useCallback(() => {
    const first = playable[0];
    if (first) startFrom(first.id, state.timeSignature);
  }, [playable, startFrom, state.timeSignature]);

  const toggle = useCallback(() => {
    if (playback.isPlaying) stop();
    else play();
  }, [playback.isPlaying, play, stop]);

  const jumpTo = useCallback(
    (index: number) => {
      const target = resolvedSlots[index];
      if (!target || target.chord === null) return;
      onChordChange(target.slot.ref);
      if (playback.isPlaying) startFrom(target.slot.id, state.timeSignature);
    },
    [resolvedSlots, onChordChange, playback.isPlaying, startFrom, state.timeSignature],
  );

  const setTimeSignature = useCallback(
    (sig: TimeSignature) => {
      dispatch({ type: "set-time-signature", sig });
      if (!playback.isPlaying) return;
      const from = playback.currentSlotId ?? playable[0]?.id;
      if (from) startFrom(from, sig);
    },
    [playback.isPlaying, playback.currentSlotId, playable, startFrom],
  );

  const setBpm = useCallback(
    (bpm: number) => {
      const next = clampBpm(bpm);
      dispatch({ type: "set-bpm", bpm: next });
      transport.setBpm(next);
    },
    [transport],
  );

  const setClick = useCallback(
    (enabled: boolean) => {
      dispatch({ type: "set-click", enabled });
      transport.setClick(enabled);
    },
    [transport],
  );

  const clear = useCallback(() => {
    stop();
    dispatch({ type: "clear" });
  }, [stop]);

  const add = useCallback(
    (ref: ChordRef) => dispatch({ type: "add", id: createSlotId(), ref }),
    [],
  );
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const move = useCallback(
    (from: number, to: number) => dispatch({ type: "move", from, to }),
    [],
  );
  const setBars = useCallback(
    (id: string, bars: number) => dispatch({ type: "set-bars", id, bars }),
    [],
  );
  const setLoop = useCallback(
    (loop: boolean) => dispatch({ type: "set-loop", loop }),
    [],
  );
  const setVisible = useCallback(
    (visible: boolean) => dispatch({ type: "set-visible", visible }),
    [],
  );

  const currentIndex = playback.isPlaying
    ? state.slots.findIndex((s) => s.id === playback.currentSlotId)
    : -1;
  const playablePos = playable.findIndex((s) => s.id === playback.currentSlotId);
  const nextPlayable =
    currentIndex === -1 || playablePos === -1
      ? undefined
      : (playable[playablePos + 1] ?? (state.loop ? playable[0] : undefined));
  const nextIndex =
    nextPlayable && nextPlayable.id !== playback.currentSlotId
      ? state.slots.findIndex((s) => s.id === nextPlayable.id)
      : -1;

  return {
    state,
    resolvedSlots,
    canPlay: playable.length > 0,
    isPlaying: playback.isPlaying,
    currentSlot: currentIndex === -1 ? null : currentIndex,
    nextSlot: nextIndex === -1 ? null : nextIndex,
    beatInBar: playback.beatInBar,
    add,
    remove,
    move,
    setBars,
    clear,
    play,
    stop,
    toggle,
    jumpTo,
    setBpm,
    setTimeSignature,
    setClick,
    setLoop,
    setVisible,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/useProgressionPlayer.test.ts` Expected: PASS.

If `npm run lint` (Step 5) reports a `react-hooks/*` compiler rule on this file, fix the
code; do not add a disable comment. The usual causes and fixes:

- A ref read during render: move it into a callback or effect.
- setState in an effect body: move it into the event handler.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write src/useProgressionPlayer.ts src/useProgressionPlayer.test.ts
npx tsc -b
npm test
git add src/useProgressionPlayer.ts src/useProgressionPlayer.test.ts
git commit -m "feat: useProgressionPlayer hook with persistence and live chord sync"
```

---

### Task 7: Transport controls (`src/components/TransportControls.tsx`)

**Files:**

- Create: `src/components/TransportControls.tsx`
- Test: `src/components/TransportControls.test.tsx`

**Interfaces:**

- Consumes: from Task 1, `TIME_SIGNATURE_PRESETS`, `timeSignatureLabel` and
  `TimeSignature`. From Task 2, `BPM_MIN`, `BPM_MAX` and `clampBpm`.
- Produces: `TransportControls(props: TransportControlsProps)`, where
  `TransportControlsProps` has:
  - `isPlaying: boolean`
  - `canPlay: boolean`
  - `disabled: boolean`
  - `hasSlots: boolean`
  - `bpm: number`
  - `timeSignature: TimeSignature`
  - `click: boolean`
  - `loop: boolean`
  - `onTogglePlay: () => void`
  - `onBpmChange: (bpm: number) => void`
  - `onTimeSignatureChange: (sig: TimeSignature) => void`
  - `onClickChange: (enabled: boolean) => void`
  - `onLoopChange: (loop: boolean) => void`
  - `onClear: () => void`

  Accessible names:
  - the `Play`/`Stop` button
  - the spinbutton `BPM`
  - the combobox `Time signature`
  - the toggles `Click` and `Loop` (`aria-pressed`)
  - the `Clear` button

**BPM input:** it keeps a local draft string so typing is not clamped mid-entry. It
commits on blur or Enter, clamps the value and writes the clamped value back. Empty or
non-numeric input reverts. The parent mounts it with `key={bpm}`, so external changes
(load, clamp) reset the draft without a set-state-in-effect.

- [ ] **Step 1: Write the failing test**

Create `src/components/TransportControls.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransportControls } from "./TransportControls";
import { TIME_SIGNATURE_PRESETS, timeSignatureLabel } from "../theory/meter";

function renderControls(
  overrides: Partial<Parameters<typeof TransportControls>[0]> = {},
) {
  const props = {
    isPlaying: false,
    canPlay: true,
    disabled: false,
    hasSlots: true,
    bpm: 90,
    timeSignature: { beats: 4, unit: 4 } as const,
    click: false,
    loop: true,
    onTogglePlay: vi.fn(),
    onBpmChange: vi.fn(),
    onTimeSignatureChange: vi.fn(),
    onClickChange: vi.fn(),
    onLoopChange: vi.fn(),
    onClear: vi.fn(),
    ...overrides,
  };
  render(<TransportControls {...props} />);
  return props;
}

describe("TransportControls — play", () => {
  it("disables Play when nothing can be played", () => {
    renderControls({ canPlay: false });
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  it("shows Stop while playing", () => {
    renderControls({ isPlaying: true });
    expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled();
  });

  it("disables everything when the panel is disabled", () => {
    renderControls({ disabled: true });
    expect(screen.getByRole("spinbutton", { name: "BPM" })).toBeDisabled();
  });

  it("calls onTogglePlay", async () => {
    const props = renderControls();
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(props.onTogglePlay).toHaveBeenCalledTimes(1);
  });
});

describe("TransportControls — BPM", () => {
  it("does not commit while typing", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, "12");
    expect(props.onBpmChange).not.toHaveBeenCalled();
  });

  it("commits on blur", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, "120");
    await userEvent.tab();
    expect(props.onBpmChange).toHaveBeenCalledWith(120);
  });

  it("commits on Enter", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, "150{Enter}");
    expect(props.onBpmChange).toHaveBeenCalledWith(150);
  });

  it.each([
    ["5", 30],
    ["999", 300],
  ])("clamps %s to %d", async (typed, expected) => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.type(input, typed);
    await userEvent.tab();
    expect([
      props.onBpmChange.mock.calls[0][0],
      (input as HTMLInputElement).value,
    ]).toEqual([expected, String(expected)]);
  });

  it("reverts an empty value", async () => {
    const props = renderControls();
    const input = screen.getByRole("spinbutton", { name: "BPM" });
    await userEvent.clear(input);
    await userEvent.tab();
    expect([
      props.onBpmChange.mock.calls.length,
      (input as HTMLInputElement).value,
    ]).toEqual([0, "90"]);
  });
});

describe("TransportControls — time signature", () => {
  it("offers every preset", () => {
    renderControls();
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(
      TIME_SIGNATURE_PRESETS.map(timeSignatureLabel),
    );
  });

  // Start each case from a *different* preset so the selection is a real change.
  it.each(
    TIME_SIGNATURE_PRESETS.map(
      (p, i, all) => [timeSignatureLabel(p), p, all[(i + 1) % all.length]] as const,
    ),
  )("selecting %s reports that preset", async (label, preset, initial) => {
    const props = renderControls({ timeSignature: initial });
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Time signature" }),
      label,
    );
    expect(props.onTimeSignatureChange).toHaveBeenLastCalledWith(preset);
  });
});

describe("TransportControls — toggles", () => {
  it("Click reflects state and toggles", async () => {
    const props = renderControls({ click: false });
    const button = screen.getByRole("button", { name: "Click" });
    await userEvent.click(button);
    expect([
      button.getAttribute("aria-pressed"),
      props.onClickChange.mock.calls[0][0],
    ]).toEqual(["false", true]);
  });

  it("Loop reflects state and toggles", async () => {
    const props = renderControls({ loop: true });
    const button = screen.getByRole("button", { name: "Loop" });
    await userEvent.click(button);
    expect([
      button.getAttribute("aria-pressed"),
      props.onLoopChange.mock.calls[0][0],
    ]).toEqual(["true", false]);
  });

  it("Clear is disabled without slots", () => {
    renderControls({ hasSlots: false });
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });
});
```

Note on the `selectOptions` case: each row starts from the next preset in the registry,
so every preset is reached through a real change event.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/TransportControls.test.tsx` Expected: FAIL with
`Failed to resolve import "./TransportControls"`.

- [ ] **Step 3: Write the implementation**

Create `src/components/TransportControls.tsx`:

```tsx
import { useState } from "react";
import {
  TIME_SIGNATURE_PRESETS,
  timeSignatureLabel,
  type TimeSignature,
} from "../theory/meter";
import { BPM_MAX, BPM_MIN, clampBpm } from "../theory/progressionStorage";

type TransportControlsProps = {
  isPlaying: boolean;
  canPlay: boolean;
  disabled: boolean;
  hasSlots: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  click: boolean;
  loop: boolean;
  onTogglePlay: () => void;
  onBpmChange: (bpm: number) => void;
  onTimeSignatureChange: (sig: TimeSignature) => void;
  onClickChange: (enabled: boolean) => void;
  onLoopChange: (loop: boolean) => void;
  onClear: () => void;
};

const BUTTON =
  "px-3 py-1.5 pointer-coarse:py-3 rounded text-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
const LABEL = "flex items-center gap-2 text-xs text-fg-muted uppercase tracking-wide";
const FIELD =
  "px-2 py-1 rounded border border-line bg-surface-raised text-fg-primary text-sm disabled:opacity-40";

function toggleClass(on: boolean): string {
  return `${BUTTON} ${on ? "bg-surface-active text-fg-emphasis" : "bg-surface-raised text-fg-muted hover:text-fg-secondary"}`;
}

type BpmInputProps = {
  bpm: number;
  disabled: boolean;
  onCommit: (bpm: number) => void;
};

function BpmInput({ bpm, disabled, onCommit }: BpmInputProps) {
  const [draft, setDraft] = useState(String(bpm));

  function commit() {
    const parsed = Number(draft);
    if (draft.trim() === "" || !Number.isFinite(parsed)) {
      setDraft(String(bpm));
      return;
    }
    const next = clampBpm(parsed);
    setDraft(String(next));
    onCommit(next);
  }

  return (
    <label className={LABEL}>
      BPM
      <input
        type="number"
        min={BPM_MIN}
        max={BPM_MAX}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`w-16 ${FIELD}`}
      />
    </label>
  );
}

export function TransportControls(props: TransportControlsProps) {
  const { isPlaying, canPlay, disabled, hasSlots, bpm, timeSignature, click, loop } =
    props;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-4">
      <button
        type="button"
        onClick={props.onTogglePlay}
        disabled={disabled || (!isPlaying && !canPlay)}
        className={`${BUTTON} min-w-[4.5rem] bg-surface-active text-fg-emphasis hover:bg-surface-raised`}
      >
        {isPlaying ? "Stop" : "Play"}
      </button>
      <BpmInput key={bpm} bpm={bpm} disabled={disabled} onCommit={props.onBpmChange} />
      <label className={LABEL}>
        Time
        <select
          aria-label="Time signature"
          value={timeSignatureLabel(timeSignature)}
          disabled={disabled}
          onChange={(e) => {
            const sig = TIME_SIGNATURE_PRESETS.find(
              (p) => timeSignatureLabel(p) === e.target.value,
            );
            if (sig) props.onTimeSignatureChange(sig);
          }}
          className={FIELD}
        >
          {TIME_SIGNATURE_PRESETS.map((p) => {
            const label = timeSignatureLabel(p);
            return (
              <option key={label} value={label}>
                {label}
              </option>
            );
          })}
        </select>
      </label>
      <button
        type="button"
        aria-pressed={click}
        disabled={disabled}
        onClick={() => props.onClickChange(!click)}
        className={toggleClass(click)}
      >
        Click
      </button>
      <button
        type="button"
        aria-pressed={loop}
        disabled={disabled}
        onClick={() => props.onLoopChange(!loop)}
        className={toggleClass(loop)}
      >
        Loop
      </button>
      <button
        type="button"
        onClick={props.onClear}
        disabled={disabled || !hasSlots}
        className={`${BUTTON} text-fg-muted hover:text-fg-secondary`}
      >
        Clear
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/TransportControls.test.tsx` Expected: PASS.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write src/components/TransportControls.tsx src/components/TransportControls.test.tsx
npx tsc -b
npm test
git add src/components/TransportControls.tsx src/components/TransportControls.test.tsx
git commit -m "feat: transport controls for the progression player"
```

---

### Task 8: Progression panel with dnd-kit (`ProgressionPanel`, `ProgressionSlotCard`)

**Files:**

- Modify: `package.json` and `package-lock.json` (via `npm install`)
- Create: `src/components/ProgressionSlotCard.tsx`
- Create: `src/components/ProgressionPanel.tsx`
- Test: `src/components/ProgressionPanel.test.tsx`

**Interfaces:**

- Consumes:
  - From Task 6: `ProgressionPlayer`, `useProgressionPlayer` (test harness).
  - From Task 7: `TransportControls`.
  - From Task 1: `allowedSlotLengths`.
  - From Task 2: `ProgressionSlot`.
  - From Task 4: `FakeAudioContext`.
  - From PR 1: `MapChord`, `ALL_NOTES_KEY`.
- Produces:
  - `ProgressionPanel({ player, disabled }: { player: ProgressionPlayer; disabled: boolean })`.
    It renders `null` when `player.state.visible` is false. Otherwise it renders a
    `<section aria-label="Progression">`.
  - `ProgressionSlotCard(props)`. Each card is an
    `<li data-testid="progression-slot" data-index data-current>` containing four
    controls:
    - the drag handle, `button "Reorder <symbol>"` (dnd-kit activator)
    - the select button, `button "Select <symbol>"`
    - the length stepper, `button "Shorter <symbol>"` / `button "Longer <symbol>"`, with
      the label `½ bar` / `1 bar` / `N bars`
    - the remove button, `button "Remove <symbol> from progression"`

**Why a drag handle:** dnd-kit's `KeyboardSensor` starts a drag on Space/Enter from
whichever node holds the listeners. If the whole card held them, pressing Space on the
card's inner −/+/× buttons would start a drag. Putting `listeners`, `attributes` and
`setActivatorNodeRef` on a dedicated handle avoids that. The PointerSensor still uses a
5 px activation distance as the spec requires. The card's `setNodeRef` stays on the
`<li>`.

- [ ] **Step 1: Install dnd-kit**

```bash
npm install @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2
```

Expected: `package.json` `dependencies` gains the three packages. Confirm with
`git diff package.json`.

- [ ] **Step 2: Write the failing test**

Create `src/components/ProgressionPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressionPanel } from "./ProgressionPanel";
import { ALL_NOTES_KEY } from "./KeySelector";
import { useProgressionPlayer } from "../useProgressionPlayer";
import { FakeAudioContext } from "../audio/testing";
import {
  DEFAULT_PROGRESSION,
  PROGRESSION_STORAGE_KEY,
  type StoredProgression,
} from "../theory/progressionStorage";
import {
  TIME_SIGNATURE_PRESETS,
  allowedSlotLengths,
  timeSignatureLabel,
} from "../theory/meter";

const barsLabel = (b: number) =>
  b === 0.5 ? "½ bar" : b === 1 ? "1 bar" : `${b} bars`;

function prime(patch: Partial<StoredProgression>) {
  localStorage.setItem(
    PROGRESSION_STORAGE_KEY,
    JSON.stringify({ ...DEFAULT_PROGRESSION, ...patch }),
  );
}

function Harness({ selectedKey = "C" }: { selectedKey?: string }) {
  const player = useProgressionPlayer({
    selectedKey,
    mode: "ionian",
    rowMode: "triads",
    onChordChange: () => {},
  });
  return (
    <>
      <button type="button" onClick={() => player.add({ tier: "diatonic", degree: 4 })}>
        Add F
      </button>
      <ProgressionPanel player={player} disabled={selectedKey === ALL_NOTES_KEY} />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("AudioContext", FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProgressionPanel — slots", () => {
  it("shows the empty state", () => {
    render(<Harness />);
    expect(
      screen.getByText("Click ＋ on a chord below to start a progression"),
    ).toBeInTheDocument();
  });

  it("adds a slot", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add F" }));
    expect(screen.getByRole("button", { name: "Select F" })).toBeInTheDocument();
  });

  it("removes a slot", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add F" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Remove F from progression" }),
    );
    expect(screen.queryByRole("button", { name: "Select F" })).not.toBeInTheDocument();
  });

  it("greys out a slot that is not on the map", () => {
    prime({ slots: [{ id: "x", ref: { tier: "secondary", degree: 1 }, bars: 1 }] });
    render(<Harness />);
    expect(screen.getByTestId("progression-slot")).toHaveAttribute(
      "title",
      "Not available in this mode",
    );
  });
});

describe.each(TIME_SIGNATURE_PRESETS.map((p) => [timeSignatureLabel(p), p] as const))(
  "length stepper in %s",
  (_label, preset) => {
    const allowed = allowedSlotLengths(preset);

    beforeEach(() => {
      prime({
        timeSignature: preset,
        slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }],
      });
    });

    it("stops at the shortest allowed length", async () => {
      render(<Harness />);
      const shorter = screen.getByRole("button", { name: "Shorter F" });
      while (!(shorter as HTMLButtonElement).disabled) await userEvent.click(shorter);
      expect(screen.getByText(barsLabel(allowed[0]))).toBeInTheDocument();
    });

    it("stops at the longest allowed length", async () => {
      render(<Harness />);
      const longer = screen.getByRole("button", { name: "Longer F" });
      while (!(longer as HTMLButtonElement).disabled) await userEvent.click(longer);
      expect(
        screen.getByText(barsLabel(allowed[allowed.length - 1])),
      ).toBeInTheDocument();
    });
  },
);

describe("ProgressionPanel — transport and visibility", () => {
  it("disables Play when nothing can be played", () => {
    prime({ slots: [{ id: "x", ref: { tier: "secondary", degree: 1 }, bars: 1 }] });
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });

  it("plays with a stubbed AudioContext", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Add F" }));
    await userEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("renders nothing when hidden", () => {
    prime({ visible: false });
    render(<Harness />);
    expect(
      screen.queryByRole("region", { name: "Progression" }),
    ).not.toBeInTheDocument();
  });

  it("shows a hint under the All key", () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect(
      screen.getByText("Pick a key to build and play a progression."),
    ).toBeInTheDocument();
  });

  it("disables Play under the All key", () => {
    prime({ slots: [{ id: "f", ref: { tier: "diatonic", degree: 4 }, bars: 1 }] });
    render(<Harness selectedKey={ALL_NOTES_KEY} />);
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/components/ProgressionPanel.test.tsx` Expected: FAIL with
`Failed to resolve import "./ProgressionPanel"`.

- [ ] **Step 4: Write `ProgressionSlotCard`**

Create `src/components/ProgressionSlotCard.tsx`:

```tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MapChord } from "../theory/harmony";
import type { ProgressionSlot } from "../theory/progressionStorage";

type ProgressionSlotCardProps = {
  slot: ProgressionSlot;
  chord: MapChord | null;
  index: number;
  allowedLengths: readonly number[];
  isCurrent: boolean;
  isNext: boolean;
  beatInBar: number;
  beatsPerBar: number;
  disabled: boolean;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onSetBars: (id: string, bars: number) => void;
};

const ICON_BUTTON =
  "px-1.5 rounded text-fg-muted hover:text-fg-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

function formatBars(bars: number): string {
  if (bars === 0.5) return "½ bar";
  return bars === 1 ? "1 bar" : `${bars} bars`;
}

function frameClass(isCurrent: boolean, isNext: boolean): string {
  if (isCurrent) return "border-line-selected ring-2 ring-selection ring-inset";
  if (isNext) return "border-dashed border-line-hover";
  return "border-line";
}

export function ProgressionSlotCard({
  slot,
  chord,
  index,
  allowedLengths,
  isCurrent,
  isNext,
  beatInBar,
  beatsPerBar,
  disabled,
  onSelect,
  onRemove,
  onSetBars,
}: ProgressionSlotCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id, disabled });
  const playable = chord !== null;
  const label = chord?.symbol ?? "—";
  const lengthIndex = allowedLengths.indexOf(slot.bars);

  return (
    <li
      ref={setNodeRef}
      // Accepted inline-style exception: dnd-kit computes the drag transform at
      // runtime (same precedent as the ChordMap mode-toggle indicator).
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="progression-slot"
      data-index={index}
      data-current={isCurrent}
      title={playable ? undefined : "Not available in this mode"}
      className={`flex flex-col gap-1 min-w-[6.5rem] p-2 rounded-xl border-2 bg-surface-raised ${frameClass(isCurrent, isNext)} ${playable ? "" : "opacity-40"} ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${label}`}
          className={`${ICON_BUTTON} touch-none cursor-grab`}
        >
          ⠿
        </button>
        <button
          type="button"
          aria-label={`Remove ${label} from progression`}
          onClick={() => onRemove(slot.id)}
          className={ICON_BUTTON}
        >
          ×
        </button>
      </div>
      <button
        type="button"
        aria-label={`Select ${label}`}
        disabled={!playable || disabled}
        onClick={() => onSelect(index)}
        className="flex flex-col items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="text-xs text-fg-muted font-mono font-semibold">
          {chord?.romanNumeral ?? ""}
        </span>
        <span className="text-lg font-bold text-fg-emphasis leading-none">{label}</span>
      </button>
      <div className="flex items-center justify-between gap-1 text-xs text-fg-secondary">
        <button
          type="button"
          aria-label={`Shorter ${label}`}
          disabled={lengthIndex <= 0}
          onClick={() => onSetBars(slot.id, allowedLengths[lengthIndex - 1])}
          className={ICON_BUTTON}
        >
          −
        </button>
        <span>{formatBars(slot.bars)}</span>
        <button
          type="button"
          aria-label={`Longer ${label}`}
          disabled={lengthIndex === -1 || lengthIndex >= allowedLengths.length - 1}
          onClick={() => onSetBars(slot.id, allowedLengths[lengthIndex + 1])}
          className={ICON_BUTTON}
        >
          +
        </button>
      </div>
      {isCurrent && (
        <div className="flex justify-center gap-1" aria-hidden="true">
          {Array.from({ length: beatsPerBar }, (_, i) => (
            <span
              key={i}
              className={`size-1.5 rounded-full ${i === beatInBar ? "bg-fg-emphasis" : "bg-line-emphasis"}`}
            />
          ))}
        </div>
      )}
    </li>
  );
}
```

- [ ] **Step 5: Write `ProgressionPanel`**

Create `src/components/ProgressionPanel.tsx`:

```tsx
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { allowedSlotLengths } from "../theory/meter";
import type { ProgressionPlayer } from "../useProgressionPlayer";
import { ProgressionSlotCard } from "./ProgressionSlotCard";
import { TransportControls } from "./TransportControls";

type ProgressionPanelProps = { player: ProgressionPlayer; disabled: boolean };

const HINT = "text-sm text-fg-muted";

export function ProgressionPanel({ player, disabled }: ProgressionPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { state, resolvedSlots } = player;
  if (!state.visible) return null;

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = state.slots.findIndex((s) => s.id === active.id);
    const to = state.slots.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) player.move(from, to);
  }

  const allowed = allowedSlotLengths(state.timeSignature);

  return (
    <section
      aria-label="Progression"
      className="mt-4 md:mt-8 p-3 rounded-xl border border-line space-y-3"
    >
      <TransportControls
        isPlaying={player.isPlaying}
        canPlay={player.canPlay}
        disabled={disabled}
        hasSlots={state.slots.length > 0}
        bpm={state.bpm}
        timeSignature={state.timeSignature}
        click={state.click}
        loop={state.loop}
        onTogglePlay={player.toggle}
        onBpmChange={player.setBpm}
        onTimeSignatureChange={player.setTimeSignature}
        onClickChange={player.setClick}
        onLoopChange={player.setLoop}
        onClear={player.clear}
      />
      {disabled ? (
        <p className={HINT}>Pick a key to build and play a progression.</p>
      ) : resolvedSlots.length === 0 ? (
        <p className={HINT}>Click ＋ on a chord below to start a progression</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={state.slots.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <ol className="flex gap-2 overflow-x-auto pb-1">
              {resolvedSlots.map(({ slot, chord }, index) => (
                <ProgressionSlotCard
                  key={slot.id}
                  slot={slot}
                  chord={chord}
                  index={index}
                  allowedLengths={allowed}
                  isCurrent={player.currentSlot === index}
                  isNext={player.nextSlot === index}
                  beatInBar={player.beatInBar}
                  beatsPerBar={state.timeSignature.beats}
                  disabled={disabled}
                  onSelect={player.jumpTo}
                  onRemove={player.remove}
                  onSetBars={player.setBars}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/components/ProgressionPanel.test.tsx` Expected: PASS.

If dnd-kit throws in jsdom with `ResizeObserver is not defined`, add this stub to
`vitest.setup.ts`, below the `matchMedia` stub, and re-run:

```ts
if (typeof window !== "undefined" && typeof window.ResizeObserver !== "function") {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
```

- [ ] **Step 7: Verify and commit**

```bash
npm run lint
npx prettier --write src/components/ProgressionPanel.tsx src/components/ProgressionSlotCard.tsx src/components/ProgressionPanel.test.tsx package.json
npx tsc -b
npm test
git add package.json package-lock.json src/components/ProgressionPanel.tsx src/components/ProgressionSlotCard.tsx src/components/ProgressionPanel.test.tsx vitest.setup.ts
git commit -m "feat: progression panel with sortable slot strip (dnd-kit)"
```

---

### Task 9: Wire into App — panel placement, ＋, visibility toggle, Space

**Files:**

- Modify: `src/components/ChordMap.tsx` (add the `progressionVisible?` and
  `onToggleProgression?` props and the `Progression` button next to the
  `role="radiogroup" aria-label="Chord row mode"` element)
- Modify: `src/components/ChordMap.test.tsx` (created by PR 1)
- Modify: `src/App.tsx` (imports; the hook after `selectedChordRef` state; a shared
  `chordArea` above `renderView()`; the three `<ChordMap … />` sites; a new Space effect
  after the existing keyboard effect)
- Modify: `src/App.test.tsx`

**Interfaces:**

- Consumes: from Task 6, `useProgressionPlayer`. From Task 8, `ProgressionPanel`. From
  Task 4, `FakeAudioContext`. From PR 1, `ChordMap` and `setSelectedChordRef`.
- Produces: `ChordMap` gains two optional props, `progressionVisible?: boolean` and
  `onToggleProgression?: () => void`. The toggle renders only when `onToggleProgression`
  is set.

**Space rule:** Space is ignored with meta/ctrl/alt, and when the target is an `input`,
`textarea`, `select` or `button`. The spec's list (inputs, textareas, selects) is
extended to buttons for three reasons:

- A focused button already activates on Space. With focus on Play, Space would otherwise
  toggle twice.
- dnd-kit's drag handle uses Space to pick up a card.
- A focused chord card would be clicked and toggled at the same time.

The existing 1–7/t/s handler is left untouched.

- [ ] **Step 1: Write the failing ChordMap test**

Append to `src/components/ChordMap.test.tsx`. If PR 1's test file does not already
import `vi` (from `vitest`), `render` and `screen` (from `@testing-library/react`),
`userEvent` (from `@testing-library/user-event`) and `ChordMap`, add those imports:

```tsx
describe("ChordMap — progression toggle", () => {
  function renderMap(extra: Partial<Parameters<typeof ChordMap>[0]> = {}) {
    render(
      <ChordMap
        selectedKey="C"
        modalMode="ionian"
        rowMode="triads"
        onRowModeChange={() => {}}
        selectedRef={null}
        onSelect={() => {}}
        {...extra}
      />,
    );
  }

  it("is absent without onToggleProgression", () => {
    renderMap();
    expect(
      screen.queryByRole("button", { name: "Progression" }),
    ).not.toBeInTheDocument();
  });

  it("reflects visibility with aria-pressed", () => {
    renderMap({ progressionVisible: true, onToggleProgression: () => {} });
    expect(screen.getByRole("button", { name: "Progression" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onToggleProgression", async () => {
    const onToggle = vi.fn();
    renderMap({ progressionVisible: false, onToggleProgression: onToggle });
    await userEvent.click(screen.getByRole("button", { name: "Progression" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ChordMap.test.tsx` Expected: FAIL. The three new
tests fail because no `Progression` button exists and the props type rejects
`progressionVisible`.

- [ ] **Step 3: Add the toggle to `ChordMap`**

In `src/components/ChordMap.tsx`, add the two props to `ChordMapProps`:

```ts
  progressionVisible?: boolean;
  onToggleProgression?: () => void;
```

Destructure them in the component signature as
`progressionVisible = false, onToggleProgression`. Make sure the element that wraps the
`role="radiogroup" aria-label="Chord row mode"` toggle is a flex row with `gap-2`, e.g.
`className="flex items-center justify-start gap-2 mb-3"`. Then add this button
immediately after the radiogroup, inside that row:

```tsx
{
  onToggleProgression && (
    <button
      type="button"
      aria-pressed={progressionVisible}
      onClick={onToggleProgression}
      className={`px-2 py-1.5 md:px-3 md:py-2.5 pointer-coarse:py-3 rounded border border-line text-xs md:text-sm font-semibold cursor-pointer ${
        progressionVisible
          ? "bg-surface-active text-fg-emphasis"
          : "text-fg-muted hover:text-fg-secondary"
      }`}
    >
      Progression
    </button>
  );
}
```

Run: `npx vitest run src/components/ChordMap.test.tsx` Expected: PASS.

- [ ] **Step 4: Write the failing App tests**

In `src/App.test.tsx`:

- Add `vi` to the `vitest` import.
- Add `import { FakeAudioContext } from "./audio/testing";` and
  `import { PROGRESSION_STORAGE_KEY } from "./theory/progressionStorage";`.
- Append:

```tsx
describe("App — progression player", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("AudioContext", FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function addF() {
    await userEvent.click(screen.getByRole("button", { name: "Add F to progression" }));
  }

  function blurActive() {
    (document.activeElement as HTMLElement | null)?.blur();
  }

  it("＋ on a chord card adds it to the progression", async () => {
    render(<App />);
    await addF();
    expect(screen.getByRole("button", { name: "Select F" })).toBeInTheDocument();
  });

  it("clicking a slot selects its chord on the map", async () => {
    const { container } = render(<App />);
    await addF();
    await userEvent.click(screen.getByRole("button", { name: "Select F" }));
    expect(
      container.querySelector(
        '[data-testid="chord-card"][data-tier="diatonic"][data-degree="4"]',
      ),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("the Progression toggle hides the panel and the ＋ buttons", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Progression" }));
    expect([
      screen.queryByRole("region", { name: "Progression" }),
      screen.queryByRole("button", { name: "Add F to progression" }),
    ]).toEqual([null, null]);
  });

  it("persists the hidden state", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole("button", { name: "Progression" }));
    const stored = JSON.parse(localStorage.getItem(PROGRESSION_STORAGE_KEY) ?? "{}");
    expect(stored.visible).toBe(false);
  });

  it("Space toggles playback", async () => {
    render(<App />);
    await addF();
    blurActive();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });

  it("Space on the focused Play button toggles exactly once", async () => {
    render(<App />);
    await addF();
    screen.getByRole("button", { name: "Play" }).focus();
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("Space in the BPM field does not toggle playback", async () => {
    render(<App />);
    await addF();
    await userEvent.click(screen.getByRole("spinbutton", { name: "BPM" }));
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
  });
});
```

Also add `afterEach` to the `vitest` import.

- [ ] **Step 5: Run them to verify they fail**

Run: `npx vitest run src/App.test.tsx` Expected: the new tests FAIL (no "Add F to
progression" button because `onAdd` is not wired, and no `Progression` region). The
existing tests still pass.

- [ ] **Step 6: Wire App**

In `src/App.tsx`:

1. Add imports:

```ts
import { ProgressionPanel } from "./components/ProgressionPanel";
import { useProgressionPlayer } from "./useProgressionPlayer";
```

2. Directly after PR 1's `selectedChordRef` / `chordRowMode` state declarations, add:

```ts
const player = useProgressionPlayer({
  selectedKey,
  mode,
  rowMode: chordRowMode,
  onChordChange: setSelectedChordRef,
});
const togglePlayback = player.toggle;
```

3. Directly after the existing 1–7/t/s keyboard `useEffect`, add:

```ts
// Space toggles the progression player. Ignored in form fields and on
// buttons (a focused button already activates on Space, and dnd-kit's drag
// handle uses Space to pick up a card).
useEffect(() => {
  function handleSpace(e: KeyboardEvent) {
    if (e.key !== " ") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = e.target;
    if (
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement ||
      t instanceof HTMLButtonElement
    ) {
      return;
    }
    e.preventDefault();
    togglePlayback();
  }
  window.addEventListener("keydown", handleSpace);
  return () => window.removeEventListener("keydown", handleSpace);
}, [togglePlayback]);
```

4. Directly above `function renderView()` (after `const isAllNotesKey = …`), add the
   shared chord area. Keep `selectedRef` / `onSelect` / `onRowModeChange` exactly as PR
   1 passes them. Confirm with `grep -n "<ChordMap" -A9 src/App.tsx`.

```tsx
// Progression panel sits between the view (which ends with its Legend) and
// the chord map, identically in every view.
const chordArea = (
  <>
    <ProgressionPanel player={player} disabled={isAllNotesKey} />
    <ChordMap
      selectedKey={selectedKey}
      modalMode={mode}
      rowMode={chordRowMode}
      onRowModeChange={setChordRowMode}
      selectedRef={selectedChordRef}
      onSelect={handleChordSelect}
      onAdd={player.state.visible ? player.add : undefined}
      progressionVisible={player.state.visible}
      onToggleProgression={() => player.setVisible(!player.state.visible)}
    />
  </>
);
```

5. In `renderView()`, replace each of the three `<ChordMap … />` elements (note-map,
   scale-positions and chord-shapes cases) with `{chordArea}`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/App.test.tsx src/components/ChordMap.test.tsx` Expected: PASS.

- [ ] **Step 8: Manual smoke check**

Open the user's already-running dev server at `http://localhost:5173` (do not start or
kill Vite; if it isn't running, ask the user). Check the following:

- Add C, Am, F and G.
- Play at 120 BPM with Click on. Clicks are accented, the fretboard follows the chords,
  and the next card is outlined.
- Drag a card by its handle.
- Toggle Progression off and on.
- Reload, and the progression is kept.

- [ ] **Step 9: Verify and commit**

```bash
npm run lint
npx prettier --write src/App.tsx src/App.test.tsx src/components/ChordMap.tsx src/components/ChordMap.test.tsx
npx tsc -b
npm test
git add src/App.tsx src/App.test.tsx src/components/ChordMap.tsx src/components/ChordMap.test.tsx
git commit -m "feat: wire progression player into App (panel, ＋, toggle, Space)"
```

---

### Task 10: E2E coverage and docs

**Files:**

- Create: `tests/e2e/progression.spec.ts`
- Modify: `README.md` (a new `## Progression player` section before
  `## Keyboard shortcuts`, and a `Space` row in the shortcuts table)
- Modify: `docs/design/2026-05-05-app-vision-and-view-designs.md` (only if PR 1 did not
  already add the "Future" entry pointing to the spec)

**Interfaces:**

- Consumes the test hooks from Tasks 8 and 9 and PR 1:
  - `progression-slot[data-index][data-current]`
  - `chord-card[data-degree][aria-pressed]`
  - the buttons `Add <symbol> to progression`, `Reorder <symbol>`, `Play` and `Stop`
  - the spinbutton `BPM`
- Produces: nothing consumed by code.

- [ ] **Step 1: Write the E2E spec**

Create `tests/e2e/progression.spec.ts`:

```ts
import { test, expect, type Page } from "@playwright/test";

// C major triads: F, G and Am are unique on the chord map (C also appears as
// V/IV, so it is avoided here).
async function addChords(page: Page, symbols: readonly string[]) {
  for (const symbol of symbols) {
    await page
      .getByRole("button", { name: `Add ${symbol} to progression`, exact: true })
      .click();
  }
}

async function setBpm(page: Page, bpm: number) {
  const input = page.getByRole("spinbutton", { name: "BPM" });
  await input.fill(String(bpm));
  await input.press("Enter");
}

const selectedCard = (page: Page) =>
  page.locator('[data-testid="chord-card"][aria-pressed="true"]');

test.describe("progression player", () => {
  test("plays through the progression and drives the chord selection", async ({
    page,
  }) => {
    await page.goto("/");
    await addChords(page, ["F", "G", "Am"]);
    await setBpm(page, 300);
    await page.getByRole("button", { name: "Play" }).click();

    const slots = page.getByTestId("progression-slot");
    await expect(slots.nth(0)).toHaveAttribute("data-current", "true");
    await expect(selectedCard(page)).toHaveAttribute("data-degree", "4");

    // 300 BPM, 4/4, 1 bar per slot → 0.8 s per chord.
    await expect(slots.nth(1)).toHaveAttribute("data-current", "true", {
      timeout: 5000,
    });
    await expect(selectedCard(page)).toHaveAttribute("data-degree", "5");

    await page.getByRole("button", { name: "Stop" }).click();
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
  });

  test("drags the third slot to the first position", async ({ page }) => {
    await page.goto("/");
    await addChords(page, ["F", "G", "Am"]);

    // dnd-kit keyboard drag: deterministic, and exercises the KeyboardSensor.
    await page.getByRole("button", { name: "Reorder Am" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Space");

    await expect(page.getByTestId("progression-slot").nth(0)).toContainText("Am");
  });

  test("keeps the progression and BPM across a reload", async ({ page }) => {
    await page.goto("/");
    await addChords(page, ["F", "G", "Am"]);
    await setBpm(page, 150);

    await page.reload();

    await expect(page.getByTestId("progression-slot")).toHaveCount(3);
    await expect(page.getByTestId("progression-slot").nth(2)).toContainText("Am");
    await expect(page.getByRole("spinbutton", { name: "BPM" })).toHaveValue("150");
  });
});
```

- [ ] **Step 2: Run the E2E spec locally (optional, CI-only in the pipeline)**

Run: `npm run test:e2e -- progression.spec.ts` Expected: 3 passed. If Chromium is
missing, run `npx playwright install chromium` once. Do **not** add this to pre-commit
or `npm test`.

- [ ] **Step 3: Update README**

In `README.md`, insert before `## Keyboard shortcuts`:

```markdown
## Progression player

Build a chord progression straight from the chord map and play it back in time. Click
the small ＋ on any chord card (diatonic, secondary dominant or borrowed) to append it,
drag cards by their ⠿ handle to reorder, and use −/+ to set each chord's length in bars
(½ bar is offered when the bar splits evenly). Press **Play** and the fretboard follows
the current chord in every view; the next chord is outlined in the strip.

The transport has a BPM field (30–300, counting the time signature's unit, so 6/8 at 120
is 120 eighth notes per minute), time-signature presets (2/4 to 12/8), an optional
accented metronome **Click**, and **Loop**. Progressions are stored by scale degree, so
they transpose with the key and adapt to the mode; a chord that doesn't exist in the
current mode is greyed out and skipped. The progression, its settings and whether the
panel is shown (the **Progression** button next to Triads/Sevenths) are saved in your
browser.
```

In the keyboard-shortcuts table, add the row:

```markdown
| `Space` | Play / stop the progression (ignored while a button or form field is
focused) |
```

Then run `npx prettier --write README.md` to realign the table.

- [ ] **Step 4: Design-doc pointer**

Run:
`grep -n "2026-10-20-chord-map-progression-player-design" docs/design/2026-05-05-app-vision-and-view-designs.md`

If there is no match, add this to the end of the "Future" area of that file:

```markdown
### Future: Chord map & progression player

Implemented. See
[`docs/superpowers/specs/2026-10-20-chord-map-progression-player-design.md`](../superpowers/specs/2026-10-20-chord-map-progression-player-design.md)
for the design and
[`docs/superpowers/plans/2026-10-20-progression-player.md`](../superpowers/plans/2026-10-20-progression-player.md)
for the progression-player implementation plan.
```

If there is a match, add only the plan link line to that existing entry.

- [ ] **Step 5: Verify and commit**

```bash
npm run lint
npx prettier --write tests/e2e/progression.spec.ts README.md docs/design/2026-05-05-app-vision-and-view-designs.md
npx tsc -b
npm test
git add tests/e2e/progression.spec.ts README.md docs/design/2026-05-05-app-vision-and-view-designs.md docs/superpowers/plans/2026-10-20-progression-player.md
git commit -m "test(e2e): progression player; docs: README and design pointer"
```

---

## Self-Review Notes

**Spec coverage:**

| Spec item                                                                                                            | Task             |
| -------------------------------------------------------------------------------------------------------------------- | ---------------- |
| §5 meter (presets, accents, slot lengths, timeline, `locate`, `secondsPerBeat`, `beatsInWindow`)                     | Task 1           |
| §6 metronome (lazy context, 25 ms/0.1 s look-ahead, ~30 ms accented click, silent clock, BPM from next beat)         | Task 4           |
| §7 storage (key, defaults, guards, clamping, snapping, refs not names)                                               | Task 2           |
| §8 hook: state, saving and metronome                                                                                 | Task 6           |
| §8 hook: playable filter                                                                                             | Task 6           |
| §8 hook: beat queue and rAF                                                                                          | Task 5 + Task 6  |
| §8 hook: loop wrap and loop-off stop                                                                                 | Task 5           |
| §8 hook: live `selectedChordRef`                                                                                     | Task 6 + Task 9  |
| §8 hook: time-signature restart                                                                                      | Task 6           |
| §9 `TransportControls`                                                                                               | Task 7           |
| §9 dnd strip and sensors                                                                                             | Task 8           |
| §9 card contents, beat dots, next outline, greyed slot, click-to-select/jump, empty state, "All" hint, Play disabled | Task 8           |
| §9 visibility toggle, Space and test hooks                                                                           | Task 8 + Task 9  |
| New dependency                                                                                                       | Task 8, Step 1   |
| Fast tests `meter`, `progressionStorage` and `ProgressionPanel`                                                      | Tasks 1, 2 and 8 |
| E2E `progression.spec.ts`                                                                                            | Task 10          |

**Resolved ambiguities:**

1. **`Timeline` type.** The spec's `locate` takes `Timeline`, but `buildTimeline`
   returns an inline type. Task 1 exports `type Timeline` and `buildTimeline` returns
   it.
2. **`beatInBar`.** It counts from the start of the timeline, not from each slot. A
   ½-bar chord therefore changes mid-bar instead of resetting the bar.
3. **Visibility toggle placement.** The spec puts it next to Triads/Sevenths, which
   lives in PR 1's `ChordMap`. Task 9 adds two optional props to `ChordMap` for it.
4. **Space rule.** The spec's ignore list (inputs, textareas, selects) is extended to
   buttons, to avoid double-toggles and clashes with dnd-kit keyboard drags.
5. **Drag handle.** Drags start from a dedicated handle, not the whole card, so Space
   and Enter on inner buttons don't start a drag.
6. **Two extra files.** `transport.ts` and `progressionReducer.ts` are not in the spec.
   They keep the hook lean and testable.
7. **Data model unchanged.** `snapSlotLength` and `clampBpm` are small additive helpers
   the spec implies. The spec's data model is unchanged.
