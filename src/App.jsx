import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import BookDetails from './components/BookDetails'
import Controls from './components/Controls'
import ErrorBoundary from './components/ErrorBoundary'
import LibraryPanel from './components/LibraryPanel'
import NormalMode from './normal-mode/NormalMode'
import SettingsPanel from './components/SettingsPanel'
import WebGLFallback from './components/WebGLFallback'
import {
  DEFAULT_GRAPHICS_QUALITY,
  getGraphicsPreset,
  loadGalaxyMode,
  loadGraphicsQuality,
  loadReducedMotionPreference,
  saveGalaxyMode,
  saveGraphicsQuality,
  saveReducedMotionPreference,
} from './graphicsQuality'
import {
  applyRoomPreset,
  applyShelfTransform,
  assignBookToShelf,
  BOOK_FORMATS,
  MAX_PUBLISHED_YEAR,
  booksFitOnShelf,
  booksOnShelf,
  bookWorldFocusPosition,
  createBook,
  createShelf,
  DEFAULT_SHELF_ID,
  deleteEmptyShelf,
  dismissLibraryBackupReminder,
  downloadLibraryExport,
  ensureLibraryCapacity,
  loadLibraryState,
  mergeLibraryStates,
  saveLibraryState,
  shouldRemindLibraryBackup,
  tryReorderBookOnShelf,
  tryReorderBookToIndex,
} from './library'
import Scene from './scene/Scene'
import { isWebGLAvailable } from './webgl'
import { loadViewMode, saveViewMode } from './viewMode'

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
    // Do not preventDefault — we abandon the context and show the fallback UI.
    const handleContextLost = () => {
      onContextLost()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    return () => canvas.removeEventListener('webglcontextlost', handleContextLost)
  }, [gl, onContextLost])

  return null
}

const sceneFallbackStyle = {
  width: '100%',
  height: '100%',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  color: '#fff',
  background: 'radial-gradient(circle at top, #201447, #05010f 68%)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  textAlign: 'center',
}

