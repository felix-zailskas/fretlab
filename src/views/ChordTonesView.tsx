import { useMemo, useState } from 'react'
import { Fretboard } from '../components/Fretboard/Fretboard'
import { PositionSelector } from '../components/PositionSelector'
import { ALL_NOTES_KEY } from '../components/KeySelector'
import type { HighlightableRole } from '../components/Legend'
import { FRET_COUNT } from '../theory/constants'
import {
  buildChordToneMarkers,
  type PositionSelection,
} from '../theory/chordTones'
import type { AccidentalStyle } from '../theory/notes'
import type { DiatonicChord } from '../theory/scales'

type ChordTonesViewProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  enabledHighlights: Set<HighlightableRole>
  selectedChord: DiatonicChord | null
}

export function ChordTonesView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: ChordTonesViewProps) {
  const [selectedPosition, setSelectedPosition] = useState<PositionSelection>('all')
  const [showOutside, setShowOutside] = useState(false)

  const markers = useMemo(
    () =>
      buildChordToneMarkers({
        key: selectedKey,
        chord: selectedChord,
        accidentalStyle,
        position: selectedPosition,
        showOutside,
        enabledHighlights,
      }),
    [selectedKey, selectedChord, accidentalStyle, selectedPosition, showOutside, enabledHighlights],
  )

  if (selectedKey === ALL_NOTES_KEY) {
    return (
      <div className="text-fg-faint text-center py-20">
        Select a key to view chord tones.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <PositionSelector
          selectedPosition={selectedPosition}
          onChange={setSelectedPosition}
        />
        {selectedPosition !== 'all' && (
          <label className="inline-flex items-center gap-2 text-sm text-fg-secondary">
            <input
              type="checkbox"
              checked={showOutside}
              onChange={(e) => setShowOutside(e.target.checked)}
            />
            Show outside position
          </label>
        )}
      </div>
      <Fretboard markers={markers} fretCount={FRET_COUNT} />
    </div>
  )
}
