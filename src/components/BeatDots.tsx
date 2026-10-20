import type { Accent } from "../theory/meter";

type BeatDotsProps = {
  beats: number;
  current: number;
  /** When given, accented beats (strong or medium) get a slightly larger dot. */
  accents?: readonly Accent[];
};

function dotSize(accent: Accent | undefined): string {
  return accent === "strong" || accent === "medium" ? "size-2" : "size-1.5";
}

export function BeatDots({ beats, current, accents }: BeatDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1" aria-hidden="true">
      {Array.from({ length: beats }, (_, i) => (
        <span
          key={i}
          data-testid="beat-dot"
          data-current={i === current}
          className={`${dotSize(accents?.[i])} rounded-full ${i === current ? "bg-fg-emphasis" : "bg-line-emphasis"}`}
        />
      ))}
    </div>
  );
}
