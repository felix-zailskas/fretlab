import type { ViewId } from "../views/types";

const VIEWS: ReadonlyArray<{ id: ViewId; label: string }> = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-shapes", label: "Chord Shapes" },
];

const DISABLED_TOOLTIP: Record<ViewId, string> = {
  "note-map": "",
  "scale-positions": "Available in standard tuning only — uses the CAGED system.",
  "chord-shapes": "Available in standard tuning only — uses jazz voicing systems.",
};

type ViewSelectorProps = {
  selectedView: ViewId;
  onViewChange: (view: ViewId) => void;
  disabledViews?: ReadonlySet<ViewId>;
};

export function ViewSelector({
  selectedView,
  onViewChange,
  disabledViews,
}: ViewSelectorProps) {
  const activeIndex = VIEWS.findIndex((v) => v.id === selectedView);
  return (
    <div
      className="relative grid grid-cols-3 max-w-md rounded border border-line"
      role="tablist"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-0 rounded bg-surface-active transition-transform duration-200 ease-out"
        style={{
          width: `${100 / VIEWS.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {VIEWS.map((view) => {
        const isDisabled = disabledViews?.has(view.id) ?? false;
        const isSelected = selectedView === view.id;
        return (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-disabled={isDisabled || undefined}
            disabled={isDisabled}
            title={isDisabled ? DISABLED_TOOLTIP[view.id] : undefined}
            onClick={() => onViewChange(view.id)}
            className={`relative z-10 px-3 py-2.5 pointer-coarse:py-3 text-sm font-medium ${
              isDisabled
                ? "text-fg-faint opacity-50 cursor-not-allowed"
                : isSelected
                  ? "text-fg-emphasis cursor-pointer"
                  : "text-fg-muted hover:text-fg-secondary cursor-pointer"
            }`}
          >
            {view.label}
          </button>
        );
      })}
    </div>
  );
}
