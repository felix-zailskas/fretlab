import type { AccidentalStyle } from "../theory/notes";
import {
  getMajorScaleNotes,
  MAJOR_SCALE_STEPS,
  type DiatonicChord,
  type DiatonicTriad,
} from "../theory/scales";
import { HIGHLIGHTABLE, roleFromChordTone } from "../theory/chordTones";
import { ALL_NOTES_KEY } from "./KeySelector";
import type { HighlightableRole } from "./Legend";

const DEGREE_LABELS = ["1", "2", "3", "4", "5", "6", "7"];

// Pill background / border / text classes per chord-tone role. The intent is
// "less prominent than the fretboard markers but unmistakably the same color
// system" — 20% bg, 40% border, primary text.
const ROLE_PILL_CLASSES: Record<HighlightableRole, string> = {
  root: "bg-root/20 border-root/40 text-fg-primary",
  third: "bg-third/20 border-third/40 text-fg-primary",
  fifth: "bg-fifth/20 border-fifth/40 text-fg-primary",
  seventh: "bg-seventh/20 border-seventh/40 text-fg-primary",
};

const NEUTRAL_PILL_CLASSES = "bg-surface-raised border-line text-fg-secondary";

type ScaleDisplayProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedChord: DiatonicChord | DiatonicTriad | null;
  enabledRoles: Set<HighlightableRole>;
};

export function ScaleDisplay({
  selectedKey,
  accidentalStyle,
  selectedChord,
  enabledRoles,
}: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const notes = getMajorScaleNotes(selectedKey, accidentalStyle);
  // 6 step intervals between the 7 in-key scale notes (W W H W W W).
  const steps = MAJOR_SCALE_STEPS.slice(0, notes.length - 1);

  // 2-row grid: row 1 holds the key label and the note pills; row 2 holds
  // the step indicators, each spanning two adjacent columns so its centered
  // text sits in the gap between the two pills it connects.
  // Columns: [key label][pill 1][pill 2]...[pill N]
  const gridStyle = {
    gridTemplateColumns: `auto repeat(${notes.length}, auto)`,
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid items-center gap-x-2 gap-y-1 text-sm"
        style={gridStyle}
      >
        <span
          className="text-xs text-fg-muted uppercase tracking-wide self-center"
          style={{ gridRow: 1, gridColumn: 1 }}
        >
          {selectedKey} major
        </span>
        {notes.map((note, i) => {
          // Mirror the fretboard's chord-tone resolution: same helper, same
          // Legend-toggle demotion. Whichever scale degree carries the chord's
          // root/3rd/5th/7th picks up that interval color; everything else
          // stays neutral. With no chord selected, every pill is neutral.
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
              className={`flex items-baseline gap-1 px-2 py-1 rounded border ${pillClasses}`}
              style={{ gridRow: 1, gridColumn: i + 2 }}
            >
              <span className="text-xs opacity-70">{DEGREE_LABELS[i]}</span>
              <span className="font-semibold">{note}</span>
            </div>
          );
        })}
        {steps.map((step, i) => (
          <span
            key={`step-${i}`}
            className="text-[10px] leading-none text-fg-faint text-center select-none"
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
