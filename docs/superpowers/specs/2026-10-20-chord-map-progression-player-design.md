# Chord Map & Progression Player — Design

## Goal

Turn the diatonic chord row into a **chord map** for the selected key: the diatonic
chords, plus the **secondary dominants** that resolve to them and the **borrowed
chords** from the parallel mode. Any chord on the map, including the ones outside the
key, drives the fretboard in every view. Add a **progression player**, which is always
available and can be hidden. Chords from the map are added to a progression, reordered
by dragging, given a length in bars, and played back in time with a metronome. The
fretboard updates live on each chord change.

Inspiration: the physical "chordfiles" board, which shows a key's main chords, secondary
dominants and modal interchange, slides to transpose, and has chord and scale diagrams.

## Scope

### In scope

- `SpelledNote` type for letter-correct note spelling. It replaces the unused
  `NoteName`.
- `src/theory/harmony.ts`: builds the three chord-map tiers for any key × mode × row
  mode.
- A generic `spellChord(root, intervals)` that stacks thirds by letter.
- Marker builders accept any map chord. Out-of-key chord tones are kept, labelled with
  the chord's own spelling and flagged `isOutsideKey`.
- `ChordMap` component replaces `DiatonicChords` in every view.
- `src/theory/meter.ts`: time signatures, accent patterns, slot lengths, timeline.
- `src/audio/metronome.ts`: a Web Audio scheduler with look-ahead and an optional click.
- Progression panel:
  - add chords from the map, drag to reorder (dnd-kit), per-slot length in bars, remove,
    clear
  - Play/Stop, BPM, time signature, click on/off, loop
  - can be hidden
- The current progression and its player settings are saved in localStorage.
- Keyboard: 1–7 select diatonic chords (unchanged), Space toggles playback.
- Fast-tier tests (theory + components) and slow-tier E2E.

### Out of scope (deferred)

- Chord audio (synth or strum). If it's wanted later, it is a candidate reason to adopt
  Tone.js.
- A named progression library or presets. Only one progression is stored.
- Selection-driven "where can this chord go" hints. The only arrows are secondary
  dominant → target.
- A user-chosen borrowing source mode. The source is chosen automatically.
- Keyboard shortcuts for the secondary and borrowed tiers.
- Showing the next chord on the fretboard. It is shown only in the progression strip.
- Moving hosting to Cloudflare. That is a separate task.

## Background

- `getModalDiatonicTriads(key, mode)` and `getModalDiatonicChords(key, mode)`
  (`src/theory/modes.ts:215,305`):
  - They build letter-spelled diatonic triads and 7ths for any key and mode.
  - Roman numerals get ♭/♯ prefixes from `MODE_DEGREE_LABELS`, so a parallel mode's
    chords already carry numerals relative to the shared tonic (`♭VI`, `♭VII`).
- `spellScale(root, intervals)` (`src/theory/notes.ts:149`):
  - It spells 7-note, one-letter-per-degree scales and returns `string[]`.
  - No function spells an arbitrary chord from a root and an interval pattern.
- Existing quality types, `TriadQuality = maj|min|dim` and
  `ChordQuality = maj7|m7|7|m7b5` (`src/theory/scales.ts`), already cover every chord
  the map produces. Dominant 7 is `"7"`. No augmented quality is needed.
- `buildChordToneMarkers` (`src/theory/chordTones.ts:84`) drops every note outside the
  key or mode (`:112-113`). An A7 in C major would therefore lose its C♯.
- `buildChordShapeMarkers` (`src/theory/chordShapes.ts:725`):
  - It only needs `quality` and `notes[0]` to place shapes.
  - Shape tables support maj/min/dim triads and maj7/m7/7/m7b5 sevenths.
  - Labels fall back to sharp chromatic names for notes outside the key (`:708`).
- App state (`src/App.tsx`):
  - `selectedChordDegree` (1–7) and `chordRowMode` (triads/sevenths) feed
    `selectedChord` (`:185-192`).
  - `DiatonicChords` is rendered after each view (`:252,279,307`).
  - The keyboard handler is at `:140-168`.
- Persistence pattern to mirror: `src/theory/customTuningStorage.ts`, which uses a
  versioned key, type guards, fallback to defaults and try/catch saves.
