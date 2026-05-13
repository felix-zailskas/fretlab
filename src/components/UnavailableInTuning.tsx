import type { ViewId } from "../views/types";
import type { Tuning } from "../theory/tuning";

type UnavailableInTuningProps = {
  viewId: ViewId;
  tuning: Tuning;
  onSwitchToStandard: () => void;
  onSwitchToNoteMap: () => void;
};

const VIEW_LABEL: Record<ViewId, string> = {
  "note-map": "Note Map",
  "scale-positions": "Scale Positions",
  "chord-shapes": "Chord Shapes",
};

export function UnavailableInTuning({
  viewId,
  tuning,
  onSwitchToStandard,
  onSwitchToNoteMap,
}: UnavailableInTuningProps) {
  return (
    <div className="text-center py-20 space-y-4 max-w-md mx-auto">
      <p className="text-fg-emphasis font-semibold text-lg">
        Not available in this tuning
      </p>
      <p className="text-fg-secondary text-sm">
        <span className="font-semibold text-fg-emphasis">{VIEW_LABEL[viewId]}</span>{" "}
        relies on the standard-tuning interval pattern (5-5-5-4-5 semitones
        between adjacent strings). Your current tuning{" "}
        <span className="font-semibold text-fg-emphasis">{tuning.name}</span> has
        a different pattern, so its shapes don't transfer here.
      </p>
      <p className="text-fg-muted text-sm">
        Switch back to <span className="font-semibold">Standard</span> to use
        this view, or stay on <span className="font-semibold">Note Map</span>{" "}
        which works for any tuning.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onSwitchToStandard}
          className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
        >
          Switch to Standard
        </button>
        <button
          type="button"
          onClick={onSwitchToNoteMap}
          className="px-3 py-2.5 pointer-coarse:py-3 rounded text-sm font-semibold bg-surface-raised text-fg-secondary hover:bg-surface-active transition-transform active:scale-[0.97] cursor-pointer"
        >
          Stay on Note Map
        </button>
      </div>
    </div>
  );
}
