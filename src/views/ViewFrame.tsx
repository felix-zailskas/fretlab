import type { ReactNode } from "react";
import { LegendPanel } from "../components/legend/LegendPanel";
import type { SymbolKind } from "../components/legend/SymbolKey";

// Shared chrome App hands every view: the view tabs, and the scale summary
// that lives in the legend.
export type ViewChrome = {
  tabs: ReactNode;
  scaleName: string;
  scale: ReactNode;
  // Symbols every view adds while they can appear (the progression's
  // next-chord preview).
  sharedSymbols: ReadonlyArray<SymbolKind>;
};

type ViewFrameProps = {
  chrome: ViewChrome;
  // "What am I studying" controls for this view, shown right after the tabs.
  subModes?: ReactNode;
  // The fretboard.
  children: ReactNode;
  highlight: ReactNode;
  symbols: ReadonlyArray<SymbolKind>;
};

// One layout for every view: tabs + sub-modes, the board, then the legend.
export function ViewFrame({
  chrome,
  subModes,
  children,
  highlight,
  symbols,
}: ViewFrameProps) {
  return (
    <div className="space-y-3">
      <div
        data-testid="view-toolbar"
        className="flex flex-wrap items-center gap-x-3 gap-y-2"
      >
        {chrome.tabs}
        {subModes && (
          <>
            <span aria-hidden="true" className="w-px h-6 bg-line" />
            {subModes}
          </>
        )}
      </div>
      {children}
      <LegendPanel
        highlight={highlight}
        symbols={[...symbols, ...chrome.sharedSymbols]}
        scaleName={chrome.scaleName}
        scale={chrome.scale}
      />
    </div>
  );
}
