import type { AccidentalStyle } from "../theory/notes";
import { getDiatonicChords, type ChordQuality } from "../theory/scales";
import { ALL_NOTES_KEY } from "./KeySelector";

type DiatonicChordsProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedDegree: number | null;
  onSelectDegree: (degree: number) => void;
};

const QUALITY_ACCENT: Record<ChordQuality, string> = {
  maj7: "border-line-emphasis bg-surface-raised",
  m7: "border-line bg-surface-raised",
  "7": "border-line bg-surface-raised",
  m7b5: "border-line bg-surface-raised",
};

export function DiatonicChords({
  selectedKey,
  accidentalStyle,
  selectedDegree,
  onSelectDegree,
}: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const chords = getDiatonicChords(selectedKey, accidentalStyle);

  return (
    <section className="mt-8">
      <h2 className="text-sm text-fg-secondary uppercase tracking-wider font-semibold mb-3">
        Diatonic chords
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {chords.map((chord) => {
          const isSelected = selectedDegree === chord.degree;
          return (
            <button
              key={chord.degree}
              type="button"
              onClick={() => onSelectDegree(chord.degree)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-3 px-4 py-8 min-h-[10rem] rounded-xl border-2 shadow-lg cursor-pointer transition-colors ${
                isSelected
                  ? "border-line-selected bg-surface-active"
                  : `${QUALITY_ACCENT[chord.quality]} hover:border-line-hover`
              }`}
            >
              <span className="text-lg text-fg-muted font-mono font-semibold">
                {chord.romanNumeral}
              </span>
              <span className="text-3xl font-bold text-fg-emphasis leading-none">
                {chord.symbol}
              </span>
              <span className="text-lg text-fg-secondary tracking-wider font-medium">
                {chord.notes.join(" – ")}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
