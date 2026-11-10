import { MODES, MODE_NAMES, type Mode } from "../theory/modes";
import { HEADER_SELECT } from "./controlStyles";

type ModeSelectorProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  disabled?: boolean;
};

// Header dropdown next to the key.
export function ModeSelector({ mode, onModeChange, disabled }: ModeSelectorProps) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      Mode
      <select
        aria-label="Mode"
        value={mode}
        onChange={(e) => onModeChange(e.target.value as Mode)}
        disabled={disabled}
        title={disabled ? "Select a key first" : undefined}
        className={`${HEADER_SELECT} disabled:opacity-40 disabled:cursor-not-allowed`}
      >
        {MODES.map((m) => (
          <option key={m} value={m}>
            {MODE_NAMES[m]}
          </option>
        ))}
      </select>
    </label>
  );
}
