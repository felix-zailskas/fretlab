import type { AccidentalStyle } from '../theory/notes'
import { getMajorScaleNotes } from '../theory/scales'
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
    <div className="flex flex-wrap gap-3 text-sm">
      <span className="text-xs text-gray-400 uppercase tracking-wide self-center">
        {selectedKey} major
      </span>
      {notes.map((note, i) => (
        <div
          key={`${i}-${note}`}
          className="flex items-baseline gap-1 px-2 py-1 rounded bg-gray-800"
        >
          <span className="text-xs text-gray-400">{DEGREE_LABELS[i]}</span>
          <span className="text-gray-100 font-semibold">{note}</span>
        </div>
      ))}
    </div>
  )
}