function SceneErrorFallback({ reset }) {
  return (
    <div role="alert" style={sceneFallbackStyle}>
      <div style={{ maxWidth: 420 }}>
        <p style={{ margin: '0 0 8px', color: '#baa7ef', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          3D scene paused
        </p>
        <h2 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 500 }}>
          The bookshelf could not render
        </h2>
        <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55, fontSize: 14 }}>
          Your library panel still works. Try again, switch to Low graphics in Settings if it reappears, or export a backup.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: '1px solid rgba(169,131,255,0.7)',
            borderRadius: 10,
            padding: '10px 16px',
            color: '#fff',
            background: 'rgba(126,91,226,0.82)',
            cursor: 'pointer',
            font: '600 14px inherit',
          }}
        >
          Retry scene
        </button>
      </div>
    </div>
  )
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

  const storedMotionPreference = useRef(loadReducedMotionPreference()).current
  const [webGLAvailable, setWebGLAvailable] = useState(isWebGLAvailable)
  const [viewMode, setViewMode] = useState(loadViewMode)
  const [mode, setMode] = useState('fixed')
  const [resetKey, setResetKey] = useState(0)
  const [galaxyMode, setGalaxyMode] = useState(loadGalaxyMode)
  const [graphicsQuality, setGraphicsQuality] = useState(loadGraphicsQuality)
  const [reducedMotion, setReducedMotion] = useState(() => (
    storedMotionPreference != null ? storedMotionPreference : prefersReducedMotion()
  ))
  const [reducedMotionUserOverride, setReducedMotionUserOverride] = useState(
    () => storedMotionPreference != null
  )
  const [libraryState, setLibraryState] = useState(() => initialLibraryRef.current.libraryState)
  const [selectedBookId, setSelectedBookId] = useState(null)
  const [selectedShelfId, setSelectedShelfId] = useState(
    () => initialLibraryRef.current.selectedShelfId
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [focusPoint, setFocusPoint] = useState(null)
  const [backupReminder, setBackupReminder] = useState(false)
  const libraryRef = useRef(libraryState.books)
  libraryRef.current = libraryState.books

  const library = libraryState.books
  const shelves = libraryState.shelves
  const selectedBook = library.find((book) => book.id === selectedBookId)
  const selectedShelf = shelves.find((shelf) => shelf.id === selectedShelfId) || shelves[0]
  const graphics = useMemo(
    () => getGraphicsPreset(graphicsQuality || DEFAULT_GRAPHICS_QUALITY),
    [graphicsQuality],
  )

  useEffect(() => {
    if (!saveLibraryState(libraryState)) {
      setStatusMessage('Could not save library to this browser. Storage may be full or disabled.')
    }
  }, [libraryState])

  useEffect(() => {
    setBackupReminder(shouldRemindLibraryBackup({ bookCount: libraryState.books.length }))
  }, [libraryState])

  useEffect(() => {
    saveGraphicsQuality(graphicsQuality)
  }, [graphicsQuality])

  useEffect(() => {
    saveGalaxyMode(galaxyMode)
  }, [galaxyMode])

  useEffect(() => {
    saveViewMode(viewMode)
  }, [viewMode])

  useEffect(() => {
    if (mode === 'play' && selectedBookId != null) setSelectedBookId(null)
  }, [mode, selectedBookId])

  useEffect(() => {
    if (selectedBookId == null && focusPoint != null) setFocusPoint(null)
  }, [focusPoint, selectedBookId])

  useEffect(() => {
    if (!shelves.some((shelf) => shelf.id === selectedShelfId) && shelves[0]) {
      setSelectedShelfId(shelves[0].id)
    }
  }, [shelves, selectedShelfId])

  // Keep focus synchronized with layout changes. Shelf selection is set only
  // on explicit book select so Arrange drag/resize does not steal the shelf.
  useEffect(() => {
    if (selectedBookId == null) return
    const currentBook = library.find((book) => book.id === selectedBookId)
    if (!currentBook) {
      setSelectedBookId(null)
      setFocusPoint(null)
      return
    }

    const nextFocus = bookWorldFocusPosition(currentBook, library, shelves)
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
    saveReducedMotionPreference(value)
  }

  const flashStatus = useCallback((message) => {
    setStatusMessage(message)
  }, [])

  const selectBook = useCallback((id) => {
    if (id == null) {
      setSelectedBookId(null)
      return
    }
    if (mode === 'play') return
    const book = library.find((entry) => entry.id === id)
    if (!book) return
    setSelectedBookId(id)
    if (book.shelfId) setSelectedShelfId(book.shelfId)
    setFocusPoint(bookWorldFocusPosition(book, library, shelves))
  }, [library, mode, shelves])

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
        if (isTypingTarget(event.target)) return
        if (selectedBookId) setSelectedBookId(null)
        return
      }

      if (!BOOK_NAV_KEYS.has(event.key)) return
      if (viewMode !== '3d' || mode === 'play' || mode === 'arrange' || !library.length) return
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
  }, [jumpBookSelection, library.length, mode, moveBookSelection, selectedBookId, viewMode])

  const [selectionAnnouncement, setSelectionAnnouncement] = useState('')
  const hasAnnouncedSelection = useRef(false)
  useEffect(() => {
    if (!hasAnnouncedSelection.current) {
      hasAnnouncedSelection.current = true
      return
    }
    const book = libraryRef.current.find((entry) => entry.id === selectedBookId)
    setSelectionAnnouncement(
      book
        ? `Selected ${book.title}${book.author ? ` by ${book.author}` : ''}`
        : 'No book selected',
    )
  }, [selectedBookId])

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
      let assignFailed = null
      setLibraryState((state) => {
        const liveTarget = state.shelves.find((shelf) => shelf.id === updates.shelfId)
        if (!liveTarget) {
          assignFailed = 'That shelf is no longer available.'
          return state
        }
        const result = assignBookToShelf(state.books, selectedBookId, updates.shelfId, liveTarget)
        if (!result.ok) {
          assignFailed = result.reason
          return state
        }
        const books = result.books.map((book) => {
          if (book.id !== selectedBookId) return book
          return applyBookFieldUpdates(book, rest)
        })
        return { ...state, books }
      })
      if (assignFailed) flashStatus(assignFailed)
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
    if (mode === 'play') {
      flashStatus('Leave Play mode to add or select books.')
      return false
    }

    // Create the book outside setState so ids stay pure under StrictMode.
    const preferredShelfId = draft.shelfId || selectedShelfId || shelves[0]?.id || DEFAULT_SHELF_ID
    const shelf = shelves.find((entry) => entry.id === preferredShelfId) || shelves[0]
    const shelfId = shelf?.id || DEFAULT_SHELF_ID
    const provisional = createBook({ ...draft, shelfId }, library.length, shelfId)
    const onShelf = [...booksOnShelf(library, shelfId), provisional]
    if (shelf && !booksFitOnShelf(onShelf, shelf)) {
      flashStatus('That shelf is full. Free space, pick another shelf, or resize it in Arrange mode.')
      return false
    }

    setLibraryState((state) => {
      const liveShelf = state.shelves.find((entry) => entry.id === provisional.shelfId)
        || state.shelves[0]
      if (!liveShelf) return state
      const book = provisional.shelfId === liveShelf.id
        ? provisional
        : { ...provisional, shelfId: liveShelf.id }
      const members = [...booksOnShelf(state.books, book.shelfId), book]
      if (!booksFitOnShelf(members, liveShelf)) return state
      if (state.books.some((entry) => entry.id === book.id)) return state
      return { ...state, books: [...state.books, book] }
    })

    setSelectedBookId(provisional.id)
    setSelectedShelfId(provisional.shelfId)
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

  const mergeLibrary = (next) => {
    const incoming = {
      books: Array.isArray(next?.books) ? next.books : Array.isArray(next) ? next : [],
      shelves: Array.isArray(next?.shelves) && next.shelves.length ? next.shelves : shelves,
    }
    const result = mergeLibraryStates(libraryState, incoming)
    setLibraryState({ books: result.books, shelves: result.shelves })
    setSelectedBookId(null)
    setSelectedShelfId((current) => (
      result.shelves.some((shelf) => shelf.id === current)
        ? current
        : (result.shelves[0]?.id || DEFAULT_SHELF_ID)
    ))
    if (result.message) flashStatus(result.message)
    return result
  }

  const handleApplyRoomPreset = (presetId) => {
    const result = applyRoomPreset(libraryState, presetId)
    if (!result.ok) {
      flashStatus(result.reason)
      return
    }
    setLibraryState({ books: result.books, shelves: result.shelves })
    setMode('arrange')
    flashStatus(
      result.adjusted
        ? 'Room layout applied and fitted to the walkable room. Drag cases to fine-tune.'
        : 'Room layout applied. Drag cases to fine-tune.',
    )
  }

  const handleBackupExport = () => {
    try {
      if (!library.length) {
        flashStatus('Add at least one book before exporting.')
        return
      }
      const { count, filename } = downloadLibraryExport({ books: library, shelves })
      setBackupReminder(false)
      flashStatus(`Exported ${count} book${count === 1 ? '' : 's'} to ${filename}.`)
    } catch (error) {
      flashStatus(error instanceof Error ? error.message : 'Could not export your library.')
    }
  }

  const handleBackupDismiss = () => {
    dismissLibraryBackupReminder()
    setBackupReminder(false)
  }

  const handleBackupExported = () => {
    setBackupReminder(false)
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

  /** 3D spine drag: drop at absolute shelf index; order auto-saves via libraryState effect. */
  const handleReorderBookToIndex = useCallback((bookId, targetIndex) => {
    let failure = null
    setLibraryState((state) => {
      const liveBook = state.books.find((entry) => entry.id === bookId)
      if (!liveBook) return state
      const liveShelf = state.shelves.find((entry) => entry.id === liveBook.shelfId)
      const result = tryReorderBookToIndex(state.books, bookId, targetIndex, liveShelf)
      if (!result.ok) {
        failure = result.reason
        return state
      }
      if (!result.changed) return state
      return { ...state, books: result.books }
    })
    if (failure) flashStatus(failure)
  }, [flashStatus])

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

  const is3D = viewMode === '3d'

  return (
    <div
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ width: '100vw', height: '100vh', background: is3D ? '#05010f' : 'hsl(var(--background))' }}
    >
      {is3D ? (
        webGLAvailable ? (
          <ErrorBoundary fallback={({ reset }) => <SceneErrorFallback reset={reset} />}>
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
                  '3D library. WASD to walk, Space to jump, drag to look around. Drag book spines to reorder them on a shelf. Arrow keys move between books. Escape clears selection. Use Arrange mode to place shelves.',
                )
              }}
            >
              <WebGLContextLossHandler onContextLost={handleWebGLContextLost} />
              <Suspense fallback={null}>
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
                  onReorderBookToIndex={handleReorderBookToIndex}
                  focusPoint={focusPoint}
                />
              </Suspense>
            </Canvas>
          </ErrorBoundary>
        ) : (
          <WebGLFallback onRetry={retryWebGL} />
        )
      ) : (
        <NormalMode
          library={library}
          shelves={shelves}
          selectedBookId={selectedBookId}
          selectedShelfId={selectedShelfId}
          onSelectBook={selectBook}
          onSelectShelf={setSelectedShelfId}
          onAddBook={addBook}
          onUpdateSelectedBook={updateSelectedBook}
          onDeleteSelectedBook={deleteSelectedBook}
          onReplaceLibrary={replaceLibrary}
          onMergeLibrary={mergeLibrary}
          onRenameShelf={renameShelf}
          onTransformShelf={transformShelf}
          onAddShelf={handleAddShelf}
          onDeleteShelf={handleDeleteShelf}
          onApplyRoomPreset={handleApplyRoomPreset}
          onExport={handleBackupExport}
          onToggle3D={() => setViewMode('3d')}
          onStatus={flashStatus}
          reducedMotion={reducedMotion}
          setReducedMotion={setReducedMotionPreference}
          graphicsQuality={graphicsQuality}
          setGraphicsQuality={setGraphicsQuality}
          galaxyMode={galaxyMode}
          setGalaxyMode={setGalaxyMode}
        />
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
            bottom: backupReminder ? 148 : 88,
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

      {backupReminder && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            zIndex: 32,
            maxWidth: 'min(480px, calc(100vw - 32px))',
            padding: '12px 14px',
            borderRadius: 14,
            color: '#fff',
            background: 'rgba(20, 18, 35, 0.94)',
            border: '1px solid rgba(169,131,255,0.45)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          <span style={{ lineHeight: 1.4, textAlign: 'center' }}>
            Backup reminder: export a JSON copy of your library to keep it safe.
          </span>
          <button
            type="button"
            onClick={handleBackupExport}
            style={{
              border: '1px solid rgba(169,131,255,0.7)',
              borderRadius: 9,
              padding: '7px 12px',
              color: '#fff',
              background: 'rgba(126,91,226,0.82)',
              cursor: 'pointer',
              font: '600 12px inherit',
            }}
          >
            Export backup
          </button>
          <button
            type="button"
            onClick={handleBackupDismiss}
            style={{
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 9,
              padding: '7px 12px',
              color: 'rgba(255,255,255,0.85)',
              background: 'rgba(255,255,255,0.08)',
              cursor: 'pointer',
              font: '600 12px inherit',
            }}
          >
            Not now
          </button>
        </div>
      )}

      {is3D && webGLAvailable && (
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
            onApplyRoomPreset={handleApplyRoomPreset}
            books={library}
            onNormalMode={() => setViewMode('normal')}
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
      {is3D && (
        <>
          <LibraryPanel
            library={library}
            shelves={shelves}
            selectedBookId={selectedBookId}
            selectedShelfId={selectedShelfId}
            onSelectBook={selectBook}
            onSelectShelf={setSelectedShelfId}
            onAddBook={addBook}
            onReplaceLibrary={replaceLibrary}
            onMergeLibrary={mergeLibrary}
            onBackupExported={handleBackupExported}
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
        </>
      )}
    </div>
  )
}

