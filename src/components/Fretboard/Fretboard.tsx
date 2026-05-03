import type { NoteMarker } from '../../theory/types'
import { FretboardString } from './FretboardString'
import { FretMarkers } from './FretMarkers'
import { NoteCircle } from './NoteCircle'

type FretboardProps = {
  markers: NoteMarker[]
  fretCount?: number
}

const PADDING = { top: 20, bottom: 40, left: 50, right: 20 }
const STRING_SPACING = 30
const NUM_STRINGS = 6

export function Fretboard({ markers, fretCount = 15 }: FretboardProps) {
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

      {/* Fret markers (dots) — rendered behind strings and notes */}
      <FretMarkers fretX={fretX} boardTop={boardTop} boardBottom={boardBottom} />

      {/* Nut */}
      <line
        x1={nutX}
        y1={boardTop - 10}
        x2={nutX}
        y2={boardBottom + 10}
        stroke="var(--color-text)"
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
    </svg>
  )
}
