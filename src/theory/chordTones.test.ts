import { describe, it, expect } from 'vitest'
import { roleFromChordTone, HIGHLIGHTABLE } from './chordTones'
import { getDiatonicChords, getIntervalRole } from './scales'
import type { IntervalRole, NoteDisplayRole } from './types'

describe('roleFromChordTone', () => {
  it('returns the major-scale interval mapping when no chord is given', () => {
    // C major scale tones: 1=C(root), 2=D(scale), 3=E(third), 4=F(scale),
    //                      5=G(fifth), 6=A(scale), 7=B(seventh).
    const cases: Array<[string, IntervalRole, NoteDisplayRole]> = [
      ['C', 'root', 'root'],
      ['D', 'second', 'scale'],
      ['E', 'third', 'third'],
      ['F', 'fourth', 'scale'],
      ['G', 'fifth', 'fifth'],
      ['A', 'sixth', 'scale'],
      ['B', 'seventh', 'seventh'],
    ]
    for (const [note, interval, expected] of cases) {
      expect(roleFromChordTone(note, null, interval)).toBe(expected)
    }
  })

  it('maps to chord-relative roles when a chord is given (G major, ii = Am7)', () => {
    // ii in G major is Am7: A C E G — A=root, C=third, E=fifth, G=seventh.
    const chords = getDiatonicChords('G')
    const am7 = chords[1] // ii
    expect(am7.symbol.toLowerCase()).toContain('a')

    expect(roleFromChordTone('A', am7, getIntervalRole('G', 'A')!)).toBe('root')
    expect(roleFromChordTone('C', am7, getIntervalRole('G', 'C')!)).toBe('third')
    expect(roleFromChordTone('E', am7, getIntervalRole('G', 'E')!)).toBe('fifth')
    expect(roleFromChordTone('G', am7, getIntervalRole('G', 'G')!)).toBe('seventh')
  })

  it('returns "scale" for in-key notes that are not chord tones', () => {
    // In G major over Am7, D is in the G major scale but not in Am7.
    const am7 = getDiatonicChords('G')[1]
    expect(roleFromChordTone('D', am7, getIntervalRole('G', 'D')!)).toBe('scale')
  })

  it('handles enharmonic equivalence (sharp vs flat input)', () => {
    // V7 in F major is C7 = C E G Bb. Bb and A# are enharmonic — both should
    // resolve as the chord's seventh.
    const c7 = getDiatonicChords('F')[4]
    expect(roleFromChordTone('Bb', c7, getIntervalRole('F', 'Bb')!)).toBe('seventh')
    expect(roleFromChordTone('A#', c7, getIntervalRole('F', 'A#')!)).toBe('seventh')
  })
})

describe('HIGHLIGHTABLE', () => {
  it('contains exactly the four chord-tone roles', () => {
    expect(HIGHLIGHTABLE.has('root')).toBe(true)
    expect(HIGHLIGHTABLE.has('third')).toBe(true)
    expect(HIGHLIGHTABLE.has('fifth')).toBe(true)
    expect(HIGHLIGHTABLE.has('seventh')).toBe(true)
    expect(HIGHLIGHTABLE.has('scale')).toBe(false)
    expect(HIGHLIGHTABLE.has('muted')).toBe(false)
  })
})
