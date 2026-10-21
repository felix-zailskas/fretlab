import type { Accent } from "../theory/meter";

type BeatDotsProps = {
  beats: number;
  current: number;
  /** Where the dots render, so tests can tell the card's dots from the transport's. */
  source: "slot" | "transport";
  /** When given, accented beats (strong or medium) get a slightly larger dot. */
  accents?: readonly Accent[];
};

function dotSize(accent: Accent | undefined): string {
  return accent === "strong" || accent === "medium" ? "size-2" : "size-1.5";
}

export function BeatDots({ beats, current, source, accents }: BeatDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1" aria-hidden="true">
      {Array.from({ length: beats }, (_, i) => (
        <span
          key={i}
          data-testid="beat-dot"
          data-source={source}
          data-current={i === current}
          className={`${dotSize(accents?.[i])} rounded-full ${i === current ? "bg-fg-emphasis" : "bg-line-emphasis"}`}
        />
      ))}
    </div>
  );
}
