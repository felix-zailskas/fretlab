# About Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or superpowers:executing-plans
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an (i) button to the header that opens a modal with an About section
(description, author credit, repo link) and a How to Use section (three views, controls
reference, keyboard shortcuts).

**Architecture:** A new `AboutModal` component renders a fixed-position overlay when
`open` is true and unmounts when closed (enabling CSS `@starting-style` entry
animations). `App.tsx` owns a `showAbout` boolean and places an (i) icon button in the
header's top-right controls bar. Two new CSS blocks in `index.css` animate the backdrop
fade and panel scale-in.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library

---

## Files

| File                                 | Change                                                                |
| ------------------------------------ | --------------------------------------------------------------------- |
| `src/index.css`                      | Add `[data-modal-backdrop]` and `[data-modal-panel]` entry animations |
| `src/components/AboutModal.tsx`      | Create — modal component with all content                             |
| `src/components/AboutModal.test.tsx` | Create — unit tests                                                   |
| `src/App.tsx`                        | Add `showAbout` state, (i) button in header, `<AboutModal>` render    |

---

### Task 1: AboutModal component — TDD

**Files:**

- Create: `src/components/AboutModal.test.tsx`
- Create: `src/components/AboutModal.tsx`
- Modify: `src/index.css` (lines 183–184, after `[data-popover]` block)

- [ ] **Step 1: Add modal CSS to `src/index.css`**

Insert immediately after the closing `}` of the `[data-popover]` block (after line 183):

```css
/* Modal backdrop fade and panel scale-in. Components opt in via
   data-modal-backdrop / data-modal-panel. Exit is instant (unmount on close). */
[data-modal-backdrop] {
  transition: opacity 200ms ease-out;

  @starting-style {
    opacity: 0;
  }
}

[data-modal-panel] {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 200ms ease-out,
    transform 200ms ease-out;

  @starting-style {
    opacity: 0;
    transform: scale(0.96);
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/components/AboutModal.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AboutModal } from "./AboutModal";

describe("AboutModal", () => {
  it("renders nothing when closed", () => {
    render(<AboutModal open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders dialog when open", () => {
    render(<AboutModal open={true} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<AboutModal open={true} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    render(<AboutModal open={true} onClose={onClose} />);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("contains author credit and GitHub link", () => {
    render(<AboutModal open={true} onClose={() => {}} />);
    expect(screen.getByText(/Felix Zailskas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Source on GitHub/ })).toHaveAttribute(
      "href",
      "https://github.com/felix-zailskas/fretlab",
    );
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- AboutModal
```

Expected: 5 failures — `AboutModal` does not exist yet.

- [ ] **Step 4: Create `src/components/AboutModal.tsx`**

