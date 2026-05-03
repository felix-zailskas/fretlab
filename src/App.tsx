import { useState } from 'react'
import { KeySelector } from './components/KeySelector'
import { ViewSelector } from './components/ViewSelector'
import { Legend } from './components/Legend'
import { NoteMapView } from './views/NoteMapView'

function App() {
  const [selectedKey, setSelectedKey] = useState('C')
  const [selectedView, setSelectedView] = useState('note-map')

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
        <Legend />
      </header>

      <main className="max-w-6xl mx-auto">
        {selectedView === 'note-map' ? (
          <NoteMapView selectedKey={selectedKey} />
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
