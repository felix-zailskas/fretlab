import { ALL_NOTES_KEY, type AccidentalStyle } from "../theory/notes";
import { HEADER_SELECT } from "./controlStyles";

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

// Header dropdown. "All notes" (no key) comes first.
export function KeySelector({
  selectedKey,
  accidentalStyle,
  onKeyChange,
}: KeySelectorProps) {
  const noteKeys =
    accidentalStyle === "sharp" ? SHARP_STYLE_NOTE_KEYS : FLAT_STYLE_NOTE_KEYS;

  return (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      Key
      <select
        aria-label="Key"
        value={selectedKey}
        onChange={(e) => onKeyChange(e.target.value)}
        className={HEADER_SELECT}
      >
        <option value={ALL_NOTES_KEY}>All notes</option>
        {noteKeys.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </label>
  );
}
