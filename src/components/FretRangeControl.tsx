import { useEffect, useRef, useState } from "react";
import { DEFAULT_END_FRET, MAX_FRET } from "../theory/constants";

type FretRangeControlProps = {
  startFret: number;
  endFret: number;
  onChange: (startFret: number, endFret: number) => void;
};

function clamp(value: number, lo: number, hi: number): number {
  if (Number.isNaN(value)) return lo;
  return Math.max(lo, Math.min(hi, value));
}

export function FretRangeControl({
  startFret,
  endFret,
  onChange,
}: FretRangeControlProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        e.target instanceof Node &&
        !wrapperRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleStartChange(raw: number) {
    const next = clamp(raw, 0, MAX_FRET - 1);
    const e = next >= endFret ? Math.min(next + 1, MAX_FRET) : endFret;
    onChange(next, e);
  }

  function handleEndChange(raw: number) {
    const next = clamp(raw, startFret + 1, MAX_FRET);
    onChange(startFret, next);
  }

  function handleReset() {
    onChange(0, DEFAULT_END_FRET);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Frets: {startFret}–{endFret} ▾
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Fret range"
          data-popover
          className="absolute right-0 top-full mt-2 z-10 w-56 p-4 rounded-lg border border-line bg-surface-raised shadow-lg space-y-3 origin-top-right"
        >
          <label className="flex items-center justify-between gap-2 text-sm text-fg-secondary">
            <span>Start fret</span>
            <input
              type="number"
              min={0}
              max={MAX_FRET - 1}
              value={startFret}
              onChange={(e) => {
                if (e.target.value === "") return; // preserve current value while empty
                handleStartChange(Number(e.target.value));
              }}
              className="w-16 px-2 py-1 rounded border border-line bg-surface text-fg-primary text-sm"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm text-fg-secondary">
            <span>End fret</span>
            <input
              type="number"
              min={startFret + 1}
              max={MAX_FRET}
              value={endFret}
              onChange={(e) => {
                if (e.target.value === "") return; // preserve current value while empty
                handleEndChange(Number(e.target.value));
              }}
              className="w-16 px-2 py-1 rounded border border-line bg-surface text-fg-primary text-sm"
            />
          </label>
          <button
            type="button"
            onClick={handleReset}
            className="w-full px-3 py-1.5 rounded text-sm font-medium bg-surface text-fg-secondary hover:bg-surface-active cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
