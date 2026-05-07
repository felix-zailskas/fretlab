import type { NoteDisplayRole } from "../../theory/types";

const ROLE_COLORS: Record<NoteDisplayRole, string> = {
  root: "var(--color-root)",
  third: "var(--color-third)",
  fifth: "var(--color-fifth)",
  seventh: "var(--color-seventh)",
  scale: "var(--color-scale)",
  muted: "var(--color-muted)",
};

type NoteCircleProps = {
  cx: number;
  cy: number;
  note: string;
  role: NoteDisplayRole;
  isCharacteristic?: boolean;
};

export function NoteCircle({ cx, cy, note, role, isCharacteristic }: NoteCircleProps) {
  const color = ROLE_COLORS[role];
  const isMuted = role === "muted";
  const radius = isMuted ? 10 : role === "root" ? 14 : 13;
  const fontSize = isMuted ? 9 : 11;
  // Ring radius sits 3px outside the fill circle; 2px stroke keeps it
  // readable but visually subordinate to the role color.
  const ringRadius = radius + 3;

  return (
    <g opacity={isMuted ? 0.4 : 1}>
      {isCharacteristic && (
        <circle
          cx={cx}
          cy={cy}
          r={ringRadius}
          fill="none"
          stroke="var(--color-characteristic)"
          strokeWidth={2}
        />
      )}
      <circle cx={cx} cy={cy} r={radius} fill={color} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fontSize}
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
      >
        {note}
      </text>
    </g>
  );
}
