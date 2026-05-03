import { describe, it, expect } from 'vitest'
import { getMajorScaleNotes, getIntervalRole, MAJOR_SCALE_INTERVALS } from './scales'

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
