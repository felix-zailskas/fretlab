import type { AccidentalStyle } from '../theory/notes'
import { getDiatonicChords, type ChordQuality } from '../theory/scales'
import { ALL_NOTES_KEY } from './KeySelector'

type DiatonicChordsProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
}

const QUALITY_ACCENT: Record<ChordQuality, string> = {
  maj7: 'border-gray-600 bg-gray-800',
  m7: 'border-gray-700 bg-gray-800/80',
  '7': 'border-gray-700 bg-gray-800/80',
  m7b5: 'border-gray-700 bg-gray-800/80',
}

export function DiatonicChords({ selectedKey, accidentalStyle }: DiatonicChordsProps) {
  if (selectedKey === ALL_NOTES_KEY) return null

  const chords = getDiatonicChords(selectedKey, accidentalStyle)

  return (
    <section className="mt-8">
      <h2 className="text-sm text-gray-300 uppercase tracking-wider font-semibold mb-3">
        Diatonic chords
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {chords.map((chord) => (
          <div
            key={chord.degree}
            className={`flex flex-col items-center justify-center gap-3 px-4 py-8 min-h-[10rem] rounded-xl border-2 shadow-lg ${QUALITY_ACCENT[chord.quality]}`}
          >
            <span className="text-lg text-gray-400 font-mono font-semibold">
              {chord.romanNumeral}
            </span>
            <span className="text-3xl font-bold text-white leading-none">
              {chord.symbol}
            </span>
            <span className="text-lg text-gray-200 tracking-wider font-medium">
              {chord.notes.join(' – ')}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
