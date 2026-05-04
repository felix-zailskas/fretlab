import { describe, it, expect } from 'vitest'
import {
  CAGED_POSITIONS,
  getPositionWindow,
  isInPositionWindow,
  type PositionId,
} from './positions'
import { FRET_COUNT } from './constants'

const ALL_KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const
const ALL_POSITIONS: PositionId[] = ['P1', 'P2', 'P3', 'P4', 'P5']

describe('CAGED_POSITIONS', () => {
  it('declares the 5 CAGED positions in the spec-defined order', () => {
    expect(CAGED_POSITIONS).toHaveLength(5)
    expect(CAGED_POSITIONS.map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5'])
    expect(CAGED_POSITIONS.map((p) => p.shape)).toEqual(['E', 'D', 'C', 'A', 'G'])
    expect(CAGED_POSITIONS.map((p) => p.cMajorWindow)).toEqual([
      [0, 3],
      [2, 5],
      [4, 8],
      [7, 10],
      [9, 13],
    ])
  })
})

describe('getPositionWindow', () => {
  it('returns the C-major windows unchanged for key=C', () => {
    expect(getPositionWindow('C', 'P1')).toEqual([0, 3])
    expect(getPositionWindow('C', 'P2')).toEqual([2, 5])
    expect(getPositionWindow('C', 'P3')).toEqual([4, 8])
    expect(getPositionWindow('C', 'P4')).toEqual([7, 10])
    expect(getPositionWindow('C', 'P5')).toEqual([9, 13])
  })

  it('shifts windows by the key offset when they fit within FRET_COUNT', () => {
    // D major = +2: P1 [0,3] -> [2,5], P2 [2,5] -> [4,7], P5 [9,13] -> [11,15].
    expect(getPositionWindow('D', 'P1')).toEqual([2, 5])
    expect(getPositionWindow('D', 'P5')).toEqual([11, 15])
  })

  it('clips a straddling window at FRET_COUNT (G major P4: [14,17] -> [14,15])', () => {
    expect(getPositionWindow('G', 'P4')).toEqual([14, 15])
  })

  it('clips to a single fret when only the low edge is on the neck (B major P3: [15,19] -> [15,15])', () => {
    expect(getPositionWindow('B', 'P3')).toEqual([15, 15])
  })

  it('wraps -12 when the window is entirely past FRET_COUNT (G major P5: [16,20] -> [4,8])', () => {
    expect(getPositionWindow('G', 'P5')).toEqual([4, 8])
  })

  it('wraps -12 for A major P5 ([18,22] -> [6,10])', () => {
    expect(getPositionWindow('A', 'P5')).toEqual([6, 10])
  })

  it('wraps -12 for B major P5 ([20,24] -> [8,12])', () => {
    expect(getPositionWindow('B', 'P5')).toEqual([8, 12])
  })

  it('produces a window with 0 <= low <= high <= FRET_COUNT for every (key, position) pair', () => {
    for (const key of ALL_KEYS) {
      for (const position of ALL_POSITIONS) {
        const [low, high] = getPositionWindow(key, position)
        expect(
          low >= 0 && low <= high && high <= FRET_COUNT,
          `key=${key} pos=${position} window=[${low},${high}]`,
        ).toBe(true)
      }
    }
  })
})

describe('isInPositionWindow', () => {
  it('returns true at both edges of the window and false just outside', () => {
    // C major P3 = [4, 8]
    expect(isInPositionWindow('C', 'P3', 4)).toBe(true)
    expect(isInPositionWindow('C', 'P3', 8)).toBe(true)
    expect(isInPositionWindow('C', 'P3', 5)).toBe(true)
    expect(isInPositionWindow('C', 'P3', 3)).toBe(false)
    expect(isInPositionWindow('C', 'P3', 9)).toBe(false)
  })

  it('reflects the wrap rule (G major P5 wraps to [4, 8])', () => {
    expect(isInPositionWindow('G', 'P5', 4)).toBe(true)
    expect(isInPositionWindow('G', 'P5', 8)).toBe(true)
    expect(isInPositionWindow('G', 'P5', 16)).toBe(false) // outside the rendered range
  })
})
