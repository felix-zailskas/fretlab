import type { ChordRef, ChordTier, MapChord } from "../theory/harmony";
import type { ChordQuality, TriadQuality } from "../theory/scales";

type ChordMapCardProps = {
  chord: MapChord;
  isSelected: boolean;
  onSelect: (ref: ChordRef) => void;
  onAdd?: (ref: ChordRef) => void;
};

// Diatonic cards keep today's quality accent: major variants get the
// emphasized border, minor and diminished the plain line.
const QUALITY_ACCENT: Record<ChordQuality | TriadQuality, string> = {
  maj7: "border-line-emphasis bg-surface-raised",
  m7: "border-line bg-surface-raised",
  "7": "border-line bg-surface-raised",
  m7b5: "border-line bg-surface-raised",
  maj: "border-line-emphasis bg-surface-raised",
  min: "border-line bg-surface-raised",
  dim: "border-line bg-surface-raised",
};

const QUALITY_NAMES: Record<ChordQuality | TriadQuality, string> = {
  maj7: "major seventh",
  m7: "minor seventh",
  "7": "dominant seventh",
  m7b5: "half-diminished",
  maj: "major triad",
  min: "minor triad",
  dim: "diminished triad",
};

function idleClasses(tier: ChordTier, chord: MapChord): string {
  if (tier === "secondary") return "border-dashed border-line-emphasis bg-surface";
  if (tier === "borrowed") return "border-mode/60 bg-surface-raised";
  return QUALITY_ACCENT[chord.quality];
}

export function ChordMapCard({
  chord,
  isSelected,
  onSelect,
  onAdd,
}: ChordMapCardProps) {
  const { tier, degree } = chord.ref;
  // While ＋ is shown, the top padding clears its 32px hit area so the
  // numeral never sits under it — at md widths too: at 900px, maj7 numerals
  // in sevenths mode reach under the hit area with md:pt-4.
  const padY = onAdd ? "pt-8 pb-2 md:pb-4" : "py-2 md:py-4";
  return (
    <div className="relative flex flex-col items-stretch gap-1">
      <button
        type="button"
        data-testid="chord-card"
        data-tier={tier}
        data-degree={degree}
        aria-pressed={isSelected}
        aria-label={`${chord.romanNumeral} ${chord.symbol}`}
        onClick={() => onSelect(chord.ref)}
        title={`${chord.romanNumeral} — ${chord.symbol} (${QUALITY_NAMES[chord.quality]}): ${chord.notes.join(", ")}`}
        className={`flex flex-col items-center justify-center gap-1 md:gap-1.5 px-1 md:px-3 ${padY} md:min-h-[6.5rem] rounded-xl border-2 shadow-sm cursor-pointer transition-colors active:scale-[0.98] ${
          isSelected
            ? `${tier === "secondary" ? "border-dashed " : ""}border-line-selected bg-surface-active ring-2 ring-selection ring-inset`
            : `${idleClasses(tier, chord)} hover:border-line-hover`
        }`}
      >
        <span className="text-xs text-fg-muted font-mono font-semibold">
          {chord.romanNumeral}
        </span>
        <span className="text-sm md:text-xl font-bold text-fg-emphasis leading-none">
          {chord.symbol}
        </span>
        <span className="hidden md:block text-xs md:tracking-wider text-fg-secondary font-medium">
          {chord.notes.join(" – ")}
        </span>
      </button>
      {onAdd && (
        <button
          type="button"
          aria-label={`Add ${chord.symbol} to progression`}
          onClick={() => onAdd(chord.ref)}
          className="group absolute top-0 right-0 w-8 h-8 flex items-start justify-end p-1.5 rounded-tr-xl cursor-pointer focus-visible:outline-none"
        >
          <span
            aria-hidden="true"
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-surface-active text-fg-secondary group-hover:text-fg-emphasis group-focus-visible:ring-2 group-focus-visible:ring-selection group-focus-visible:text-fg-emphasis"
          >
            ＋
          </span>
        </button>
      )}
      {tier === "secondary" && (
        <span aria-hidden="true" className="text-center text-fg-muted leading-none">
          ↓
        </span>
      )}
    </div>
  );
}
