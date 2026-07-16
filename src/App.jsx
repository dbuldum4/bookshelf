import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import BookDetails from './components/BookDetails'
import Controls from './components/Controls'
import LibraryPanel from './components/LibraryPanel'
import SettingsPanel from './components/SettingsPanel'
import WebGLFallback from './components/WebGLFallback'
import {
  DEFAULT_GRAPHICS_QUALITY,
  getGraphicsPreset,
  loadGraphicsQuality,
  saveGraphicsQuality,
} from './graphicsQuality'
import {
  applyShelfTransform,
  assignBookToShelf,
  booksFitOnShelf,
  booksOnShelf,
  bookWorldFocusPosition,
  createBook,
  createShelf,
  DEFAULT_SHELF_ID,
  deleteEmptyShelf,
  ensureLibraryCapacity,
  loadLibraryState,
  saveLibraryState,
  tryReorderBookOnShelf,
} from './library'
import Scene from './scene/Scene'
import { isWebGLAvailable } from './webgl'

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

function WebGLContextLossHandler({ onContextLost }) {
  const gl = useThree((state) => state.gl)

  useEffect(() => {
    const canvas = gl.domElement
    const handleContextLost = (event) => {
      event.preventDefault()
      onContextLost()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    return () => canvas.removeEventListener('webglcontextlost', handleContextLost)
  }, [gl, onContextLost])

  return null
}

export default function App() {
  // One localStorage parse for both library state and the default selected shelf.
  const initialLibraryRef = useRef(null)
  if (initialLibraryRef.current === null) {
    const state = loadLibraryState()
    initialLibraryRef.current = {
      libraryState: state,
      selectedShelfId: state.shelves[0]?.id || DEFAULT_SHELF_ID,
    }
  }

  const [webGLAvailable, setWebGLAvailable] = useState(isWebGLAvailable)
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState('realistic')
  const [graphicsQuality, setGraphicsQuality] = useState(loadGraphicsQuality)
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion)
  const [reducedMotionUserOverride, setReducedMotionUserOverride] = useState(false)
  const [libraryState, setLibraryState] = useState(() => initialLibraryRef.current.libraryState)
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [selectedShelfId, setSelectedShelfId] = useState(
    () => initialLibraryRef.current.selectedShelfId
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [focusPoint, setFocusPoint] = useState(null)

  const library = libraryState.books
  const shelves = libraryState.shelves
  const selectedBook = library.find((book) => book.id === selectedBookId)
  const selectedShelf = shelves.find((shelf) => shelf.id === selectedShelfId) || shelves[0]
  const graphics = useMemo(
    () => getGraphicsPreset(graphicsQuality || DEFAULT_GRAPHICS_QUALITY),
    [graphicsQuality],
  )

  useEffect(() => {
    saveLibraryState(libraryState)
  }, [libraryState])

  useEffect(() => {
    saveGraphicsQuality(graphicsQuality)
  }, [graphicsQuality])

  useEffect(() => {
    if (mode === 'play') setSelectedBookId(null)
  }, [mode])

  useEffect(() => {
    if (selectedBookId == null && focusPoint != null) setFocusPoint(null)
  }, [focusPoint, selectedBookId])

  useEffect(() => {
    if (!shelves.some((shelf) => shelf.id === selectedShelfId) && shelves[0]) {
      setSelectedShelfId(shelves[0].id)
    }
  }, [shelves, selectedShelfId])

  // Keep selection focus synchronized with physical layout changes. This
  // covers shelf moves/resizes, reorders, and moving the selected book.
  useEffect(() => {
    if (selectedBookId == null) return
    const currentBook = library.find((book) => book.id === selectedBookId)
    if (!currentBook) {
      setSelectedBookId(null)
      setFocusPoint(null)
      return
    }

    const nextFocus = bookWorldFocusPosition(currentBook, library, shelves)
    if (currentBook.shelfId) {
      setSelectedShelfId((current) => (current === currentBook.shelfId ? current : currentBook.shelfId))
    }
    setFocusPoint((current) => (
      focusPointsEqual(current, nextFocus) ? current : nextFocus
    ))
  }, [library, shelves, selectedBookId])

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

  const flashStatus = useCallback((message) => {
    setStatusMessage(message)
  }, [])

  const selectBook = useCallback((id) => {
    if (id == null) {
      setSelectedBookId(null)
      return
    }
    const book = library.find((entry) => entry.id === id)
    if (!book) return
    setSelectedBookId(id)
    if (book.shelfId) setSelectedShelfId(book.shelfId)
    setFocusPoint(bookWorldFocusPosition(book, library, shelves))
  }, [library, shelves])

  const moveBookSelection = useCallback((delta) => {
    if (!library.length || mode === 'play' || mode === 'arrange') return
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
    if (!library.length || mode === 'play' || mode === 'arrange') return
    const nextBook = position === 'start' ? library[0] : library[library.length - 1]
    if (nextBook) selectBook(nextBook.id)
  }, [library, mode, selectBook])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (event.defaultPrevented) return
        if (document.querySelector('[data-modal="true"], [aria-modal="true"]')) return
        if (selectedBookId) setSelectedBookId(null)
        return
      }

      if (!BOOK_NAV_KEYS.has(event.key)) return
      if (mode === 'play' || mode === 'arrange' || !library.length) return
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
    if (updates.shelfId && updates.shelfId !== selectedBook?.shelfId) {
      const target = shelves.find((shelf) => shelf.id === updates.shelfId)
      if (!target) return
      const capacity = assignBookToShelf(library, selectedBookId, updates.shelfId, target)
      if (!capacity.ok) {
        flashStatus(capacity.reason)
        return
      }
      const { shelfId: _shelfId, ...rest } = updates
      setLibraryState((state) => {
        const liveTarget = state.shelves.find((shelf) => shelf.id === updates.shelfId)
        if (!liveTarget) return state
        const result = assignBookToShelf(state.books, selectedBookId, updates.shelfId, liveTarget)
        if (!result.ok) return state
        const books = result.books.map((book) => {
          if (book.id !== selectedBookId) return book
          return applyBookFieldUpdates(book, rest)
        })
        return { ...state, books }
      })
      return
    }

    setLibraryState((state) => ({
      ...state,
      books: state.books.map((book) => {
        if (book.id !== selectedBookId) return book
        return applyBookFieldUpdates(book, updates)
      }),
    }))
  }

  const addBook = (draft) => {
    const requestedShelfId = draft.shelfId || selectedShelfId || shelves[0]?.id || DEFAULT_SHELF_ID
    const shelf = shelves.find((entry) => entry.id === requestedShelfId) || shelves[0]
    const shelfId = shelf?.id || DEFAULT_SHELF_ID
    const provisional = createBook({ ...draft, shelfId }, library.length, shelfId)
    const onShelf = [...booksOnShelf(library, shelfId), provisional]
    if (shelf && !booksFitOnShelf(onShelf, shelf)) {
      flashStatus('That shelf is full. Free space, pick another shelf, or resize it in Arrange mode.')
      return false
    }
    setLibraryState((state) => ({
      ...state,
      books: [...state.books, provisional],
    }))
    setSelectedBookId(provisional.id)
    setSelectedShelfId(shelfId)
    setFocusPoint(bookWorldFocusPosition(provisional, [...library, provisional], shelves))
    return true
  }

  const deleteSelectedBook = () => {
    if (!selectedBookId) return
    setLibraryState((state) => ({
      ...state,
      books: state.books.filter((book) => book.id !== selectedBookId),
    }))
    setSelectedBookId(null)
  }

  const replaceLibrary = (next) => {
    const books = Array.isArray(next?.books) ? next.books : Array.isArray(next) ? next : []
    const nextShelves = Array.isArray(next?.shelves) && next.shelves.length
      ? next.shelves
      : shelves.length
        ? shelves
        : [{ id: DEFAULT_SHELF_ID, name: 'Library', x: 0, z: 0, yaw: 0, width: 7.6, rows: 4 }]
    const fitted = ensureLibraryCapacity({ books, shelves: nextShelves })
    setLibraryState({ books: fitted.books, shelves: fitted.shelves })
    setSelectedBookId(null)
    setSelectedShelfId(fitted.shelves[0]?.id || DEFAULT_SHELF_ID)
    if (fitted.message) flashStatus(fitted.message)
  }

  const renameShelf = (shelfId, name) => {
    const trimmed = name.trim()
    setLibraryState((state) => ({
      ...state,
      shelves: state.shelves.map((shelf) =>
        shelf.id === shelfId ? { ...shelf, name: trimmed || shelf.name } : shelf
      ),
    }))
  }

  const transformShelf = (shelfId, updates) => {
    const shelf = shelves.find((entry) => entry.id === shelfId)
    if (!shelf) return
    const preview = applyShelfTransform(shelf, library, updates)
    if (!preview.ok) {
      flashStatus(preview.reason)
      return
    }
    setLibraryState((state) => {
      const live = state.shelves.find((entry) => entry.id === shelfId)
      if (!live) return state
      const result = applyShelfTransform(live, state.books, updates)
      if (!result.ok) return state
      return {
        ...state,
        shelves: state.shelves.map((entry) => (entry.id === shelfId ? result.shelf : entry)),
      }
    })
  }

  const moveShelf = useCallback((shelfId, { x, z }) => {
    setLibraryState((state) => ({
      ...state,
      shelves: state.shelves.map((shelf) =>
        shelf.id === shelfId ? { ...shelf, x, z } : shelf
      ),
    }))
  }, [])

  const handleAddShelf = () => {
    const last = shelves[shelves.length - 1]
    const created = createShelf({
      name: `Shelf ${shelves.length + 1}`,
      x: last ? last.x + last.width + 2.5 : 0,
      z: last ? last.z : 0,
      yaw: 0,
    }, shelves.length)
    setLibraryState((state) => {
      if (state.shelves.some((shelf) => shelf.id === created.id)) return state
      return { ...state, shelves: [...state.shelves, created] }
    })
    setSelectedShelfId(created.id)
    setMode('arrange')
    flashStatus('New shelf added. Drag it into place, then resize with the Arrange controls.')
  }

  const handleDeleteShelf = (shelfId) => {
    const preview = deleteEmptyShelf(shelves, library, shelfId)
    if (!preview.ok) {
      flashStatus(preview.reason)
      return
    }
    setLibraryState((state) => {
      const result = deleteEmptyShelf(state.shelves, state.books, shelfId)
      if (!result.ok) return state
      return { ...state, shelves: result.shelves }
    })
    flashStatus('Shelf removed.')
  }

  const handleReorderBook = (bookId, delta) => {
    if (!delta) return
    const book = library.find((entry) => entry.id === bookId)
    const shelf = shelves.find((entry) => entry.id === book?.shelfId)
    const preview = tryReorderBookOnShelf(library, bookId, delta, shelf)
    if (!preview.ok) {
      flashStatus(preview.reason)
      return
    }

    setLibraryState((state) => {
      const liveBook = state.books.find((entry) => entry.id === bookId)
      const liveShelf = state.shelves.find((entry) => entry.id === liveBook?.shelfId)
      const result = tryReorderBookOnShelf(state.books, bookId, delta, liveShelf)
      if (!result.ok) return state
      return { ...state, books: result.books }
    })
  }

  const retryWebGL = () => {
    setWebGLAvailable(isWebGLAvailable())
  }

  const handleWebGLContextLost = useCallback(() => {
    setWebGLAvailable(false)
  }, [])

  useEffect(() => {
    if (!statusMessage) return undefined
    const timer = window.setTimeout(() => setStatusMessage(''), 4500)
    return () => window.clearTimeout(timer)
  }, [statusMessage])

  return (
    <div
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ width: '100vw', height: '100vh', background: '#05010f' }}
    >
      {webGLAvailable ? (
        <Canvas
          key={graphicsQuality}
          shadows={graphics.shadows}
          camera={{ position: [0, 1.95, 11], fov: 55 }}
          dpr={graphics.dpr}
          gl={{ antialias: graphics.antialias }}
          onCreated={({ gl }) => {
            const canvas = gl.domElement
            canvas.tabIndex = 0
            canvas.setAttribute('role', 'application')
            canvas.setAttribute(
              'aria-label',
              '3D library. WASD to walk, Space to jump, drag to look around. Arrow keys move between books. Escape clears selection. Use Arrange mode to place shelves.',
            )
          }}
        >
          <WebGLContextLossHandler onContextLost={handleWebGLContextLost} />
          <Scene
            mode={mode}
            resetKey={resetKey}
            galaxyMode={galaxyMode}
            graphics={graphics}
            reducedMotion={reducedMotion}
            library={library}
            shelves={shelves}
            selectedBookId={selectedBookId}
            onSelectBook={selectBook}
            selectedShelfId={selectedShelfId}
            onSelectShelf={setSelectedShelfId}
            onMoveShelf={moveShelf}
            focusPoint={focusPoint}
          />
        </Canvas>
      ) : (
        <WebGLFallback onRetry={retryWebGL} />
      )}

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {selectionAnnouncement}
      </div>

      {statusMessage && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 88,
            transform: 'translateX(-50%)',
            zIndex: 30,
            maxWidth: 'min(440px, calc(100vw - 32px))',
            padding: '10px 14px',
            borderRadius: 12,
            color: '#fff',
            background: 'rgba(20, 18, 35, 0.88)',
            border: '1px solid rgba(255,255,255,0.14)',
            fontSize: 13,
            fontWeight: 600,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          {statusMessage}
        </div>
      )}

      {webGLAvailable && (
        <>
          <Controls
            mode={mode}
            setMode={setMode}
            reducedMotion={reducedMotion}
            onReset={() => setResetKey((key) => key + 1)}
            shelves={shelves}
            selectedShelf={selectedShelf}
            selectedShelfId={selectedShelfId}
            onSelectShelf={setSelectedShelfId}
            onRenameShelf={renameShelf}
            onTransformShelf={transformShelf}
            onAddShelf={handleAddShelf}
            onDeleteShelf={handleDeleteShelf}
            books={library}
          />
          <SettingsPanel
            galaxyMode={galaxyMode}
            setGalaxyMode={setGalaxyMode}
            graphicsQuality={graphicsQuality}
            setGraphicsQuality={setGraphicsQuality}
            reducedMotion={reducedMotion}
            setReducedMotion={setReducedMotionPreference}
          />
        </>
      )}
      <LibraryPanel
        library={library}
        shelves={shelves}
        selectedBookId={selectedBookId}
        selectedShelfId={selectedShelfId}
        onSelectBook={selectBook}
        onSelectShelf={setSelectedShelfId}
        onAddBook={addBook}
        onReplaceLibrary={replaceLibrary}
        onReorderBook={handleReorderBook}
      />
      <BookDetails
        book={selectedBook}
        shelves={shelves}
        onUpdate={updateSelectedBook}
        onDelete={deleteSelectedBook}
        onClose={() => setSelectedBookId(null)}
        onReorder={handleReorderBook}
      />
    </div>
  )
}

function applyBookFieldUpdates(book, updates) {
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
}

function focusPointsEqual(left, right) {
  if (!left || !right) return left === right
  return left.id === right.id
    && left.x === right.x
    && left.y === right.y
    && left.z === right.z
    && left.cameraX === right.cameraX
    && left.cameraZ === right.cameraZ
}
