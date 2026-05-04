import { describe, it, expect } from 'vitest'
import {
  getMajorScaleNotes,
  getIntervalRole,
  getDiatonicChords,
  MAJOR_SCALE_INTERVALS,
  MAJOR_SCALE_STEPS,
} from './scales'

describe('MAJOR_SCALE_INTERVALS', () => {
  it('has correct semitone pattern', () => {
    expect(MAJOR_SCALE_INTERVALS).toEqual([0, 2, 4, 5, 7, 9, 11])
  })
})

describe('getMajorScaleNotes', () => {
  it('returns C major scale', () => {
    expect(getMajorScaleNotes('C')).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })

  it('returns G major scale', () => {
    expect(getMajorScaleNotes('G')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'F#'])
  })

  it('returns D major scale', () => {
    expect(getMajorScaleNotes('D')).toEqual(['D', 'E', 'F#', 'G', 'A', 'B', 'C#'])
  })

  it('returns F major scale (flat key)', () => {
    expect(getMajorScaleNotes('F')).toEqual(['F', 'G', 'A', 'Bb', 'C', 'D', 'E'])
  })

  it('returns Bb major scale', () => {
    expect(getMajorScaleNotes('Bb')).toEqual(['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'])
  })

  it('returns Eb major scale', () => {
    expect(getMajorScaleNotes('Eb')).toEqual(['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'])
  })

  it('returns Ab major scale', () => {
    expect(getMajorScaleNotes('Ab')).toEqual(['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'])
  })

  it('returns all 12 major scales with 7 notes each', () => {
    const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    for (const key of keys) {
      const scale = getMajorScaleNotes(key)
      expect(scale).toHaveLength(7)
      expect(scale[0]).toBe(key)
    }
  })

  it('respects sharp accidentalStyle for a flat-keyed scale', () => {
    expect(getMajorScaleNotes('F', 'sharp')).toEqual(['F', 'G', 'A', 'A#', 'C', 'D', 'E'])
  })

  it('respects flat accidentalStyle for a sharp-keyed scale', () => {
    expect(getMajorScaleNotes('G', 'flat')).toEqual(['G', 'A', 'B', 'C', 'D', 'E', 'Gb'])
  })
})

describe('MAJOR_SCALE_STEPS', () => {
  it('matches the W W H W W W H pattern', () => {
    expect(MAJOR_SCALE_STEPS).toEqual([
      'whole', 'whole', 'half', 'whole', 'whole', 'whole', 'half',
    ])
  })
})

describe('getDiatonicChords', () => {
  it('returns the 7 diatonic chords for C major', () => {
    const chords = getDiatonicChords('C')
    expect(chords).toHaveLength(7)
    expect(chords[0]).toMatchObject({
      romanNumeral: 'I',
      quality: 'major',
      symbol: 'C',
      notes: ['C', 'E', 'G'],
    })
    expect(chords[1]).toMatchObject({
      romanNumeral: 'ii',
      quality: 'minor',
      symbol: 'Dm',
      notes: ['D', 'F', 'A'],
    })
    expect(chords[5]).toMatchObject({
      romanNumeral: 'vi',
      quality: 'minor',
      symbol: 'Am',
      notes: ['A', 'C', 'E'],
    })
    expect(chords[6]).toMatchObject({
      romanNumeral: 'vii°',
      quality: 'diminished',
      symbol: 'Bdim',
      notes: ['B', 'D', 'F'],
    })
  })

  it('returns correct chords for G major (sharps)', () => {
    const chords = getDiatonicChords('G')
    expect(chords[0].symbol).toBe('G')
    expect(chords[0].notes).toEqual(['G', 'B', 'D'])
    expect(chords[6].symbol).toBe('F#dim')
    expect(chords[6].notes).toEqual(['F#', 'A', 'C'])
  })

  it('returns correct chords for F major (flats)', () => {
    const chords = getDiatonicChords('F')
    expect(chords[0].symbol).toBe('F')
    expect(chords[3].symbol).toBe('Bb')
    expect(chords[3].notes).toEqual(['Bb', 'D', 'F'])
  })

  it('respects accidentalStyle override', () => {
    const chords = getDiatonicChords('F', 'sharp')
    expect(chords[3].symbol).toBe('A#')
    expect(chords[3].notes).toEqual(['A#', 'D', 'F'])
  })
})

describe('getIntervalRole', () => {
  it('identifies root in C major', () => {
    expect(getIntervalRole('C', 'C')).toBe('root')
  })

  it('identifies all intervals in C major', () => {
    expect(getIntervalRole('C', 'C')).toBe('root')
    expect(getIntervalRole('C', 'D')).toBe('second')
    expect(getIntervalRole('C', 'E')).toBe('third')
    expect(getIntervalRole('C', 'F')).toBe('fourth')
    expect(getIntervalRole('C', 'G')).toBe('fifth')
    expect(getIntervalRole('C', 'A')).toBe('sixth')
    expect(getIntervalRole('C', 'B')).toBe('seventh')
  })

  it('identifies intervals in G major', () => {
    expect(getIntervalRole('G', 'G')).toBe('root')
    expect(getIntervalRole('G', 'B')).toBe('third')
    expect(getIntervalRole('G', 'D')).toBe('fifth')
    expect(getIntervalRole('G', 'F#')).toBe('seventh')
  })

  it('returns null for notes outside the scale', () => {
    expect(getIntervalRole('C', 'C#')).toBeNull()
    expect(getIntervalRole('C', 'Eb')).toBeNull()
    expect(getIntervalRole('G', 'Bb')).toBeNull()
  })

  it('handles enharmonic equivalents', () => {
    // F# in G major = seventh, should also work if passed as Gb
    expect(getIntervalRole('G', 'Gb')).toBe('seventh')
  })
})
