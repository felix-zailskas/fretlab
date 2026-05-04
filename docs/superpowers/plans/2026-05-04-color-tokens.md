# Color Token Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every hardcoded Tailwind palette color in React components with semantic tokens defined in a Tailwind v4 `@theme` block, so call sites read as `bg-surface-raised`, `text-fg-muted`, etc.

**Architecture:** All tokens live in a single `@theme {}` block in `src/index.css`. Tailwind v4 emits both CSS custom properties (used by SVG attributes) and utility classes (used by JSX className). Migration is a mechanical, file-by-file class swap — no logic, type, or test changes.

**Tech Stack:** Tailwind CSS v4, React 19, TypeScript, Vite, Vitest

**Spec:** `docs/superpowers/specs/2026-05-04-color-tokens-design.md`

---

### Task 1: Define tokens and migrate App.tsx

**Files:**
- Modify: `src/index.css`
- Modify: `src/App.tsx`

These two are migrated atomically because `App.tsx` is the only consumer of the `--color-bg` and `--color-text` tokens that get renamed. Splitting the change would leave the build referencing names that no longer exist.

- [ ] **Step 1: Replace `src/index.css` with the full `@theme` token set**

```css
@import "tailwindcss";

@theme {
  /* Surfaces — backgrounds, dark to active */
  --color-surface:         #111827;
  --color-surface-raised:  #1F2937;
  --color-surface-active:  #374151;

  /* Borders — subtle to strong. Named "line" so utilities don't double up the border- prefix. */
  --color-line:          #374151;
  --color-line-emphasis: #4B5563;
  --color-line-hover:    #6B7280;
  --color-line-selected: rgb(255 255 255 / 0.9);

  /* Foreground (text) — emphasis to faint */
  --color-fg-primary:      #F9FAFB;
  --color-fg-secondary:    #D1D5DB;
  --color-fg-muted:        #9CA3AF;
  --color-fg-faint:        #6B7280;
  --color-fg-emphasis:     #FFFFFF;

  /* Theory roles — chord/scale interval colors */
  --color-root:            #3B82F6;
  --color-third:           #F59E0B;
  --color-fifth:           #10B981;
  --color-seventh:         #8B5CF6;
  --color-scale:           #6B7280;
  --color-muted:           #374151;

  /* Fretboard render */
  --color-fretboard:       #292524;
  --color-string:          #9CA3AF;
  --color-fret:            #6B7280;
}
```

- [ ] **Step 2: Replace `src/App.tsx`**

