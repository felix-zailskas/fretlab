import type { AccidentalStyle } from '../theory/notes'
import { getMajorScaleNotes, MAJOR_SCALE_STEPS } from '../theory/scales'
import { ALL_NOTES_KEY } from './KeySelector'

const DEGREE_LABELS = ['1', '2', '3', '4', '5', '6', '7']

type ScaleDisplayProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
}

export function ScaleDisplay({ selectedKey, accidentalStyle }: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null

  const notes = getMajorScaleNotes(selectedKey, accidentalStyle)

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-gray-400 uppercase tracking-wide">
        {selectedKey} major
      </span>
      {notes.map((note, i) => (
        <div key={`${i}-${note}`} className="flex items-center gap-2">
          <div className="flex items-baseline gap-1 px-2 py-1 rounded bg-gray-800">
            <span className="text-xs text-gray-400">{DEGREE_LABELS[i]}</span>
            <span className="text-gray-100 font-semibold">{note}</span>
          </div>
          {i < notes.length - 1 && (
            <span
              className={`px-2 py-0.5 rounded text-sm font-medium tracking-wide border ${
                MAJOR_SCALE_STEPS[i] === 'half'
                  ? 'bg-blue-900/25 text-blue-300/80 border-blue-800/40'
                  : 'bg-emerald-900/25 text-emerald-300/80 border-emerald-800/40'
              }`}
              title={MAJOR_SCALE_STEPS[i] === 'half' ? 'Half step' : 'Whole step'}
            >
              {MAJOR_SCALE_STEPS[i] === 'half' ? 'H' : 'F'}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
