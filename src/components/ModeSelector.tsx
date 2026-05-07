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
    <div
      role="radiogroup"
      aria-label="Mode"
      aria-disabled={disabled}
      title={disabled ? "Select a key first" : undefined}
      className={`flex flex-wrap gap-1 ${
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
          className={`min-w-[6.5rem] px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold transition-colors cursor-pointer ${
            mode === m
              ? "bg-mode text-surface"
              : "bg-surface-raised text-fg-secondary hover:bg-surface-active"
          }`}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}
