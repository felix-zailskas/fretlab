import { useMemo } from 'react'
import { Fretboard } from '../components/Fretboard/Fretboard'
import { STANDARD_TUNING, getNoteAtFret, getDisplayName } from '../theory/notes'
import { getIntervalRole } from '../theory/scales'
import type { IntervalRole, NoteMarker, NoteDisplayRole } from '../theory/types'

type NoteMapViewProps = {
  selectedKey: string
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

export function NoteMapView({ selectedKey }: NoteMapViewProps) {
  const markers = useMemo(() => {
    const result: NoteMarker[] = []

    for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
      const openString = STANDARD_TUNING[stringIndex]
      for (let fret = 0; fret <= FRET_COUNT; fret++) {
        const note = getNoteAtFret(openString, fret)
        const interval = getIntervalRole(selectedKey, note)
        if (interval === null) continue

        const role = INTERVAL_TO_DISPLAY_ROLE[interval]

        result.push({
          string: stringIndex,
          fret,
          note: getDisplayName(note, selectedKey),
          role,
        })
      }
    }

    return result
  }, [selectedKey])

  return <Fretboard markers={markers} fretCount={FRET_COUNT} />
}
