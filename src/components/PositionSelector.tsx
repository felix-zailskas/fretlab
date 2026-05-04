import type { PositionSelection } from '../theory/chordTones'

const OPTIONS: ReadonlyArray<{ id: PositionSelection; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'P1', label: 'P1' },
  { id: 'P2', label: 'P2' },
  { id: 'P3', label: 'P3' },
  { id: 'P4', label: 'P4' },
  { id: 'P5', label: 'P5' },
]

type PositionSelectorProps = {
  selectedPosition: PositionSelection
  onChange: (next: PositionSelection) => void
}

export function PositionSelector({ selectedPosition, onChange }: PositionSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${
            selectedPosition === opt.id
              ? 'bg-surface-active text-fg-emphasis'
              : 'bg-transparent text-fg-muted hover:text-fg-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
