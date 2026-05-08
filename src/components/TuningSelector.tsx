import { TUNINGS, type TuningId } from "../theory/tuning";

type TuningSelectorProps = {
  tuningId: TuningId;
  onTuningChange: (id: TuningId) => void;
};

const TUNING_IDS: TuningId[] = ["standard", "open-g"];

export function TuningSelector({ tuningId, onTuningChange }: TuningSelectorProps) {
  return (
    <label className="flex items-center gap-2 text-sm text-fg-muted">
      <span className="uppercase tracking-wide text-xs">Tuning</span>
      <select
        value={tuningId}
        onChange={(e) => onTuningChange(e.target.value as TuningId)}
        className="rounded border border-line bg-surface text-fg-primary px-2 py-1 pointer-coarse:py-2 cursor-pointer"
      >
        {TUNING_IDS.map((id) => (
          <option key={id} value={id}>
            {TUNINGS[id].name}
          </option>
        ))}
      </select>
    </label>
  );
}
