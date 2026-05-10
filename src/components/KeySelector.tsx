import type { AccidentalStyle } from "../theory/notes";

export const ALL_NOTES_KEY = "all";

// Note keys only — All is rendered separately so it reads as a meta-toggle
// (clear key) rather than yet another key choice in the row.
const FLAT_STYLE_NOTE_KEYS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const SHARP_STYLE_NOTE_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

type KeySelectorProps = {
  selectedKey: string;
  accidentalStyle: AccidentalStyle;
  onKeyChange: (key: string) => void;
};

export function KeySelector({
  selectedKey,
  accidentalStyle,
  onKeyChange,
}: KeySelectorProps) {
  const noteKeys =
    accidentalStyle === "sharp" ? SHARP_STYLE_NOTE_KEYS : FLAT_STYLE_NOTE_KEYS;
  const isAllSelected = selectedKey === ALL_NOTES_KEY;

  return (
    <div className="relative after:absolute after:right-0 after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-surface after:to-transparent after:pointer-events-none md:after:hidden">
      <div className="flex flex-nowrap overflow-x-auto md:flex-wrap items-center gap-1 pb-0.5">
        <button
          onClick={() => onKeyChange(ALL_NOTES_KEY)}
          className={`px-2 py-1.5 md:px-3 md:py-2.5 pointer-coarse:py-3 rounded text-xs md:text-sm font-semibold border transition-colors cursor-pointer shrink-0 ${
            isAllSelected
              ? "bg-selection text-fg-emphasis border-selection"
              : "bg-transparent text-fg-secondary border-line hover:bg-surface-raised"
          }`}
        >
          All
        </button>
        <span
          aria-hidden="true"
          className="w-px h-6 bg-line self-center mx-1 shrink-0"
        />
        {noteKeys.map((key) => (
          <button
            key={key}
            onClick={() => onKeyChange(key)}
            className={`min-w-[2rem] md:min-w-[2.5rem] px-2 py-1.5 md:px-3 md:py-2.5 pointer-coarse:py-3 rounded text-xs md:text-sm font-semibold transition-colors cursor-pointer shrink-0 ${
              selectedKey === key
                ? "bg-selection text-fg-emphasis"
                : "bg-surface-raised text-fg-secondary hover:bg-surface-active"
            }`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
