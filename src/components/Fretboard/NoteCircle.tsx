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
};

export function NoteCircle({ cx, cy, note, role }: NoteCircleProps) {
  const color = ROLE_COLORS[role];
  const isMuted = role === "muted";
  const radius = isMuted ? 10 : 13;
  const fontSize = isMuted ? 9 : 11;

  return (
    <g opacity={isMuted ? 0.4 : 1}>
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
