# Fretlab Step 1: Project Setup + Interactive Fretboard + Key Selector

## Overview

Fretlab is a web-based interactive guitar practice reference tool. This spec covers the
foundational step: project scaffolding, the reusable SVG fretboard component, key
selector, and a basic major scale view to prove the system works end-to-end.

## Tech Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4**
- **No component library** — custom components only
- **SVG-based fretboard rendering**

## Project Structure

```
fretlab/
├── src/
│   ├── theory/                    # Pure music theory logic (no React)
│   │   ├── notes.ts               # Chromatic scale, note naming, enharmonics
│   │   ├── scales.ts              # Major scale construction, intervals
│   │   └── types.ts               # Shared types (Note, Interval, etc.)
│   ├── components/
│   │   ├── Fretboard/
│   │   │   ├── Fretboard.tsx      # Main SVG fretboard component
│   │   │   ├── FretboardString.tsx # Single string with nut/fret lines
│   │   │   ├── FretMarkers.tsx    # Dot markers at 3, 5, 7, 9, 12, 15
│   │   │   └── NoteCircle.tsx     # Individual note dot with label
│   │   ├── KeySelector.tsx        # 12-key picker
│   │   ├── ViewSelector.tsx       # Tab bar (placeholders for future views)
│   │   └── Legend.tsx             # Interval color legend
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## Music Theory Layer (`src/theory/`)

Pure functions with no React dependency. All music theory computation lives here.

### Types (`types.ts`)

```ts
type NoteName =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

type IntervalRole =
  | "root"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "sixth"
  | "seventh";

type NoteDisplayRole = "root" | "third" | "fifth" | "seventh" | "scale" | "muted";

type NoteMarker = {
  string: number; // 0 = low E, 5 = high E
  fret: number; // 0 = open, up to 15
  note: string; // Display name (e.g., "C", "F#", "Bb")
  role: NoteDisplayRole;
};
```

### Notes (`notes.ts`)

- `CHROMATIC_SCALE`: `['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']`
- `STANDARD_TUNING`: `['E', 'A', 'D', 'G', 'B', 'E']` (index 0 = low E, index 5 = high
  E)
- `FLAT_KEYS`: `['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']` — these keys display with flats
  instead of sharps
- `ENHARMONIC_MAP`: `{ 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' }`
- `getNoteAtFret(openString: string, fret: number): string` — returns the note name at a
  given string/fret position using chromatic calculation
- `getNoteIndex(note: string): number` — maps any note name (sharp or flat) to its
  chromatic index (0-11)
- `getDisplayName(note: string, key: string): string` — returns sharp or flat spelling
  based on whether the key is a flat key

### Scales (`scales.ts`)

- `MAJOR_SCALE_INTERVALS`: `[0, 2, 4, 5, 7, 9, 11]` (semitones from root)
- `INTERVAL_NAMES`: `['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']`
- `getMajorScaleNotes(key: string): string[]` — returns 7 notes of the major scale in
  the given key
- `getIntervalRole(key: string, note: string): IntervalRole | null` — returns the
  interval of a note relative to the key's major scale, or null if the note is not in
  the scale

## Fretboard Component

### `Fretboard.tsx`

The core reusable component. Renders an SVG fretboard with:

- **Dimensions**: Horizontal layout, 6 strings, frets 0-15
- **Orientation**: Nut on the left, higher frets to the right. Low E (string 0) at the
  bottom, high E (string 5) at the top.
- **Props**:
  - `markers: NoteMarker[]` — what notes to display and how
  - `fretCount?: number` — defaults to 15
- **Rendering**:
  - Nut rendered as a thicker vertical line on the left
  - Fret lines as vertical lines
  - Strings as horizontal lines
  - Fret spacing can be uniform (simpler) — no need to simulate real fret taper
  - Fret numbers displayed below the fretboard

The fretboard is a "dumb" renderer. It does not compute which notes to show — it
receives `NoteMarker[]` from the parent and renders them. Each view will compute its own
markers using the theory layer.

### `FretMarkers.tsx`

Renders dot markers at standard positions:

- Single dots at frets 3, 5, 7, 9, 15
- Double dot at fret 12
- Dots placed between strings (centered vertically) in a muted color

### `NoteCircle.tsx`

Renders a single note on the fretboard:

- Circle with note name text inside
- Color determined by the `role` prop
- Size large enough to read the note name at arm's length
- For `muted` role: lower opacity, smaller circle

### `FretboardString.tsx`

Renders one horizontal string line across the fretboard. Thickness varies slightly
(lower strings thicker) for visual realism.

## Color System

Defined as CSS custom properties on `:root` for easy theming:

| Role  | Color  | Hex                      |
| ----- | ------ | ------------------------ |
| Root  | Blue   | `#3B82F6`                |
| 3rd   | Amber  | `#F59E0B`                |
| 5th   | Green  | `#10B981`                |
| 7th   | Purple | `#8B5CF6`                |
| Scale | Gray   | `#6B7280`                |
| Muted | Dark   | `#374151` at 40% opacity |

These colors are used consistently across ALL views.

## UI Components

### `KeySelector.tsx`

- Row of 12 buttons, one per key
- Display order: C, Db, D, Eb, E, F, Gb, G, Ab, A, Bb, B (flat names for flat keys)
- Selected key is visually highlighted
- Changing key updates global state and re-renders fretboard instantly

### `ViewSelector.tsx`

- Tab bar with 6 tabs matching the views from the full spec
- For step 1, only the first view-like display is functional (major scale on fretboard)
- Other tabs show a "Coming soon" placeholder
- Tab labels: Note Map, Scale Positions, Chord Tones, Diatonic Chords, Shell Voicings,
  Triad Shapes

### `Legend.tsx`

- Small horizontal legend showing colored circles with labels: Root, 3rd, 5th, 7th
- Always visible below the key selector / above the fretboard

## App State

Simple `useState` in `App.tsx`:

- `selectedKey: string` (default: `'C'`)
- `selectedView: string` (default: `'note-map'`)

No state management library needed. State is lifted to App and passed down as props.

## Initial View Behavior

For step 1, the fretboard displays the major scale of the selected key:

- All 7 scale notes shown across all 6 strings, frets 0-15
- Root notes colored blue (root role)
- All other scale tones colored gray (scale role)
- Notes outside the scale are not shown
- Changing the key immediately recalculates and re-renders

This proves the full pipeline: theory functions -> marker computation -> SVG rendering.

## Theme

- Dark theme by default
- Background: `#111827` (gray-900)
- Fretboard wood color: `#292524` (stone-800) or similar dark warm tone
- String color: `#9CA3AF` (gray-400)
- Fret line color: `#6B7280` (gray-500)
- Text: `#F9FAFB` (gray-50)

## Responsive Behavior

- Fretboard SVG uses `viewBox` for scalability
- On desktop/tablet: fretboard takes full available width
- On narrow screens: horizontal scroll if needed (fretboard should not be squished)
- Minimum readable width: ~768px for full experience

## Testing

- Unit tests for all theory functions (notes.ts, scales.ts) using Vitest
- Verify correct note calculation for every string/fret combination
- Verify major scale construction for all 12 keys
- Verify enharmonic display logic
