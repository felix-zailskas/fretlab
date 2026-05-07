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

  // Each marker is rendered as two circles — a slightly larger dark outer
  // ring + the colored inner dot — to mimic the inset-shadow look of a real
  // inlay rather than a flat printed dot.
  function marker(key: string, cx: number, cy: number) {
    return (
      <g key={key}>
        <circle cx={cx} cy={cy} r={5.5} fill="rgba(0, 0, 0, 0.2)" />
        <circle cx={cx} cy={cy} r={5} fill="var(--color-fret)" opacity={0.4} />
      </g>
    );
  }

  return (
    <g>
      {visibleSingles.map((fret) => marker(`${fret}`, fretX(fret), midY))}
      {visibleDoubles.flatMap((fret) => [
        marker(`${fret}-top`, fretX(fret), midY - dotOffset),
        marker(`${fret}-bottom`, fretX(fret), midY + dotOffset),
      ])}
    </g>
  );
}
