import type { ReactNode } from "react";
import { SymbolKey, type SymbolKind } from "./SymbolKey";

type LegendPanelProps = {
  // The role toggles (Root / 3rd / 5th / 7th).
  highlight: ReactNode;
  // Every symbol this view can draw, so the panel doesn't jump while you click.
  symbols: ReadonlyArray<SymbolKind>;
  // Scale degrees and steps, with the scale's name as the caption.
  scaleName: string;
  scale: ReactNode;
};

function Group({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-xs text-fg-muted">{caption}</span>
      {children}
    </div>
  );
}

// Everything below the board explains it: what's highlighted, what each
// symbol means, and the scale itself.
export function LegendPanel({
  highlight,
  symbols,
  scaleName,
  scale,
}: LegendPanelProps) {
  return (
    <div
      data-testid="legend-panel"
      className="grid grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-8 gap-y-3 pt-3 border-t border-line"
    >
      <Group caption="Highlight">{highlight}</Group>
      <Group caption="On the board">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {symbols.map((kind) => (
            <SymbolKey key={kind} kind={kind} />
          ))}
        </div>
      </Group>
      <div className="min-w-0">
        <Group caption={scaleName}>{scale}</Group>
      </div>
    </div>
  );
}
