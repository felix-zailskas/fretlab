const VIEWS = [
  { id: "note-map", label: "Note Map" },
  { id: "scale-positions", label: "Scale Positions" },
  { id: "chord-shapes", label: "Chord Shapes" },
];

type ViewSelectorProps = {
  selectedView: string;
  onViewChange: (view: string) => void;
};

export function ViewSelector({ selectedView, onViewChange }: ViewSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-3 py-3 rounded text-sm font-medium transition-colors cursor-pointer ${
            selectedView === view.id
              ? "bg-surface-active text-fg-emphasis"
              : "bg-transparent text-fg-muted hover:text-fg-secondary"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
