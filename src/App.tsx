import { useCallback, useState } from 'react'
import { AccidentalToggle } from './components/AccidentalToggle'
import { KeySelector, ALL_NOTES_KEY } from './components/KeySelector'
import { ViewSelector } from './components/ViewSelector'
import { Legend, type HighlightableRole } from './components/Legend'
import { ScaleDisplay } from './components/ScaleDisplay'
import { DiatonicChords } from './components/DiatonicChords'
import { NoteMapView } from './views/NoteMapView'
import type { AccidentalStyle } from './theory/notes'

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ['root', 'third', 'fifth', 'seventh']

const ENHARMONIC_KEY_SWAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
}

function App() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedView, setSelectedView] = useState('note-map')
  const [accidentalStyle, setAccidentalStyle] = useState<AccidentalStyle>('flat')
  const [enabledHighlights, setEnabledHighlights] = useState<Set<HighlightableRole>>(
    () => new Set(DEFAULT_HIGHLIGHTS),
  )

  const toggleHighlight = useCallback((role: HighlightableRole) => {
    setEnabledHighlights((prev) => {
      const next = new Set(prev)
      if (next.has(role)) next.delete(role)
      else next.add(role)
      return next
    })
  }, [])

  const handleAccidentalChange = useCallback((next: AccidentalStyle) => {
    setAccidentalStyle((prev) => {
      if (prev !== next) {
        // Swap the selected key to its enharmonic equivalent so we stay on the same scale.
        setSelectedKey((prevKey) =>
          prevKey === ALL_NOTES_KEY ? prevKey : ENHARMONIC_KEY_SWAP[prevKey] ?? prevKey,
        )
      }
      return next
    })
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-4">
      <header className="max-w-6xl mx-auto space-y-4 mb-6">
        <h1 className="text-2xl font-bold">Fretlab</h1>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Key</label>
            <KeySelector
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              onKeyChange={setSelectedKey}
            />
          </div>
          <AccidentalToggle accidentalStyle={accidentalStyle} onChange={handleAccidentalChange} />
        </div>
        <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
        <ScaleDisplay selectedKey={selectedKey} accidentalStyle={accidentalStyle} />
        <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
      </header>

      <main className="max-w-6xl mx-auto">
        {selectedView === 'note-map' ? (
          <>
            <NoteMapView
              selectedKey={selectedKey}
              accidentalStyle={accidentalStyle}
              enabledHighlights={enabledHighlights}
            />
            <DiatonicChords selectedKey={selectedKey} accidentalStyle={accidentalStyle} />
          </>
        ) : (
          <div className="text-gray-500 text-center py-20">
            Coming soon
          </div>
        )}
      </main>
    </div>
  )
}

export default App
