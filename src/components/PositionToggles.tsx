import type { PositionId, CagedShape } from "../theory/positions";

const TOGGLES: ReadonlyArray<{ id: PositionId; shape: CagedShape }> = [
  { id: "P1", shape: "E" },
  { id: "P2", shape: "D" },
  { id: "P3", shape: "C" },
  { id: "P4", shape: "A" },
  { id: "P5", shape: "G" },
];

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
            className={`flex items-baseline gap-1.5 px-2 py-1 rounded transition-opacity cursor-pointer hover:bg-surface-raised ${
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
