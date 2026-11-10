import type { ChordRef, ChordRowMode } from "../theory/harmony";
import { MODE_NAMES, type Mode } from "../theory/modes";
import { ChordGrid } from "./ChordGrid";
import { ChordRowModeToggle } from "./ChordRowModeToggle";
import { ALL_NOTES_KEY } from "../theory/notes";

type ChordMapProps = {
  selectedKey: string;
  modalMode: Mode;
  rowMode: ChordRowMode;
  onRowModeChange: (m: ChordRowMode) => void;
  selectedRef: ChordRef | null;
  onSelect: (ref: ChordRef) => void;
};

// Reference of the key's chords below the board. Clicking one shows it on
// the board; building a progression happens in the lane under the header.
export function ChordMap({
  selectedKey,
  modalMode,
  rowMode,
  onRowModeChange,
  selectedRef,
  onSelect,
}: ChordMapProps) {
  const hasKey = selectedKey !== ALL_NOTES_KEY;
  return (
    <section className="mt-6 pt-4 border-t border-line" aria-label="Chord map">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-1">
        <h2 className="text-sm font-semibold text-fg-emphasis">
          {hasKey ? `Chords in ${selectedKey} ${MODE_NAMES[modalMode]}` : "Chords"}
        </h2>
        <ChordRowModeToggle value={rowMode} onChange={onRowModeChange} />
        <span className="text-xs text-fg-muted">
          {hasKey
            ? "Click a chord to show it on the board."
            : "Pick a key to see its chords."}
        </span>
      </div>
      {hasKey && (
        <ChordGrid
          selectedKey={selectedKey}
          modalMode={modalMode}
          rowMode={rowMode}
          selectedRef={selectedRef}
          onPick={onSelect}
        />
      )}
    </section>
  );
}
