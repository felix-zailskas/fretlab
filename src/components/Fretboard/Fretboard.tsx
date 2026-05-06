import type { NoteMarker } from "../../theory/types";
import { DEFAULT_END_FRET } from "../../theory/constants";
import { FretboardString } from "./FretboardString";
import { FretMarkers } from "./FretMarkers";
import { NoteCircle } from "./NoteCircle";

export type PositionWindow = {
  id: string;
  low: number;
  high: number;
  label: string;
};

export type OverlapZone = {
  id: string;
  low: number;
  high: number;
};

type FretboardProps = {
  markers: NoteMarker[];
  startFret?: number;
  endFret?: number;
  positionWindows?: ReadonlyArray<PositionWindow>;
  overlapZones?: ReadonlyArray<OverlapZone>;
};

// PADDING.top reserves space above the board for position-window labels.
// boardTop = PADDING.top, so increasing top padding pushes the whole board
// down and exposes a header strip for label text.
const PADDING = { top: 40, bottom: 40, left: 50, right: 20 };
const STRING_SPACING = 30;
const NUM_STRINGS = 6;

// Position windows use corner brackets — viewfinder/cinema-marker geometry —
// rather than a continuous border. Brackets read as "framed region" and stay
// distinct from the continuous-border overlap-zone treatment below, even
// when several non-overlapping positions are selected.
const POSITION_FILL = "rgba(255, 255, 255, 0.04)";
const POSITION_BRACKET_STROKE = "rgba(255, 255, 255, 0.65)";
const POSITION_BRACKET_WIDTH = 2;
const POSITION_BRACKET_LEN = 16;

// Overlap zones use a continuous border + brighter fill — visually different
// from position windows so the eye reads "joined territory" rather than just
// "another box."
const OVERLAP_FILL = "rgba(255, 255, 255, 0.13)";
const OVERLAP_STROKE = "rgba(255, 255, 255, 0.55)";
const OVERLAP_STROKE_WIDTH = 1.5;

