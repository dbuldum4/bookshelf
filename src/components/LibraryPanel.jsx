import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeGoalProgress,
  computeLibraryStats,
  computeYearInReview,
  downloadLibraryExport,
  LIBRARY_SORT_OPTIONS,
  loadReadingGoals,
  lookupBookByIsbn,
  lookupBookByTitleAuthor,
  mergeBlankBookMetadata,
  normalizeReadingGoals,
  parseLibraryFile,
  READING_STATUSES,
  saveReadingGoals,
  searchAcclaimedBooks,
  sortLibrary,
  wait,
} from '../library'

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const panelStyle = {
  position: 'absolute',
  top: 76,
  left: 16,
  width: 344,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100vh - 100px)',
  display: 'flex',
  flexDirection: 'column',
  color: '#fff',
  background: 'rgba(15, 14, 29, 0.78)',
  backdropFilter: 'blur(28px) saturate(145%)',
  WebkitBackdropFilter: 'blur(28px) saturate(145%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 18,
  boxShadow: '0 24px 70px rgba(0,0,0,0.52)',
  fontFamily,
  overflow: 'hidden',
}

const inputStyle = {
  width: '100%',
  height: 36,
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 9,
  color: '#fff',
  background: 'rgba(255,255,255,0.07)',
  padding: '0 10px',
  font: 'inherit',
  fontSize: 13,
  outline: 'none',
}

const actionButton = (primary = false) => ({
  border: primary ? '1px solid rgba(169, 131, 255, 0.7)' : '1px solid rgba(255,255,255,0.12)',
  borderRadius: 9,
  cursor: 'pointer',
  color: '#fff',
  background: primary ? 'rgba(126, 91, 226, 0.82)' : 'rgba(255,255,255,0.08)',
  padding: '8px 11px',
  font: '600 12px/1.1 ' + fontFamily,
})

