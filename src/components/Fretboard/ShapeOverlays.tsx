import type { Barre } from "../../theory/cagedShapes";

export type BarreOverlay = { id: string } & Barre;
export type UnplayedStringOverlay = { id: string; string: number; fret: number };

// Translucent bar behind the markers: reads as "one finger across these
// strings" without hiding the note circles drawn on top of it.
const BARRE_FILL = "rgba(255, 255, 255, 0.28)";
const BARRE_WIDTH = 16;

type Geometry = {
  fretCenterX: (fret: number) => number;
  stringY: (stringIndex: number) => number;
};

export function Barres({
  barres,
  fretCenterX,
  stringY,
}: Geometry & { barres: ReadonlyArray<BarreOverlay> }) {
  return (
    <>
      {barres.map((b) => {
        // stringY grows downward as the string index falls (low E at bottom).
        const top = stringY(b.stringHigh);
        const bottom = stringY(b.stringLow);
        return (
          <rect
            key={`barre-${b.id}`}
            data-testid="barre"
            data-fret={b.fret}
            data-string-low={b.stringLow}
            data-string-high={b.stringHigh}
            x={fretCenterX(b.fret) - BARRE_WIDTH / 2}
            y={top - BARRE_WIDTH / 2}
            width={BARRE_WIDTH}
            height={bottom - top + BARRE_WIDTH}
            rx={BARRE_WIDTH / 2}
            fill={BARRE_FILL}
          />
        );
      })}
    </>
  );
}

// "×" chord-chart marker for strings a grip doesn't play, drawn in the
// grip's lowest fret slot (always empty on that string for that grip).
export function UnplayedStrings({
  unplayed,
  fretCenterX,
  stringY,
}: Geometry & { unplayed: ReadonlyArray<UnplayedStringOverlay> }) {
  return (
    <>
      {unplayed.map((u) => (
        <text
          key={`unplayed-${u.id}`}
          data-testid="unplayed-string"
          data-string={u.string}
          data-fret={u.fret}
          x={fretCenterX(u.fret)}
          y={stringY(u.string) + 6}
          textAnchor="middle"
          fontSize={18}
          fontWeight={600}
          fontFamily="system-ui, sans-serif"
          fill="var(--color-fg-muted)"
        >
          ×
        </text>
      ))}
    </>
  );
}
