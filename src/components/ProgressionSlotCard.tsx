import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MapChord } from "../theory/harmony";
import type { ProgressionSlot } from "../theory/progressionStorage";
import { secondsPerBeat } from "../theory/meter";

type ProgressionSlotCardProps = {
  slot: ProgressionSlot;
  chord: MapChord | null;
  index: number;
  allowedLengths: readonly number[];
  isCurrent: boolean;
  isNext: boolean;
  // Beats elapsed in this slot while it plays (0-based).
  beatInSlot: number;
  beatsPerBar: number;
  bpm: number;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onSetBars: (id: string, bars: number) => void;
};

// On touch, icon buttons widen to 32px and take a 44px-tall tap area.
const ICON_BUTTON =
  "relative touch-target pointer-coarse:min-w-8 pointer-coarse:py-1 px-1.5 rounded text-fg-muted hover:text-fg-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

function formatBars(bars: number): string {
  if (bars === 0.5) return "½ bar";
  return bars === 1 ? "1 bar" : `${bars} bars`;
}

function frameClass(isCurrent: boolean, isNext: boolean): string {
  if (isCurrent) return "border-line-selected ring-2 ring-selection ring-inset";
  if (isNext) return "border-dashed border-line-hover";
  return "border-line";
}

export function ProgressionSlotCard({
  slot,
  chord,
  index,
  allowedLengths,
  isCurrent,
  isNext,
  beatInSlot,
  beatsPerBar,
  bpm,
  onSelect,
  onRemove,
  onSetBars,
}: ProgressionSlotCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slot.id });
  const playable = chord !== null;
  const label = chord?.symbol ?? `slot ${index + 1}`;
  const lengthIndex = allowedLengths.indexOf(slot.bars);
  const slotBeats = Math.round(slot.bars * beatsPerBar);

  return (
    <li
      ref={setNodeRef}
      // Accepted inline-style exception: dnd-kit computes the drag transform at
      // runtime (same precedent as the inline transforms in AccidentalToggle and ViewSelector).
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="progression-slot"
      data-index={index}
      data-current={isCurrent}
      title={playable ? undefined : "Not available in this mode"}
      className={`relative flex items-center gap-1.5 shrink-0 pl-1 pr-1.5 py-0.5 pointer-coarse:py-0 rounded-lg border-2 bg-surface-raised ${frameClass(isCurrent, isNext)} ${playable ? "" : "opacity-40"} ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Reorder ${label}`}
        className={`${ICON_BUTTON} touch-none cursor-grab`}
      >
        ⠿
      </button>
      <button
        type="button"
        aria-label={`Select ${label}`}
        disabled={!playable}
        onClick={() => onSelect(index)}
        className="flex items-baseline gap-1 cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="text-sm font-bold text-fg-emphasis leading-none">{label}</span>
        <span className="text-xs text-fg-muted font-mono font-semibold">
          {chord?.romanNumeral ?? ""}
        </span>
      </button>
      <span className="flex items-center text-xs text-fg-secondary">
        <button
          type="button"
          aria-label={`Shorter ${label}`}
          disabled={lengthIndex <= 0}
          onClick={() => onSetBars(slot.id, allowedLengths[lengthIndex - 1])}
          className={ICON_BUTTON}
        >
          −
        </button>
        <span className="whitespace-nowrap">{formatBars(slot.bars)}</span>
        <button
          type="button"
          aria-label={`Longer ${label}`}
          disabled={lengthIndex === -1 || lengthIndex >= allowedLengths.length - 1}
          onClick={() => onSetBars(slot.id, allowedLengths[lengthIndex + 1])}
          className={ICON_BUTTON}
        >
          +
        </button>
      </span>
      <button
        type="button"
        aria-label={`Remove ${label} from progression`}
        onClick={() => onRemove(slot.id)}
        className={ICON_BUTTON}
      >
        ×
      </button>
      <SlotProgress
        fraction={isCurrent ? (beatInSlot + 1) / slotBeats : 0}
        beatSeconds={secondsPerBeat(bpm)}
      />
      <BeatTicks beats={slotBeats} beatsPerBar={beatsPerBar} />
    </li>
  );
}

// A tick per beat along the progress track: the 1 of each bar tall and
// bright, the other beats short and faint, so you can read both which bar
// and which beat the fill is in. Drawn on every chip (not only the playing
// one) so nothing appears or shifts on play, and over the fill so the ticks
// stay readable as it passes them.
function BeatTicks({ beats, beatsPerBar }: { beats: number; beatsPerBar: number }) {
  return (
    <>
      {Array.from({ length: beats }, (_, i) => {
        const downbeat = i % beatsPerBar === 0;
        return (
          <span
            key={i}
            aria-hidden="true"
            data-testid={downbeat ? "bar-tick" : "beat-tick"}
            className={`absolute bottom-0.5 -translate-x-1/2 ${
              downbeat ? "h-2 w-0.5 bg-fg-emphasis" : "h-1 w-px bg-fg-faint"
            }`}
            // Accepted inline-style exception: position is a runtime fraction
            // of the chip (same precedent as SlotProgress below).
            style={{ left: `calc(3px + ${i / beats} * (100% - 6px))` }}
          />
        );
      })}
    </>
  );
}

// A thin line along the chip's bottom edge that fills over the chord's whole
// length. Each beat sets the target to the end of that beat and the width
// eases there linearly over one beat, so the fill moves continuously instead
// of stepping. Always rendered (empty when idle) so nothing reflows when the
// current chord changes.
function SlotProgress({
  fraction,
  beatSeconds,
}: {
  fraction: number;
  beatSeconds: number;
}) {
  return (
    <span
      aria-hidden="true"
      data-testid="slot-progress"
      // Inset 2px so it sits inside the current chip's inset selection ring
      // rather than underneath it.
      className="absolute left-0.5 bottom-0.5 h-[3px] rounded-full bg-fg-secondary motion-safe:transition-[width] ease-linear"
      // Accepted inline-style exception: width and timing are runtime values
      // (same precedent as dnd-kit's transform above).
      style={{
        width: `calc(${Math.min(fraction, 1)} * (100% - 4px))`,
        transitionDuration: fraction === 0 ? "0s" : `${beatSeconds}s`,
      }}
    />
  );
}