```tsx
import { useCallback, useMemo, useState } from 'react'
import { AccidentalToggle } from './components/AccidentalToggle'
import { KeySelector, ALL_NOTES_KEY } from './components/KeySelector'
import { ViewSelector } from './components/ViewSelector'
import { Legend, type HighlightableRole } from './components/Legend'
import { ScaleDisplay } from './components/ScaleDisplay'
import { DiatonicChords } from './components/DiatonicChords'
import { NoteMapView } from './views/NoteMapView'
import type { AccidentalStyle } from './theory/notes'
import { getDiatonicChords } from './theory/scales'

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ['root', 'third', 'fifth', 'seventh']

const ENHARMONIC_KEY_SWAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
}

function App() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedView, setSelectedView] = useState('note-map')
  const [accidentalStyle, setAccidentalStyle] = useState<AccidentalStyle>('flat')
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  )
  const [selectedChordDegree, setSelectedChordDegree] = useState<number | null>(1)

  const selectedChord = useMemo(() => {
    if (selectedChordDegree === null || selectedKey === ALL_NOTES_KEY) return null
    const chords = getDiatonicChords(selectedKey, accidentalStyle)
    return chords[selectedChordDegree - 1] ?? null
  }, [selectedChordDegree, selectedKey, accidentalStyle])

  const handleChordSelect = useCallback((degree: number) => {
    setSelectedChordDegree((prev) => (prev === degree ? null : degree))
  }, [])

  const toggleHighlight = useCallback((role: HighlightableRole) => {
    setEnabledHighlights((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }, [])

  const handleAccidentalChange = useCallback((next: AccidentalStyle) => {
    setAccidentalStyle((prev) => {
      if (prev !== next) {
        // Swap the selected key to its enharmonic equivalent so we stay on the same scale.
        setSelectedKey((prevKey) =>
          prevKey === ALL_NOTES_KEY ? prevKey : ENHARMONIC_KEY_SWAP[prevKey] ?? prevKey,
        )
      }
      return next
    })
  }, [])

  return (
    <div className="min-h-screen bg-surface text-fg-primary p-4">
      <header className="max-w-6xl mx-auto space-y-4 mb-6">
        <h1 className="text-2xl font-bold">Fretlab</h1>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="text-xs text-fg-muted uppercase tracking-wide block mb-1">Key</label>
            <KeySelector
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              onKeyChange={setSelectedKey}
            />
          </div>
          <AccidentalToggle accidentalStyle={accidentalStyle} onChange={handleAccidentalChange} />
        </div>
        <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
        <ScaleDisplay selectedKey={selectedKey} accidentalStyle={accidentalStyle} />
      </header>

      <main className="max-w-6xl mx-auto">
        {selectedView === 'note-map' ? (
          <>
            <NoteMapView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={enabledHighlights}
              selectedChord={selectedChord}
            />
            <div className="mt-4">
              <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
            </div>
            <DiatonicChords
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              selectedDegree={selectedChordDegree}
              onSelectDegree={handleChordSelect}
            />
          </>
        ) : (
          <div className="text-fg-faint text-center py-20">
            Coming soon
          </div>
        )}
      </main>
    </div>
  )
}

export default App
```

- [ ] **Step 3: Verify build, lint, and tests pass**

```bash
npm run build && npm run lint && npm run test
```

Expected: build succeeds, lint clean, all 36 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/App.tsx
git commit -m "refactor: introduce semantic color tokens via @theme and migrate App"
```

---

### Task 2: Migrate KeySelector

**Files:**
- Modify: `src/components/KeySelector.tsx`

Color changes:
- `bg-[var(--color-root)]` → `bg-root`
- `text-white` → `text-fg-emphasis`
- `bg-gray-800` → `bg-surface-raised`
- `text-gray-300` → `text-fg-secondary`
- `hover:bg-gray-700` → `hover:bg-surface-active`

- [ ] **Step 1: Replace `src/components/KeySelector.tsx`**

```tsx
import type { AccidentalStyle } from '../theory/notes'

export const ALL_NOTES_KEY = 'all'

const FLAT_STYLE_KEYS = [ALL_NOTES_KEY, 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const SHARP_STYLE_KEYS = [ALL_NOTES_KEY, 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const KEY_LABELS: Record<string, string> = {
  [ALL_NOTES_KEY]: 'All',
}

type KeySelectorProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  onKeyChange: (key: string) => void
}

export function KeySelector({ selectedKey, accidentalStyle, onKeyChange }: KeySelectorProps) {
  const keys = accidentalStyle === 'sharp' ? SHARP_STYLE_KEYS : FLAT_STYLE_KEYS

  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKeyChange(key)}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
            selectedKey === key
              ? 'bg-root text-fg-emphasis'
              : 'bg-surface-raised text-fg-secondary hover:bg-surface-active'
          }`}
        >
          {KEY_LABELS[key] ?? key}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/KeySelector.tsx
git commit -m "refactor(KeySelector): migrate to color tokens"
```

---

### Task 3: Migrate AccidentalToggle

**Files:**
- Modify: `src/components/AccidentalToggle.tsx`

Color changes:
- `border-gray-700` → `border-line`
- `bg-gray-700` → `bg-surface-active`
- `text-white` → `text-fg-emphasis`
- `bg-gray-900` → `bg-surface`
- `text-gray-400` → `text-fg-muted`
- `hover:bg-gray-800` → `hover:bg-surface-raised`

