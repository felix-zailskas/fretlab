import type { ChordRef, ChordTier, MapChord } from "../theory/harmony";
import type { ChordQuality, TriadQuality } from "../theory/scales";

type ChordMapCardProps = {
  chord: MapChord;
  isSelected: boolean;
  onPick: (ref: ChordRef) => void;
  // Accessible name; defaults to "<numeral> <symbol>". The progression picker
  // names the action instead ("Add C to progression").
  label?: string;
  // Off in the picker: there, the arrows would only repeat the reference's.
  showResolution?: boolean;
};

// Diatonic cards keep the quality accent: major variants get the emphasized
// border, minor and diminished the plain line.
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
  // Borrowed chords sit on a mode-tinted background.
  if (tier === "borrowed") return "border-mode/40 bg-mode/10";
  return QUALITY_ACCENT[chord.quality];
}

// Compact two-line card: symbol and numeral on top, the notes underneath.
export function ChordMapCard({
  chord,
  isSelected,
  onPick,
  label,
  showResolution = true,
}: ChordMapCardProps) {
  const { tier, degree } = chord.ref;
  return (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        data-testid="chord-card"
        data-tier={tier}
        data-degree={degree}
        aria-pressed={isSelected}
        aria-label={label ?? `${chord.romanNumeral} ${chord.symbol}`}
        onClick={() => onPick(chord.ref)}
        title={`${chord.romanNumeral} — ${chord.symbol} (${QUALITY_NAMES[chord.quality]}): ${chord.notes.join(", ")}`}
        className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg border-2 cursor-pointer transition-colors active:scale-[0.98] ${
          isSelected
            ? `${tier === "secondary" ? "border-dashed " : ""}border-line-selected bg-surface-active ring-2 ring-selection ring-inset`
            : `${idleClasses(tier, chord)} hover:border-line-hover`
        }`}
      >
        <span className="flex items-baseline gap-1.5">
          <span className="text-sm font-bold text-fg-emphasis leading-tight">
            {chord.symbol}
          </span>
          <span className="text-xs text-fg-muted font-mono font-semibold">
            {chord.romanNumeral}
          </span>
        </span>
        <span className="text-xs text-fg-secondary whitespace-nowrap">
          {chord.notes.join(" ")}
        </span>
      </button>
      {showResolution && tier === "secondary" && (
        <span
          aria-hidden="true"
          className="text-center text-xs text-fg-faint leading-none"
        >
          ↓
        </span>
      )}
    </div>
  );
}
