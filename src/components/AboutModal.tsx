import { Fragment, useEffect } from "react";
import { CONTROLS, PROGRESSION, SHORTCUTS, VIEWS } from "./aboutContent";

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

function TermList({ items }: { items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      {items.map(([term, desc]) => (
        <Fragment key={term}>
          <dt className="font-medium text-fg-primary whitespace-nowrap">{term}</dt>
          <dd className="text-fg-muted">{desc}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

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
        aria-labelledby="about-modal-title"
        className="relative w-full max-w-2xl my-auto rounded-xl border border-line bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line">
          <h2 id="about-modal-title" className="text-base font-bold">
            About Fretlab
          </h2>
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
              fretlab.studio is a passion project for every guitarist who wants a
              single, clean reference for the theory and charts they reach for during
              practice.
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
              {" · "}
              <span className="font-mono" data-testid="app-version">
                v{__APP_VERSION__}
              </span>
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-fg-primary">The three views</h3>
            {VIEWS.map(([name, desc]) => (
              <div key={name} className="space-y-1">
                <h4 className="font-semibold text-fg-primary">{name}</h4>
                <p>{desc}</p>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-fg-primary">Controls</h3>
            <TermList items={CONTROLS} />
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-fg-primary">
              Progressions and the metronome
            </h3>
            <TermList items={PROGRESSION} />
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
