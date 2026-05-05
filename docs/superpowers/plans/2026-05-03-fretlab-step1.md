# Fretlab Step 1: Interactive Fretboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Fretlab project and build a reusable SVG fretboard component that
displays major scale notes for any selected key.

**Architecture:** Pure music theory functions (no React) compute note data. A
props-driven SVG fretboard component renders `NoteMarker[]` it receives. App-level state
(`selectedKey`, `selectedView`) drives everything.

**Tech Stack:** Vite, React 19, TypeScript, Tailwind CSS v4, Vitest

---

### Task 1: Project Scaffolding

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`,
  `tsconfig.node.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`,
  `.gitignore`, `eslint.config.js`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/felixzailskas/Code/fretlab
npm create vite@latest . -- --template react-ts
```

Select the current directory when prompted. This generates the base project files.

- [ ] **Step 2: Install Tailwind CSS v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Vite with Tailwind plugin**

Replace `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

- [ ] **Step 4: Configure CSS entry point**

Replace `src/index.css` with:

```css
@import "tailwindcss";

:root {
  --color-root: #3b82f6;
  --color-third: #f59e0b;
  --color-fifth: #10b981;
  --color-seventh: #8b5cf6;
  --color-scale: #6b7280;
  --color-muted: #374151;

  --color-bg: #111827;
  --color-text: #f9fafb;
  --color-fretboard: #292524;
  --color-string: #9ca3af;
  --color-fret: #6b7280;
}
```

- [ ] **Step 5: Install Vitest**

```bash
npm install -D vitest
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 6: Create a comprehensive .gitignore**

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/

# Misc
*.tsbuildinfo
```

- [ ] **Step 7: Minimal App.tsx placeholder**

Replace `src/App.tsx`:

```tsx
function App() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <h1 className="text-2xl font-bold p-4">Fretlab</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 8: Verify the dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, page shows "Fretlab" heading on dark background.

- [ ] **Step 9: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: Both succeed with no errors.

- [ ] **Step 10: Commit**

```bash
git add .gitignore package.json package-lock.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js index.html src/main.tsx src/App.tsx src/index.css src/vite-env.d.ts
git commit -m "chore: scaffold Vite + React + TypeScript + Tailwind project"
```

---

### Task 2: Music Theory Types

**Files:**

- Create: `src/theory/types.ts`

- [ ] **Step 1: Create types file**

```ts
export type NoteName =
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

export type IntervalRole =
  | "root"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "sixth"
  | "seventh";

export type NoteDisplayRole =
  | "root"
  | "third"
  | "fifth"
  | "seventh"
  | "scale"
  | "muted";

export type NoteMarker = {
  string: number; // 0 = low E, 5 = high E
  fret: number; // 0 = open, up to 15
  note: string; // Display name (e.g., "C", "F#", "Bb")
  role: NoteDisplayRole;
};
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/theory/types.ts
git commit -m "feat: add music theory type definitions"
```

---

### Task 3: Notes Module — Tests

**Files:**

- Create: `src/theory/notes.ts`, `src/theory/notes.test.ts`

- [ ] **Step 1: Write failing tests for getNoteIndex**

Create `src/theory/notes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getNoteIndex,
  getNoteAtFret,
  getDisplayName,
  CHROMATIC_SCALE,
  STANDARD_TUNING,
} from "./notes";

describe("getNoteIndex", () => {
  it("returns correct index for natural notes", () => {
    expect(getNoteIndex("C")).toBe(0);
    expect(getNoteIndex("D")).toBe(2);
    expect(getNoteIndex("E")).toBe(4);
    expect(getNoteIndex("F")).toBe(5);
    expect(getNoteIndex("G")).toBe(7);
    expect(getNoteIndex("A")).toBe(9);
    expect(getNoteIndex("B")).toBe(11);
  });

  it("returns correct index for sharp notes", () => {
    expect(getNoteIndex("C#")).toBe(1);
    expect(getNoteIndex("F#")).toBe(6);
  });

  it("returns correct index for flat notes", () => {
    expect(getNoteIndex("Db")).toBe(1);
    expect(getNoteIndex("Eb")).toBe(3);
    expect(getNoteIndex("Gb")).toBe(6);
    expect(getNoteIndex("Ab")).toBe(8);
    expect(getNoteIndex("Bb")).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test
```

