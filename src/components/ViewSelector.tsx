import type { ViewId } from "../views/types";

const VIEWS: ReadonlyArray<{ id: ViewId; label: string }> = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-shapes", label: "Chord Shapes" },
];

type ViewSelectorProps = {
  selectedView: ViewId;
  onViewChange: (view: ViewId) => void;
};

export function ViewSelector({ selectedView, onViewChange }: ViewSelectorProps) {
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
      {VIEWS.map((view) => (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={selectedView === view.id}
          onClick={() => onViewChange(view.id)}
          className={`relative z-10 px-2 py-1.5 md:px-3 md:py-2.5 pointer-coarse:py-3 text-xs md:text-sm font-medium cursor-pointer ${
            selectedView === view.id
              ? "text-fg-emphasis"
              : "text-fg-muted hover:text-fg-secondary"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
