import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { allowedSlotLengths } from "../theory/meter";
import type { ProgressionPlayer } from "../useProgressionPlayer";
import { ProgressionSlotCard } from "./ProgressionSlotCard";
import { TransportControls } from "./TransportControls";

// noKey: the key is "All", so no slot resolves. The metronome still plays.
type ProgressionPanelProps = { player: ProgressionPlayer; noKey: boolean };

const HINT = "text-sm text-fg-muted";

export function ProgressionPanel({ player, noKey }: ProgressionPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { state, resolvedSlots } = player;
  if (!state.visible) return null;

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = state.slots.findIndex((s) => s.id === active.id);
    const to = state.slots.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) player.move(from, to);
  }

  const allowed = allowedSlotLengths(state.timeSignature);

  return (
    <section
      aria-label="Progression"
      className="mt-4 md:mt-8 p-3 rounded-xl border border-line space-y-3"
    >
      <TransportControls
        isPlaying={player.isPlaying}
        beatInBar={player.isPlaying ? player.beatInBar : null}
        metronomeOnly={player.metronomeOnly}
        hasSlots={state.slots.length > 0}
        bpm={state.bpm}
        timeSignature={state.timeSignature}
        click={state.click}
        loop={state.loop}
        onTogglePlay={player.toggle}
        onBpmChange={player.setBpm}
        onTimeSignatureChange={player.setTimeSignature}
        onClickChange={player.setClick}
        onLoopChange={player.setLoop}
        onClear={player.clear}
      />
      {noKey ? (
        <p className={HINT}>Pick a key to build and play a progression.</p>
      ) : resolvedSlots.length === 0 ? (
        <p className={HINT}>Click ＋ on a chord below to start a progression</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={state.slots.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <ol className="flex gap-2 overflow-x-auto pb-1">
              {resolvedSlots.map(({ slot, chord }, index) => (
                <ProgressionSlotCard
                  key={slot.id}
                  slot={slot}
                  chord={chord}
                  index={index}
                  allowedLengths={allowed}
                  isCurrent={player.currentSlot === index}
                  isNext={player.nextSlot === index}
                  beatInBar={player.beatInBar}
                  beatsPerBar={state.timeSignature.beats}
                  onSelect={player.jumpTo}
                  onRemove={player.remove}
                  onSetBars={player.setBars}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
