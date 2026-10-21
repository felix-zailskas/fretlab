import { Fragment } from "react";
import {
  borrowSourceMode,
  getChordMap,
  sameChordRef,
  type ChordRef,
  type ChordRowMode,
  type ChordTier,
} from "../theory/harmony";
import { MODE_NAMES, type Mode } from "../theory/modes";
import { ChordMapCard } from "./ChordMapCard";
import { ChordRowModeToggle } from "./ChordRowModeToggle";
import { ALL_NOTES_KEY } from "../theory/notes";

type ChordMapProps = {
  selectedKey: string;
  modalMode: Mode;
  rowMode: ChordRowMode;
  onRowModeChange: (m: ChordRowMode) => void;
  selectedRef: ChordRef | null;
  onSelect: (ref: ChordRef) => void;
  onAdd?: (ref: ChordRef) => void; // only while the progression panel is visible
};

export function ChordMap({
  selectedKey,
  modalMode,
  rowMode,
  onRowModeChange,
  selectedRef,
  onSelect,
  onAdd,
}: ChordMapProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const map = getChordMap(selectedKey, modalMode, rowMode);
  const tiers: { tier: ChordTier; label: string }[] = [
    { tier: "secondary", label: "Secondary dominants" },
    { tier: "diatonic", label: `Diatonic (${selectedKey} ${MODE_NAMES[modalMode]})` },
    {
      tier: "borrowed",
      label: `Borrowed (${selectedKey} ${MODE_NAMES[borrowSourceMode(modalMode)]})`,
    },
  ];

  return (
    <section className="mt-4 md:mt-8" aria-label="Chord map">
      <div className="flex items-center justify-start gap-2 mb-3">
        <ChordRowModeToggle value={rowMode} onChange={onRowModeChange} />
      </div>
      {/* The grid keeps 7 columns at every width so each chord stays in its
          degree's column; below min-w it scrolls instead of re-flowing. */}
      <div className="overflow-x-auto pb-1">
        <div className="grid grid-cols-7 gap-2 md:gap-4 min-w-[34rem]">
          {tiers.map(({ tier, label }) => (
            <Fragment key={tier}>
              <h3 className="col-span-7 text-xs text-fg-muted uppercase tracking-wide">
                {label}
              </h3>
              {map[tier].map((chord, i) =>
                chord ? (
                  <ChordMapCard
                    key={`${tier}-${i}`}
                    chord={chord}
                    isSelected={sameChordRef(selectedRef, chord.ref)}
                    onSelect={onSelect}
                    onAdd={onAdd}
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
    </section>
  );
}
