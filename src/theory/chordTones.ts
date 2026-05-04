import { getNoteIndex } from './notes'
import type { DiatonicChord } from './scales'
import type { IntervalRole, NoteDisplayRole } from './types'

const INTERVAL_TO_DISPLAY_ROLE: Record<IntervalRole, NoteDisplayRole> = {
  root: 'root',
  second: 'scale',
  third: 'third',
  fourth: 'scale',
  fifth: 'fifth',
  sixth: 'scale',
  seventh: 'seventh',
}

// Roles the Legend can toggle off (demoted to 'scale' when their toggle is
// disabled). Both NoteMapView and ChordTonesView read from this single set.
export const HIGHLIGHTABLE: ReadonlySet<NoteDisplayRole> = new Set<NoteDisplayRole>([
  'root',
  'third',
  'fifth',
  'seventh',
])

// Resolves the visual role of an in-key note given an optional chord context.
// - With a chord: returns the chord-relative role ('root'/'third'/'fifth'/
//   'seventh'), or 'scale' if the note is in-key but not a chord tone.
// - Without a chord: falls back to the major-scale interval mapping where
//   1/3/5/7 light up and 2/4/6 are muted to 'scale'.
// Caller is responsible for filtering out-of-key notes upstream (intervalRole
// is non-nullable here; callers pass the result of getIntervalRole and skip
// when null).
export function roleFromChordTone(
  note: string,
  chord: DiatonicChord | null,
  intervalRole: IntervalRole,
): NoteDisplayRole {
  if (!chord) {
    return INTERVAL_TO_DISPLAY_ROLE[intervalRole]
  }
  const noteIdx = getNoteIndex(note)
  const rootIdx = getNoteIndex(chord.notes[0])
  const thirdIdx = getNoteIndex(chord.notes[1])
  const fifthIdx = getNoteIndex(chord.notes[2])
  const seventhIdx = getNoteIndex(chord.notes[3])

  if (noteIdx === rootIdx) return 'root'
  if (noteIdx === thirdIdx) return 'third'
  if (noteIdx === fifthIdx) return 'fifth'
  if (noteIdx === seventhIdx) return 'seventh'
  return 'scale'
}