Expected: FAIL — module `./notes` does not exist.

- [ ] **Step 3: Write failing tests for getNoteAtFret**

Append to `src/theory/notes.test.ts`:

```ts
describe("getNoteAtFret", () => {
  it("returns open string notes for fret 0", () => {
    expect(getNoteAtFret("E", 0)).toBe("E");
    expect(getNoteAtFret("A", 0)).toBe("A");
    expect(getNoteAtFret("D", 0)).toBe("D");
    expect(getNoteAtFret("G", 0)).toBe("G");
    expect(getNoteAtFret("B", 0)).toBe("B");
  });

  it("calculates notes correctly on the low E string", () => {
    expect(getNoteAtFret("E", 1)).toBe("F");
    expect(getNoteAtFret("E", 2)).toBe("F#");
    expect(getNoteAtFret("E", 3)).toBe("G");
    expect(getNoteAtFret("E", 5)).toBe("A");
    expect(getNoteAtFret("E", 7)).toBe("B");
    expect(getNoteAtFret("E", 12)).toBe("E");
  });

  it("calculates notes correctly on the A string", () => {
    expect(getNoteAtFret("A", 2)).toBe("B");
    expect(getNoteAtFret("A", 3)).toBe("C");
    expect(getNoteAtFret("A", 5)).toBe("D");
    expect(getNoteAtFret("A", 7)).toBe("E");
    expect(getNoteAtFret("A", 12)).toBe("A");
  });

  it("calculates notes correctly on the B string", () => {
    expect(getNoteAtFret("B", 1)).toBe("C");
    expect(getNoteAtFret("B", 3)).toBe("D");
    expect(getNoteAtFret("B", 5)).toBe("E");
  });

  it("wraps around correctly at fret 12", () => {
    // Fret 12 = same note as open string
    for (const openString of STANDARD_TUNING) {
      expect(getNoteAtFret(openString, 12)).toBe(openString);
    }
  });
});
```

- [ ] **Step 4: Write failing tests for getDisplayName**

Append to `src/theory/notes.test.ts`:

```ts
describe("getDisplayName", () => {
  it("returns sharp names for sharp keys", () => {
    expect(getDisplayName("C#", "C")).toBe("C#");
    expect(getDisplayName("F#", "G")).toBe("F#");
    expect(getDisplayName("G#", "A")).toBe("G#");
  });

  it("returns flat names for flat keys", () => {
    expect(getDisplayName("C#", "F")).toBe("Db");
    expect(getDisplayName("D#", "Bb")).toBe("Eb");
    expect(getDisplayName("G#", "Eb")).toBe("Ab");
    expect(getDisplayName("A#", "F")).toBe("Bb");
  });

  it("returns natural notes unchanged regardless of key", () => {
    expect(getDisplayName("C", "F")).toBe("C");
    expect(getDisplayName("E", "G")).toBe("E");
    expect(getDisplayName("C", "C")).toBe("C");
  });

  it("handles flat input notes in sharp keys", () => {
    // If someone passes 'Db' but key is 'G' (sharp key), return 'C#'
    expect(getDisplayName("Db", "G")).toBe("C#");
    expect(getDisplayName("Gb", "D")).toBe("F#");
  });
});
```

- [ ] **Step 5: Implement notes.ts**

Create `src/theory/notes.ts`:

