import type { AccidentalStyle } from '../theory/notes'
import { getDiatonicChords, type ChordQuality } from '../theory/scales'
import { ALL_NOTES_KEY } from './KeySelector'

type DiatonicChordsProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
}

const QUALITY_ACCENT: Record<ChordQuality, string> = {
  major: 'border-gray-700',
  minor: 'border-gray-700',
  diminished: 'border-rose-900/60',
}

export function DiatonicChords({ selectedKey, accidentalStyle }: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null

  const chords = getDiatonicChords(selectedKey, accidentalStyle)

  return (
    <section className="mt-6">
      <h2 className="text-xs text-gray-400 uppercase tracking-wide mb-2">
        Diatonic chords
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {chords.map((chord) => (
          <div
            key={chord.degree}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded bg-gray-900 border ${QUALITY_ACCENT[chord.quality]}`}
          >
            <span className="text-xs text-gray-500 font-mono">{chord.romanNumeral}</span>
            <span className="text-2xl font-bold text-gray-100">{chord.symbol}</span>
            <span className="text-xs text-gray-400 tracking-wider">
              {chord.notes.join(' – ')}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
