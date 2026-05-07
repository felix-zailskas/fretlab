type Option<Id extends string> = {
  id: Id;
  label: string;
};

type StringSetTogglesProps<Id extends string> = {
  options: ReadonlyArray<Option<Id>>;
  selected: ReadonlySet<Id>;
  onToggle: (id: Id) => void;
  ariaLabel: string;
};

export function StringSetToggles<Id extends string>({
  options,
  selected,
  onToggle,
  ariaLabel,
}: StringSetTogglesProps<Id>) {
  return (
    <div
      className="inline-flex rounded overflow-hidden border border-line"
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const isOn = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            aria-pressed={isOn}
            className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              isOn
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
