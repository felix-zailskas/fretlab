import { Fragment, useEffect, useRef, useState } from "react";
import { TUNINGS, TUNING_GROUPS, type TuningId } from "../theory/tuning";

type TuningSelectorProps = {
  tuningId: TuningId;
  onTuningChange: (id: TuningId) => void;
};

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
          className="absolute right-0 top-full mt-2 z-10 w-80 max-w-[calc(100vw-1rem)] p-1 rounded-lg border border-line bg-surface-raised shadow-lg origin-top-right max-h-[70vh] overflow-y-auto"
        >
          {TUNING_GROUPS.map((group, groupIdx) => (
            <Fragment key={group.category}>
              <div
                className={`px-3 pb-1 text-xs uppercase tracking-wide text-fg-muted font-semibold ${
                  groupIdx === 0 ? "pt-2" : "pt-3"
                }`}
                role="presentation"
              >
                {group.label}
              </div>
              {group.ids.map((id) => {
                const isActive = id === tuningId;
                const tuning = TUNINGS[id];
                return (
                  <button
                    key={id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => handleSelect(id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded text-sm cursor-pointer ${
                      isActive
                        ? "bg-surface-active text-fg-emphasis font-semibold"
                        : "text-fg-secondary hover:bg-surface-active"
                    }`}
                  >
                    <span>{tuning.name}</span>
                    <span className="font-mono text-xs text-fg-faint tabular-nums">
                      {tuning.strings.join(" ")}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
