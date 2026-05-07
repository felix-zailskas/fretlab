import type { AccidentalStyle } from "../theory/notes";
import { type DiatonicChord, type DiatonicTriad } from "../theory/scales";
import {
  getModalScaleNotes,
  MODE_DEGREE_LABELS,
  MODE_STEPS,
  type Mode,
} from "../theory/modes";
import { HIGHLIGHTABLE, roleFromChordTone } from "../theory/chordTones";
import { ALL_NOTES_KEY } from "./KeySelector";
import type { HighlightableRole } from "./Legend";

const ROLE_PILL_CLASSES: Record<HighlightableRole, string> = {
  root: "bg-root/20 border-root/40 text-fg-primary",
  third: "bg-third/20 border-third/40 text-fg-primary",
  fifth: "bg-fifth/20 border-fifth/40 text-fg-primary",
  seventh: "bg-seventh/20 border-seventh/40 text-fg-primary",
};

const NEUTRAL_PILL_CLASSES = "bg-surface-raised border-line text-fg-secondary";

const MODE_DISPLAY_NAME: Record<Mode, string> = {
  ionian: "major",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  aeolian: "Aeolian",
  locrian: "Locrian",
};

type ScaleDisplayProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  enabledRoles: Set<HighlightableRole>;
  // Optional — defaults to 'ionian', preserving today's "{key} major" header.
  // Phase D wires App.tsx to pass this explicitly from global state.
  mode?: Mode;
};

export function ScaleDisplay({
  selectedKey,
  accidentalStyle,
  selectedChord,
  enabledRoles,
  mode = "ionian",
}: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const notes = getModalScaleNotes(selectedKey, mode, accidentalStyle);
  const labels = MODE_DEGREE_LABELS[mode];
  const steps = MODE_STEPS[mode].slice(0, notes.length - 1);

  const gridStyle = {
    gridTemplateColumns: `auto repeat(${notes.length}, auto)`,
  };

  return (
    <div className="overflow-x-auto overflow-y-clip">
      <div
        role="list"
        aria-label={`${selectedKey} ${MODE_DISPLAY_NAME[mode]} scale degrees`}
        className="inline-grid items-center gap-x-2 gap-y-1 text-sm"
        style={gridStyle}
      >
        <span
          className="text-xs text-fg-muted uppercase tracking-wide self-center"
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          {selectedKey} {MODE_DISPLAY_NAME[mode]}
        </span>
        {notes.map((note, i) => {
          let role = roleFromChordTone(note, selectedChord);
          if (HIGHLIGHTABLE.has(role) && !enabledRoles.has(role as HighlightableRole)) {
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
              className={`flex items-baseline gap-1 px-2 py-1 rounded border ${pillClasses}`}
              style={{ gridRow: 1, gridColumn: i + 2 }}
            >
              <span className="text-xs opacity-70">{labels[i]}</span>
              <span className="font-semibold">{note}</span>
            </div>
          );
        })}
        {steps.map((step, i) => (
          <span
            key={`step-${i}`}
            className="text-xs leading-none text-fg-muted text-center select-none px-1.5 py-0.5 rounded bg-surface-raised mx-auto"
            style={{ gridRow: 2, gridColumn: `${i + 2} / span 2` }}
            title={step === "half" ? "Half step" : "Whole step"}
          >
            {step === "half" ? "H" : "W"}
          </span>
        ))}
      </div>
    </div>
  );
}