const MAX_UNKNOWN_PAGE = 100_000

function applyBookFieldUpdates(book, updates) {
  const next = { ...book, ...updates }
  if (updates.status === 'Reading' && !book.startedAt) next.startedAt = today()
  if (updates.status === 'Finished' && !book.finishedAt) next.finishedAt = today()
  if (updates.pageCount !== undefined) {
    next.pageCount = Math.max(0, Number(updates.pageCount) || 0)
    const currentPage = Math.max(0, Number(next.currentPage) || 0)
    next.currentPage = next.pageCount
      ? Math.min(currentPage, next.pageCount)
      : Math.min(currentPage, MAX_UNKNOWN_PAGE)
  }
  if (updates.currentPage !== undefined) {
    const currentPage = Math.max(0, Number(updates.currentPage) || 0)
    next.currentPage = next.pageCount
      ? Math.min(currentPage, next.pageCount)
      : Math.min(currentPage, MAX_UNKNOWN_PAGE)
  }
  if (updates.series !== undefined) {
    next.series = typeof updates.series === 'string' ? updates.series : String(updates.series ?? '')
  }
  if (updates.seriesNumber !== undefined) {
    next.seriesNumber = Math.max(0, Math.round(Number(updates.seriesNumber)) || 0)
  }
  if (updates.publishedYear !== undefined) {
    const year = Number(updates.publishedYear)
    next.publishedYear = Number.isFinite(year)
      ? Math.min(MAX_PUBLISHED_YEAR, Math.max(0, Math.round(year)))
      : 0
  }
  if (updates.format !== undefined) {
    next.format = BOOK_FORMATS.includes(updates.format) ? updates.format : ''
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
