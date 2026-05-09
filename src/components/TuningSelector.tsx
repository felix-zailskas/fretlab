import { useEffect, useRef, useState } from "react";
import { TUNINGS, type TuningId } from "../theory/tuning";

type TuningSelectorProps = {
  tuningId: TuningId;
  onTuningChange: (id: TuningId) => void;
};

const TUNING_IDS: TuningId[] = ["standard", "open-g"];

export function TuningSelector({ tuningId, onTuningChange }: TuningSelectorProps) {
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

  function handleSelect(id: TuningId) {
    onTuningChange(id);
    setOpen(false);
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        Tuning: {TUNINGS[tuningId].name} ▾
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Tuning"
          data-popover
          className="absolute right-0 top-full mt-2 z-10 w-44 p-1 rounded-lg border border-line bg-surface-raised shadow-lg origin-top-right"
        >
          {TUNING_IDS.map((id) => {
            const isActive = id === tuningId;
            return (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(id)}
                className={`w-full text-left px-3 py-2 rounded text-sm cursor-pointer ${
                  isActive
                    ? "bg-surface-active text-fg-emphasis font-semibold"
                    : "text-fg-secondary hover:bg-surface-active"
                }`}
              >
                {TUNINGS[id].name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
