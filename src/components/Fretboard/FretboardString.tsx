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
    <g>
      {/* Subtle highlight line above the string — gives a hint of depth so
        strings read as physical, not flat printed lines. */}
      <line
        x1={xStart}
        y1={y - 0.5}
        x2={xEnd}
        y2={y - 0.5}
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth={strokeWidth * 0.6}
      />
      <line
        x1={xStart}
        y1={y}
        x2={xEnd}
        y2={y}
        stroke="var(--color-string)"
        strokeWidth={strokeWidth}
      />
    </g>
  );
}
