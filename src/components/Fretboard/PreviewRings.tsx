import type { NoteMarker } from "../../theory/types";

const ROLE_COLORS: Partial<Record<NoteMarker["role"], string>> = {
  root: "var(--color-root)",
  third: "var(--color-third)",
  fifth: "var(--color-fifth)",
  seventh: "var(--color-seventh)",
};

type PreviewRingsProps = {
  markers: ReadonlyArray<NoteMarker>;
  fretCenterX: (fret: number) => number;
  stringY: (string: number) => number;
};

// The next chord's targets, as thin rings in their new role colour around
// the spot each one lands on. Unfilled so the current chord stays the main
// thing on the board. They fade from faint to full as the change approaches
// (the .preview-ring animation, timed by --preview-ramp on the page).
export function PreviewRings({ markers, fretCenterX, stringY }: PreviewRingsProps) {
  return (
    <g aria-hidden="true">
      {markers.map((m) => (
        <circle
          key={`${m.string}-${m.fret}-${m.role}`}
          data-testid="preview-ring"
          data-string={m.string}
          data-fret={m.fret}
          data-role={m.role}
          className="preview-ring"
          cx={fretCenterX(m.fret)}
          cy={stringY(m.string)}
          r={16}
          fill="none"
          stroke={ROLE_COLORS[m.role]}
          strokeWidth={1.75}
        />
      ))}
    </g>
  );
}
