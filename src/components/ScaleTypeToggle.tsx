import type { ScaleType } from "../theory/pentatonic";

export const PENTATONIC_UNAVAILABLE_HINT =
  "Pentatonic is available in Ionian (major) and Aeolian (minor)";

const OPTIONS: { value: ScaleType; label: string }[] = [
  { value: "full", label: "Full" },
  { value: "pentatonic", label: "Pentatonic" },
];

type ScaleTypeToggleProps = {
  value: ScaleType;
  onChange: (value: ScaleType) => void;
  disabled?: boolean;
};

export function ScaleTypeToggle({
  value,
  onChange,
  disabled = false,
}: ScaleTypeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Scale"
      aria-disabled={disabled || undefined}
      title={disabled ? PENTATONIC_UNAVAILABLE_HINT : undefined}
      className={`inline-grid grid-cols-2 rounded overflow-hidden border border-line ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      {OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isActive}
            disabled={disabled}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors ${
              disabled ? "pointer-events-none" : "cursor-pointer"
            } ${
              isActive
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:text-fg-secondary"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
