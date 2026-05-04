import { getNoteIndex, getDisplayName, CHROMATIC_SCALE, type AccidentalStyle } from './notes'
import type { IntervalRole } from './types'

export const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11] as const

// Step pattern between consecutive notes of the major scale: 1→2, 2→3, …, 7→1(octave).
export type ScaleStep = 'whole' | 'half'
export const MAJOR_SCALE_STEPS: readonly ScaleStep[] = [
  'whole', 'whole', 'half', 'whole', 'whole', 'whole', 'half',
] as const

const INTERVAL_NAMES: IntervalRole[] = ['root', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh']

export type ChordQuality = 'maj7' | 'm7' | '7' | 'm7b5'

export type DiatonicChord = {
  degree: number             // 1-7
  romanNumeral: string       // 'Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7'
  quality: ChordQuality
  symbol: string             // 'Cmaj7', 'Dm7', 'G7', 'Bm7b5'
  notes: [string, string, string, string]
}

const DIATONIC_TEMPLATE: { numeral: string; quality: ChordQuality }[] = [
  { numeral: 'Imaj7',   quality: 'maj7' },
  { numeral: 'ii7',     quality: 'm7' },
  { numeral: 'iii7',    quality: 'm7' },
  { numeral: 'IVmaj7',  quality: 'maj7' },
  { numeral: 'V7',      quality: '7' },
  { numeral: 'vi7',     quality: 'm7' },
  { numeral: 'viiø7',   quality: 'm7b5' },
]

const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj7: 'maj7',
  m7: 'm7',
  '7': '7',
  m7b5: 'm7b5',
}

export function getMajorScaleNotes(key: string, accidentalStyle?: AccidentalStyle): string[] {
  const rootIndex = getNoteIndex(key)
  return MAJOR_SCALE_INTERVALS.map((interval) => {
    const noteIndex = (rootIndex + interval) % 12
    const sharpName = CHROMATIC_SCALE[noteIndex]
    return getDisplayName(sharpName, key, accidentalStyle)
  })
}

export function getDiatonicChords(key: string, accidentalStyle?: AccidentalStyle): DiatonicChord[] {
  const scale = getMajorScaleNotes(key, accidentalStyle)
  return DIATONIC_TEMPLATE.map(({ numeral, quality }, i) => {
    const root = scale[i]
    const third = scale[(i + 2) % 7]
    const fifth = scale[(i + 4) % 7]
    const seventh = scale[(i + 6) % 7]
    return {
      degree: i + 1,
      romanNumeral: numeral,
      quality,
      symbol: root + QUALITY_SUFFIX[quality],
      notes: [root, third, fifth, seventh],
    }
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