```ts
export const CHROMATIC_SCALE = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const STANDARD_TUNING = ["E", "A", "D", "G", "B", "E"] as const;

export const FLAT_KEYS = ["F", "Bb", "Eb", "Ab", "Db", "Gb"] as const;

const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db",
  "D#": "Eb",
  "F#": "Gb",
  "G#": "Ab",
  "A#": "Bb",
};

const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

export function getNoteIndex(note: string): number {
  const sharpName = FLAT_TO_SHARP[note] ?? note;
  const index = CHROMATIC_SCALE.indexOf(sharpName as (typeof CHROMATIC_SCALE)[number]);
  return index;
}

export function getNoteAtFret(openString: string, fret: number): string {
  const openIndex = getNoteIndex(openString);
  const noteIndex = (openIndex + fret) % 12;
  return CHROMATIC_SCALE[noteIndex];
}

export function getDisplayName(note: string, key: string): string {
  // Normalize to sharp name first
  const sharpName = FLAT_TO_SHARP[note] ?? note;
  const isFlatKey = (FLAT_KEYS as readonly string[]).includes(key);

  // Natural notes are always returned as-is
  if (!sharpName.includes("#")) {
    return sharpName;
  }

  if (isFlatKey) {
    return SHARP_TO_FLAT[sharpName] ?? sharpName;
  }

  return sharpName;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test
```

Expected: All tests in `notes.test.ts` PASS.

- [ ] **Step 7: Commit**

```bash
git add src/theory/notes.ts src/theory/notes.test.ts
git commit -m "feat: add notes module with chromatic scale, fret calculation, and enharmonics"
```

---

### Task 4: Scales Module — Tests

**Files:**

- Create: `src/theory/scales.ts`, `src/theory/scales.test.ts`

- [ ] **Step 1: Write failing tests for getMajorScaleNotes**

Create `src/theory/scales.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getMajorScaleNotes, getIntervalRole, MAJOR_SCALE_INTERVALS } from "./scales";

describe("MAJOR_SCALE_INTERVALS", () => {
  it("has correct semitone pattern", () => {
    expect(MAJOR_SCALE_INTERVALS).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
});

describe("getMajorScaleNotes", () => {
  it("returns C major scale", () => {
    expect(getMajorScaleNotes("C")).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
  });

  it("returns G major scale", () => {
    expect(getMajorScaleNotes("G")).toEqual(["G", "A", "B", "C", "D", "E", "F#"]);
  });

  it("returns D major scale", () => {
    expect(getMajorScaleNotes("D")).toEqual(["D", "E", "F#", "G", "A", "B", "C#"]);
  });

  it("returns F major scale (flat key)", () => {
    expect(getMajorScaleNotes("F")).toEqual(["F", "G", "A", "Bb", "C", "D", "E"]);
  });

  it("returns Bb major scale", () => {
    expect(getMajorScaleNotes("Bb")).toEqual(["Bb", "C", "D", "Eb", "F", "G", "A"]);
  });

  it("returns Eb major scale", () => {
    expect(getMajorScaleNotes("Eb")).toEqual(["Eb", "F", "G", "Ab", "Bb", "C", "D"]);
  });

  it("returns Ab major scale", () => {
    expect(getMajorScaleNotes("Ab")).toEqual(["Ab", "Bb", "C", "Db", "Eb", "F", "G"]);
  });

  it("returns all 12 major scales with 7 notes each", () => {
    const keys = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
    for (const key of keys) {
      const scale = getMajorScaleNotes(key);
      expect(scale).toHaveLength(7);
      expect(scale[0]).toBe(key);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test
```

Expected: FAIL — module `./scales` does not exist.

- [ ] **Step 3: Write failing tests for getIntervalRole**

Append to `src/theory/scales.test.ts`:

