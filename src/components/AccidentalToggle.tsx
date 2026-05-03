import type { AccidentalStyle } from '../theory/notes'

const OPTIONS: { value: AccidentalStyle; label: string }[] = [
  { value: 'flat', label: '♭' },
  { value: 'sharp', label: '♯' },
]

type AccidentalToggleProps = {
  accidentalStyle: AccidentalStyle
  onChange: (style: AccidentalStyle) => void
}

export function AccidentalToggle({ accidentalStyle, onChange }: AccidentalToggleProps) {
  return (
    <div className="inline-flex rounded overflow-hidden border border-gray-700">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          aria-pressed={accidentalStyle === opt.value}
          className={`px-3 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
            accidentalStyle === opt.value
              ? 'bg-gray-700 text-white'
              : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
