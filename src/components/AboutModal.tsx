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

        <div className="px-6 py-5 space-y-6 text-sm text-fg-secondary">
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