```ts
describe("getIntervalRole", () => {
  it("identifies root in C major", () => {
    expect(getIntervalRole("C", "C")).toBe("root");
  });

  it("identifies all intervals in C major", () => {
    expect(getIntervalRole("C", "C")).toBe("root");
    expect(getIntervalRole("C", "D")).toBe("second");
    expect(getIntervalRole("C", "E")).toBe("third");
    expect(getIntervalRole("C", "F")).toBe("fourth");
    expect(getIntervalRole("C", "G")).toBe("fifth");
    expect(getIntervalRole("C", "A")).toBe("sixth");
    expect(getIntervalRole("C", "B")).toBe("seventh");
  });

  it("identifies intervals in G major", () => {
    expect(getIntervalRole("G", "G")).toBe("root");
    expect(getIntervalRole("G", "B")).toBe("third");
    expect(getIntervalRole("G", "D")).toBe("fifth");
    expect(getIntervalRole("G", "F#")).toBe("seventh");
  });

  it("returns null for notes outside the scale", () => {
    expect(getIntervalRole("C", "C#")).toBeNull();
    expect(getIntervalRole("C", "Eb")).toBeNull();
    expect(getIntervalRole("G", "Bb")).toBeNull();
  });

  it("handles enharmonic equivalents", () => {
    // F# in G major = seventh, should also work if passed as Gb
    expect(getIntervalRole("G", "Gb")).toBe("seventh");
  });
});
```

- [ ] **Step 4: Implement scales.ts**

Create `src/theory/scales.ts`:

```ts
import { getNoteIndex, getDisplayName, CHROMATIC_SCALE } from "./notes";
import type { IntervalRole } from "./types";

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const;

const INTERVAL_NAMES: IntervalRole[] = [
  "root",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
];

export function getMajorScaleNotes(key: string): string[] {
  const rootIndex = getNoteIndex(key);
  return MAJOR_SCALE_INTERVALS.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12;
    const sharpName = CHROMATIC_SCALE[noteIndex];
    return getDisplayName(sharpName, key);
  });
}

export function getIntervalRole(key: string, note: string): IntervalRole | null {
  const noteIndex = getNoteIndex(note);
  const rootIndex = getNoteIndex(key);
  const semitones = (noteIndex - rootIndex + 12) % 12;
  const intervalIndex = MAJOR_SCALE_INTERVALS.indexOf(
    semitones as (typeof MAJOR_SCALE_INTERVALS)[number],
  );
  if (intervalIndex === -1) return null;
  return INTERVAL_NAMES[intervalIndex];
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test
```

Expected: All tests in `scales.test.ts` and `notes.test.ts` PASS.

- [ ] **Step 6: Commit**

```bash
git add src/theory/scales.ts src/theory/scales.test.ts
git commit -m "feat: add scales module with major scale construction and interval detection"
```

---

### Task 5: NoteCircle Component

**Files:**

- Create: `src/components/Fretboard/NoteCircle.tsx`

- [ ] **Step 1: Create NoteCircle component**

Create `src/components/Fretboard/NoteCircle.tsx`:

```tsx
import type { NoteDisplayRole } from "../../theory/types";

const ROLE_COLORS: Record<NoteDisplayRole, string> = {
  root: "var(--color-root)",
  third: "var(--color-third)",
  fifth: "var(--color-fifth)",
  seventh: "var(--color-seventh)",
  scale: "var(--color-scale)",
  muted: "var(--color-muted)",
};

type NoteCircleProps = {
  cx: number;
  cy: number;
  note: string;
  role: NoteDisplayRole;
};

export function NoteCircle({ cx, cy, note, role }: NoteCircleProps) {
  const color = ROLE_COLORS[role];
  const isMuted = role === "muted";
  const radius = isMuted ? 10 : 13;
  const fontSize = isMuted ? 9 : 11;

  return (
    <g opacity={isMuted ? 0.4 : 1}>
      <circle cx={cx} cy={cy} r={radius} fill={color} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {note}
      </text>
    </g>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Fretboard/NoteCircle.tsx
git commit -m "feat: add NoteCircle SVG component with role-based coloring"
```

---

### Task 6: FretMarkers Component

**Files:**

- Create: `src/components/Fretboard/FretMarkers.tsx`

- [ ] **Step 1: Create FretMarkers component**

Create `src/components/Fretboard/FretMarkers.tsx`:

