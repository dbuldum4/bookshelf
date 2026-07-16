import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeLibraryStats,
  downloadLibraryExport,
  LIBRARY_SORT_OPTIONS,
  lookupBookByIsbn,
  parseLibraryFile,
  READING_STATUSES,
  searchAcclaimedBooks,
  sortLibrary,
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

function LibraryPanel({
  library,
  shelves = [],
  selectedBookId,
  selectedShelfId,
  onSelectBook,
  onSelectShelf,
  onAddBook,
  onReplaceLibrary,
  onReorderBook,
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
  const blurTimer = useRef(null)
  const importInputRef = useRef(null)
  const transferTimer = useRef(null)

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

  const statusStats = useMemo(() => READING_STATUSES.map((value) => ({
    label: value,
    count: readingStats.byStatus[value] || 0,
  })), [readingStats])

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
      const matchesAuthor = authorFilter === 'All' || book.author === authorFilter
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
      showTransferFeedback(`Exported ${count} book${count === 1 ? '' : 's'} to ${filename}.`)
    } catch (error) {
      showTransferFeedback(error instanceof Error ? error.message : 'Could not export your library.', true)
    }
  }

  const openImportPicker = () => {
    clearTransferFeedback()
    importInputRef.current?.click()
  }

  const importLibrary = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    clearTransferFeedback()
    try {
      const text = await file.text()
      const parsed = parseLibraryFile(text, file.name)
      const { books, count, format } = parsed
      const kind = format === 'csv' ? 'CSV' : 'JSON'
      const confirmed = window.confirm(
        `Replace your current library (${library.length} book${library.length === 1 ? '' : 's'}) with ${count} imported book${count === 1 ? '' : 's'} from ${kind}?\n\nThis cannot be undone unless you export a backup first.`
      )
      if (!confirmed) {
        showTransferFeedback('Import cancelled. Your library was not changed.')
        return
      }
      onReplaceLibrary({ books, shelves: parsed.shelves })
      showTransferFeedback(`Imported ${count} book${count === 1 ? '' : 's'} from ${file.name}.`)
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

  const blurTitle = () => {
    if (blurTimer.current !== null) window.clearTimeout(blurTimer.current)
    blurTimer.current = window.setTimeout(() => {
      setShowSuggestions(false)
      blurTimer.current = null
    }, 100)
  }

  const findByIsbn = async () => {
    setLookingUp(true)
    setLookupError('')
    try {
      const result = await lookupBookByIsbn(draft.isbn)
      setDraft((current) => ({ ...current, ...result }))
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Could not look up that ISBN.')
    } finally {
      setLookingUp(false)
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
          title="Import Bookshelf JSON or a Goodreads CSV export"
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
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" style={{ width: 28, height: 40, objectFit: 'cover', borderRadius: 3, background: book.color }} />
                ) : (
                  <span aria-hidden="true" style={{ width: 28, height: 40, flexShrink: 0, borderRadius: 3, background: book.color, boxShadow: `inset -4px 0 rgba(0,0,0,0.25)` }} />
                )}
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
            No books match those filters.
          </p>
        )}
      </div>
    </aside>
  )
}

export default LibraryPanel
