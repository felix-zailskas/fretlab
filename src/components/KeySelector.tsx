const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

type KeySelectorProps = {
  selectedKey: string
  onKeyChange: (key: string) => void
}

export function KeySelector({ selectedKey, onKeyChange }: KeySelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {KEYS.map((key) => (
        <button
          key={key}
          onClick={() => onKeyChange(key)}
          className={`px-3 py-1.5 rounded text-sm font-semibold transition-colors cursor-pointer ${
            selectedKey === key
              ? 'bg-[var(--color-root)] text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