```tsx
type FretMarkersProps = {
  fretX: (fret: number) => number;
  boardTop: number;
  boardBottom: number;
};

const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15];
const DOUBLE_DOT_FRET = 12;

export function FretMarkers({ fretX, boardTop, boardBottom }: FretMarkersProps) {
  const midY = (boardTop + boardBottom) / 2;
  const dotOffset = (boardBottom - boardTop) / 5;

  return (
    <g>
      {SINGLE_DOT_FRETS.map((fret) => (
        <circle
          key={fret}
          cx={fretX(fret)}
          cy={midY}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />
      ))}
      {/* Double dot at fret 12 */}
      <circle
        cx={fretX(DOUBLE_DOT_FRET)}
        cy={midY - dotOffset}
        r={5}
        fill="var(--color-fret)"
        opacity={0.4}
      />
      <circle
        cx={fretX(DOUBLE_DOT_FRET)}
        cy={midY + dotOffset}
        r={5}
        fill="var(--color-fret)"
        opacity={0.4}
      />
    </g>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Fretboard/FretMarkers.tsx
git commit -m "feat: add FretMarkers component for fret position dots"
```

---

### Task 7: FretboardString Component

**Files:**

- Create: `src/components/Fretboard/FretboardString.tsx`

- [ ] **Step 1: Create FretboardString component**

Create `src/components/Fretboard/FretboardString.tsx`:

```tsx
type FretboardStringProps = {
  stringIndex: number; // 0 = low E (bottom), 5 = high E (top)
  y: number;
  xStart: number;
  xEnd: number;
};

export function FretboardString({
  stringIndex,
  y,
  xStart,
  xEnd,
}: FretboardStringProps) {
  // Lower strings (index 0) are thicker, higher strings (index 5) are thinner
  const strokeWidth = 2.5 - stringIndex * 0.3;

  return (
    <line
      x1={xStart}
      y1={y}
      x2={xEnd}
      y2={y}
      stroke="var(--color-string)"
      strokeWidth={strokeWidth}
    />
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Fretboard/FretboardString.tsx
git commit -m "feat: add FretboardString component with variable string thickness"
```

---

### Task 8: Main Fretboard Component

**Files:**

- Create: `src/components/Fretboard/Fretboard.tsx`

- [ ] **Step 1: Create the main Fretboard component**

Create `src/components/Fretboard/Fretboard.tsx`:

