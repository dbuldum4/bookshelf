import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import BookDetails from './components/BookDetails'
import Controls from './components/Controls'
import LibraryPanel from './components/LibraryPanel'
import { createBook, loadLibrary, saveLibrary } from './library'
import Scene from './scene/Scene'

const BOOKS_PER_SHELF_VIEW = 40

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export default function App() {
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState('realistic')
  const [library, setLibrary] = useState(loadLibrary)
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [shelfPage, setShelfPage] = useState(0)
  const selectedBook = library.find((book) => book.id === selectedBookId)
  const shelfPageCount = Math.max(1, Math.ceil(library.length / BOOKS_PER_SHELF_VIEW))
  const visibleLibrary = useMemo(() => {
    const start = shelfPage * BOOKS_PER_SHELF_VIEW
    return library.slice(start, start + BOOKS_PER_SHELF_VIEW)
  }, [library, shelfPage])

  useEffect(() => {
    saveLibrary(library)
  }, [library])

  useEffect(() => {
    if (mode === 'play') setSelectedBookId(null)
  }, [mode])

  useEffect(() => {
    setShelfPage((page) => Math.min(page, shelfPageCount - 1))
  }, [shelfPageCount])

  const selectBook = (id) => {
    const index = library.findIndex((book) => book.id === id)
    if (index < 0) return
    setShelfPage(Math.floor(index / BOOKS_PER_SHELF_VIEW))
    setSelectedBookId(id)
  }

  const updateSelectedBook = (updates) => {
    setLibrary((books) => books.map((book) => {
      if (book.id !== selectedBookId) return book

      const next = { ...book, ...updates }
      if (updates.status === 'Reading' && !book.startedAt) next.startedAt = today()
      if (updates.status === 'Finished' && !book.finishedAt) next.finishedAt = today()
      if (updates.pageCount !== undefined) {
        next.pageCount = Math.max(0, Number(updates.pageCount) || 0)
        next.currentPage = Math.min(Number(next.currentPage) || 0, next.pageCount || Number.MAX_SAFE_INTEGER)
      }
      if (updates.currentPage !== undefined) {
        const currentPage = Math.max(0, Number(updates.currentPage) || 0)
        next.currentPage = next.pageCount ? Math.min(currentPage, next.pageCount) : currentPage
      }
      return next
    }))
  }

  const addBook = (draft) => {
    const index = library.length
    const book = createBook(draft, index)
    setLibrary((books) => [...books, book])
    setShelfPage(Math.floor(index / BOOKS_PER_SHELF_VIEW))
    setSelectedBookId(book.id)
  }

  const deleteSelectedBook = () => {
    if (!selectedBookId) return
    setLibrary((books) => books.filter((book) => book.id !== selectedBookId))
    setSelectedBookId(null)
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
          library={visibleLibrary}
          selectedBookId={selectedBookId}
          onSelectBook={selectBook}
        />
      </Canvas>

      <Controls
        mode={mode}
        setMode={setMode}
        galaxyMode={galaxyMode}
        setGalaxyMode={setGalaxyMode}
        onReset={() => setResetKey((key) => key + 1)}
        shelfPage={shelfPage}
        shelfPageCount={shelfPageCount}
        setShelfPage={setShelfPage}
      />
      <LibraryPanel
        library={library}
        selectedBookId={selectedBookId}
        onSelectBook={selectBook}
        onAddBook={addBook}
      />
      <BookDetails
        book={selectedBook}
        onUpdate={updateSelectedBook}
        onDelete={deleteSelectedBook}
        onClose={() => setSelectedBookId(null)}
      />
    </div>
  )
}
