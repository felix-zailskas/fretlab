type FretboardStringProps = {
  stringIndex: number; // 0 = low E (bottom), 5 = high E (top)
  y: number;
  xStart: number;
  xEnd: number;
};

export function FretboardString({
  stringIndex,
  y,
  xStart,
  xEnd,
}: FretboardStringProps) {
  // Lower strings (index 0) are thicker, higher strings (index 5) are thinner
  const strokeWidth = 2.5 - stringIndex * 0.3;

  return (
    <line
      x1={xStart}
      y1={y}
      x2={xEnd}
      y2={y}
      stroke="var(--color-string)"
      strokeWidth={strokeWidth}
    />
  );
}
