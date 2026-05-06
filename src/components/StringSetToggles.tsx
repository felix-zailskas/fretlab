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
    <div className="flex flex-wrap gap-3 text-sm" role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const isOn = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`px-2 py-1 rounded transition-opacity cursor-pointer hover:bg-surface-raised ${
              isOn ? "opacity-100" : "opacity-40"
            }`}
            aria-pressed={isOn}
          >
            <span className="font-medium text-fg-primary">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
