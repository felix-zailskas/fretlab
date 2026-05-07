import type { AccidentalStyle } from "../theory/notes";

const OPTIONS: { value: AccidentalStyle; label: string; title: string }[] = [
  { value: "flat", label: "♭", title: "Flat spelling" },
  { value: "sharp", label: "♯", title: "Sharp spelling" },
];

type AccidentalToggleProps = {
  accidentalStyle: AccidentalStyle;
  onChange: (style: AccidentalStyle) => void;
};

export function AccidentalToggle({ accidentalStyle, onChange }: AccidentalToggleProps) {
  const activeIndex = OPTIONS.findIndex((o) => o.value === accidentalStyle);
  return (
    <div className="relative inline-flex rounded overflow-hidden border border-line">
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 w-1/2 bg-surface-active transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={accidentalStyle === opt.value}
          title={opt.title}
          className={`relative z-10 px-3 py-2.5 pointer-coarse:py-3 text-sm font-semibold cursor-pointer ${
            accidentalStyle === opt.value
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
