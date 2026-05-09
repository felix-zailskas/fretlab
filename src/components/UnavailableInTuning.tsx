import type { ViewId } from "../views/types";
import { TUNINGS, type TuningId } from "../theory/tuning";

type UnavailableInTuningProps = {
  viewId: ViewId;
  tuningId: TuningId;
  onSwitchToStandard: () => void;
};

const VIEW_LABEL: Record<ViewId, string> = {
  "note-map": "Note Map",
  "scale-positions": "Scale Positions",
  "chord-shapes": "Chord Shapes",
};

const VIEW_REASON: Record<ViewId, string> = {
  "note-map": "",
  "scale-positions":
    "Scale Positions teaches the CAGED system, which is specific to standard tuning's intervals.",
  "chord-shapes":
    "Chord Shapes teaches drop-2 / drop-3 voicing systems, which are specific to standard tuning's intervals.",
};

export function UnavailableInTuning({
  viewId,
  tuningId,
  onSwitchToStandard,
}: UnavailableInTuningProps) {
  return (
    <div className="text-center py-20 space-y-4 max-w-md mx-auto">
      <p className="text-fg-secondary text-base">
        <span className="font-semibold text-fg-emphasis">{VIEW_LABEL[viewId]}</span>{" "}
        isn't available in{" "}
        <span className="font-semibold">{TUNINGS[tuningId].name}</span>.
      </p>
      <p className="text-fg-muted text-sm">{VIEW_REASON[viewId]}</p>
      <button
        type="button"
        onClick={onSwitchToStandard}
        className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active cursor-pointer"
      >
        Switch to Standard tuning
      </button>
    </div>
  );
}
