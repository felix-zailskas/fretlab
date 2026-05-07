import type { AccidentalStyle } from "../theory/notes";

const OPTIONS: { value: AccidentalStyle; label: string }[] = [
  { value: "flat", label: "♭" },
  { value: "sharp", label: "♯" },
];

type AccidentalToggleProps = {
  accidentalStyle: AccidentalStyle;
  onChange: (style: AccidentalStyle) => void;
};

export function AccidentalToggle({ accidentalStyle, onChange }: AccidentalToggleProps) {
  return (
    <div className="inline-flex rounded overflow-hidden border border-line">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={accidentalStyle === opt.value}
          className={`px-3 py-2.5 pointer-coarse:py-3 text-sm font-semibold transition-colors cursor-pointer ${
            accidentalStyle === opt.value
              ? "bg-surface-active text-fg-emphasis"
              : "bg-surface text-fg-muted hover:bg-surface-raised"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
