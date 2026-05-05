import type { AccidentalStyle } from '../theory/notes'
import {
  getMajorScaleNotes,
  MAJOR_SCALE_STEPS,
  type DiatonicChord,
} from '../theory/scales'
import { HIGHLIGHTABLE, roleFromChordTone } from '../theory/chordTones'
import { ALL_NOTES_KEY } from './KeySelector'
import type { HighlightableRole } from './Legend'

const DEGREE_LABELS = ['1', '2', '3', '4', '5', '6', '7']

// Pill background / border / text classes per chord-tone role. The intent is
// "less prominent than the fretboard markers but unmistakably the same color
// system" — 20% bg, 40% border, primary text.
const ROLE_PILL_CLASSES: Record<HighlightableRole, string> = {
  root: 'bg-root/20 border-root/40 text-fg-primary',
  third: 'bg-third/20 border-third/40 text-fg-primary',
  fifth: 'bg-fifth/20 border-fifth/40 text-fg-primary',
  seventh: 'bg-seventh/20 border-seventh/40 text-fg-primary',
}

const NEUTRAL_PILL_CLASSES = 'bg-surface-raised border-line text-fg-secondary'

type ScaleDisplayProps = {
  selectedKey: string
  accidentalStyle: AccidentalStyle
  selectedChord: DiatonicChord | null
  enabledRoles: Set<HighlightableRole>
}

export function ScaleDisplay({
  selectedKey,
  accidentalStyle,
  selectedChord,
  enabledRoles,
}: ScaleDisplayProps) {
  if (selectedKey === ALL_NOTES_KEY) return null

  const notes = getMajorScaleNotes(selectedKey, accidentalStyle)

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-fg-muted uppercase tracking-wide">
        {selectedKey} major
      </span>
      {notes.map((note, i) => {
        // Mirror the fretboard's chord-tone resolution: same helper, same
        // Legend-toggle demotion. Whatever scale degree carries the chord's
        // root/3rd/5th/7th picks up that interval color; everything else
        // stays neutral. With no chord selected, every pill is neutral.
        let role = roleFromChordTone(note, selectedChord)
        if (HIGHLIGHTABLE.has(role) && !enabledRoles.has(role as HighlightableRole)) {
          role = 'scale'
        }
        const isHighlighted = HIGHLIGHTABLE.has(role)
        const pillClasses = isHighlighted
          ? ROLE_PILL_CLASSES[role as HighlightableRole]
          : NEUTRAL_PILL_CLASSES
        return (
          <div key={`${i}-${note}`} className="flex items-center gap-2">
            <div className={`flex items-baseline gap-1 px-2 py-1 rounded border ${pillClasses}`}>
              <span className="text-xs opacity-70">{DEGREE_LABELS[i]}</span>
              <span className="font-semibold">{note}</span>
            </div>
            {i < notes.length - 1 && (
              <span
                className="px-2 py-0.5 rounded text-sm font-medium tracking-wide border bg-surface-raised border-line text-fg-muted"
                title={MAJOR_SCALE_STEPS[i] === 'half' ? 'Half step' : 'Whole step'}
              >
                {MAJOR_SCALE_STEPS[i] === 'half' ? 'H' : 'F'}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
