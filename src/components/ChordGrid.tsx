import { Fragment } from "react";
import {
  borrowSourceMode,
  getChordMap,
  sameChordRef,
  type ChordRef,
  type ChordRowMode,
  type ChordTier,
  type MapChord,
} from "../theory/harmony";
import { MODE_NAMES, type Mode } from "../theory/modes";
import { ChordMapCard } from "./ChordMapCard";

type ChordGridProps = {
  selectedKey: string;
  modalMode: Mode;
  rowMode: ChordRowMode;
  selectedRef: ChordRef | null;
  onPick: (ref: ChordRef) => void;
  // Overrides each card's accessible name (the picker's "Add … to progression").
  cardLabel?: (chord: MapChord) => string;
  showResolution?: boolean;
};

// The key's chords by tier — secondary dominants over the chord they resolve
// to, then diatonic, then borrowed. Shared by the chord map and the
// progression's add picker so both read the same.
export function ChordGrid({
  selectedKey,
  modalMode,
  rowMode,
  selectedRef,
  onPick,
  cardLabel,
  showResolution = true,
}: ChordGridProps) {
  const map = getChordMap(selectedKey, modalMode, rowMode);
  const tiers: { tier: ChordTier; label: string }[] = [
    { tier: "secondary", label: "Secondary dominants" },
    { tier: "diatonic", label: "Diatonic" },
    {
      tier: "borrowed",
      label: `Borrowed from ${selectedKey} ${MODE_NAMES[borrowSourceMode(modalMode)]}`,
    },
  ];

  // Seven columns at every width keep each chord in its degree's column;
  // below min-w the grid scrolls instead of re-flowing.
  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid grid-cols-7 gap-x-2 gap-y-1 min-w-[36rem]">
        {tiers.map(({ tier, label }) => (
          <Fragment key={tier}>
            <h3 className="col-span-7 mt-1 text-xs text-fg-muted">{label}</h3>
            {map[tier].map((chord, i) =>
              chord ? (
                <ChordMapCard
                  key={`${tier}-${i}`}
                  chord={chord}
                  isSelected={sameChordRef(selectedRef, chord.ref)}
                  onPick={onPick}
                  label={cardLabel?.(chord)}
                  showResolution={showResolution}
                />
              ) : (
                <div
                  key={`${tier}-${i}`}
                  data-testid="chord-cell-empty"
                  data-tier={tier}
                  data-degree={i + 1}
                  aria-hidden="true"
                />
              ),
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