function progressLabel(book) {
  if (!book.pageCount) return book.status
  return `${Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))}% · ${book.currentPage}/${book.pageCount}`
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function formatPages(count) {
  return new Intl.NumberFormat().format(count || 0)
}

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function GoalProgressBar({ label, progress, unitLabel }) {
  const { active, current, target, ratio, remaining, met } = progress
  if (!active) {
    return (
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
          <span>{label}</span>
          <span>{formatPages(current)} {unitLabel} · no goal</span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.72)' }}>
        <span>{label}</span>
        <span style={{ color: met ? 'rgba(134, 239, 172, 0.95)' : 'rgba(255,255,255,0.72)' }}>
          {formatPages(current)} / {formatPages(target)} {unitLabel}
          {met ? ' · met' : remaining > 0 ? ` · ${formatPages(remaining)} left` : ''}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label}: ${current} of ${target} ${unitLabel}`}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={Math.min(current, target)}
        style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}
      >
        <div
          style={{
            width: `${Math.round(ratio * 100)}%`,
            height: '100%',
            borderRadius: 99,
            background: met
              ? 'linear-gradient(90deg, rgba(74, 222, 128, 0.85), rgba(134, 239, 172, 0.95))'
              : 'linear-gradient(90deg, rgba(126, 91, 226, 0.9), rgba(169, 131, 255, 0.95))',
          }}
        />
      </div>
    </div>
  )
}

const MAX_IMPORT_BYTES = 5_000_000

function CoverThumb({ coverUrl, color }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    setFailed(false)
  }, [coverUrl])
  if (!coverUrl || failed) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 40,
          flexShrink: 0,
          borderRadius: 3,
          background: color,
          boxShadow: 'inset -4px 0 rgba(0,0,0,0.25)',
        }}
      />
    )
  }
  return (
    <img
      src={coverUrl}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 3, background: color }}
    />
  )
}

function LibraryPanel({
  library,
  shelves = [],
  selectedBookId,
  selectedShelfId,
  onSelectBook,
  onSelectShelf,
  onAddBook,
  onReplaceLibrary,
  onMergeLibrary,
  onReorderBook,
  onBackupExported,
  onUpdateBook,
}) {
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [shelfFilter, setShelfFilter] = useState('All')
  const [authorFilter, setAuthorFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState('All')
  const [ratingFilter, setRatingFilter] = useState('All')
  const [sortBy, setSortBy] = useState('shelf')
  const [draft, setDraft] = useState({ title: '', author: '', isbn: '', pageCount: '', coverUrl: '', shelfId: '' })
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [transferMessage, setTransferMessage] = useState('')
  const [transferError, setTransferError] = useState('')
  const [importing, setImporting] = useState(false)
  /** Pending parsed import awaiting Merge / Replace / Cancel. */
  const [pendingImport, setPendingImport] = useState(null)
  const [goals, setGoals] = useState(() => loadReadingGoals())
  const [editingGoals, setEditingGoals] = useState(false)
  const [goalDraft, setGoalDraft] = useState(() => loadReadingGoals())
  const [goalError, setGoalError] = useState('')
  const [reviewOpen, setReviewOpen] = useState(false)
  const blurTimer = useRef(null)
  const importInputRef = useRef(null)
  const transferTimer = useRef(null)
  const isbnRequestId = useRef(0)
  const fillAbortRef = useRef(null)
  const [fillingCovers, setFillingCovers] = useState(false)

  const clearTransferFeedback = () => {
    setTransferMessage('')
    setTransferError('')
  }

  const showTransferFeedback = (message, isError = false) => {
    if (transferTimer.current !== null) window.clearTimeout(transferTimer.current)
    if (isError) {
      setTransferError(message)
      setTransferMessage('')
    } else {
      setTransferMessage(message)
      setTransferError('')
      transferTimer.current = window.setTimeout(() => {
        setTransferMessage('')
        transferTimer.current = null
      }, 5000)
    }
  }

  const readingStats = useMemo(() => computeLibraryStats(library), [library])
  const yearReview = useMemo(
    () => computeYearInReview(library, readingStats.year),
    [library, readingStats.year],
  )
  const booksGoalProgress = useMemo(
    () => computeGoalProgress(readingStats.finishedThisYear, goals.books),
    [readingStats.finishedThisYear, goals.books],
  )
  const pagesGoalProgress = useMemo(
    () => computeGoalProgress(readingStats.pagesFinishedThisYear, goals.pages),
    [readingStats.pagesFinishedThisYear, goals.pages],
  )

  const statusStats = useMemo(() => READING_STATUSES.map((value) => ({
    label: value,
    count: readingStats.byStatus[value] || 0,
  })), [readingStats])

  const beginEditGoals = () => {
    setGoalDraft(goals)
    setGoalError('')
    setEditingGoals(true)
  }

  const cancelEditGoals = () => {
    setGoalDraft(goals)
    setGoalError('')
    setEditingGoals(false)
  }

  const commitGoals = () => {
    const next = normalizeReadingGoals(goalDraft)
    if (!saveReadingGoals(readingStats.year, next)) {
      setGoalError('Could not save reading goals. Check that browser storage is available and try again.')
      return
    }
    setGoals(next)
    setGoalDraft(next)
    setGoalError('')
    setEditingGoals(false)
  }

  const authorOptions = useMemo(
    () => uniqueSorted(library.map((book) => book.author?.trim())),
    [library]
  )

  const tagOptions = useMemo(
    () => uniqueSorted(library.flatMap((book) => book.tags || [])),
    [library]
  )

  const shelfNameById = useMemo(
    () => Object.fromEntries(shelves.map((shelf) => [shelf.id, shelf.name])),
    [shelves]
  )

  const activeFilterCount = [status, shelfFilter, authorFilter, tagFilter, ratingFilter]
    .filter((value) => value !== 'All').length

  const clearFilters = () => {
    setQuery('')
    setStatus('All')
    setShelfFilter('All')
    setAuthorFilter('All')
    setTagFilter('All')
    setRatingFilter('All')
    setSortBy('shelf')
  }

  useEffect(() => {
    if (shelfFilter !== 'All' && !shelves.some((shelf) => shelf.id === shelfFilter)) {
      setShelfFilter('All')
    }
  }, [shelfFilter, shelves])

  useEffect(() => {
    if (draft.shelfId && !shelves.some((shelf) => shelf.id === draft.shelfId)) {
      setDraft((current) => ({ ...current, shelfId: '' }))
    }
  }, [draft.shelfId, shelves])

  useEffect(() => {
    if (authorFilter !== 'All' && !authorOptions.includes(authorFilter)) setAuthorFilter('All')
  }, [authorFilter, authorOptions])

  useEffect(() => {
    if (tagFilter !== 'All' && !tagOptions.includes(tagFilter)) setTagFilter('All')
  }, [tagFilter, tagOptions])

  // Keep keyboard focus on the selected library row when arrows change selection.
  useEffect(() => {
    if (!selectedBookId) return
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) return
    if (active.getAttribute('role') !== 'option') return
    if (!active.closest('[role="listbox"][aria-label="Library books"]')) return
    const next = document.getElementById(`library-book-${selectedBookId}`)
    if (next instanceof HTMLElement && next !== active) next.focus()
  }, [selectedBookId])

  const visibleBooks = useMemo(() => {
    const search = query.trim().toLowerCase()
    const filtered = library.filter((book) => {
      const matchesStatus = status === 'All' || book.status === status
      const matchesShelf = shelfFilter === 'All' || book.shelfId === shelfFilter
      const matchesAuthor = authorFilter === 'All' || (book.author || '').trim() === authorFilter
      const matchesTag = tagFilter === 'All' || (book.tags || []).includes(tagFilter)
      const matchesRating = ratingFilter === 'All'
        || (ratingFilter === '0' ? !book.rating : book.rating >= Number(ratingFilter))
      const matchesSearch = !search || [
        book.title,
        book.author,
        ...(book.tags || []),
        ...(book.quotes || []),
        book.notes || '',
        shelfNameById[book.shelfId] || '',
      ].join(' ').toLowerCase().includes(search)
      return matchesStatus && matchesShelf && matchesAuthor && matchesTag && matchesRating && matchesSearch
    })
    return sortLibrary(filtered, sortBy)
  }, [library, query, status, shelfFilter, authorFilter, tagFilter, ratingFilter, sortBy, shelfNameById])

  useEffect(() => {
    const search = draft.title.trim()
    if (search.length < 2 || !showSuggestions) {
      setSuggestions([])
      setLoadingSuggestions(false)
      setSuggestionError('')
      return undefined
    }

    const controller = new AbortController()
    setSuggestions([])
    setLoadingSuggestions(true)
    setSuggestionError('')
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchAcclaimedBooks(search, controller.signal)
        if (controller.signal.aborted) return
        setSuggestions(results)
        setActiveSuggestion(0)
      } catch (error) {
        if (error?.name !== 'AbortError' && !controller.signal.aborted) {
          setSuggestions([])
          setSuggestionError(error instanceof Error ? error.message : 'Book suggestions are unavailable right now.')
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [draft.title, showSuggestions])

  useEffect(() => () => {
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
    if (transferTimer.current !== null) window.clearTimeout(transferTimer.current)
    fillAbortRef.current?.abort()
  }, [])

  const changeDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const exportLibrary = () => {
    clearTransferFeedback()
    try {
      if (!library.length) {
        showTransferFeedback('Add at least one book before exporting.', true)
        return
      }
      const { count, filename } = downloadLibraryExport({ books: library, shelves })
      onBackupExported?.()
      showTransferFeedback(`Exported ${count} book${count === 1 ? '' : 's'} to ${filename}.`)
    } catch (error) {
      showTransferFeedback(error instanceof Error ? error.message : 'Could not export your library.', true)
    }
  }

  const openImportPicker = () => {
    clearTransferFeedback()
    setPendingImport(null)
    importInputRef.current?.click()
  }

  const cancelPendingImport = () => {
    setPendingImport(null)
    showTransferFeedback('Import cancelled. Your library was not changed.')
  }

  const confirmMergeImport = () => {
    if (!pendingImport) return
    const { payload, count, fileName } = pendingImport
    const result = onMergeLibrary?.(payload)
    setPendingImport(null)
    if (result && typeof result === 'object') {
      const { added = 0, updated = 0 } = result
      showTransferFeedback(
        `Merged import: ${added} added, ${updated} updated (${result.total ?? library.length + added} total).`,
      )
    } else {
      showTransferFeedback(`Merged ${count} book${count === 1 ? '' : 's'} from ${fileName}.`)
    }
  }

  const confirmReplaceImport = () => {
    if (!pendingImport) return
    const { payload, count, fileName } = pendingImport
    const confirmed = window.confirm(
      `Replace your entire library (${library.length} book${library.length === 1 ? '' : 's'}) `
      + `with ${count} imported book${count === 1 ? '' : 's'}?\n\n`
      + 'This cannot be undone unless you export a backup first.\n\n'
      + 'OK = Replace · Cancel = keep this import choice open.',
    )
    if (!confirmed) return
    onReplaceLibrary(payload)
    setPendingImport(null)
    showTransferFeedback(`Replaced library with ${count} book${count === 1 ? '' : 's'} from ${fileName}.`)
  }

  const importLibrary = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    clearTransferFeedback()
    setPendingImport(null)
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        showTransferFeedback('That file is too large to import (max 5 MB). Export a smaller backup or split the library.', true)
        return
      }
      const text = await file.text()
      const parsed = parseLibraryFile(text, file.name)
      const { books, count, format } = parsed
      const kind = format === 'csv' ? 'CSV' : 'JSON'
      const payload = { books, shelves: parsed.shelves }

      // Empty library: always load directly.
      if (!library.length) {
        onReplaceLibrary(payload)
        showTransferFeedback(`Imported ${count} book${count === 1 ? '' : 's'} from ${file.name}.`)
        return
      }

      setPendingImport({
        payload,
        count,
        kind,
        fileName: file.name,
      })
    } catch (error) {
      showTransferFeedback(error instanceof Error ? error.message : 'Could not import that library file.', true)
    } finally {
      setImporting(false)
    }
  }

  const chooseSuggestion = (book) => {
    setDraft((current) => ({
      ...current,
      title: book.title,
      author: book.author,
      coverUrl: book.coverUrl,
    }))
    setShowSuggestions(false)
    setSuggestionError('')
    setActiveSuggestion(0)
  }

  const handleTitleKeyDown = (event) => {
    if (!showSuggestions || loadingSuggestions || !suggestions.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveSuggestion((index) => (index + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveSuggestion((index) => (index - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      chooseSuggestion(suggestions[activeSuggestion])
    } else if (event.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  const focusTitle = () => {
    if (blurTimer.current !== null) {
      window.clearTimeout(blurTimer.current)
      blurTimer.current = null
    }
    setShowSuggestions(true)
  }

  const blurTitle = (event) => {
    const next = event.relatedTarget
    if (next && event.currentTarget.parentElement?.contains(next)) return
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => {
      setShowSuggestions(false)
      blurTimer.current = null
    }, 150)
  }

  const cancelFillCovers = () => {
    fillAbortRef.current?.abort()
  }

  const fillMissingCovers = async () => {
    if (fillingCovers || typeof onUpdateBook !== 'function') return
    const missing = library.filter((book) => !book.coverUrl)
    if (!missing.length) {
      showTransferFeedback('Every book already has a cover.')
      return
    }

    const controller = new AbortController()
    fillAbortRef.current = controller
    setFillingCovers(true)
    let filled = 0
    let stopped = false

    try {
      for (let index = 0; index < missing.length; index += 1) {
        if (controller.signal.aborted) {
          stopped = true
          break
        }
        const book = missing[index]
        try {
          const result = await lookupBookByTitleAuthor(book.title, book.author, controller.signal)
          if (controller.signal.aborted) {
            stopped = true
            break
          }
          const updates = mergeBlankBookMetadata(book, result)
          if (updates.coverUrl) {
            onUpdateBook(book.id, updates)
            filled += 1
          }
        } catch (error) {
          if (error?.name === 'AbortError' || controller.signal.aborted) {
            stopped = true
            break
          }
        }
        if (index < missing.length - 1 && !controller.signal.aborted) {
          try {
            await wait(200, controller.signal)
          } catch (error) {
            if (error?.name === 'AbortError' || controller.signal.aborted) {
              stopped = true
              break
            }
          }
        }
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        showTransferFeedback(error instanceof Error ? error.message : 'Could not fill missing covers.', true)
        return
      }
      stopped = true
    } finally {
      setFillingCovers(false)
      fillAbortRef.current = null
    }

    const countLabel = `${filled} cover${filled === 1 ? '' : 's'}`
    showTransferFeedback(stopped
      ? `Stopped after filling ${countLabel}.`
      : `Filled ${countLabel}.`)
  }

  const findByIsbn = async () => {
    const requestId = ++isbnRequestId.current
    setLookingUp(true)
    setLookupError('')
    try {
      const result = await lookupBookByIsbn(draft.isbn)
      if (requestId !== isbnRequestId.current) return
      setDraft((current) => ({ ...current, ...result }))
    } catch (error) {
      if (requestId !== isbnRequestId.current) return
      setLookupError(error instanceof Error ? error.message : 'Could not look up that ISBN.')
    } finally {
      if (requestId === isbnRequestId.current) setLookingUp(false)
    }
  }

  const submit = (event) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setLookupError('Add a title before saving the book.')
      return
    }
    const added = onAddBook({
      ...draft,
      pageCount: Number(draft.pageCount) || 0,
      shelfId: draft.shelfId || selectedShelfId || shelves[0]?.id,
    })
    if (added === false) return
    setDraft({ title: '', author: '', isbn: '', pageCount: '', coverUrl: '', shelfId: '' })
    setLookupError('')
    setAdding(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open library"
        onClick={() => setOpen(true)}
        style={{ ...actionButton(true), position: 'absolute', top: 76, left: 16, padding: '10px 13px' }}
      >
        My Library
      </button>
    )
  }

  return (
    <aside aria-label="My library" style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 12px' }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22, fontWeight: 500 }}>
            My Library
          </h2>
          <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {library.length} book{library.length === 1 ? '' : 's'} · {shelves.length} shelf{shelves.length === 1 ? '' : 's'}
          </p>
        </div>
        <button type="button" aria-label="Close library" onClick={() => setOpen(false)} style={{ ...actionButton(), padding: '6px 9px', fontSize: 16 }}>
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 16px 8px' }}>
        {statusStats.map((item) => (
          <div key={item.label} style={{ borderRadius: 10, padding: '8px 7px', background: 'rgba(255,255,255,0.055)' }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{item.count}</div>
            <div style={{ color: 'rgba(255,255,255,0.47)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div
        aria-label="Reading stats"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 6,
          padding: '0 16px 12px',
        }}
      >
        <div style={{ borderRadius: 10, padding: '8px 9px', background: 'rgba(126, 91, 226, 0.16)', border: '1px solid rgba(169, 131, 255, 0.22)' }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{readingStats.finishedThisYear}</div>
          <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 10 }}>Finished in {readingStats.year}</div>
        </div>
        <div style={{ borderRadius: 10, padding: '8px 9px', background: 'rgba(255,255,255,0.055)' }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>{formatPages(readingStats.pagesRead)}</div>
          <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 10 }}>Pages read</div>
        </div>
        <div style={{ borderRadius: 10, padding: '8px 9px', background: 'rgba(255,255,255,0.055)' }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>
            {readingStats.ratedCount ? `${readingStats.averageRating.toFixed(1)} ★` : '—'}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 10 }}>
            Avg rating{readingStats.ratedCount ? ` · ${readingStats.ratedCount}` : ''}
          </div>
        </div>
        <div style={{ borderRadius: 10, padding: '8px 9px', background: 'rgba(255,255,255,0.055)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 18, marginBottom: 4 }}>
            {(() => {
              const max = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => readingStats.ratingCounts[s] || 0))
              return [1, 2, 3, 4, 5].map((star) => {
                const count = readingStats.ratingCounts[star] || 0
                const height = count ? Math.max(3, Math.round((count / max) * 16)) : 2
                return (
                  <span
                    key={star}
                    title={`${star}★: ${count}`}
                    style={{
                      flex: 1,
                      height,
                      borderRadius: 2,
                      background: count ? 'rgba(250, 204, 21, 0.75)' : 'rgba(255,255,255,0.12)',
                    }}
                  />
                )
              })
            })()}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.52)', fontSize: 10 }}>Ratings</div>
        </div>
      </div>

      <div
        aria-label="Reading goals"
        style={{
          margin: '0 16px 10px',
          padding: '10px 10px 9px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.045)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'grid',
          gap: 9,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.62)', textTransform: 'uppercase' }}>
            {readingStats.year} goals
          </div>
          {!editingGoals ? (
            <button type="button" onClick={beginEditGoals} style={{ ...actionButton(), padding: '4px 8px', fontSize: 11 }}>
              {goals.books || goals.pages ? 'Edit goals' : 'Set goals'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" onClick={cancelEditGoals} style={{ ...actionButton(), padding: '4px 8px', fontSize: 11 }}>
                Cancel
              </button>
              <button type="button" onClick={commitGoals} style={{ ...actionButton(true), padding: '4px 8px', fontSize: 11 }}>
                Save
              </button>
            </div>
          )}
        </div>

        {editingGoals ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              Books finished
              <input
                aria-label="Books finished goal"
                type="number"
                min={0}
                inputMode="numeric"
                value={goalDraft.books || ''}
                placeholder="0"
                onChange={(event) => setGoalDraft((prev) => ({ ...prev, books: event.target.value }))}
                style={{ ...inputStyle, height: 32, fontSize: 12 }}
              />
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              Pages finished
              <input
                aria-label="Pages finished goal"
                type="number"
                min={0}
                inputMode="numeric"
                value={goalDraft.pages || ''}
                placeholder="0"
                onChange={(event) => setGoalDraft((prev) => ({ ...prev, pages: event.target.value }))}
                style={{ ...inputStyle, height: 32, fontSize: 12 }}
              />
            </label>
            <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.42)' }}>
              Leave at 0 to hide a goal. Progress uses books finished this year and their page counts.
            </p>
            {goalError && (
              <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, fontSize: 11, color: '#ffb4b4' }}>
                {goalError}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            <GoalProgressBar label="Books" progress={booksGoalProgress} unitLabel="books" />
            <GoalProgressBar label="Pages" progress={pagesGoalProgress} unitLabel="pages" />
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <button
          type="button"
          aria-expanded={reviewOpen}
          aria-controls="year-in-review"
          onClick={() => setReviewOpen((open) => !open)}
          style={{
            ...actionButton(),
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            fontSize: 12,
          }}
        >
          <span>{readingStats.year} year in review</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>{reviewOpen ? '▾' : '▸'}</span>
        </button>

        {reviewOpen && (
          <div
            id="year-in-review"
            aria-label={`${readingStats.year} year in review`}
            style={{
              marginTop: 8,
              padding: '10px 10px 8px',
              borderRadius: 12,
              background: 'rgba(126, 91, 226, 0.1)',
              border: '1px solid rgba(169, 131, 255, 0.18)',
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <div style={{ borderRadius: 8, padding: '7px 8px', background: 'rgba(0,0,0,0.18)' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{yearReview.finishedCount}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Finished</div>
              </div>
              <div style={{ borderRadius: 8, padding: '7px 8px', background: 'rgba(0,0,0,0.18)' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{formatPages(yearReview.pagesFinished)}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>Pages</div>
              </div>
              <div style={{ borderRadius: 8, padding: '7px 8px', background: 'rgba(0,0,0,0.18)' }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>
                  {yearReview.ratedCount ? `${yearReview.averageRating.toFixed(1)} ★` : '—'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                  Avg{yearReview.ratedCount ? ` · ${yearReview.ratedCount}` : ''}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              {yearReview.previousYearFinished === 0 && yearReview.finishedCount === 0
                ? `No finishes recorded for ${yearReview.year - 1} or ${yearReview.year} yet.`
                : yearReview.finishedCount === yearReview.previousYearFinished
                  ? `Tied with ${yearReview.year - 1} (${yearReview.previousYearFinished} finished).`
                  : yearReview.finishedCount > yearReview.previousYearFinished
                    ? `${yearReview.finishedCount - yearReview.previousYearFinished} more than ${yearReview.year - 1} (${yearReview.previousYearFinished}).`
                    : `${yearReview.previousYearFinished - yearReview.finishedCount} behind ${yearReview.year - 1} (${yearReview.previousYearFinished}).`}
            </div>

            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                Monthly finishes
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 44 }}>
                {(() => {
                  const max = Math.max(1, ...yearReview.monthlyFinished)
                  return yearReview.monthlyFinished.map((count, index) => {
                    const height = count ? Math.max(4, Math.round((count / max) * 36)) : 2
                    return (
                      <div key={MONTH_NAMES[index]} style={{ flex: 1, display: 'grid', gap: 3, justifyItems: 'center' }}>
                        <span
                          title={`${MONTH_NAMES[index]}: ${count}`}
                          style={{
                            width: '100%',
                            height,
                            borderRadius: 2,
                            background: count ? 'rgba(169, 131, 255, 0.85)' : 'rgba(255,255,255,0.1)',
                          }}
                        />
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{MONTH_LABELS[index]}</span>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {yearReview.ratedCount > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Ratings this year
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 22 }}>
                  {(() => {
                    const max = Math.max(1, ...[1, 2, 3, 4, 5].map((s) => yearReview.ratingCounts[s] || 0))
                    return [1, 2, 3, 4, 5].map((star) => {
                      const count = yearReview.ratingCounts[star] || 0
                      const height = count ? Math.max(3, Math.round((count / max) * 18)) : 2
                      return (
                        <span
                          key={star}
                          title={`${star}★: ${count}`}
                          style={{
                            flex: 1,
                            height,
                            borderRadius: 2,
                            background: count ? 'rgba(250, 204, 21, 0.75)' : 'rgba(255,255,255,0.12)',
                          }}
                        />
                      )
                    })
                  })()}
                </div>
              </div>
            )}

            {yearReview.topRated.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Top rated
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5 }}>
                  {yearReview.topRated.map((book) => (
                    <li key={book.id || book.title}>
                      <button
                        type="button"
                        onClick={() => onSelectBook?.(book.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          borderRadius: 8,
                          cursor: book.id ? 'pointer' : 'default',
                          padding: '6px 7px',
                          color: '#fff',
                          background: 'rgba(0,0,0,0.16)',
                          font: 'inherit',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                          {book.title}
                          {book.author ? (
                            <span style={{ color: 'rgba(255,255,255,0.45)' }}> · {book.author}</span>
                          ) : null}
                        </span>
                        <span style={{ flexShrink: 0, fontSize: 11, color: 'rgba(250, 204, 21, 0.9)' }}>
                          {book.rating}★
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {yearReview.books.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Finished in {yearReview.year}
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4, maxHeight: 140, overflow: 'auto' }}>
                  {yearReview.books.map((book) => (
                    <li key={`finished-${book.id || book.title}`}>
                      <button
                        type="button"
                        onClick={() => onSelectBook?.(book.id)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          border: 'none',
                          borderRadius: 7,
                          cursor: book.id ? 'pointer' : 'default',
                          padding: '5px 6px',
                          color: 'rgba(255,255,255,0.85)',
                          background: 'transparent',
                          font: 'inherit',
                          fontSize: 11,
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {book.title}
                        </span>
                        <span style={{ flexShrink: 0, color: 'rgba(255,255,255,0.4)' }}>
                          {book.finishedAt ? String(book.finishedAt).slice(0, 10) : ''}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gap: 8, padding: '0 16px 12px' }}>
        <input
          aria-label="Search your library"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, author, tag, or quote"
          style={inputStyle}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select
            aria-label="Filter by shelf"
            value={shelfFilter}
            onChange={(event) => {
              const value = event.target.value
              setShelfFilter(value)
              if (value !== 'All') onSelectShelf?.(value)
            }}
            style={{ ...inputStyle, padding: '0 6px' }}
          >
            <option value="All">All shelves</option>
            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
            ))}
          </select>
          <select
            aria-label="Filter by reading status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            style={{ ...inputStyle, padding: '0 6px' }}
          >
            <option value="All">All statuses</option>
            {READING_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select
            aria-label="Filter by rating"
            value={ratingFilter}
            onChange={(event) => setRatingFilter(event.target.value)}
            style={{ ...inputStyle, padding: '0 6px' }}
          >
            <option value="All">All ratings</option>
            <option value="0">Not rated</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={String(rating)}>
                {rating === 5 ? '5 stars' : `${rating}+ stars`}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by author"
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            style={{ ...inputStyle, padding: '0 6px' }}
          >
            <option value="All">All authors</option>
            {authorOptions.map((author) => <option key={author} value={author}>{author}</option>)}
          </select>
          <select
            aria-label="Filter by tag"
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            style={{ ...inputStyle, padding: '0 6px' }}
          >
            <option value="All">All tags</option>
            {tagOptions.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
        <select
          aria-label="Sort library"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
          style={{ ...inputStyle, padding: '0 6px' }}
        >
          {LIBRARY_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '0 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.46)', fontSize: 12 }}>{visibleBooks.length} shown</span>
          {(activeFilterCount > 0 || query.trim()) && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: 'rgba(255,255,255,0.72)',
                background: 'rgba(255,255,255,0.06)',
                cursor: 'pointer',
                padding: '4px 8px',
                font: '600 11px/1.1 ' + fontFamily,
                whiteSpace: 'nowrap',
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        <button type="button" onClick={() => setAdding((value) => !value)} style={actionButton(true)}>
          {adding ? 'Cancel' : '+ Add book'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px' }}>
        <button
          type="button"
          onClick={exportLibrary}
          disabled={!library.length}
          style={{ ...actionButton(), flex: 1, opacity: library.length ? 1 : 0.45 }}
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={openImportPicker}
          disabled={importing}
          style={{ ...actionButton(), flex: 1, opacity: importing ? 0.45 : 1 }}
          title="Import Bookshelf JSON or Goodreads CSV — merge or replace"
        >
          {importing ? 'Importing…' : 'Import'}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json,text/csv,.csv"
          aria-label="Import library JSON or CSV file"
          onChange={importLibrary}
          style={{ display: 'none' }}
        />
      </div>

      {typeof onUpdateBook === 'function' && (
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 10px' }}>
          <button
            type="button"
            onClick={fillingCovers ? cancelFillCovers : fillMissingCovers}
            disabled={!fillingCovers && !library.some((book) => !book.coverUrl)}
            style={{
              ...actionButton(fillingCovers),
              flex: 1,
              opacity: fillingCovers || library.some((book) => !book.coverUrl) ? 1 : 0.45,
            }}
          >
            {fillingCovers ? 'Cancel' : 'Fill missing covers'}
          </button>
        </div>
      )}

      {pendingImport && (
        <div
          role="region"
          aria-label="Choose import mode"
          style={{
            margin: '0 16px 10px',
            padding: '10px 12px',
            borderRadius: 10,
            color: '#fff',
            background: 'rgba(126, 91, 226, 0.16)',
            border: '1px solid rgba(169, 131, 255, 0.35)',
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <p style={{ margin: '0 0 8px' }}>
            Import <strong>{pendingImport.count}</strong> book{pendingImport.count === 1 ? '' : 's'} from{' '}
            {pendingImport.kind} (<span style={{ wordBreak: 'break-all' }}>{pendingImport.fileName}</span>)
            into your library of {library.length}.
          </p>
          <p style={{ margin: '0 0 10px', color: 'rgba(255,255,255,0.62)', fontSize: 11 }}>
            Merge matches by id, ISBN, or title + author. Replace discards your current library.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button type="button" onClick={confirmMergeImport} style={actionButton(true)}>
              Merge
            </button>
            <button type="button" onClick={confirmReplaceImport} style={actionButton()}>
              Replace…
            </button>
            <button type="button" onClick={cancelPendingImport} style={actionButton()}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {(transferMessage || transferError) && (
        <p
          role={transferError ? 'alert' : 'status'}
          style={{
            margin: '0 16px 10px',
            padding: '8px 10px',
            borderRadius: 9,
            color: transferError ? '#ffb4b4' : '#c8f0c8',
            background: transferError ? 'rgba(255, 90, 90, 0.12)' : 'rgba(80, 180, 100, 0.12)',
            border: `1px solid ${transferError ? 'rgba(255, 140, 140, 0.28)' : 'rgba(140, 220, 150, 0.28)'}`,
            fontSize: 12,
            lineHeight: 1.35,
          }}
        >
          {transferError || transferMessage}
        </p>
      )}

      {adding && (
        <form onSubmit={submit} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: 16, background: 'rgba(255,255,255,0.025)' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <input
                required
                role="combobox"
                aria-autocomplete="list"
                aria-controls="acclaimed-book-suggestions"
                aria-haspopup="listbox"
                aria-expanded={showSuggestions && (loadingSuggestions || Boolean(suggestionError) || suggestions.length > 0)}
                aria-activedescendant={showSuggestions && !loadingSuggestions && suggestions.length ? `book-suggestion-${suggestions[activeSuggestion].id}` : undefined}
                value={draft.title}
                onChange={(event) => {
                  changeDraft('title', event.target.value)
                  setSuggestions([])
                  setLoadingSuggestions(event.target.value.trim().length >= 2)
                  setSuggestionError('')
                  setShowSuggestions(true)
                  setActiveSuggestion(0)
                }}
                onFocus={focusTitle}
                onBlur={blurTitle}
                onKeyDown={handleTitleKeyDown}
                placeholder="Title"
                aria-label="Book title"
                autoComplete="off"
                style={inputStyle}
              />
              {showSuggestions && (loadingSuggestions || Boolean(suggestionError) || suggestions.length > 0) && (
                <div
                  id="acclaimed-book-suggestions"
                  role="listbox"
                  aria-busy={loadingSuggestions}
                  aria-label="Acclaimed book suggestions"
                  style={{
                    position: 'absolute',
                    zIndex: 2,
                    top: 40,
                    left: 0,
                    right: 0,
                    maxHeight: 'clamp(96px, calc(100vh - 330px), 232px)',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10,
                    background: 'rgba(24, 22, 42, 0.98)',
                    boxShadow: '0 14px 32px rgba(0,0,0,0.42)',
                  }}
                >
                  {loadingSuggestions && (
                    <div role="option" aria-disabled="true" style={{ padding: '9px 10px', color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>Finding acclaimed books…</div>
                  )}
                  {!loadingSuggestions && suggestionError && (
                    <div role="option" aria-disabled="true" aria-live="assertive" style={{ padding: '9px 10px', color: '#ffb4b4', fontSize: 11 }}>{suggestionError}</div>
                  )}
                  {!loadingSuggestions && suggestions.map((book, index) => (
                    <button
                      id={`book-suggestion-${book.id}`}
                      role="option"
                      aria-selected={index === activeSuggestion}
                      type="button"
                      key={book.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveSuggestion(index)}
                      onClick={() => chooseSuggestion(book)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        border: 0,
                        color: '#fff',
                        background: index === activeSuggestion ? 'rgba(155, 119, 246, 0.24)' : 'transparent',
                        padding: '8px 10px',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ width: 22, color: 'rgba(201, 180, 255, 0.75)', fontSize: 10, fontWeight: 700 }}>#{book.acclaimRank}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 700 }}>{book.title}</span>
                        <span style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                          {[book.author, book.firstPublishYear || '', book.rating ? `${book.rating.toFixed(1)} ★` : ''].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input value={draft.author} onChange={(event) => changeDraft('author', event.target.value)} placeholder="Author" aria-label="Book author" style={inputStyle} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={draft.isbn} onChange={(event) => changeDraft('isbn', event.target.value)} placeholder="ISBN (optional)" aria-label="ISBN" style={inputStyle} />
              <button type="button" disabled={lookingUp || !draft.isbn} onClick={findByIsbn} style={{ ...actionButton(), opacity: lookingUp || !draft.isbn ? 0.45 : 1, whiteSpace: 'nowrap' }}>
                {lookingUp ? 'Looking up…' : 'Look up'}
              </button>
            </div>
            <input min="0" type="number" value={draft.pageCount} onChange={(event) => changeDraft('pageCount', event.target.value)} placeholder="Page count (optional)" aria-label="Page count" style={inputStyle} />
            <select
              aria-label="Shelf for new book"
              value={draft.shelfId || selectedShelfId || shelves[0]?.id || ''}
              onChange={(event) => changeDraft('shelfId', event.target.value)}
              style={{ ...inputStyle, padding: '0 6px' }}
            >
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
              ))}
            </select>
            {lookupError && <p role="alert" style={{ margin: 0, color: '#ffb4b4', fontSize: 12 }}>{lookupError}</p>}
            <button type="submit" style={actionButton(true)}>Add to library</button>
          </div>
        </form>
      )}

      <div
        role="listbox"
        aria-label="Library books"
        aria-activedescendant={selectedBookId ? `library-book-${selectedBookId}` : undefined}
        tabIndex={visibleBooks.length ? 0 : undefined}
        onKeyDown={(event) => {
          if (!visibleBooks.length || !onSelectBook) return
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          const currentIndex = Math.max(0, visibleBooks.findIndex((book) => book.id === selectedBookId))
          const delta = event.key === 'ArrowDown' ? 1 : -1
          const nextIndex = Math.min(visibleBooks.length - 1, Math.max(0, currentIndex + delta))
          const nextBook = visibleBooks[nextIndex]
          if (nextBook) onSelectBook(nextBook.id)
        }}
        style={{ overflowY: 'auto', padding: '0 10px 10px' }}
      >
        {visibleBooks.map((book) => {
          const selected = book.id === selectedBookId
          const shelfName = shelfNameById[book.shelfId] || 'Shelf'
          const label = [
            book.title,
            book.author ? `by ${book.author}` : '',
            shelfName,
            book.status,
            selected ? 'selected' : '',
          ].filter(Boolean).join(', ')
          return (
            <div
              key={book.id}
              style={{
                display: 'flex',
                gap: 4,
                alignItems: 'stretch',
                marginBottom: 2,
              }}
            >
              <button
                type="button"
                id={`library-book-${book.id}`}
                role="option"
                aria-selected={selected}
                aria-label={label}
                tabIndex={selected || (!selectedBookId && book.id === visibleBooks[0]?.id) ? 0 : -1}
                onClick={() => onSelectBook(book.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
                  event.preventDefault()
                  const currentIndex = visibleBooks.findIndex((item) => item.id === book.id)
                  if (currentIndex < 0) return
                  const delta = event.key === 'ArrowDown' ? 1 : -1
                  const nextIndex = Math.min(visibleBooks.length - 1, Math.max(0, currentIndex + delta))
                  const nextBook = visibleBooks[nextIndex]
                  if (nextBook) onSelectBook(nextBook.id)
                }}
                style={{
                  minWidth: 0,
                  flex: 1,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  border: selected ? `1px solid ${book.color}` : '1px solid transparent',
                  borderRadius: 11,
                  color: '#fff',
                  background: selected ? 'rgba(255,255,255,0.1)' : 'transparent',
                  cursor: 'pointer',
                  padding: 8,
                  textAlign: 'left',
                }}
              >
                <CoverThumb coverUrl={book.coverUrl} color={book.color} />
                <span style={{ minWidth: 0, flex: 1 }} aria-hidden="true">
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>{book.title}</span>
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, color: 'rgba(255,255,255,0.52)', fontSize: 11 }}>
                    {book.author}
                    {` · ${shelfName}`}
                    {book.rating > 0 ? ` · ${'★'.repeat(book.rating)}` : ''}
                    {(book.quotes || []).length ? ` · ${book.quotes.length} quote${book.quotes.length === 1 ? '' : 's'}` : ''}
                  </span>
                </span>
                <span aria-hidden="true" style={{ maxWidth: 78, color: selected ? '#fff' : 'rgba(255,255,255,0.48)', fontSize: 10, textAlign: 'right' }}>{progressLabel(book)}</span>
              </button>
              {typeof onReorderBook === 'function' && sortBy === 'shelf' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 4 }}>
                  <button
                    type="button"
                    aria-label={`Move ${book.title} earlier on shelf`}
                    onClick={() => onReorderBook(book.id, -1)}
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      width: 28,
                      height: 20,
                      fontSize: 10,
                      padding: 0,
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${book.title} later on shelf`}
                    onClick={() => onReorderBook(book.id, 1)}
                    style={{
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      color: 'rgba(255,255,255,0.7)',
                      background: 'rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      width: 28,
                      height: 20,
                      fontSize: 10,
                      padding: 0,
                    }}
                  >
                    ↓
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {!visibleBooks.length && (
          <p style={{ padding: '22px 8px', margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>
            {library.length === 0
              ? 'No books yet. Add a book to get started.'
              : 'No books match those filters.'}
          </p>
        )}
      </div>
    </aside>
  )
}

export default LibraryPanel
