import { useId, type ReactNode } from "react";
import { StringGroupIcon } from "../StringGroupIcon";

export type SymbolKind =
  | "scale"
  | "context"
  | "characteristic"
  | "outsideKey"
  | "nonPentatonic"
  | "hiddenString"
  | "stringGroup"
  | "position"
  | "shape"
  | "barre"
  | "notPlayed"
  | "nextChord";

const SIZE = 18;

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

const ICONS: Record<SymbolKind, () => ReactNode> = {
  scale: () => (
    <Svg>
      <circle cx="9" cy="9" r="7" fill="var(--color-scale)" />
    </Svg>
  ),
  context: () => (
    <Svg>
      <circle cx="9" cy="9" r="7" fill="var(--color-scale)" opacity="0.5" />
    </Svg>
  ),
  characteristic: () => (
    <Svg>
      <circle cx="9" cy="9" r="5.5" fill="var(--color-third)" />
      <circle
        cx="9"
        cy="9"
        r="8"
        fill="none"
        stroke="var(--color-characteristic)"
        strokeWidth="1.6"
      />
    </Svg>
  ),
  outsideKey: () => (
    <Svg>
      <circle cx="9" cy="9" r="5.5" fill="var(--color-third)" />
      <circle
        cx="9"
        cy="9"
        r="8"
        fill="none"
        stroke="var(--color-fg-primary)"
        strokeWidth="1.2"
        strokeDasharray="2.5 1.8"
      />
    </Svg>
  ),
  nonPentatonic: () => (
    <Svg>
      <circle
        cx="9"
        cy="9"
        r="6.5"
        fill="var(--color-fifth)"
        fillOpacity="0.2"
        stroke="var(--color-fifth)"
        strokeWidth="1.6"
      />
    </Svg>
  ),
  hiddenString: () => (
    <Svg>
      <circle cx="9" cy="9" r="5" fill="var(--color-muted)" opacity="0.8" />
    </Svg>
  ),
  stringGroup: () => <StringGroupIcon strings={[1, 2, 3]} active size={0.75} />,
  position: () => (
    <Svg>
      <path
        d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4"
        fill="none"
        stroke="var(--color-fg-secondary)"
        strokeWidth="1.5"
      />
    </Svg>
  ),
  shape: () => (
    <Svg>
      <path
        d="M2 6V2h4M12 2h4v4M16 12v4h-4M6 16H2v-4"
        fill="none"
        stroke="var(--color-fg-secondary)"
        strokeWidth="1.5"
      />
    </Svg>
  ),
  barre: () => (
    <Svg>
      <rect
        x="6"
        y="1"
        width="6"
        height="16"
        rx="3"
        fill="var(--color-fg-secondary)"
        opacity="0.45"
      />
    </Svg>
  ),
  nextChord: () => (
    <Svg>
      <circle
        cx="9"
        cy="9"
        r="7"
        fill="none"
        stroke="var(--color-third)"
        strokeWidth="2"
        strokeOpacity="0.85"
      />
    </Svg>
  ),
  notPlayed: () => (
    <Svg>
      <text
        x="9"
        y="14"
        textAnchor="middle"
        fontSize="16"
        fontWeight="600"
        fill="var(--color-fg-muted)"
      >
        ×
      </text>
    </Svg>
  ),
};

const NAMES: Record<SymbolKind, string> = {
  scale: "Scale note",
  context: "Context note",
  characteristic: "Characteristic note",
  outsideKey: "Outside the key",
  nonPentatonic: "Not in pentatonic",
  hiddenString: "Hidden string",
  stringGroup: "String group",
  position: "Position",
  shape: "Shape",
  barre: "Barre",
  notPlayed: "Not played",
  nextChord: "Next chord",
};

const EXPLANATIONS: Record<SymbolKind, string> = {
  scale: "A note of the scale that isn't one of the highlighted chord tones.",
  context:
    "A scale note outside the selected positions, shown faintly for orientation.",
  characteristic:
    "The note that gives the mode its colour, e.g. the natural 6th in Dorian.",
  outsideKey: "A chord tone that isn't in the key, e.g. the C♯ of A7 in C major.",
  nonPentatonic: "A chord tone that isn't part of the pentatonic scale.",
  hiddenString: "A note on a string you've hidden with the eye toggle.",
  stringGroup:
    "Which strings a voicing is played on. Pick groups with the string buttons above the board.",
  position: "A scale position box. Click a label above the board to show or hide it.",
  shape: "A CAGED chord shape. Click a label above the board to show or hide it.",
  barre: "One finger presses all these strings at this fret.",
  notPlayed: "This string isn't played in the chord shape.",
  nextChord:
    "While a progression plays, rings mark where the next chord's highlighted notes land, in their new colour. They fade in as the change approaches. A note that keeps its role gets no ring.",
};

// One legend entry: symbol, short name, ⓘ. The full explanation shows as a
// tooltip on hover and on keyboard focus (tap focuses it on touch).
export function SymbolKey({ kind }: { kind: SymbolKind }) {
  return (
    <InfoTip label={NAMES[kind]} tip={EXPLANATIONS[kind]} testId={kind}>
      {ICONS[kind]()}
    </InfoTip>
  );
}

type InfoTipProps = {
  label: string;
  tip: string;
  testId?: string;
  children?: ReactNode;
};

export function InfoTip({ label, tip, testId, children }: InfoTipProps) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-describedby={id}
        data-testid={testId ? `legend-${testId}` : undefined}
        className="inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-xs text-fg-secondary cursor-help focus-visible:outline-2 focus-visible:outline-selection"
      >
        {children}
        <span>{label}</span>
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center size-3.5 rounded-full border border-fg-faint text-[9px] italic font-serif text-fg-muted"
        >
          i
        </span>
      </button>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 motion-safe:transition-opacity absolute left-0 bottom-full mb-2 z-20 w-60 rounded-md bg-fg-primary text-surface text-xs leading-snug px-2.5 py-2 shadow-lg"
      >
        {tip}
      </span>
    </span>
  );
}
