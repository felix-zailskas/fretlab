// A tiny slice of the fretboard: wood, six strings (high E on top, as on the
// board) and a dot on each string of the group. Skipped strings (drop-3's
// 6-4-3-2) show as a gap. Dots are deliberately neutral: which string holds
// the root depends on the inversion, so role colours would mislead.

type StringGroupIconProps = {
  // Guitar string numbers, 1 = high E … 6 = low E.
  strings: readonly number[];
  active: boolean;
  // Render scale relative to the 22×24 viewBox.
  size?: number;
};

const W = 22;
const H = 24;

function stringY(n: number): number {
  return 2.5 + (n - 1) * 3.8;
}

export function StringGroupIcon({
  strings,
  active,
  size = 1.25,
}: StringGroupIconProps) {
  return (
    <svg
      width={W * size}
      height={H * size}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      className="block"
    >
      <rect
        width={W}
        height={H}
        rx={2}
        fill="var(--color-fretboard)"
        opacity={active ? 1 : 0.6}
      />
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <line
          key={n}
          x1={0}
          x2={W}
          y1={stringY(n)}
          y2={stringY(n)}
          stroke="var(--color-string)"
          strokeWidth={0.6}
          opacity={0.7}
        />
      ))}
      {strings.map((n) => (
        <circle
          key={n}
          cx={W / 2}
          cy={stringY(n)}
          r={1.8}
          fill={active ? "var(--color-fg-emphasis)" : "var(--color-fg-faint)"}
        />
      ))}
    </svg>
  );
}
