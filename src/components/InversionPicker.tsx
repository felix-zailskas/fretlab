import type { Inversion } from "../theory/chordShapes";

const OPTIONS: { value: Inversion; label: string }[] = [
  { value: "root", label: "Root" },
  { value: "first", label: "1st" },
  { value: "second", label: "2nd" },
];

type InversionPickerProps = {
  inversion: Inversion;
  onChange: (inversion: Inversion) => void;
};

export function InversionPicker({ inversion, onChange }: InversionPickerProps) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-line"
      role="radiogroup"
      aria-label="Inversion"
    >
      {OPTIONS.map((opt) => {
        const isSelected = inversion === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              isSelected
                ? "bg-surface-active text-fg-emphasis"
                : "bg-surface text-fg-muted hover:bg-surface-raised"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
