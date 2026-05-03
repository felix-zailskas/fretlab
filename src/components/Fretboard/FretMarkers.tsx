type FretMarkersProps = {
  fretX: (fret: number) => number
  boardTop: number
  boardBottom: number
}

const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15]
const DOUBLE_DOT_FRET = 12

export function FretMarkers({ fretX, boardTop, boardBottom }: FretMarkersProps) {
  const midY = (boardTop + boardBottom) / 2
  const dotOffset = (boardBottom - boardTop) / 5

  return (
    <g>
      {SINGLE_DOT_FRETS.map((fret) => (
        <circle
          key={fret}
          cx={fretX(fret)}
          cy={midY}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />
      ))}
      {/* Double dot at fret 12 */}
      <circle
        cx={fretX(DOUBLE_DOT_FRET)}
        cy={midY - dotOffset}
        r={5}
        fill="var(--color-fret)"
        opacity={0.4}
      />
      <circle
        cx={fretX(DOUBLE_DOT_FRET)}
        cy={midY + dotOffset}
        r={5}
        fill="var(--color-fret)"
        opacity={0.4}
      />
    </g>
  )
}
