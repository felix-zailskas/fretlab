import { useCallback, useMemo, useState } from 'react'
import { Fretboard, type PositionWindow } from '../components/Fretboard/Fretboard'
import { PositionToggles } from '../components/PositionToggles'
import { ALL_NOTES_KEY } from '../components/KeySelector'
import type { HighlightableRole } from '../components/Legend'
import { FRET_COUNT } from '../theory/constants'
import { buildChordToneMarkers } from '../theory/chordTones'
import {
  CAGED_POSITIONS,
  getPositionWindow,
  type PositionId,
} from '../theory/positions'
import type { AccidentalStyle } from '../theory/notes'
import type { DiatonicChord } from '../theory/scales'

type ChordTonesViewProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  enabledHighlights: Set<HighlightableRole>
  selectedChord: DiatonicChord | null
}

const DEFAULT_POSITIONS: PositionId[] = ['P1']

export function ChordTonesView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: ChordTonesViewProps) {
  const [selectedPositions, setSelectedPositions] = useState<Set<PositionId>>(
    () => new Set(DEFAULT_POSITIONS),
  )
  const [showContext, setShowContext] = useState(false)

  const togglePosition = useCallback((position: PositionId) => {
    setSelectedPositions((prev) => {
      const next = new Set(prev)
      if (next.has(position)) next.delete(position)
      else next.add(position)
      return next
    })
  }, [])

  const positionsArray = useMemo(
    () =>
      // Iterate in canonical CAGED_POSITIONS order so the resulting list is
      // deterministic regardless of toggle-click order.
      CAGED_POSITIONS.map((p) => p.id).filter((id) => selectedPositions.has(id)),
    [selectedPositions],
  )

  const positionWindows = useMemo<PositionWindow[]>(() => {
    if (selectedKey === ALL_NOTES_KEY) return []
    return CAGED_POSITIONS.filter((p) => selectedPositions.has(p.id)).map((p) => {
      const [low, high] = getPositionWindow(selectedKey, p.id)
      return {
        id: p.id,
        low,
        high,
        label: `${p.id} — ${p.shape}`,
      }
    })
  }, [selectedKey, selectedPositions])

  const markers = useMemo(
    () =>
      buildChordToneMarkers({
        key: selectedKey,
        chord: selectedChord,
        accidentalStyle,
        positions: positionsArray,
        showContext,
        enabledHighlights,
      }),
    [selectedKey, selectedChord, accidentalStyle, positionsArray, showContext, enabledHighlights],
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
      <div className="flex flex-wrap items-center gap-6">
        <PositionToggles selected={selectedPositions} onToggle={togglePosition} />
        <label className="inline-flex items-center gap-2 text-sm text-fg-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={showContext}
            onChange={(e) => setShowContext(e.target.checked)}
          />
          Show context notes
        </label>
      </div>
      {selectedPositions.size === 0 ? (
        <div className="text-fg-faint text-center py-20">
          Toggle a position to begin.
        </div>
      ) : (
        <Fretboard
          markers={markers}
          fretCount={FRET_COUNT}
          positionWindows={positionWindows}
        />
      )}
    </div>
  )
}
