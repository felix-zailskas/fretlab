import { CAGED_POSITIONS, type PositionId } from "../theory/positions";

const TOGGLES = CAGED_POSITIONS.map((p) => ({
  id: p.id,
  shape: p.shape,
  title: `${p.id}-shape position — derived from the open ${p.shape} chord shape`,
}));

type PositionTogglesProps = {
  selected: ReadonlySet<PositionId>;
  onToggle: (position: PositionId) => void;
};

export function PositionToggles({ selected, onToggle }: PositionTogglesProps) {
  return (
    <div className="flex gap-3 text-sm">
      {TOGGLES.map((opt) => {
        const isOn = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            title={opt.title}
            className={`flex items-baseline gap-1.5 px-2 py-2 rounded transition-opacity duration-150 ease-out cursor-pointer hover:bg-surface-raised ${
              isOn ? "opacity-100" : "opacity-40"
            }`}
            aria-pressed={isOn}
          >
            <span className="font-medium text-fg-primary">{opt.id}</span>
            <span className="text-xs text-fg-muted">{opt.shape}</span>
          </button>
        );
      })}
    </div>
  );
}
