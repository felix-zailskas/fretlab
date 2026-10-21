import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { MapChord } from "../theory/harmony";
import type { ProgressionSlot } from "../theory/progressionStorage";
import { BeatDots } from "./BeatDots";

type ProgressionSlotCardProps = {
  slot: ProgressionSlot;
  chord: MapChord | null;
  index: number;
  allowedLengths: readonly number[];
  isCurrent: boolean;
  isNext: boolean;
  beatInBar: number;
  beatsPerBar: number;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onSetBars: (id: string, bars: number) => void;
};

const ICON_BUTTON =
  "px-1.5 rounded text-fg-muted hover:text-fg-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";

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
  beatInBar,
  beatsPerBar,
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
      className={`flex flex-col gap-1 min-w-[6.5rem] p-2 rounded-xl border-2 bg-surface-raised ${frameClass(isCurrent, isNext)} ${playable ? "" : "opacity-40"} ${isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between">
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
          aria-label={`Remove ${label} from progression`}
          onClick={() => onRemove(slot.id)}
          className={ICON_BUTTON}
        >
          ×
        </button>
      </div>
      <button
        type="button"
        aria-label={`Select ${label}`}
        disabled={!playable}
        onClick={() => onSelect(index)}
        className="flex flex-col items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed"
      >
        <span className="text-xs text-fg-muted font-mono font-semibold">
          {chord?.romanNumeral ?? ""}
        </span>
        <span className="text-lg font-bold text-fg-emphasis leading-none">{label}</span>
      </button>
      <div className="flex items-center justify-between gap-1 text-xs text-fg-secondary">
        <button
          type="button"
          aria-label={`Shorter ${label}`}
          disabled={lengthIndex <= 0}
          onClick={() => onSetBars(slot.id, allowedLengths[lengthIndex - 1])}
          className={ICON_BUTTON}
        >
          −
        </button>
        <span>{formatBars(slot.bars)}</span>
        <button
          type="button"
          aria-label={`Longer ${label}`}
          disabled={lengthIndex === -1 || lengthIndex >= allowedLengths.length - 1}
          onClick={() => onSetBars(slot.id, allowedLengths[lengthIndex + 1])}
          className={ICON_BUTTON}
        >
          +
        </button>
      </div>
      {isCurrent && <BeatDots beats={beatsPerBar} current={beatInBar} source="slot" />}
    </li>
  );
}