```tsx
import type { NoteMarker } from "../../theory/types";
import { FretboardString } from "./FretboardString";
import { FretMarkers } from "./FretMarkers";
import { NoteCircle } from "./NoteCircle";

type FretboardProps = {
  markers: NoteMarker[];
  fretCount?: number;
};

const PADDING = { top: 20, bottom: 40, left: 50, right: 20 };
const STRING_SPACING = 30;
const NUM_STRINGS = 6;

export function Fretboard({ markers, fretCount = 15 }: FretboardProps) {
  const boardTop = PADDING.top;
  const boardBottom = PADDING.top + (NUM_STRINGS - 1) * STRING_SPACING;
  const boardWidth = 900;
  const fretSpacing = boardWidth / fretCount;
  const nutX = PADDING.left;
  const totalWidth = PADDING.left + boardWidth + PADDING.right;
  const totalHeight = boardBottom + PADDING.bottom;

  // Returns the x position at the center of a fret (between fret n-1 and fret n).
  // For fret 0 (open), returns a position to the left of the nut.
  function fretCenterX(fret: number): number {
    if (fret === 0) return nutX - 20;
    return nutX + (fret - 0.5) * fretSpacing;
  }

  // Returns the x position of the fret wire itself (for dot markers).
  function fretX(fret: number): number {
    return nutX + (fret - 0.5) * fretSpacing;
  }

  // String index 0 = low E = bottom, index 5 = high E = top
  function stringY(stringIndex: number): number {
    return boardBottom - stringIndex * STRING_SPACING;
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full max-w-6xl"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Fretboard background */}
      <rect
        x={nutX}
        y={boardTop - 10}
        width={boardWidth}
        height={boardBottom - boardTop + 20}
        rx={4}
        fill="var(--color-fretboard)"
      />

      {/* Fret markers (dots) — rendered behind strings and notes */}
      <FretMarkers fretX={fretX} boardTop={boardTop} boardBottom={boardBottom} />

      {/* Nut */}
      <line
        x1={nutX}
        y1={boardTop - 10}
        x2={nutX}
        y2={boardBottom + 10}
        stroke="var(--color-text)"
        strokeWidth={4}
      />

      {/* Fret lines */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map((fret) => (
        <line
          key={fret}
          x1={nutX + fret * fretSpacing}
          y1={boardTop - 10}
          x2={nutX + fret * fretSpacing}
          y2={boardBottom + 10}
          stroke="var(--color-fret)"
          strokeWidth={1.5}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => i).map((stringIndex) => (
        <FretboardString
          key={stringIndex}
          stringIndex={stringIndex}
          y={stringY(stringIndex)}
          xStart={nutX}
          xEnd={nutX + boardWidth}
        />
      ))}

      {/* Fret numbers */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map((fret) => (
        <text
          key={fret}
          x={nutX + (fret - 0.5) * fretSpacing}
          y={boardBottom + 30}
          textAnchor="middle"
          fill="var(--color-scale)"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {fret}
        </text>
      ))}

      {/* Note markers */}
      {markers.map((marker) => (
        <NoteCircle
          key={`${marker.string}-${marker.fret}`}
          cx={fretCenterX(marker.fret)}
          cy={stringY(marker.string)}
          note={marker.note}
          role={marker.role}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Fretboard/Fretboard.tsx
git commit -m "feat: add main Fretboard SVG component with strings, frets, nut, and note rendering"
```

---

### Task 9: KeySelector Component

**Files:**

- Create: `src/components/KeySelector.tsx`

- [ ] **Step 1: Create KeySelector component**

Create `src/components/KeySelector.tsx`:

```tsx
const KEYS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

type KeySelectorProps = {
  selectedKey: string;
  onKeyChange: (key: string) => void;
};

export function KeySelector({ selectedKey, onKeyChange }: KeySelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {KEYS.map((key) => (
        <button
          key={key}
          onClick={() => onKeyChange(key)}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
            selectedKey === key
              ? "bg-[var(--color-root)] text-white"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/KeySelector.tsx
git commit -m "feat: add KeySelector component with 12-key picker"
```

---

### Task 10: ViewSelector Component

**Files:**

- Create: `src/components/ViewSelector.tsx`

- [ ] **Step 1: Create ViewSelector component**

Create `src/components/ViewSelector.tsx`:

```tsx
const VIEWS = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-tones", label: "Chord Tones" },
  { id: "diatonic-chords", label: "Diatonic Chords" },
  { id: "shell-voicings", label: "Shell Voicings" },
  { id: "triad-shapes", label: "Triad Shapes" },
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
              ? "bg-gray-700 text-white"
              : "bg-transparent text-gray-400 hover:text-gray-200"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ViewSelector.tsx
git commit -m "feat: add ViewSelector tab component with placeholder views"
```

---

### Task 11: Legend Component

**Files:**

- Create: `src/components/Legend.tsx`

- [ ] **Step 1: Create Legend component**

Create `src/components/Legend.tsx`:

```tsx
const LEGEND_ITEMS = [
  { label: "Root", color: "var(--color-root)" },
  { label: "3rd", color: "var(--color-third)" },
  { label: "5th", color: "var(--color-fifth)" },
  { label: "7th", color: "var(--color-seventh)" },
];

export function Legend() {
  return (
    <div className="flex gap-4 text-sm">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Legend.tsx
git commit -m "feat: add Legend component for interval color reference"
```

---

### Task 12: Wire Up App — End-to-End Integration

**Files:**

