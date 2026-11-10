import type { NoteDisplayRole } from "../../theory/types";

const ROLE_COLORS: Record<NoteDisplayRole, string> = {
  root: "var(--color-root)",
  third: "var(--color-third)",
  fifth: "var(--color-fifth)",
  seventh: "var(--color-seventh)",
  scale: "var(--color-scale)",
  muted: "var(--color-muted)",
};

const LEAVING_PROPS = { className: "note-leave", "aria-hidden": true } as const;

type NoteCircleProps = {
  cx: number;
  cy: number;
  note: string;
  role: NoteDisplayRole;
  isCharacteristic?: boolean;
  isOutsideKey?: boolean;
  // Chord tone outside the active pentatonic: drawn hollow (role-colour
  // outline, faint role-colour fill, role-colour label).
  isNonPentatonic?: boolean;
  // String/fret coordinates exposed as data-* attributes for E2E tests; not
  // used for rendering. Optional so existing callers don't have to pass them.
  string?: number;
  fret?: number;
  // A note that just left the board, drawn while it fades out. It carries no
  // test hooks so queries only see the notes that are really there.
  leaving?: boolean;
};

export function NoteCircle({
  cx,
  cy,
  note,
  role,
  isCharacteristic,
  isOutsideKey,
  isNonPentatonic,
  string,
  fret,
  leaving,
}: NoteCircleProps) {
  const color = ROLE_COLORS[role];
  const isMuted = role === "muted";
  const radius = isMuted ? 10 : role === "root" ? 14 : 13;
  const fontSize = isMuted ? 9 : 11;
  // Ring radius sits 3px outside the fill circle; 2px stroke keeps it
  // readable but visually subordinate to the role color.
  const ringRadius = radius + 3;

  const outer = leaving
    ? LEAVING_PROPS
    : {
        className: "note-enter",
        "data-testid": "note-marker",
        "data-string": string,
        "data-fret": fret,
        "data-note": note,
        "data-role": role,
        "data-outside-key": isOutsideKey ? "true" : undefined,
        "data-non-pentatonic": isNonPentatonic ? "true" : undefined,
      };

  // The fade animates the outer group's opacity; the muted dimming sits on
  // an inner group so the two don't fight.
  return (
    <g {...outer}>
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
        {/* Dashed neutral ring for chord tones outside the key. Deliberately not
          the gold characteristic ring, which keeps its modal meaning. */}
        {isOutsideKey && (
          <circle
            data-testid="outside-key-ring"
            cx={cx}
            cy={cy}
            r={ringRadius}
            fill="none"
            stroke="var(--color-fg-primary)"
            strokeWidth={1.5}
            strokeDasharray="3 2"
          />
        )}
        {isNonPentatonic ? (
          <>
            {/* Opaque base so the string line doesn't strike through the label. */}
            <circle cx={cx} cy={cy} r={radius - 1} fill="var(--color-fretboard)" />
            <circle
              cx={cx}
              cy={cy}
              r={radius - 1}
              fill={color}
              fillOpacity={0.2}
              stroke={color}
              strokeWidth={2.5}
            />
          </>
        ) : (
          <circle cx={cx} cy={cy} r={radius} fill={color} />
        )}
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isNonPentatonic ? color : "white"}
          fontSize={fontSize}
          fontWeight="bold"
          fontFamily="system-ui, sans-serif"
        >
          {note}
        </text>
      </g>
    </g>
  );
}
