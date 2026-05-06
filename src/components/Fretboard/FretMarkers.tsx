const SINGLE_DOT_FRETS = [3, 5, 7, 9, 15, 17, 19, 21];
const DOUBLE_DOT_FRETS = [12, 24];

type FretMarkersProps = {
  fretX: (fret: number) => number;
  boardTop: number;
  boardBottom: number;
  startFret: number;
  endFret: number;
};

export function FretMarkers({
  fretX,
  boardTop,
  boardBottom,
  startFret,
  endFret,
}: FretMarkersProps) {
  const midY = (boardTop + boardBottom) / 2;
  const dotOffset = (boardBottom - boardTop) / 5;

  const visibleSingles = SINGLE_DOT_FRETS.filter((f) => f >= startFret && f <= endFret);
  const visibleDoubles = DOUBLE_DOT_FRETS.filter((f) => f >= startFret && f <= endFret);

  return (
    <g>
      {visibleSingles.map((fret) => (
        <circle
          key={fret}
          cx={fretX(fret)}
          cy={midY}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />
      ))}
      {visibleDoubles.flatMap((fret) => [
        <circle
          key={`${fret}-top`}
          cx={fretX(fret)}
          cy={midY - dotOffset}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />,
        <circle
          key={`${fret}-bottom`}
          cx={fretX(fret)}
          cy={midY + dotOffset}
          r={5}
          fill="var(--color-fret)"
          opacity={0.4}
        />,
      ])}
    </g>
  );
}