- `NoteName` (`src/theory/types.ts:1`) is not used anywhere.

## Design

### 1. Spelling: `SpelledNote`

In `src/theory/notes.ts`:

```ts
type Letter = "C" | "D" | "E" | "F" | "G" | "A" | "B";
type Accidental = "" | "#" | "##" | "b" | "bb";
export type SpelledNote = `${Letter}${Accidental}`; // 35 values
```

- `NoteName` is deleted from `src/theory/types.ts`.
- `spellScale` returns `SpelledNote[]`.
- `DiatonicChord.notes` and `DiatonicTriad.notes` become tuples of `SpelledNote`.
- New: `spellChord(root: SpelledNote, intervals: readonly number[]): SpelledNote[]`.
  - Chord tone `i` gets the letter `2·i` steps above the root letter, so the chord is
    stacked in thirds.
  - Accidentals are added until the tone reaches its target pitch class:
    `root + intervals[i]`.
  - Results that would need more than a double accidental throw an error.

Correct letter spelling can produce double accidentals in extreme keys, for example B𝄫
when G♭ major borrows from G♭ minor, or G𝄪 in E♯7. This is intentional; the display code
already renders `##`/`bb`.

### 2. Theory: `src/theory/harmony.ts`

```ts
export type ChordTier = "secondary" | "diatonic" | "borrowed";
export type ChordRef = { tier: ChordTier; degree: number }; // 1–7; secondary: degree of its target
export type MapChord = {
  ref: ChordRef;
  romanNumeral: string; // "V7/ii", "♭VI", "iv"
  symbol: string; // "A7", "A♭", "Fm"
  quality: TriadQuality | ChordQuality;
  notes: readonly SpelledNote[];
};
export type ChordMap = Record<ChordTier, (MapChord | null)[]>; // always 7 entries per tier

export function getChordMap(key: string, mode: Mode, rowMode: ChordRowMode): ChordMap;
export function resolveChordRef(
  ref: ChordRef,
  key: string,
  mode: Mode,
  rowMode: ChordRowMode,
): MapChord | null;
export function borrowSourceMode(mode: Mode): Mode;
```

**Diatonic tier.** This tier wraps `getModalDiatonicTriads` or `getModalDiatonicChords`
unchanged and adds `ref`.

**Secondary tier.** Column `d` holds the dominant of diatonic chord `d`.

- Columns exist only for `d ∈ 2..7` where the diatonic triad is not diminished. Column 1
  and diminished targets are `null`.
- The root is a perfect fifth above the target root. Its letter is 4 letter-steps above
  the target's letter, and it is spelled with `spellChord`.
- Always a dominant 7th `[0,4,7,10]`, numeral `V7/x`, symbol `A7`, regardless of row
  mode. `x` is the target's numeral without its quality suffix.
- V7/IV (C7) is distinct from I thanks to its ♭7.

**Borrowed tier.** Column `d` holds chord `d` of `borrowSourceMode(mode)` on the same
tonic.

- `borrowSourceMode`: modes with a major third (Ionian, Lydian, Mixolydian) map to
  Aeolian. Modes with a minor third (Dorian, Phrygian, Aeolian, Locrian) map to Ionian.
  This is derived from `MODE_INTERVALS[mode][2]` rather than hand-listed.
- An entry is `null` when the chord has the same root pitch class and quality as the
  diatonic chord in that column.
- The numeral and symbol come from the source mode's generator, which already gives
  numerals relative to the shared tonic.

**Mapping of qualities to semitone intervals.** This lives in one exported table in
`harmony.ts`. The existing un-exported `QUALITY_INTERVALS` in `chordShapes.ts:417` moves
there and `chordShapes.ts` imports it, so there is one source of truth.

### 3. Fretboard markers

