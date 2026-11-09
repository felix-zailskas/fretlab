import { layoutRegionLabels } from "./regionLabelLayout";
// Clickable region labels (positions P1–P5, CAGED shapes) in the strip above
// the board. HTML buttons overlaid on the SVG, positioned in percentages so
// they track the responsive scaling (same technique as the string toggles).

export type RegionToggle = {
  id: string;
  label: string;
  sub?: string;
  on: boolean;
  // Fret span of the region on screen; omitted when it doesn't fit the
  // current fret range, in which case the label is pinned to the strip's edge.
  low?: number;
  high?: number;
  onToggle: () => void;
};

type RegionTogglesProps = {
  toggles: ReadonlyArray<RegionToggle>;
  // Viewbox-x of a region's centre, and the overall viewbox size.
  regionCenterX: (low: number, high: number) => number;
  minX: number;
  maxX: number;
  y: number;
  totalWidth: number;
  totalHeight: number;
};

export function RegionToggles({
  toggles,
  regionCenterX,
  minX,
  maxX,
  y,
  totalWidth,
  totalHeight,
}: RegionTogglesProps) {
  const xs = layoutRegionLabels(toggles, regionCenterX, minX, maxX);
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      role="group"
      aria-label="Regions"
    >
      {toggles.map((t) => {
        const offBoard = t.low === undefined;
        return (
          <button
            key={t.id}
            type="button"
            data-testid="region-toggle"
            data-region-id={t.id}
            aria-pressed={t.on}
            title={
              offBoard ? `${t.label} doesn't fit the current fret range` : undefined
            }
            onClick={t.onToggle}
            className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer whitespace-nowrap rounded-full border px-2.5 py-0.5 pointer-coarse:py-2 text-sm font-semibold transition-opacity ${
              t.on
                ? "bg-surface-active border-line-hover text-fg-emphasis"
                : "bg-surface-raised border-line text-fg-secondary opacity-50 hover:opacity-90"
            } ${offBoard ? "border-dashed" : ""}`}
            style={{
              left: `${((xs.get(t.id) ?? minX) / totalWidth) * 100}%`,
              top: `${(y / totalHeight) * 100}%`,
            }}
          >
            {t.label}
            {t.sub && <span className="ml-1 font-normal text-fg-muted">{t.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
