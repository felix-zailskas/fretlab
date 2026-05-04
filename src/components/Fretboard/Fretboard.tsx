import type { NoteMarker } from '../../theory/types'
import { FRET_COUNT } from '../../theory/constants'
import { FretboardString } from './FretboardString'
import { FretMarkers } from './FretMarkers'
import { NoteCircle } from './NoteCircle'

export type PositionWindow = {
  id: string
  low: number
  high: number
  label: string
}

export type OverlapZone = {
  id: string
  low: number
  high: number
}

type FretboardProps = {
  markers: NoteMarker[]
  fretCount?: number
  positionWindows?: ReadonlyArray<PositionWindow>
  overlapZones?: ReadonlyArray<OverlapZone>
}

const PADDING = { top: 20, bottom: 40, left: 50, right: 20 }
const STRING_SPACING = 30
const NUM_STRINGS = 6

// Visual tint applied to position-window rectangles. Subtle by design — the
// box is a backdrop, not the focus.
const POSITION_FILL = 'rgba(255, 255, 255, 0.06)'
const POSITION_STROKE = 'rgba(255, 255, 255, 0.22)'

// Brighter tint applied to overlap zones so the transition between two
// adjacent CAGED boxes reads clearly — the boxes are connected pieces of one
// continuous map, not isolated islands.
const OVERLAP_FILL = 'rgba(255, 255, 255, 0.12)'
const OVERLAP_STROKE = 'rgba(255, 255, 255, 0.55)'

export function Fretboard({
  markers,
  fretCount = FRET_COUNT,
  positionWindows,
  overlapZones,
}: FretboardProps) {
  const boardTop = PADDING.top
  const boardBottom = PADDING.top + (NUM_STRINGS - 1) * STRING_SPACING
  const boardWidth = 900
  const fretSpacing = boardWidth / fretCount
  const nutX = PADDING.left
  const totalWidth = PADDING.left + boardWidth + PADDING.right
  const totalHeight = boardBottom + PADDING.bottom

  // Returns the x position at the center of a fret (between fret n-1 and fret n).
  // For fret 0 (open), returns a position to the left of the nut.
  function fretCenterX(fret: number): number {
    if (fret === 0) return nutX - 20
    return nutX + (fret - 0.5) * fretSpacing
  }

  // Returns the x position of the fret wire itself (for dot markers).
  function fretX(fret: number): number {
    return nutX + (fret - 0.5) * fretSpacing
  }

  // String index 0 = low E = bottom, index 5 = high E = top
  function stringY(stringIndex: number): number {
    return boardBottom - stringIndex * STRING_SPACING
  }

  // Position-window rectangle bounds. Fret-0 windows are extended pre-nut so
  // the rectangle visually contains open-note markers (which render at
  // nutX - 20 with radius ~13).
  function windowLeftX(low: number): number {
    return low === 0 ? nutX - 35 : nutX + (low - 1) * fretSpacing
  }
  function windowRightX(high: number): number {
    return nutX + high * fretSpacing
  }

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      className="w-full max-w-6xl"
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

      {/* Position-window highlights — rendered behind fret markers and notes */}
      {positionWindows?.map((win) => {
        const leftX = windowLeftX(win.low)
        const rightX = windowRightX(win.high)
        return (
          <rect
            key={`window-${win.id}`}
            x={leftX}
            y={boardTop - 10}
            width={rightX - leftX}
            height={boardBottom - boardTop + 20}
            rx={3}
            fill={POSITION_FILL}
            stroke={POSITION_STROKE}
            strokeWidth={1}
          />
        )
      })}

      {/* Overlap zones — drawn over the position windows with brighter
          fill/stroke so transition zones between adjacent CAGED boxes pop. */}
      {overlapZones?.map((zone) => {
        const leftX = windowLeftX(zone.low)
        const rightX = windowRightX(zone.high)
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
            strokeWidth={1.5}
          />
        )
      })}

      {/* Fret markers (dots) — rendered behind strings and notes */}
      <FretMarkers fretX={fretX} boardTop={boardTop} boardBottom={boardBottom} />

      {/* Nut */}
      <line
        x1={nutX}
        y1={boardTop - 10}
        x2={nutX}
        y2={boardBottom + 10}
        stroke="var(--color-fg-primary)"
        strokeWidth={4}
      />

      {/* Fret lines */}
      {Array.from({ length: fretCount }, (_, i) => i + 1).map((fret) => (
        <line
          key={fret}
          x1={nutX + fret * fretSpacing}
          y1={boardTop - 10}
          x2={nutX + fret * fretSpacing}
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
      {Array.from({ length: fretCount }, (_, i) => i + 1).map((fret) => (
        <text
          key={fret}
          x={nutX + (fret - 0.5) * fretSpacing}
          y={boardBottom + 30}
          textAnchor="middle"
          fill="var(--color-scale)"
          fontSize={11}
          fontFamily="system-ui, sans-serif"
        >
          {fret}
        </text>
      ))}

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

      {/* Position-window labels — rendered last so they sit on top */}
      {positionWindows?.map((win) => {
        const leftX = windowLeftX(win.low)
        const rightX = windowRightX(win.high)
        const centerX = (leftX + rightX) / 2
        return (
          <text
            key={`label-${win.id}`}
            x={centerX}
            y={12}
            textAnchor="middle"
            fontSize={11}
            fontFamily="system-ui, sans-serif"
            fill="var(--color-fg-secondary)"
          >
            {win.label}
          </text>
        )
      })}
    </svg>
  )
}