```tsx
import { Fragment, useEffect } from "react";

type AboutModalProps = {
  open: boolean;
  onClose: () => void;
};

const CLOSE_ICON = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2 2l10 10M12 2L2 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const CONTROLS = [
  ["Key", "Pick any of the 12 keys, or All Notes to see the full chromatic set."],
  [
    "Mode",
    "Switch between the 7 diatonic modes. The chord row, CAGED windows, and characteristic-tone markers re-anchor automatically.",
  ],
  [
    "Chord row",
    "Select any of the 7 diatonic chords. Toggle between Triads and Sevenths.",
  ],
  [
    "R 3 5 7",
    "Show or hide each chord-tone role on the fretboard. The 7th toggle is only active in Sevenths mode.",
  ],
  ["♭ / ♯", "Toggle between flat and sharp accidental display."],
  ["Fret range", "Configure which frets are visible (0–24)."],
  [
    "Tuning",
    "Choose from 18 presets: Standard, open, drop, DADGAD, All Fourths, and more.",
  ],
] as const;

const SHORTCUTS = [
  ["1 – 7", "Select chord degree"],
  ["t", "Switch to Triads mode"],
  ["s", "Switch to Sevenths mode"],
] as const;

export function AboutModal({ open, onClose }: AboutModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-modal-backdrop=""
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 md:p-8 bg-black/50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-modal-panel=""
        role="dialog"
        aria-modal="true"
        aria-label="About Fretlab"
        className="relative w-full max-w-2xl my-auto rounded-xl border border-line bg-surface shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line">
          <h2 className="text-base font-bold">About Fretlab</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded text-fg-muted hover:bg-surface-raised hover:text-fg-primary cursor-pointer transition-colors"
          >
            {CLOSE_ICON}
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 text-sm text-fg-secondary">
          {/* About */}
          <section className="space-y-2">
            <p>
              Fretlab is a key-aware fretboard reference for intermediate and advanced
              guitarists, built to sit on a music stand and answer theory questions fast
              enough not to break your practice flow.
            </p>
            <p className="text-fg-muted">
              Built by{" "}
              <span className="text-fg-secondary font-medium">Felix Zailskas</span>
              {" · "}MIT licensed{" · "}
              <a
                href="https://github.com/felix-zailskas/fretlab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg-secondary underline hover:text-fg-primary"
              >
                Source on GitHub
              </a>
            </p>
          </section>

          {/* Three views */}
          <section className="space-y-4">
            <h3 className="text-base font-semibold text-fg-primary">The three views</h3>

            <div className="space-y-1">
              <h4 className="font-semibold text-fg-primary">Note Map</h4>
              <p>
                Visualise every in-key note across the full neck. Select any chord from
                the diatonic row and the root, 3rd, 5th, and 7th light up in their fixed
                colours. Use the R&nbsp;3&nbsp;5&nbsp;7 toggles to focus on individual
                chord-tone roles.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-fg-primary">Scale Positions</h4>
              <p>
                Toggle any of the five CAGED box positions. Overlap zones show where
                adjacent positions connect — useful for practising transitions between
                positions.
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-semibold text-fg-primary">Chord Shapes</h4>
              <p>
                Browse triad and seventh-chord voicings (Close, Drop&nbsp;2,
                Drop&nbsp;3, Drop&nbsp;2&amp;4) across all string sets and inversions.
                Cycle through diatonic chords to see each voicing at every fitting fret.
              </p>
            </div>
          </section>

          {/* Controls reference */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-fg-primary">Controls</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {CONTROLS.map(([term, desc]) => (
                <Fragment key={term}>
                  <dt className="font-medium text-fg-primary whitespace-nowrap">
                    {term}
                  </dt>
                  <dd className="text-fg-muted">{desc}</dd>
                </Fragment>
              ))}
            </dl>
          </section>

          {/* Keyboard shortcuts */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-fg-primary">
              Keyboard shortcuts
            </h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              {SHORTCUTS.map(([key, desc]) => (
                <Fragment key={key}>
                  <dt>
                    <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface-raised text-fg-primary font-mono text-xs">
                      {key}
                    </kbd>
                  </dt>
                  <dd className="text-fg-muted">{desc}</dd>
                </Fragment>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- AboutModal
```

Expected: all 5 tests pass.

- [ ] **Step 6: Run full suite + lint**

```bash
npm run lint && npm test
```

Expected: all tests pass, no lint errors.

- [ ] **Step 7: Commit**

```bash
git add src/index.css src/components/AboutModal.tsx src/components/AboutModal.test.tsx
git commit -m "feat: add AboutModal component with about and how-to-use content"
```

---

### Task 2: Wire (i) button and AboutModal into App.tsx

**Files:**

- Modify: `src/App.tsx`

- [ ] **Step 1: Add import and state**

At the top of `src/App.tsx`, add the import alongside other component imports (around
line 17):

```ts
import { AboutModal } from "./components/AboutModal";
```

After the existing `useState` declarations (around line 46, after `chordRowMode`), add:

```ts
const [showAbout, setShowAbout] = useState(false);
```

- [ ] **Step 2: Add the (i) button to the header**

In the header's top-right flex group (around line 279), insert the (i) button
immediately after `<ThemeToggle mode={themeMode} onCycle={cycleTheme} />`:

```tsx
<button
  onClick={() => setShowAbout(true)}
  title="About Fretlab"
  aria-label="About Fretlab"
  className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer inline-flex items-center"
>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M7 6.5v3.5M7 4v.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
</button>
```

- [ ] **Step 3: Render AboutModal at the end of the return**

Just before the closing `</div>` on line 342 (the outermost wrapper div), add:

```tsx
<AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
```

- [ ] **Step 4: Run lint + tests**

```bash
npm run lint && npm test
```

Expected: all tests pass, no lint or type errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add (i) button in header wired to AboutModal"
```
