import type { AccidentalStyle } from '../theory/notes'

export const ALL_NOTES_KEY = 'all'

const FLAT_STYLE_KEYS = [ALL_NOTES_KEY, 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const SHARP_STYLE_KEYS = [ALL_NOTES_KEY, 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

const KEY_LABELS: Record<string, string> = {
  [ALL_NOTES_KEY]: 'All',
}

type KeySelectorProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  onKeyChange: (key: string) => void
}

export function KeySelector({ selectedKey, accidentalStyle, onKeyChange }: KeySelectorProps) {
  const keys = accidentalStyle === 'sharp' ? SHARP_STYLE_KEYS : FLAT_STYLE_KEYS

  return (
    <div className="flex flex-wrap gap-1">
      {keys.map((key) => (
        <button
          key={key}
          onClick={() => onKeyChange(key)}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
            selectedKey === key
              ? 'bg-[var(--color-root)] text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {KEY_LABELS[key] ?? key}
        </button>
      ))}
    </div>
  )
}
