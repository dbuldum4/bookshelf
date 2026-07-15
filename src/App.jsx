import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import BookDetails from './components/BookDetails'
import Controls from './components/Controls'
import LibraryPanel from './components/LibraryPanel'
import WebGLFallback from './components/WebGLFallback'
import {
  DEFAULT_GRAPHICS_QUALITY,
  getGraphicsPreset,
  loadGraphicsQuality,
  saveGraphicsQuality,
} from './graphicsQuality'
import { createBook, loadLibrary, saveLibrary } from './library'
import Scene from './scene/Scene'
import { isWebGLAvailable } from './webgl'

const BOOKS_PER_SHELF_VIEW = 40
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const BOOK_NAV_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'Home', 'End'])

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

/** True when focus is in a text field, select, or contenteditable. */
function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false
  const el = target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')
  if (!el) return false
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase()
    if (['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'range', 'color', 'image'].includes(type)) {
      return false
    }
  }
  return true
}

/** True when focus is inside a modal, dialog, or book editor panel. */
function isModalOrEditorTarget(target) {
  if (!target || !(target instanceof Element)) return false
  return Boolean(
    target.closest(
      '[role="dialog"], [aria-modal="true"], [data-book-editor], [data-modal], [data-editor]'
    )
  )
}

function shouldIgnoreBookNavigation(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return true
  const target = event.target
  if (isTypingTarget(target)) return true
  if (isModalOrEditorTarget(target)) return true
  return false
}