- Modify: `src/App.tsx`
- Create: `src/views/NoteMapView.tsx`

- [ ] **Step 1: Create NoteMapView that computes markers from theory layer**

Create `src/views/NoteMapView.tsx`:

```tsx
import { useMemo } from "react";
import { Fretboard } from "../components/Fretboard/Fretboard";
import { STANDARD_TUNING, getNoteAtFret, getDisplayName } from "../theory/notes";
import { getMajorScaleNotes, getIntervalRole } from "../theory/scales";
import type { NoteMarker, NoteDisplayRole } from "../theory/types";

type NoteMapViewProps = {
  selectedKey: string;
};

const FRET_COUNT = 15;

export function NoteMapView({ selectedKey }: NoteMapViewProps) {
  const markers = useMemo(() => {
    const scaleNotes = getMajorScaleNotes(selectedKey);
    const result: NoteMarker[] = [];

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex];
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const note = getNoteAtFret(openString, fret);
        const interval = getIntervalRole(selectedKey, note);
        if (interval === null) continue;

        let role: NoteDisplayRole = "scale";
        if (interval === "root") role = "root";

        result.push({
          string: stringIndex,
          fret,
          note: getDisplayName(note, selectedKey),
          role,
        });
      }
    }

    return result;
  }, [selectedKey]);

  return <Fretboard markers={markers} fretCount={FRET_COUNT} />;
}
```

- [ ] **Step 2: Wire up App.tsx with all components**

Replace `src/App.tsx`:

```tsx
import { useState } from "react";
import { KeySelector } from "./components/KeySelector";
import { ViewSelector } from "./components/ViewSelector";
import { Legend } from "./components/Legend";
import { NoteMapView } from "./views/NoteMapView";

function App() {
  const [selectedKey, setSelectedKey] = useState("C");
  const [selectedView, setSelectedView] = useState("note-map");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-4">
      <header className="max-w-6xl mx-auto space-y-4 mb-6">
        <h1 className="text-2xl font-bold">Fretlab</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">
              Key
            </label>
            <KeySelector selectedKey={selectedKey} onKeyChange={setSelectedKey} />
          </div>
        </div>
        <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
        <Legend />
      </header>

      <main className="max-w-6xl mx-auto">
        {selectedView === "note-map" ? (
          <NoteMapView selectedKey={selectedKey} />
        ) : (
          <div className="text-gray-500 text-center py-20">Coming soon</div>
        )}
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 3: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: Both pass with no errors.

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: All theory tests pass.

- [ ] **Step 5: Manual verification in browser**

```bash
npm run dev
```

Verify:

- Dark background, "Fretlab" heading
- Key selector shows 12 keys, C is selected by default
- Fretboard displays with correct SVG rendering: nut, frets, strings, fret markers
- Notes of C major scale appear on the fretboard with root notes (C) in blue and other
  scale tones in gray
- Switching to G major: all F notes disappear, F# appears, G notes turn blue
- View tabs visible, other tabs show "Coming soon"
- Legend shows Root, 3rd, 5th, 7th colors

- [ ] **Step 6: Commit**

```bash
git add src/views/NoteMapView.tsx src/App.tsx
git commit -m "feat: wire up App with NoteMapView showing major scale on fretboard"
```

---

### Task 13: Clean Up Vite Scaffold Remnants

**Files:**

- Delete: `src/App.css`, `src/assets/react.svg`, `public/vite.svg`
- Modify: `src/main.tsx` (remove App.css import if present)
- Modify: `index.html` (update title)

- [ ] **Step 1: Remove unused scaffold files and update metadata**

```bash
rm -f src/App.css src/assets/react.svg public/vite.svg
```

Update `index.html` title to `Fretlab`.

Update `src/main.tsx` to ensure it only imports `index.css` (remove any `App.css`
import).

- [ ] **Step 2: Run build and lint**

```bash
npm run build && npm run lint
```

Expected: Both pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: clean up Vite scaffold remnants and set page title"
```
