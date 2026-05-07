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

// Mirrors KeySelector's button-pill pattern. When the selected mode is
// non-Ionian, the active button uses an emphasized treatment so a glance at
// the header tells the user they're in a modal frame.
export function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Mode"
      aria-disabled={disabled}
      className={`flex flex-wrap gap-1 ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => onModeChange(m)}
          disabled={disabled}
          className={`px-3 py-3 rounded text-sm font-semibold transition-colors cursor-pointer ${
            mode === m
              ? mode === "ionian"
                ? "bg-surface-active text-fg-emphasis"
                : "bg-mode text-surface"
              : "bg-surface-raised text-fg-secondary hover:bg-surface-active"
          }`}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}
