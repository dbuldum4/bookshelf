import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import BookDetails from './components/BookDetails'
import Controls from './components/Controls'
import { loadLibrary, saveLibrary } from './library'
import Scene from './scene/Scene'

export default function App() {
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState('realistic')
  const [library, setLibrary] = useState(loadLibrary)
  const [selectedBookId, setSelectedBookId] = useState(null)
  const selectedBook = library.find((book) => book.id === selectedBookId)

  useEffect(() => {
    saveLibrary(library)
  }, [library])

  useEffect(() => {
    if (mode === 'play') setSelectedBookId(null)
  }, [mode])

  const updateSelectedBook = (updates) => {
    setLibrary((books) =>
      books.map((book) =>
        book.id === selectedBookId ? { ...book, ...updates } : book
      )
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#05010f' }}>
      <Canvas
        shadows
        camera={{ position: [0, 2, 11], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <Scene
          mode={mode}
          resetKey={resetKey}
          galaxyMode={galaxyMode}
          library={library}
          selectedBookId={selectedBookId}
          onSelectBook={setSelectedBookId}
        />
      </Canvas>

      <Controls
        mode={mode}
        setMode={setMode}
        galaxyMode={galaxyMode}
        setGalaxyMode={setGalaxyMode}
        onReset={() => setResetKey((key) => key + 1)}
      />
      <BookDetails
        book={selectedBook}
        onUpdate={updateSelectedBook}
        onClose={() => setSelectedBookId(null)}
      />
    </div>
  )
}