export default function App() {
  const [webGLAvailable, setWebGLAvailable] = useState(isWebGLAvailable)
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState('realistic')
  const [graphicsQuality, setGraphicsQuality] = useState(loadGraphicsQuality)
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion)
  const [reducedMotionUserOverride, setReducedMotionUserOverride] = useState(false)
  const [library, setLibrary] = useState(loadLibrary)
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [shelfPage, setShelfPage] = useState(0)
  const selectedBook = library.find((book) => book.id === selectedBookId)
  const shelfPageCount = Math.max(1, Math.ceil(library.length / BOOKS_PER_SHELF_VIEW))
  const graphics = useMemo(
    () => getGraphicsPreset(graphicsQuality || DEFAULT_GRAPHICS_QUALITY),
    [graphicsQuality],
  )
  const visibleLibrary = useMemo(() => {
    const start = shelfPage * BOOKS_PER_SHELF_VIEW
    return library.slice(start, start + BOOKS_PER_SHELF_VIEW)
  }, [library, shelfPage])

  useEffect(() => {
    saveLibrary(library)
  }, [library])

  useEffect(() => {
    saveGraphicsQuality(graphicsQuality)
  }, [graphicsQuality])

  useEffect(() => {
    if (mode === 'play') setSelectedBookId(null)
  }, [mode])

  useEffect(() => {
    setShelfPage((page) => Math.min(page, shelfPageCount - 1))
  }, [shelfPageCount])

  // Follow system preference until the user explicitly overrides it.
  useEffect(() => {
    if (reducedMotionUserOverride || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const media = window.matchMedia(REDUCED_MOTION_QUERY)
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [reducedMotionUserOverride])

  const setReducedMotionPreference = (value) => {
    setReducedMotionUserOverride(true)
    setReducedMotion(value)
  }

  const selectBook = useCallback((id) => {
    if (id == null) {
      setSelectedBookId(null)
      return
    }
    const index = library.findIndex((book) => book.id === id)
    if (index < 0) return
    setShelfPage(Math.floor(index / BOOKS_PER_SHELF_VIEW))
    setSelectedBookId(id)
  }, [library])

  const moveBookSelection = useCallback((delta) => {
    if (!library.length || mode === 'play') return
    const currentIndex = selectedBookId
      ? library.findIndex((book) => book.id === selectedBookId)
      : -1

    let nextIndex
    if (currentIndex < 0) {
      nextIndex = delta >= 0 ? 0 : library.length - 1
    } else {
      nextIndex = Math.max(0, Math.min(library.length - 1, currentIndex + delta))
    }

    const nextBook = library[nextIndex]
    if (nextBook) selectBook(nextBook.id)
  }, [library, mode, selectBook, selectedBookId])

  const jumpBookSelection = useCallback((position) => {
    if (!library.length || mode === 'play') return
    const nextBook = position === 'start' ? library[0] : library[library.length - 1]
    if (nextBook) selectBook(nextBook.id)
  }, [library, mode, selectBook])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        // Close book details / clear selection; form fields keep their own Escape handling first.
        if (selectedBookId && !event.defaultPrevented) {
          setSelectedBookId(null)
        }
        return
      }

      if (!BOOK_NAV_KEYS.has(event.key)) return
      if (mode === 'play' || !library.length) return
      if (shouldIgnoreBookNavigation(event)) return

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveBookSelection(-1)
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveBookSelection(1)
      } else if (event.key === 'Home') {
        event.preventDefault()
        jumpBookSelection('start')
      } else if (event.key === 'End') {
        event.preventDefault()
        jumpBookSelection('end')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jumpBookSelection, library.length, mode, moveBookSelection, selectedBookId])

  const [selectionAnnouncement, setSelectionAnnouncement] = useState('')
  const hasAnnouncedSelection = useRef(false)
  useEffect(() => {
    // Skip the initial mount so screen readers are not interrupted on load.
    if (!hasAnnouncedSelection.current) {
      hasAnnouncedSelection.current = true
      return
    }
    setSelectionAnnouncement(
      selectedBook
        ? `Selected ${selectedBook.title}${selectedBook.author ? ` by ${selectedBook.author}` : ''}`
        : 'No book selected',
    )
  }, [selectedBook, selectedBookId])

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

  const replaceLibrary = (books) => {
    setLibrary(books)
    setSelectedBookId(null)
    setShelfPage(0)
  }

  const retryWebGL = () => {
    setWebGLAvailable(isWebGLAvailable())
  }

  return (
    <div
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ width: '100vw', height: '100vh', background: '#05010f' }}
    >
      {webGLAvailable ? (
        <Canvas
          key={graphicsQuality}
          shadows={graphics.shadows}
          camera={{ position: [0, 2, 13], fov: 45 }}
          dpr={graphics.dpr}
          gl={{ antialias: graphics.antialias }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement
            canvas.addEventListener('webglcontextlost', (event) => {
              event.preventDefault()
              setWebGLAvailable(false)
            }, { once: true })
            canvas.tabIndex = 0
            canvas.setAttribute('role', 'application')
            canvas.setAttribute(
              'aria-label',
              '3D bookshelf. Use Left and Right arrow keys to move between books, Home and End to jump to the first or last book, and Escape to clear the selection.',
            )
          }}
        >
          <Scene
            mode={mode}
            resetKey={resetKey}
            galaxyMode={galaxyMode}
            graphics={graphics}
            reducedMotion={reducedMotion}
            library={visibleLibrary}
            selectedBookId={selectedBookId}
            onSelectBook={selectBook}
          />
        </Canvas>
      ) : (
        <WebGLFallback onRetry={retryWebGL} />
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectionAnnouncement}
      </div>

      {webGLAvailable && (
        <Controls
          mode={mode}
          setMode={setMode}
          galaxyMode={galaxyMode}
          setGalaxyMode={setGalaxyMode}
          graphicsQuality={graphicsQuality}
          setGraphicsQuality={setGraphicsQuality}
          reducedMotion={reducedMotion}
          setReducedMotion={setReducedMotionPreference}
          onReset={() => setResetKey((key) => key + 1)}
          shelfPage={shelfPage}
          shelfPageCount={shelfPageCount}
          setShelfPage={setShelfPage}
        />
      )}
      <LibraryPanel
        library={library}
        selectedBookId={selectedBookId}
        onSelectBook={selectBook}
        onAddBook={addBook}
        onReplaceLibrary={replaceLibrary}
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