- `NoteMarker` gains an optional `isOutsideKey?: boolean`.
- `buildChordToneMarkers` and the NoteMap pipeline take `chord: MapChord | null`
  (structurally compatible with today's diatonic chords):
  - Chord tones are always emitted, even when they are not in the key or mode. They are
    labelled from `chord.notes`, and `isOutsideKey` is set when their pitch class is not
    in the key.
  - Key notes are still shown as `scale`, except a key note that shares a letter with an
    out-of-key chord tone. That note is hidden; C is hidden when A7 contains C♯.
  - Muted strings and disabled highlight roles behave as today.
- `buildChordShapeMarkers` input:
  - The input takes `MapChord`. The `triads`/`sevenths` discriminant stays, and the
    chord must hold 3 or 4 notes respectively.
  - Labels come from the chord's own spelling first, then the key's spelling map, then
    the sharp name.
  - It sets `isOutsideKey` the same way.
- `NoteCircle` draws `isOutsideKey` as a **dashed ring** in `--color-fg-primary`. It is
  deliberately not the gold `--color-characteristic` ring, which keeps its meaning of a
  modal characteristic note.
- `data-outside-key` is added to `note-marker` elements for E2E.
- In triads mode, the 7th highlight stays available when the selected chord has a 7th
  (`showsSeventh`); Chord Shapes voices its triad (`triadOf`).

### 4. Chord map UI

`src/components/ChordMap.tsx` (with `ChordMapCard.tsx`) replaces
`src/components/DiatonicChords.tsx` in the same three places in `App.tsx`.
`ChordRowMode` moves with it.

```ts
type ChordMapProps = {
  selectedKey: string;
  modalMode: Mode;
  rowMode: ChordRowMode;
  onRowModeChange: (m: ChordRowMode) => void;
  selectedRef: ChordRef | null;
  onSelect: (ref: ChordRef) => void;
  onAdd?: (ref: ChordRef) => void; // only while the progression panel is visible
};
```

Layout:

```
SECONDARY DOMINANTS   ·   [A7]  [B7]  [C7]  [D7]  [E7]   ·      dashed border
                             ↓     ↓     ↓     ↓     ↓
DIATONIC (C IONIAN)  [C]  [Dm]  [Em]  [F]   [G]   [Am]  [B°]    as today
BORROWED (C AEOLIAN) [Cm]  [D°]  [E♭]  [Fm]  [Gm]  [A♭]  [B♭]     border tinted --color-mode
```

- There are three tiers on one 7-column grid, so every chord sits in its degree's
  column. A `null` entry renders as an empty cell.
- Each tier has a small uppercase label. The diatonic and borrowed labels name the key
  and mode, e.g. "Borrowed (C Aeolian)".
- A ↓ is drawn under each secondary dominant.
- The Triads/Sevenths toggle stays at the top-left of the map, with the "Progression"
  panel toggle next to it.
- Mobile: the grid stays 7 columns. Cards show only the numeral and symbol (the notes
  line is already hidden on mobile). Below a minimum width the map scrolls horizontally
  instead of re-flowing.
- The map renders `null` when the key is `ALL_NOTES_KEY`, as today.
- Clicking a card selects it, and clicking the selected card deselects it (as today).
- When `onAdd` is set, each card shows a small ＋ button in its corner that appends the
  chord to the progression. Clicking the card body still selects it.
- Cards have `data-testid="chord-card"`, `data-tier`, `data-degree` and `aria-pressed`.
  The ＋ button has an `aria-label` of the form "Add A7 to progression".

App state changes:

- `selectedChordDegree: number | null` becomes `selectedChordRef: ChordRef | null`. The
  default is `{tier: "diatonic", degree: 1}`.
- `selectedChord = resolveChordRef(selectedChordRef, key, mode, rowMode)`. When the ref
  resolves to `null` after a key or mode change, the selection is cleared.
- Keys 1–7 select `{tier: "diatonic", degree}`. `t`/`s` stay as they are.

### 5. Meter: `src/theory/meter.ts`

```ts
export type TimeSignature = { beats: number; unit: 2 | 4 | 8 | 16 };
export const TIME_SIGNATURE_PRESETS: readonly TimeSignature[]; // 2/4 3/4 4/4 5/4 6/8 7/8 9/8 12/8
export type Accent = "strong" | "medium" | "weak";
export function accentPattern(sig: TimeSignature): Accent[];
export function allowedSlotLengths(sig: TimeSignature): number[]; // in bars
export function beatsPerSlot(bars: number, sig: TimeSignature): number;
export function buildTimeline(
  slotBars: readonly number[],
  sig: TimeSignature,
): { starts: number[]; totalBeats: number };
export function locate(
  beat: number,
  timeline: Timeline,
  sig: TimeSignature,
): { slotIndex: number; beatInBar: number };
export function secondsPerBeat(bpm: number): number;
export function beatsInWindow(
  fromTime: number,
  toTime: number,
  startTime: number,
  bpm: number,
): number[];
```

- The BPM counts the time signature's unit, so 6/8 at 120 means 120 eighth notes per
  minute.
- `accentPattern`:
  - Beat 1 is always `strong`.
  - Compound meters (beats divisible by 3 and greater than 3, with unit 8 or 16) put
    `medium` on every third beat: 6/8 gives S w w M w w.
  - 5 is grouped 3+2 and 7 is grouped 2+2+3, with `medium` at each group start.
  - All other beats are `weak`.
- `allowedSlotLengths` returns `[0.5, 1, 2, 3, 4]` when `sig.beats` is even, and
  `[1, 2, 3, 4]` otherwise. Slot lengths are always whole numbers of beats.
- `beatsInWindow` is the pure core of the scheduler. It returns the absolute beat
  indices whose time falls in `[fromTime, toTime)`.

### 6. Metronome scheduler: `src/audio/metronome.ts`

This module is not theory and does not use React, which is why it gets a new
`src/audio/` folder.

```ts
export type Metronome = {
  start(opts: { bpm: number; onBeat: (beat: number, time: number) => void }): void;
  stop(): void;
  setBpm(bpm: number): void;
  setClick(enabled: boolean, accentOf: (beat: number) => Accent): void;
  now(): number; // AudioContext.currentTime
};
export function createMetronome(): Metronome;
```

- The `AudioContext` is created lazily on the first `start()`, which runs inside the
  Play click, so the browser's user-gesture rule is satisfied.
- A `setTimeout` loop runs every 25 ms and schedules every beat in
  `beatsInWindow(now, now + 0.1)`.
- When click is enabled, each beat is a short oscillator blip with a gain envelope of
  about 30 ms. Strong, medium and weak beats use descending pitches.
- `onBeat(beat, time)` hands each scheduled beat and its audio time to the hook. With
  click disabled, the same clock runs silently.
- A BPM change takes effect from the next scheduled beat.

### 7. Progression state & persistence

`src/theory/progressionStorage.ts` mirrors `customTuningStorage.ts`:

```ts
export type ProgressionSlot = { id: string; ref: ChordRef; bars: number };
export type StoredProgression = {
  version: 1;
  slots: ProgressionSlot[];
  timeSignature: TimeSignature;
  bpm: number; // clamped 30–300
  click: boolean;
  loop: boolean;
  visible: boolean;
};
export const PROGRESSION_STORAGE_KEY = "fretlab:progression:v1";
export function loadProgression(): StoredProgression;
export function saveProgression(state: StoredProgression): void;
```

- Defaults: no slots, 4/4, 90 BPM, click off, loop on, visible.
- Type guards validate every field. Data that is invalid or from an unknown version
  falls back to the defaults.
- A slot whose `bars` value is not allowed under the stored time signature is snapped
  to 1.
- Slots store `ChordRef`, not chord names, so the progression transposes with the key
  and adapts to the mode.

### 8. Player hook: `src/useProgressionPlayer.ts`

- It owns the `StoredProgression` state, saves it on change and holds a `Metronome`.
- It exposes `isPlaying`, `metronomeOnly`, `currentSlot`, `beatInBar`, and the actions
  add, remove, move, setBars, clear, play, stop, jumpTo, setBpm, setTimeSignature,
  setClick, setLoop and setVisible.
- Playable slots are those whose ref resolves to a chord under the current key and mode.
  Other slots stay in the list but are skipped by the timeline.
- Beats from `onBeat` go into a queue. A `requestAnimationFrame` loop moves the UI
  forward once `metronome.now()` reaches each beat's time, so the visuals line up with
  the click.
- When the end is reached with loop on, playback wraps to the first playable slot. With
  loop off, it stops on the last chord.
- **While playing, the current slot's ref becomes `selectedChordRef` in App**, so every
  view updates live. On Stop, the last chord stays selected.
- Clear stops playback; removing slots one by one keeps playback running and falls back
  to metronome-only when none remain. With Loop off, a final downbeat click may sound
  after the last bar, because the metronome schedules up to 100 ms ahead.
- Changing the time signature while playing restarts playback from the current slot.
- **Metronome-only mode.** Play always works. While no slot is playable (no slots, none
  resolves under the current key and mode, or the key is "All"), the player is a plain
  metronome:
  - the timeline is one bar of the time signature (`playbackTimeline` in `meter.ts`
    returns `{ starts: [0], totalBeats: sig.beats }` for no slots);
  - loop is forced on, so it never ends, whatever the Loop setting;
  - the click is forced on (audible click = Click setting or metronome-only);
  - `beatInBar` advances, `currentSlot` is null, and no chord is announced.
- When chords become playable during metronome-only playback (one is added, or the key
  leaves "All"), playback restarts on the first playable slot immediately. The restart
  runs from the hook's effect that observes the change, never from inside the
  transport's callbacks.
- When the last playable slot goes away during playback, it carries on as metronome-only
  without a restart: the transport reads the one-bar timeline on the next beat.
- Hiding the panel stops playback, so playback never runs without a visible Stop.

### 9. Progression UI

`src/components/ProgressionPanel.tsx` sits between the legend and the chord map. It
contains:

- `TransportControls.tsx`:
  - Play/Stop button
  - BPM number input (30–300)
  - time-signature select (presets)
  - Click and Loop toggles
  - Clear
- A slot strip of `ProgressionSlotCard.tsx` items in a dnd-kit `SortableContext` with
  horizontal list strategy.
  - Sensors: pointer (5 px activation distance, so clicks still register), touch and
    keyboard.
  - Each card shows the symbol and numeral, a −/+ length stepper over
    `allowedSlotLengths` with a label such as "2 bars", and a × remove button.
  - While playing, the current card shows its beat dots, and the next card has an
    outline.
  - A slot that can't be played is greyed out with the title "Not available in this
    mode".
  - Clicking a card selects its chord. While playing, the click jumps playback to that
    slot.
- While playing, the transport bar shows beat dots for the current bar (one per beat,
  the current beat filled, accented beats slightly larger), in every playing mode.
- An empty state reads "Click ＋ on a chord below to start a progression". Play works
  next to it and runs the metronome.
- With key "All", only the slot strip shows a "pick a key" hint. The transport stays
  enabled and Play runs the metronome.
- In metronome-only mode the Click toggle stays usable but has no effect, with the title
  "Click always sounds when no chords are playing".

Other controls and test hooks:

- Visibility is toggled by the "Progression" button next to the Triads/Sevenths toggle,
  and is saved.
- **Space** toggles Play/Stop. It is ignored in inputs, textareas, selects and buttons,
  with meta/ctrl/alt, on key repeat, and while the panel is hidden.
- Slots have `data-testid="progression-slot"`, `data-index` and `data-current`.

### New dependency

`@dnd-kit/core`, `@dnd-kit/sortable` and `@dnd-kit/utilities` add about 15.5 kB gzipped
(measured 2026-10-20 with esbuild; fretlab's bundle was 77 kB gzipped at the time).

Tone.js was considered and rejected for this scope. It adds about 69 kB gzipped and, for
a click track, only saves the scheduling loop.

## Testing

### Fast tier (`npm test`)

- `notes.test.ts`:
  - `spellChord` letter stacking, including C7 → C E G B♭ and E♯7 → E♯ G## B♯ D♯.
  - Out-of-range spellings throw.
- `harmony.test.ts`:
  - Iterates every key offered by `KeySelector` (sharp and flat spellings) × `MODES` ×
    both row modes and asserts:
    - every tier has 7 entries
    - each secondary dominant root is 7 semitones above its target root
    - each map chord's letters are stacked in thirds
    - secondary dominants are missing exactly for degree 1 and diminished targets
    - no borrowed chord equals its column's diatonic chord
    - `borrowSourceMode` matches the mode's third
  - Hand-checked examples:
    - C Ionian: V7/ii = A C♯ E G and ♭VI = A♭ C E♭
    - A Aeolian: borrowed IV = D F♯ A
    - Triads mode: V7/V = D F♯ A C
- `meter.test.ts`:
  - `accentPattern` for every preset
  - `allowedSlotLengths` for even and odd meters
  - `buildTimeline` and `locate` across slot boundaries and loop wrap
  - `beatsInWindow` edges (inclusive start, exclusive end)
- `progressionStorage.test.ts`:
  - round trip
  - missing, malformed and wrong-version data fall back to defaults
  - BPM clamping
  - snapping of invalid `bars`
- `chordTones.test.ts` and `chordShapes.test.ts`:
  - out-of-key chord tones are emitted with `isOutsideKey` and the chord's spelling
  - the clashing key letter is hidden
  - diatonic behaviour is unchanged
- `ChordMap.test.tsx` (new; the old row had no test):
  - three tiers render, and empty cells are where they should be
  - select and deselect work
  - ＋ appears only with `onAdd`
  - the "All" key renders nothing
- `ProgressionPanel.test.tsx` (with a stubbed `AudioContext`):
  - add and remove slots
  - the stepper respects allowed lengths
  - the empty state
  - unplayable slots are greyed out
  - Play works with an empty progression and under the "All" key (metronome-only)
  - beat dots while playing, one per beat of each preset
  - visibility toggle

### Slow tier (`npm run test:e2e`, CI only)

- `tests/e2e/chord-map.spec.ts`:
  - In C, clicking A7 gives `note-marker[data-note="C#"][data-outside-key]` and no C
    natural markers.
  - Switching to Dorian shows Ionian chords in the borrowed row.
- `tests/e2e/progression.spec.ts`:
  - Add three chords, play at 300 BPM and assert that `data-current` moves forward and
    the selected chord card changes.
  - Drag the third slot to the first position.
  - Reload and assert the progression and BPM were kept.

## Delivery

There are two PRs. Each is reviewable and shippable on its own:

1. **Chord map**: `SpelledNote`, `harmony.ts`, marker changes, `ChordMap` replacing
   `DiatonicChords`, `selectedChordRef`. It is useful on its own.
2. **Progression player**: `meter.ts`, `metronome.ts`, `progressionStorage.ts`,
   `useProgressionPlayer`, `ProgressionPanel`, dnd-kit.

Docs: a short entry in the "Future" section of
`docs/design/2026-05-05-app-vision-and-view-designs.md` pointing to this spec.

## Decisions log

| Question                           | Decision                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Purpose                            | Chord map (A) plus a progression builder and player (B). The existing chord-tone fretboard covers the improvisation aid. |
| Map placement                      | It replaces the diatonic chord row in every view.                                                                        |
| Builder visibility                 | Always available, can be hidden. The visibility is saved.                                                                |
| Progression storage                | Key-relative `ChordRef`, so it transposes with key and mode.                                                             |
| Reordering                         | Drag (dnd-kit; pointer, touch and keyboard).                                                                             |
| Non-Ionian modes                   | Borrow automatically from the parallel Aeolian (major-third modes) or Ionian (minor-third modes).                        |
| Sound                              | Optional metronome click with accents. No chord audio yet.                                                               |
| Meter                              | Time-signature presets. BPM counts the denominator unit.                                                                 |
| Chord length                       | Per-slot length in bars (default 1). ½ bar only when the bar splits evenly.                                              |
| Persistence                        | One current progression and its settings in localStorage.                                                                |
| Function hints                     | Only the secondary dominant → target arrows.                                                                             |
| Timing engine                      | Our own Web Audio look-ahead scheduler (not `setInterval`, not Tone.js).                                                 |
| Note typing                        | New `SpelledNote`. The unused `NoteName` is removed.                                                                     |
| Secondary dominants in triads mode | Always V7 (user, 2026-10-20); Chord Shapes triads mode voices the triad                                                  |
| Out-of-key marker                  | Dashed neutral ring. The gold ring stays reserved for modal characteristic notes.                                        |
| Play without chords                | Plain metronome: one bar looping, click always on (user, 2026-10-20)                                                     |
