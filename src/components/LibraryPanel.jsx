import { useMemo, useState } from 'react'
import { ACCLAIMED_BOOKS, lookupBookByIsbn, READING_STATUSES } from '../library'

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

function LibraryPanel({ library, selectedBookId, onSelectBook, onAddBook }) {
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [draft, setDraft] = useState({ title: '', author: '', isbn: '', pageCount: '', coverUrl: '' })
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)

  const stats = useMemo(() => READING_STATUSES.map((value) => ({
    label: value,
    count: library.filter((book) => book.status === value).length,
  })), [library])

  const visibleBooks = useMemo(() => {
    const search = query.trim().toLowerCase()
    return library.filter((book) => {
      const matchesStatus = status === 'All' || book.status === status
      const matchesSearch = !search || [book.title, book.author, ...(book.tags || [])]
        .join(' ').toLowerCase().includes(search)
      return matchesStatus && matchesSearch
    })
  }, [library, query, status])

  const suggestions = useMemo(() => {
    const search = draft.title.trim().toLowerCase()
    if (!search) return []
    return ACCLAIMED_BOOKS
      .filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(search))
      .slice(0, 6)
  }, [draft.title])

  const changeDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }))

  const chooseSuggestion = (book) => {
    setDraft((current) => ({ ...current, title: book.title, author: book.author }))
    setShowSuggestions(false)
    setActiveSuggestion(0)
  }

  const handleTitleKeyDown = (event) => {
    if (!showSuggestions || !suggestions.length) return
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
    onAddBook({ ...draft, pageCount: Number(draft.pageCount) || 0 })
    setDraft({ title: '', author: '', isbn: '', pageCount: '', coverUrl: '' })
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
            {library.length} book{library.length === 1 ? '' : 's'} · select one to find it on the shelf
          </p>
        </div>
        <button type="button" aria-label="Close library" onClick={() => setOpen(false)} style={{ ...actionButton(), padding: '6px 9px', fontSize: 16 }}>
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, padding: '0 16px 14px' }}>
        {stats.map((item) => (
          <div key={item.label} style={{ borderRadius: 10, padding: '8px 7px', background: 'rgba(255,255,255,0.055)' }}>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{item.count}</div>
            <div style={{ color: 'rgba(255,255,255,0.47)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
        <input
          aria-label="Search your library"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title, author, or tag"
          style={inputStyle}
        />
        <select aria-label="Filter by reading status" value={status} onChange={(event) => setStatus(event.target.value)} style={{ ...inputStyle, width: 102, padding: '0 6px' }}>
          <option value="All">All</option>
          {READING_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 10px' }}>
        <span style={{ color: 'rgba(255,255,255,0.46)', fontSize: 12 }}>{visibleBooks.length} shown</span>
        <button type="button" onClick={() => setAdding((value) => !value)} style={actionButton(true)}>
          {adding ? 'Cancel' : '+ Add book'}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: 16, background: 'rgba(255,255,255,0.025)' }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <input
                required
                role="combobox"
                aria-autocomplete="list"
                aria-controls="acclaimed-book-suggestions"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-activedescendant={showSuggestions && suggestions.length ? `book-suggestion-${suggestions[activeSuggestion].id}` : undefined}
                value={draft.title}
                onChange={(event) => {
                  changeDraft('title', event.target.value)
                  setShowSuggestions(true)
                  setActiveSuggestion(0)
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => window.setTimeout(() => setShowSuggestions(false), 100)}
                onKeyDown={handleTitleKeyDown}
                placeholder="Title"
                aria-label="Book title"
                autoComplete="off"
                style={inputStyle}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  id="acclaimed-book-suggestions"
                  role="listbox"
                  aria-label="Acclaimed book suggestions"
                  style={{
                    position: 'absolute',
                    zIndex: 2,
                    top: 40,
                    left: 0,
                    right: 0,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10,
                    background: 'rgba(24, 22, 42, 0.98)',
                    boxShadow: '0 14px 32px rgba(0,0,0,0.42)',
                  }}
                >
                  {suggestions.map((book, index) => (
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
                        <span style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{book.author}</span>
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
            {lookupError && <p role="alert" style={{ margin: 0, color: '#ffb4b4', fontSize: 12 }}>{lookupError}</p>}
            <button type="submit" style={actionButton(true)}>Add to library</button>
          </div>
        </form>
      )}

      <div style={{ overflowY: 'auto', padding: '0 10px 10px' }}>
        {visibleBooks.map((book) => {
          const selected = book.id === selectedBookId
          return (
            <button
              type="button"
              key={book.id}
              onClick={() => onSelectBook(book.id)}
              style={{
                width: '100%',
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
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 }}>{book.title}</span>
                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, color: 'rgba(255,255,255,0.52)', fontSize: 11 }}>{book.author}</span>
              </span>
              <span style={{ maxWidth: 78, color: selected ? '#fff' : 'rgba(255,255,255,0.48)', fontSize: 10, textAlign: 'right' }}>{progressLabel(book)}</span>
            </button>
          )
        })}
        {!visibleBooks.length && (
          <p style={{ padding: '22px 8px', margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center' }}>No books match that search.</p>
        )}
      </div>
    </aside>
  )
}

export default LibraryPanel
