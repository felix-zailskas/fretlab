type Option<Id extends string> = {
  id: Id;
  label: string;
};

type SegmentedRadioProps<Id extends string> = {
  options: ReadonlyArray<Option<Id>>;
  selected: Id;
  onChange: (id: Id) => void;
  ariaLabel: string;
};

// Single-choice counterpart to StringSetToggles: same segmented look, but
// exactly one option is active (radiogroup semantics).
export function SegmentedRadio<Id extends string>({
  options,
  selected,
  onChange,
  ariaLabel,
}: SegmentedRadioProps<Id>) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-line"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={selected === opt.id}
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
            selected === opt.id
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
