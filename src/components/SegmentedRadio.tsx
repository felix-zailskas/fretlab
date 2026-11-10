import { GROUP_SINGLE, segmentClass } from "./controlStyles";

type Option<Id extends string> = {
  id: Id;
  label: string;
};

type SegmentedRadioProps<Id extends string> = {
  options: ReadonlyArray<Option<Id>>;
  selected: Id;
  onChange: (id: Id) => void;
  ariaLabel: string;
  disabled?: boolean;
  title?: string;
};

// Single-choice counterpart to StringSetToggles: same segmented look, but
// exactly one option is active (radiogroup semantics).
export function SegmentedRadio<Id extends string>({
  options,
  selected,
  onChange,
  ariaLabel,
  disabled,
  title,
}: SegmentedRadioProps<Id>) {
  return (
    <div
      className={`${GROUP_SINGLE} ${disabled ? "opacity-40" : ""}`}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      title={title}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={selected === opt.id}
          disabled={disabled}
          onClick={() => onChange(opt.id)}
          className={`${segmentClass(selected === opt.id)} disabled:cursor-not-allowed`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
