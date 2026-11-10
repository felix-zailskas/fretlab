import type { ChordToneSource } from "../theory/harmony";
import {
  getCharacteristicNotes,
  getModalScaleNotes,
  MODE_DEGREE_LABELS,
  MODE_NAMES,
  MODE_STEPS,
  type Mode,
} from "../theory/modes";
import { HIGHLIGHTABLE, roleFromChordTone } from "../theory/chordTones";
import { ALL_NOTES_KEY } from "../theory/notes";
import type { HighlightableRole } from "../theory/types";

const ROLE_PILL_CLASSES: Record<HighlightableRole, string> = {
  root: "bg-root/20 border-root/40 text-fg-primary",
  third: "bg-third/20 border-third/40 text-fg-primary",
  fifth: "bg-fifth/20 border-fifth/40 text-fg-primary",
  seventh: "bg-seventh/20 border-seventh/40 text-fg-primary",
};

const NEUTRAL_PILL_CLASSES = "bg-surface-raised border-line text-fg-secondary";

type ScaleDisplayProps = {
  selectedKey: string;
  selectedChord: ChordToneSource | null;
  enabledRoles: Set<HighlightableRole>;
  // Optional — defaults to 'ionian', preserving today's "{key} major" header.
  // Phase D wires App.tsx to pass this explicitly from global state.
  mode?: Mode;
};

export function ScaleDisplay({
  selectedKey,
  selectedChord,
  enabledRoles,
  mode = "ionian",
}: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const notes = getModalScaleNotes(selectedKey, mode);
  const labels = MODE_DEGREE_LABELS[mode];
  const steps = MODE_STEPS[mode].slice(0, notes.length - 1);
  // Outlined in the same gold as the characteristic ring on the board.
  const characteristic = new Set(getCharacteristicNotes(selectedKey, mode));

  const gridStyle = {
    gridTemplateColumns: `repeat(${notes.length}, auto)`,
  };

  return (
    <div className="relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-8 after:bg-gradient-to-l after:from-surface after:to-transparent after:pointer-events-none">
      <div className="overflow-x-auto overflow-y-clip pr-8">
        <div
          role="list"
          aria-label={`${selectedKey} ${MODE_NAMES[mode]} scale degrees`}
          className="inline-grid items-center gap-x-2 gap-y-1 text-sm"
          style={gridStyle}
        >
          {notes.map((note, i) => {
            let role = roleFromChordTone(note, selectedChord);
            if (
              HIGHLIGHTABLE.has(role) &&
              !enabledRoles.has(role as HighlightableRole)
            ) {
              role = "scale";
            }
            const isHighlighted = HIGHLIGHTABLE.has(role);
            const pillClasses = isHighlighted
              ? ROLE_PILL_CLASSES[role as HighlightableRole]
              : NEUTRAL_PILL_CLASSES;
            return (
              <div
                key={`pill-${i}-${note}`}
                role="listitem"
                aria-label={`Degree ${labels[i]}, ${note}`}
                data-characteristic={characteristic.has(note) || undefined}
                className={`flex items-baseline gap-1 px-2 py-1.5 rounded border ${pillClasses} ${
                  characteristic.has(note) ? "ring-1 ring-characteristic" : ""
                }`}
                style={{ gridRow: 1, gridColumn: i + 1 }}
              >
                <span className="text-xs opacity-70">{labels[i]}</span>
                <span className="font-semibold">{note}</span>
              </div>
            );
          })}
          {steps.map((step, i) => (
            <span
              key={`step-${i}`}
              className="text-xs leading-none text-fg-secondary text-center select-none px-1.5 py-0.5 rounded bg-surface-raised mx-auto"
              style={{ gridRow: 2, gridColumn: `${i + 1} / span 2` }}
              title={step === "half" ? "Half step" : "Whole step"}
            >
              {step === "half" ? "H" : "W"}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