- [ ] **Step 1: Replace `src/components/AccidentalToggle.tsx`**

```tsx
import type { AccidentalStyle } from '../theory/notes'

const OPTIONS: { value: AccidentalStyle; label: string }[] = [
  { value: 'flat', label: '♭' },
  { value: 'sharp', label: '♯' },
]

type AccidentalToggleProps = {
  accidentalStyle: AccidentalStyle
  onChange: (style: AccidentalStyle) => void
}

export function AccidentalToggle({ accidentalStyle, onChange }: AccidentalToggleProps) {
  return (
    <div className="inline-flex rounded overflow-hidden border border-line">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={accidentalStyle === opt.value}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
            accidentalStyle === opt.value
              ? 'bg-surface-active text-fg-emphasis'
              : 'bg-surface text-fg-muted hover:bg-surface-raised'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/AccidentalToggle.tsx
git commit -m "refactor(AccidentalToggle): migrate to color tokens"
```

---

### Task 4: Migrate ViewSelector

**Files:**
- Modify: `src/components/ViewSelector.tsx`

Color changes:
- `bg-gray-700` → `bg-surface-active`
- `text-white` → `text-fg-emphasis`
- `text-gray-400` → `text-fg-muted`
- `hover:text-gray-200` → `hover:text-fg-secondary`

- [ ] **Step 1: Replace `src/components/ViewSelector.tsx`**

```tsx
const VIEWS = [
  { id: 'note-map', label: 'Note Map' },
  { id: 'scale-positions', label: 'Scale Positions' },
  { id: 'chord-tones', label: 'Chord Tones' },
  { id: 'diatonic-chords', label: 'Diatonic Chords' },
  { id: 'shell-voicings', label: 'Shell Voicings' },
  { id: 'triad-shapes', label: 'Triad Shapes' },
]

type ViewSelectorProps = {
  selectedView: string
  onViewChange: (view: string) => void
}

export function ViewSelector({ selectedView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
            selectedView === view.id
              ? 'bg-surface-active text-fg-emphasis'
              : 'bg-transparent text-fg-muted hover:text-fg-secondary'
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ViewSelector.tsx
git commit -m "refactor(ViewSelector): migrate to color tokens"
```

---

### Task 5: Migrate Legend

**Files:**
- Modify: `src/components/Legend.tsx`

Color changes:
- `hover:bg-gray-800` → `hover:bg-surface-raised`
- `text-gray-300` → `text-fg-secondary`

- [ ] **Step 1: Replace `src/components/Legend.tsx`**

```tsx
import type { NoteDisplayRole } from '../theory/types'

export type HighlightableRole = Extract<NoteDisplayRole, 'root' | 'third' | 'fifth' | 'seventh'>

const LEGEND_ITEMS: { label: string; role: HighlightableRole; color: string }[] = [
  { label: 'Root', role: 'root', color: 'var(--color-root)' },
  { label: '3rd', role: 'third', color: 'var(--color-third)' },
  { label: '5th', role: 'fifth', color: 'var(--color-fifth)' },
  { label: '7th', role: 'seventh', color: 'var(--color-seventh)' },
]

type LegendProps = {
  enabledRoles: Set<HighlightableRole>
  onToggleRole: (role: HighlightableRole) => void
}

export function Legend({ enabledRoles, onToggleRole }: LegendProps) {
  return (
    <div className="flex gap-3 text-sm">
      {LEGEND_ITEMS.map((item) => {
        const isEnabled = enabledRoles.has(item.role)
        return (
          <button
            key={item.label}
            onClick={() => onToggleRole(item.role)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-opacity cursor-pointer hover:bg-surface-raised ${
              isEnabled ? 'opacity-100' : 'opacity-40'
            }`}
            aria-pressed={isEnabled}
          >
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-fg-secondary">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Legend.tsx
git commit -m "refactor(Legend): migrate to color tokens"
```

---

### Task 6: Migrate ScaleDisplay

**Files:**
- Modify: `src/components/ScaleDisplay.tsx`

Color changes:
- `text-gray-400` → `text-fg-muted` (two occurrences: section label and degree number)
- `bg-gray-800` → `bg-surface-raised`
- `border-gray-700` → `border-line`
- `text-gray-100` → `text-fg-secondary`
- Half-step pill: `bg-blue-900/25 text-blue-300/80 border-blue-800/40` → `bg-root/25 text-root/80 border-root/40`
- Whole-step pill: `bg-emerald-900/25 text-emerald-300/80 border-emerald-800/40` → `bg-fifth/25 text-fifth/80 border-fifth/40`

- [ ] **Step 1: Replace `src/components/ScaleDisplay.tsx`**

```tsx
import type { AccidentalStyle } from '../theory/notes'
import { getMajorScaleNotes, MAJOR_SCALE_STEPS } from '../theory/scales'
import { ALL_NOTES_KEY } from './KeySelector'

