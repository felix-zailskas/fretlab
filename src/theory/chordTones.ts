import { ALL_NOTES_KEY } from '../components/KeySelector'
import type { HighlightableRole } from '../components/Legend'
import { FRET_COUNT } from './constants'
import {
  STANDARD_TUNING,
  getDisplayName,
  getNoteAtFret,
  getNoteIndex,
  type AccidentalStyle,
} from './notes'
import { isInPositionWindow, type PositionId } from './positions'
import { getIntervalRole, type DiatonicChord } from './scales'
import type { IntervalRole, NoteDisplayRole, NoteMarker } from './types'

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

export type PositionSelection = PositionId | 'all'

export type BuildChordToneMarkersInput = {
  key: string
  chord: DiatonicChord | null
  accidentalStyle: AccidentalStyle
  position: PositionSelection
  showOutside: boolean
  enabledHighlights: Set<HighlightableRole>
}

// Pure function: given the Chord-Tones view's full input, returns the
// NoteMarker[] that the Fretboard should render. Mirrors the pipeline
// described in the spec under "Marker Computation". Returns [] for the
// "All Notes" key (the chord-tones concept requires a key).
export function buildChordToneMarkers({
  key,
  chord,
  accidentalStyle,
  position,
  showOutside,
  enabledHighlights,
}: BuildChordToneMarkersInput): NoteMarker[] {
  if (key === ALL_NOTES_KEY) return []

  const result: NoteMarker[] = []

  for (let stringIndex = 0; stringIndex < STANDARD_TUNING.length; stringIndex++) {
    const openString = STANDARD_TUNING[stringIndex]
    for (let fret = 0; fret <= FRET_COUNT; fret++) {
      const note = getNoteAtFret(openString, fret)
      const interval = getIntervalRole(key, note)
      if (interval === null) continue // out of key — drop entirely

      const inWindow =
        position === 'all' ? true : isInPositionWindow(key, position, fret)
      if (!inWindow && !showOutside) continue // hide outside (focus mode)

      let role = roleFromChordTone(note, chord, interval)
      if (HIGHLIGHTABLE.has(role) && !enabledHighlights.has(role as HighlightableRole)) {
        role = 'scale' // Legend toggle off → demote
      }
      if (!inWindow) {
        role = 'muted' // outside-window override (showOutside=true case)
      }

      result.push({
        string: stringIndex,
        fret,
        note: getDisplayName(note, key, accidentalStyle),
        role,
      })
    }
  }

  return result
}
