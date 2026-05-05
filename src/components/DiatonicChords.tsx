import type { AccidentalStyle } from "../theory/notes";
import {
  getDiatonicChords,
  getDiatonicTriads,
  type ChordQuality,
  type TriadQuality,
} from "../theory/scales";
import { ALL_NOTES_KEY } from "./KeySelector";

export type ChordRowMode = "triads" | "sevenths";

type DiatonicChordsProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  selectedDegree: number | null;
  onSelectDegree: (degree: number) => void;
  mode: ChordRowMode;
  onModeChange: (mode: ChordRowMode) => void;
};

const QUALITY_ACCENT: Record<ChordQuality | TriadQuality, string> = {
  // Sevenths
  maj7: "border-line-emphasis bg-surface-raised",
  m7: "border-line bg-surface-raised",
  "7": "border-line bg-surface-raised",
  m7b5: "border-line bg-surface-raised",
  // Triads — major variants get the emphasized border to mirror the
  // sevenths' maj7 treatment; minor and diminished get the plain line.
  maj: "border-line-emphasis bg-surface-raised",
  min: "border-line bg-surface-raised",
  dim: "border-line bg-surface-raised",
};

const MODE_OPTIONS: { value: ChordRowMode; label: string }[] = [
  { value: "triads", label: "Triads" },
  { value: "sevenths", label: "Sevenths" },
];

export function DiatonicChords({
  selectedKey,
  accidentalStyle,
  selectedDegree,
  onSelectDegree,
  mode,
  onModeChange,
}: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null;

  const chords =
    mode === "sevenths"
      ? getDiatonicChords(selectedKey, accidentalStyle)
      : getDiatonicTriads(selectedKey, accidentalStyle);

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3 gap-4">
        <h2 className="text-sm text-fg-secondary uppercase tracking-wider font-semibold">
          Diatonic chords
        </h2>
        <div
          className="inline-flex rounded overflow-hidden border border-line"
          role="radiogroup"
          aria-label="Chord row mode"
        >
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={mode === opt.value}
              onClick={() => onModeChange(opt.value)}
              className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
                mode === opt.value
                  ? "bg-surface-active text-fg-emphasis"
                  : "bg-surface text-fg-muted hover:bg-surface-raised"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
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
