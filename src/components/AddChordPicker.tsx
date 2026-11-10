import { useCallback, useRef, useState, type ReactNode } from "react";
import { usePopoverDismiss } from "./usePopoverDismiss";

type AddChordPickerProps = {
  // Empty progression: the trigger becomes the lane's whole prompt.
  empty: boolean;
  // The chord grid; clicking a chord there appends it. The panel stays open
  // so several chords can be added in a row.
  children: ReactNode;
};

export function AddChordPicker({ empty, children }: AddChordPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  usePopoverDismiss(open, close, wrapperRef, triggerRef);

  return (
    <div className="flex min-w-0 items-center gap-3" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative touch-target shrink-0 px-2.5 py-0.5 pointer-coarse:py-1.5 rounded-lg border-2 border-dashed text-sm font-semibold whitespace-nowrap cursor-pointer ${
          open
            ? "border-line-hover text-fg-emphasis"
            : "border-line-emphasis text-fg-muted hover:text-fg-secondary hover:border-line-hover"
        }`}
      >
        {empty ? "＋ Start a progression" : "＋ Add chord"}
      </button>
      {empty && (
        <span className="min-w-0 text-xs text-fg-muted">
          Add chords to play them in a loop with the metronome.
        </span>
      )}
      {open && (
        <div
          role="dialog"
          aria-label="Add chord"
          className="absolute left-4 top-full mt-1 z-30 w-[40rem] max-w-[calc(100vw-2rem)] p-3 rounded-lg border border-line bg-surface-raised shadow-lg"
        >
          {children}
        </div>
      )}
    </div>
  );
}