export function Fretboard({
  markers,
  startFret = 0,
  endFret = DEFAULT_END_FRET,
  positionWindows,
  overlapZones,
}: FretboardProps) {
  const boardTop = PADDING.top;
  const boardBottom = PADDING.top + (NUM_STRINGS - 1) * STRING_SPACING;
  const boardWidth = 900;

  // effectiveStart preserves today's "fretCount = endFret" visual scale
  // when startFret = 0 (the pre-nut zone is bonus, outside boardWidth).
  // When startFret > 0, slots startFret..endFret fit fully inside boardWidth.
  const effectiveStart = Math.max(startFret - 1, 0);
  const visibleSlots = endFret - effectiveStart;
  const fretSpacing = boardWidth / visibleSlots;

  const nutX = PADDING.left;
  const totalWidth = PADDING.left + boardWidth + PADDING.right;
  const totalHeight = boardBottom + PADDING.bottom;

  // Returns the x position at the center of a fret (between fret n-1 and fret n).
  // For fret 0 (open) when startFret = 0, returns a position to the left of the nut.
  function fretCenterX(fret: number): number {
    if (fret === 0 && startFret === 0) return nutX - 20;
    return nutX + (fret - effectiveStart - 0.5) * fretSpacing;
  }

  // Returns the x position of the fret wire itself (for dot markers).
  function fretX(fret: number): number {
    return nutX + (fret - effectiveStart - 0.5) * fretSpacing;
  }

  // String index 0 = low E = bottom, index 5 = high E = top
  function stringY(stringIndex: number): number {
    return boardBottom - stringIndex * STRING_SPACING;
  }

  // Position-window rectangle bounds. Fret-0 windows are extended pre-nut so
  // the rectangle visually contains open-note markers (which render at
  // nutX - 20 with radius ~13).
  function windowLeftX(low: number): number {
    if (low === 0 && startFret === 0) return nutX - 35;
    return nutX + (low - effectiveStart - 1) * fretSpacing;
  }
  function windowRightX(high: number): number {
    return nutX + (high - effectiveStart) * fretSpacing;
  }

  // Generates an SVG path describing four L-shaped corner brackets at the
  // corners of the rectangle (L,T)-(R,B). Bracket arm length is clamped so it
  // never exceeds half the smaller dimension — single-fret windows still get
  // sensible brackets that don't cross.
  function bracketPath(L: number, T: number, R: number, B: number): string {
    const k = Math.min(POSITION_BRACKET_LEN, (R - L) / 2, (B - T) / 2);
    return [
      // top-left:  arm tip → corner → arm tip
      `M ${L + k},${T} L ${L},${T} L ${L},${T + k}`,
      // top-right
      `M ${R - k},${T} L ${R},${T} L ${R},${T + k}`,
      // bottom-left
      `M ${L},${B - k} L ${L},${B} L ${L + k},${B}`,
      // bottom-right
      `M ${R},${B - k} L ${R},${B} L ${R - k},${B}`,
    ].join(" ");
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Fretboard background */}
      <rect
        x={nutX}
        y={boardTop - 10}
        width={boardWidth}
        height={boardBottom - boardTop + 20}
        rx={4}
        fill="var(--color-fretboard)"
      />

      {/* Position windows — faint fill, no continuous border (corner brackets
          rendered separately below for the framing geometry). */}
      {positionWindows?.map((win) => {
        const leftX = windowLeftX(win.low);
        const rightX = windowRightX(win.high);
        return (
          <rect
            key={`window-fill-${win.id}`}
            x={leftX}
            y={boardTop - 10}
            width={rightX - leftX}
            height={boardBottom - boardTop + 20}
            rx={3}
            fill={POSITION_FILL}
          />
        );
      })}

      {/* Overlap zones — continuous-bordered rectangles. Visually distinct from
          the bracketed position windows: positions = framed regions, overlaps
          = explicitly joined territory. */}
      {overlapZones?.map((zone) => {
        const leftX = windowLeftX(zone.low);
        const rightX = windowRightX(zone.high);
        return (
          <rect
            key={`overlap-${zone.id}`}
            x={leftX}
            y={boardTop - 10}
            width={rightX - leftX}
            height={boardBottom - boardTop + 20}
            rx={3}
            fill={OVERLAP_FILL}
            stroke={OVERLAP_STROKE}
            strokeWidth={OVERLAP_STROKE_WIDTH}
          />
        );
      })}

      {/* Fret markers (dots) — rendered behind strings and notes */}
      <FretMarkers
        fretX={fretX}
        boardTop={boardTop}
        boardBottom={boardBottom}
        startFret={startFret}
        endFret={endFret}
      />

      {/* Nut (when startFret === 0) or starting boundary (when startFret > 0) */}
      <line
        x1={nutX}
        y1={boardTop - 10}
        x2={nutX}
        y2={boardBottom + 10}
        stroke={startFret === 0 ? "var(--color-fg-primary)" : "var(--color-fret)"}
        strokeWidth={startFret === 0 ? 4 : 1.5}
      />

      {/* Fret lines */}
      {Array.from(
        { length: endFret - effectiveStart },
        (_, i) => effectiveStart + i + 1,
      ).map((fret) => (
        <line
          key={fret}
          x1={nutX + (fret - effectiveStart) * fretSpacing}
          y1={boardTop - 10}
          x2={nutX + (fret - effectiveStart) * fretSpacing}
          y2={boardBottom + 10}
          stroke="var(--color-fret)"
          strokeWidth={1.5}
        />
      ))}

      {/* Strings */}
      {Array.from({ length: NUM_STRINGS }, (_, i) => i).map((stringIndex) => (
        <FretboardString
          key={stringIndex}
          stringIndex={stringIndex}
          y={stringY(stringIndex)}
          xStart={nutX}
          xEnd={nutX + boardWidth}
        />
      ))}

      {/* Fret numbers */}
      {Array.from(
        { length: endFret - effectiveStart },
        (_, i) => effectiveStart + i + 1,
      ).map((fret) => (
        <text
          key={fret}
          x={fretX(fret)}
          y={boardBottom + 30}
          textAnchor="middle"
          fill="var(--color-scale)"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {fret}
        </text>
      ))}

      {/* Position-window corner brackets — rendered above strings/markers so
          they read as a frame in front of, not behind, the content. */}
      {positionWindows?.map((win) => {
        const leftX = windowLeftX(win.low);
        const rightX = windowRightX(win.high);
        const T = boardTop - 10;
        const B = boardBottom + 10;
        return (
          <path
            key={`brackets-${win.id}`}
            d={bracketPath(leftX, T, rightX, B)}
            fill="none"
            stroke={POSITION_BRACKET_STROKE}
            strokeWidth={POSITION_BRACKET_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="miter"
          />
        );
      })}

      {/* Note markers */}
      {markers.map((marker) => (
        <NoteCircle
          key={`${marker.string}-${marker.fret}`}
          cx={fretCenterX(marker.fret)}
          cy={stringY(marker.string)}
          note={marker.note}
          role={marker.role}
        />
      ))}

      {/* Position-window labels — placed in the dedicated header strip above
          the board (the boardTop padding reserves this space). */}
      {positionWindows?.map((win) => {
        const leftX = windowLeftX(win.low);
        const rightX = windowRightX(win.high);
        const centerX = (leftX + rightX) / 2;
        return (
          <text
            key={`label-${win.id}`}
            x={centerX}
            y={22}
            textAnchor="middle"
            fontSize={12}
            fontWeight={500}
            fontFamily="system-ui, sans-serif"
            fill="var(--color-fg-primary)"
            style={{ letterSpacing: "0.04em" }}
          >
            {win.label}
          </text>
        );
      })}
    </svg>
  );
}
