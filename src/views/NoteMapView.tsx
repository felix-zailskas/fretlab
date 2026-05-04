import { useMemo } from 'react'
import { Fretboard } from '../components/Fretboard/Fretboard'
import { ALL_NOTES_KEY } from '../components/KeySelector'
import type { HighlightableRole } from '../components/Legend'
import {
  STANDARD_TUNING,
  getNoteAtFret,
  getDisplayName,
  getNoteIndex,
  type AccidentalStyle,
} from '../theory/notes'
import { getIntervalRole, type DiatonicChord } from '../theory/scales'
import type { IntervalRole, NoteMarker, NoteDisplayRole } from '../theory/types'

type NoteMapViewProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  enabledHighlights: Set<HighlightableRole>
  selectedChord: DiatonicChord | null
}

const FRET_COUNT = 15

const INTERVAL_TO_DISPLAY_ROLE: Record<IntervalRole, NoteDisplayRole> = {
  root: 'root',
  second: 'scale',
  third: 'third',
  fourth: 'scale',
  fifth: 'fifth',
  sixth: 'scale',
  seventh: 'seventh',
}

const HIGHLIGHTABLE: ReadonlySet<NoteDisplayRole> = new Set<NoteDisplayRole>([
  'root', 'third', 'fifth', 'seventh',
])

export function NoteMapView({
  selectedKey,
  accidentalStyle,
  enabledHighlights,
  selectedChord,
}: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = []
    const showAll = selectedKey === ALL_NOTES_KEY

    // Pre-compute the chord-tone chromatic indices so each fret is O(1).
    const chordIndices: [number, number, number, number] | null = selectedChord
      ? [
          getNoteIndex(selectedChord.notes[0]),
          getNoteIndex(selectedChord.notes[1]),
          getNoteIndex(selectedChord.notes[2]),
          getNoteIndex(selectedChord.notes[3]),
        ]
      : null

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex]
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const note = getNoteAtFret(openString, fret)

        let role: NoteDisplayRole
        let displayName: string

        if (showAll) {
          role = 'scale'
          displayName = getDisplayName(note, selectedKey, accidentalStyle)
        } else {
          const interval = getIntervalRole(selectedKey, note)
          if (interval === null) continue

          if (chordIndices) {
            const noteIdx = getNoteIndex(note)
            if (noteIdx === chordIndices[0]) role = 'root'
            else if (noteIdx === chordIndices[1]) role = 'third'
            else if (noteIdx === chordIndices[2]) role = 'fifth'
            else if (noteIdx === chordIndices[3]) role = 'seventh'
            else role = 'scale'
          } else {
            role = INTERVAL_TO_DISPLAY_ROLE[interval]
          }

          // De-highlight to plain scale tone if the user toggled this role off.
          if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role as HighlightableRole)) {
            role = 'scale'
          }
          displayName = getDisplayName(note, selectedKey, accidentalStyle)
        }

        result.push({
          string: stringIndex,
          fret,
          note: displayName,
          role,
        })
      }
    }

    return result
  }, [selectedKey, accidentalStyle, enabledHighlights, selectedChord])

  return <Fretboard markers={markers} fretCount={FRET_COUNT} />
}
