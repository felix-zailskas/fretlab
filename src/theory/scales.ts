import { getNoteIndex, getDisplayName, CHROMATIC_SCALE, type AccidentalStyle } from './notes'
import type { IntervalRole } from './types'

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const

const INTERVAL_NAMES: IntervalRole[] = ['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']

export function getMajorScaleNotes(key: string, accidentalStyle?: AccidentalStyle): string[] {
  const rootIndex = getNoteIndex(key)
  return MAJOR_SCALE_INTERVALS.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12
    const sharpName = CHROMATIC_SCALE[noteIndex]
    return getDisplayName(sharpName, key, accidentalStyle)
  })
}

export function getIntervalRole(key: string, note: string): IntervalRole | null {
  const noteIndex = getNoteIndex(note)
  const rootIndex = getNoteIndex(key)
  const semitones = (noteIndex - rootIndex + 12) % 12
  const intervalIndex = MAJOR_SCALE_INTERVALS.indexOf(semitones as typeof MAJOR_SCALE_INTERVALS[number])
  if (intervalIndex === -1) return null
  return INTERVAL_NAMES[intervalIndex]
}