const DEGREE_LABELS = ['1', '2', '3', '4', '5', '6', '7']

type ScaleDisplayProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
}

export function ScaleDisplay({ selectedKey, accidentalStyle }: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null

  const notes = getMajorScaleNotes(selectedKey, accidentalStyle)

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-fg-muted uppercase tracking-wide">
        {selectedKey} major
      </span>
      {notes.map((note, i) => (
        <div key={`${i}-${note}`} className="flex items-center gap-2">
          <div className="flex items-baseline gap-1 px-2 py-1 rounded bg-surface-raised border border-line">
            <span className="text-xs text-fg-muted">{DEGREE_LABELS[i]}</span>
            <span className="text-fg-secondary font-semibold">{note}</span>
          </div>
          {i < notes.length - 1 && (
            <span
              className={`px-2 py-0.5 rounded text-sm font-medium tracking-wide border ${
                MAJOR_SCALE_STEPS[i] === 'half'
                  ? 'bg-root/25 text-root/80 border-root/40'
                  : 'bg-fifth/25 text-fifth/80 border-fifth/40'
              }`}
              title={MAJOR_SCALE_STEPS[i] === 'half' ? 'Half step' : 'Whole step'}
            >
              {MAJOR_SCALE_STEPS[i] === 'half' ? 'H' : 'F'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ScaleDisplay.tsx
git commit -m "refactor(ScaleDisplay): migrate to color tokens"
```

---

### Task 7: Migrate DiatonicChords

**Files:**
- Modify: `src/components/DiatonicChords.tsx`

Color changes:
- `border-gray-600` → `border-line-emphasis`
- `border-gray-700` → `border-line`
- `bg-gray-800`, `bg-gray-800/80` → `bg-surface-raised` (the `/80` shade collapses per spec)
- `text-gray-300` → `text-fg-secondary`
- `border-white/90` → `border-line-selected`
- `bg-gray-700` → `bg-surface-active`
- `hover:border-gray-500` → `hover:border-line-hover`
- `text-gray-400` → `text-fg-muted`
- `text-white` → `text-fg-emphasis`
- `text-gray-200` → `text-fg-secondary`

- [ ] **Step 1: Replace `src/components/DiatonicChords.tsx`**

```tsx
import type { AccidentalStyle } from '../theory/notes'
import { getDiatonicChords, type ChordQuality } from '../theory/scales'
import { ALL_NOTES_KEY } from './KeySelector'

type DiatonicChordsProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  selectedDegree: number | null
  onSelectDegree: (degree: number) => void
}

const QUALITY_ACCENT: Record<ChordQuality, string> = {
  maj7: 'border-line-emphasis bg-surface-raised',
  m7: 'border-line bg-surface-raised',
  '7': 'border-line bg-surface-raised',
  m7b5: 'border-line bg-surface-raised',
}

export function DiatonicChords({
  selectedKey,
  accidentalStyle,
  selectedDegree,
  onSelectDegree,
}: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null

  const chords = getDiatonicChords(selectedKey, accidentalStyle)

  return (
    <section className="mt-8">
      <h2 className="text-sm text-fg-secondary uppercase tracking-wider font-semibold mb-3">
        Diatonic chords
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {chords.map((chord) => {
          const isSelected = selectedDegree === chord.degree
          return (
            <button
              key={chord.degree}
              type="button"
              onClick={() => onSelectDegree(chord.degree)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-3 px-4 py-8 min-h-[10rem] rounded-xl border-2 shadow-lg cursor-pointer transition-colors ${
                isSelected
                  ? 'border-line-selected bg-surface-active'
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
                {chord.notes.join(' – ')}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify build and lint pass**

```bash
npm run build && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DiatonicChords.tsx
git commit -m "refactor(DiatonicChords): migrate to color tokens"
```

---

### Task 8: Final verification

**Files:**
- None modified — verification only

- [ ] **Step 1: Confirm no Tailwind palette utilities remain in components or views**

```bash
grep -rEn '(bg|text|border|ring|fill|stroke|from|to|via)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white)(-[0-9]+)?(\/[0-9]+)?' src/components src/views src/App.tsx
```

Expected: no output (zero matches). If any match appears, it's a missed migration — fix that file using the patterns from Tasks 2–7, re-run, then continue.

- [ ] **Step 2: Confirm old token names are fully replaced**

```bash
grep -rEn 'var\(--color-bg\)|var\(--color-text\)' src/
```

Expected: no output. The old `--color-bg` and `--color-text` names should appear nowhere.

- [ ] **Step 3: Run full build, lint, and test suite**

```bash
npm run build && npm run lint && npm run test
```

Expected: build succeeds, lint clean, all 36 tests pass.

- [ ] **Step 4: Manual visual smoke test**

```bash
npm run dev
```

Open `http://localhost:5173/` and verify:
- Page background is the same dark gray as before.
- Key selector: selected key has blue background (`--color-root`), white text. Unselected keys have raised gray bg, lighter text, hover slightly brighter.
- ♭/♯ toggle: same look as before.
- View tabs: selected tab has gray-active bg + white text.
- Scale display chips read e.g. "1 C 2 D 3 E 4 F …" with bordered chips and pill-style "F" (greenish) and "H" (bluish) indicators between them. The H pill should now have a subtle gradient flattening — visually near-identical to before.
- Diatonic chord cards: I card highlighted with white border + active gray bg. Other cards have raised-gray bg with default borders (the `gray-800/80` shade is gone — all four quality types share the same bg). Hover lifts border color.
- Click a chord: white border switches, fretboard highlight colors track the chord's root/3rd/5th/7th.
- Toggle Legend items: same on/off behavior.
- Stop the dev server (Ctrl-C).

- [ ] **Step 5: No commit needed**

Task 8 is verification only. If everything passes, the refactor is complete.

---

## Coverage Summary

| Spec section | Implemented in |
|---|---|
| Token taxonomy (`@theme` block, 17 tokens) | Task 1 |
| Rename `--color-bg` → `--color-surface` | Task 1 |
| Rename `--color-text` → `--color-fg-primary` | Task 1 |
| Replacement mapping table (every row) | Tasks 2–7 |
| `gray-800/80` collapse to solid `surface-raised` | Task 7 |
| `gray-100`/`200`/`300` text collapse to `fg-secondary` | Tasks 6 (gray-100), 7 (gray-200, gray-300), 5 (gray-300), 4 (gray-200) |
| Step-pill recolor (blue → root, emerald → fifth) | Task 6 |
| SVG attributes unchanged (Fretboard*.tsx, NoteCircle.tsx, FretMarkers.tsx, FretboardString.tsx) | n/a — none referenced renamed tokens |
| Verification: grep, build, lint, tests, manual smoke | Task 8 |
