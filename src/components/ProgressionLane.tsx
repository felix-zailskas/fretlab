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

// noKey: the key is "All", so no slot resolves. The metronome still plays.
type ProgressionLaneProps = { player: ProgressionPlayer; noKey: boolean };

// Slim strip under the header holding the progression's chord chips. Absent
// (zero height) while there is nothing to show; the transport lives in the
// header.
export function ProgressionLane({ player, noKey }: ProgressionLaneProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { state, resolvedSlots } = player;
  if (noKey || resolvedSlots.length === 0) return null;

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
      className="border-t border-line bg-surface px-4 py-1.5"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={state.slots.map((s) => s.id)}
          strategy={horizontalListSortingStrategy}
        >
          <ol className="flex gap-1.5 overflow-x-auto">
            {resolvedSlots.map(({ slot, chord }, index) => (
              <ProgressionSlotCard
                key={slot.id}
                slot={slot}
                chord={chord}
                index={index}
                allowedLengths={allowed}
                isCurrent={player.currentSlot === index}
                isNext={player.nextSlot === index}
                beatInSlot={player.beatInSlot}
                beatsPerBar={state.timeSignature.beats}
                bpm={state.bpm}
                onSelect={player.jumpTo}
                onRemove={player.remove}
                onSetBars={player.setBars}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </section>
  );
}
