import type { ChordRowMode } from "../theory/harmony";

type ChordRowModeToggleProps = {
  value: ChordRowMode;
  onChange: (mode: ChordRowMode) => void;
};

const OPTIONS: { value: ChordRowMode; label: string }[] = [
  { value: "triads", label: "Triads" },
  { value: "sevenths", label: "Sevenths" },
];

export function ChordRowModeToggle({ value, onChange }: ChordRowModeToggleProps) {
  return (
    <div
      className="relative inline-grid grid-cols-2 rounded overflow-hidden border border-line"
      role="radiogroup"
      aria-label="Chord row mode"
    >
      <div
        aria-hidden="true"
        className={`absolute top-0 bottom-0 left-0 w-1/2 bg-surface-active transition-transform duration-200 ease-out ${
          value === "sevenths" ? "translate-x-full" : "translate-x-0"
        }`}
      />
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 px-2 py-1.5 md:px-3 md:py-2.5 pointer-coarse:py-3 text-xs md:text-sm font-semibold cursor-pointer ${
            value === opt.value
              ? "text-fg-emphasis"
              : "text-fg-muted hover:text-fg-secondary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
