import { useCallback, useRef, useState, type ReactNode } from "react";
import { BUTTON } from "./controlStyles";
import { usePopoverDismiss } from "./usePopoverDismiss";

type SettingsMenuProps = {
  // Shown on the trigger so the current tuning and fret range stay visible
  // without opening the menu, e.g. "Standard · 0–15".
  summary: string;
  children: ReactNode;
};

function GearIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

// One button for set-once preferences (accidentals, theme, tuning, frets).
// The panel hosts the existing controls, whose own dropdowns open inside it.
export function SettingsMenu({ summary, children }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);
  usePopoverDismiss(open, close, wrapperRef, triggerRef);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Settings: ${summary}`}
        className={`${BUTTON} inline-flex items-center gap-1.5 bg-surface-raised text-fg-secondary hover:bg-surface-active whitespace-nowrap`}
      >
        {summary}
        <GearIcon />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Settings"
          className="absolute right-0 top-full mt-2 z-30 w-[22rem] max-w-[calc(100vw-1rem)] p-3 rounded-lg border border-line bg-surface-raised shadow-lg space-y-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}

type SettingsRowProps = { label: string; children: ReactNode };

export function SettingsRow({ label, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-fg-muted">{label}</span>
      {children}
    </div>
  );
}
