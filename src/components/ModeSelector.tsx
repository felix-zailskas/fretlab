import { MODES, type Mode } from "../theory/modes";

const MODE_LABELS: Record<Mode, string> = {
  ionian: "Ionian",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  aeolian: "Aeolian",
  locrian: "Locrian",
};

type ModeSelectorProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled?: boolean;
};

// Mirrors KeySelector's button-pill pattern. Every mode (including Ionian)
// uses the same selected treatment — Ionian gets no visual differentiation.
export function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <div className="relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-surface after:to-transparent after:pointer-events-none md:after:hidden">
      <div
        role="radiogroup"
        aria-label="Mode"
        aria-disabled={disabled}
        title={disabled ? "Select a key first" : undefined}
        className={`flex flex-nowrap overflow-x-auto md:flex-wrap gap-1 pb-0.5 ${
          disabled ? "opacity-40 pointer-events-none cursor-not-allowed" : ""
        }`}
      >
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onModeChange(m)}
            disabled={disabled}
            className={`shrink-0 md:min-w-[6.5rem] px-2 py-1.5 md:px-3 md:py-2.5 pointer-coarse:py-3 rounded text-xs md:text-sm font-semibold transition-colors cursor-pointer ${
              mode === m
                ? "bg-mode text-surface"
                : "bg-surface-raised text-fg-secondary hover:bg-surface-active"
            }`}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>
    </div>
  );
}
