import { useCallback, useState } from 'react'
import { KeySelector } from './components/KeySelector'
import { ViewSelector } from './components/ViewSelector'
import { Legend, type HighlightableRole } from './components/Legend'
import { ScaleDisplay } from './components/ScaleDisplay'
import { NoteMapView } from './views/NoteMapView'

const DEFAULT_HIGHLIGHTS: HighlightableRole[] = ['root', 'third', 'fifth', 'seventh']

function App() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedView, setSelectedView] = useState('note-map')
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

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] p-4">
      <header className="max-w-6xl mx-auto space-y-4 mb-6">
        <h1 className="text-2xl font-bold">Fretlab</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Key</label>
            <KeySelector selectedKey={selectedKey} onKeyChange={setSelectedKey} />
          </div>
        </div>
        <ViewSelector selectedView={selectedView} onViewChange={setSelectedView} />
        <ScaleDisplay selectedKey={selectedKey} />
        <Legend enabledRoles={enabledHighlights} onToggleRole={toggleHighlight} />
      </header>

      <main className="max-w-6xl mx-auto">
        {selectedView === 'note-map' ? (
          <NoteMapView selectedKey={selectedKey} enabledHighlights={enabledHighlights} />
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
