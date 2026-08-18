import { useEffect, useState } from 'react'
import { READING_STATUSES } from '../library'

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const fieldStyle = {
  width: '100%',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10,
  color: '#fff',
  background: 'rgba(255,255,255,0.07)',
  font: 'inherit',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  color: 'rgba(255,255,255,0.58)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.8,
  textTransform: 'uppercase',
}

function BookDetails({ book, shelves = [], onUpdate, onDelete, onClose, onReorder }) {
  const [tagsDraft, setTagsDraft] = useState(null) // null = not editing
  const [coverFailed, setCoverFailed] = useState(false)

  useEffect(() => {
    setTagsDraft(null)
    setCoverFailed(false)
  }, [book?.id])

  if (!book) return null

  const progress = book.pageCount ? Math.min(100, Math.round((book.currentPage / book.pageCount) * 100)) : 0
  const quotes = Array.isArray(book.quotes) ? book.quotes : []
  const reads = Array.isArray(book.reads) ? book.reads : []

  const removeBook = () => {
    if (window.confirm(`Remove “${book.title}” from your library?`)) onDelete()
  }

  const updateQuote = (index, value) => {
    onUpdate({ quotes: quotes.map((quote, quoteIndex) => (quoteIndex === index ? value : quote)) })
  }

  const addQuote = () => {
    onUpdate({ quotes: [...quotes, ''] })
  }

  const removeQuote = (index) => {
    onUpdate({ quotes: quotes.filter((_, quoteIndex) => quoteIndex !== index) })
  }

  const updateRead = (index, field, value) => {
    onUpdate({
      reads: reads.map((read, readIndex) => (
        readIndex === index ? { ...read, [field]: value } : read
      )),
    })
  }

  const addRead = () => {
    onUpdate({ reads: [...reads, { startedAt: '', finishedAt: '' }] })
  }

  const removeRead = (index) => {
    onUpdate({ reads: reads.filter((_, readIndex) => readIndex !== index) })
  }

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label={`Details for ${book.title}`}
      data-book-editor
      style={{
        position: 'absolute',
        top: 76,
        right: 16,
        width: 344,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto',
        padding: 20,
        color: '#fff',
        background: 'rgba(15, 14, 29, 0.78)',
        backdropFilter: 'blur(28px) saturate(145%)',
        WebkitBackdropFilter: 'blur(28px) saturate(145%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 18,
        boxShadow: '0 24px 70px rgba(0,0,0,0.52)',
        fontFamily,
      }}
    >
      <button
        type="button"
        aria-label="Close book details"
        onClick={onClose}
        style={{
          position: 'absolute', top: 14, right: 14, width: 30, height: 30,
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%',
          color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.07)',
          cursor: 'pointer', fontSize: 18, lineHeight: 1,
        }}
      >
        ×
      </button>

      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', marginBottom: 18, paddingRight: 30 }}>
        {book.coverUrl && !coverFailed ? (
          <img
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            onError={() => setCoverFailed(true)}
            style={{ width: 52, height: 76, objectFit: 'cover', borderRadius: 5, background: book.color, boxShadow: '0 8px 20px rgba(0,0,0,0.3)' }}
          />
        ) : (
          <div aria-hidden="true" style={{ width: 12, height: 76, borderRadius: 5, background: book.color, boxShadow: `0 0 22px ${book.color}` }} />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 24, fontWeight: 500, lineHeight: 1.1, letterSpacing: -0.5 }}>
            {book.title}
          </h1>
          <p style={{ margin: '7px 0 0', color: 'rgba(255,255,255,0.58)', fontSize: 14 }}>{book.author}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label htmlFor="book-title" style={labelStyle}>Title</label>
          <input id="book-title" value={book.title} onChange={(event) => onUpdate({ title: event.target.value })} style={{ ...fieldStyle, height: 40, padding: '0 11px' }} />
        </div>
        <div>
          <label htmlFor="book-author" style={labelStyle}>Author</label>
          <input
            id="book-author"
            value={book.author}
            onChange={(event) => onUpdate({ author: event.target.value })}
            onBlur={(event) => onUpdate({ author: event.target.value.trim() })}
            style={{ ...fieldStyle, height: 40, padding: '0 11px' }}
          />
        </div>
        <div>
          <label htmlFor="book-status" style={labelStyle}>Reading status</label>
          <select id="book-status" value={book.status} onChange={(event) => onUpdate({ status: event.target.value })} style={{ ...fieldStyle, height: 40, padding: '0 11px' }}>
            {READING_STATUSES.map((status) => <option key={status} value={status} style={{ color: '#111' }}>{status}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="book-shelf" style={labelStyle}>Shelf</label>
          <select
            id="book-shelf"
            value={book.shelfId || ''}
            onChange={(event) => onUpdate({ shelfId: event.target.value })}
            style={{ ...fieldStyle, height: 40, padding: '0 11px' }}
          >
            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id} style={{ color: '#111' }}>{shelf.name}</option>
            ))}
          </select>
        </div>

        {typeof onReorder === 'function' && (
          <div>
            <span style={labelStyle}>Order on shelf</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => onReorder(book.id, -1)}
                style={{
                  flex: 1,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  padding: '9px 10px',
                  font: `600 12px ${fontFamily}`,
                }}
              >
                ← Move left
              </button>
              <button
                type="button"
                onClick={() => onReorder(book.id, 1)}
                style={{
                  flex: 1,
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  color: '#fff',
                  background: 'rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  padding: '9px 10px',
                  font: `600 12px ${fontFamily}`,
                }}
              >
                Move right →
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label htmlFor="book-rating" style={labelStyle}>Rating</label>
            <select id="book-rating" value={book.rating} onChange={(event) => onUpdate({ rating: Number(event.target.value) })} style={{ ...fieldStyle, height: 40, padding: '0 11px' }}>
              <option value="0" style={{ color: '#111' }}>Not rated</option>
              {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating} style={{ color: '#111' }}>{'★'.repeat(rating)}{'☆'.repeat(5 - rating)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="book-pages" style={labelStyle}>Total pages</label>
            <input id="book-pages" min="0" type="number" value={book.pageCount || ''} onChange={(event) => onUpdate({ pageCount: event.target.value })} placeholder="—" style={{ ...fieldStyle, height: 40, padding: '0 11px' }} />
          </div>
        </div>

        <div>
          <label htmlFor="book-progress" style={labelStyle}>Reading progress {book.pageCount ? `· ${progress}%` : ''}</label>
          <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
            <input id="book-progress" min="0" max={book.pageCount || undefined} type="number" value={book.currentPage || ''} onChange={(event) => onUpdate({ currentPage: event.target.value })} placeholder="Current page" style={{ ...fieldStyle, height: 40, padding: '0 11px' }} />
            {book.pageCount > 0 && <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, whiteSpace: 'nowrap' }}>of {book.pageCount}</span>}
          </div>
          {book.pageCount > 0 && <div aria-hidden="true" style={{ height: 4, overflow: 'hidden', marginTop: 8, borderRadius: 99, background: 'rgba(255,255,255,0.13)' }}><div style={{ width: `${progress}%`, height: '100%', borderRadius: 99, background: book.color }} /></div>}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Read-throughs</label>
            <button
              type="button"
              onClick={addRead}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: '#fff',
                background: 'rgba(255,255,255,0.08)',
                cursor: 'pointer',
                padding: '5px 8px',
                font: `600 11px ${fontFamily}`,
                whiteSpace: 'nowrap',
              }}
            >
              + Add read
            </button>
          </div>
          {reads.length === 0 ? (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.42)', fontSize: 12, lineHeight: 1.4 }}>
              Track each time you start or finish this book.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {reads.map((read, index) => (
                <div key={`read-${index}`} style={{ display: 'grid', gap: 6 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label htmlFor={index === 0 ? 'book-started' : `book-read-started-${index}`} style={labelStyle}>Started</label>
                      <input
                        id={index === 0 ? 'book-started' : `book-read-started-${index}`}
                        type="date"
                        value={read.startedAt || ''}
                        onChange={(event) => updateRead(index, 'startedAt', event.target.value)}
                        style={{ ...fieldStyle, height: 40, padding: '0 8px', colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={index === 0 ? 'book-finished' : `book-read-finished-${index}`} style={labelStyle}>Finished</label>
                      <input
                        id={index === 0 ? 'book-finished' : `book-read-finished-${index}`}
                        type="date"
                        value={read.finishedAt || ''}
                        onChange={(event) => updateRead(index, 'finishedAt', event.target.value)}
                        style={{ ...fieldStyle, height: 40, padding: '0 8px', colorScheme: 'dark' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => removeRead(index)}
                      style={{
                        border: '1px solid rgba(255,130,130,0.28)',
                        borderRadius: 8,
                        color: '#ffb3b3',
                        background: 'rgba(255,80,80,0.08)',
                        cursor: 'pointer',
                        padding: '5px 8px',
                        font: `600 11px ${fontFamily}`,
                      }}
                    >
                      Remove read
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="book-tags" style={labelStyle}>Tags</label>
          <input
            id="book-tags"
            value={tagsDraft ?? (book.tags || []).join(', ')}
            onFocus={() => setTagsDraft((book.tags || []).join(', '))}
            onChange={(event) => setTagsDraft(event.target.value)}
            onBlur={() => {
              const tags = (tagsDraft ?? '').split(',').map((tag) => tag.trim()).filter(Boolean)
              onUpdate({ tags })
              setTagsDraft(null)
            }}
            placeholder="Classics, sci-fi, favorite"
            style={{ ...fieldStyle, height: 40, padding: '0 11px' }}
          />
        </div>
        <div>
          <label htmlFor="book-isbn" style={labelStyle}>ISBN</label>
          <input id="book-isbn" value={book.isbn} onChange={(event) => onUpdate({ isbn: event.target.value })} placeholder="ISBN-10 or ISBN-13" style={{ ...fieldStyle, height: 40, padding: '0 11px' }} />
        </div>
        <div>
          <label htmlFor="book-notes" style={labelStyle}>Notes</label>
          <textarea id="book-notes" value={book.notes} onChange={(event) => onUpdate({ notes: event.target.value })} placeholder="What do you want to remember?" rows={4} style={{ ...fieldStyle, display: 'block', minHeight: 96, padding: 11, resize: 'vertical', lineHeight: 1.45 }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 7 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Favorite quotes</label>
            <button
              type="button"
              onClick={addQuote}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8,
                color: '#fff',
                background: 'rgba(255,255,255,0.08)',
                cursor: 'pointer',
                padding: '5px 8px',
                font: `600 11px ${fontFamily}`,
                whiteSpace: 'nowrap',
              }}
            >
              + Add quote
            </button>
          </div>
          {(book.quotes || []).length === 0 ? (
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.42)', fontSize: 12, lineHeight: 1.4 }}>
              Save lines you want to keep close while reading.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {(book.quotes || []).map((quote, index) => (
                <div key={`quote-${index}`} style={{ display: 'grid', gap: 6 }}>
                  <textarea
                    id={index === 0 ? 'book-quotes' : undefined}
                    aria-label={`Favorite quote ${index + 1}`}
                    value={quote}
                    onChange={(event) => updateQuote(index, event.target.value)}
                    placeholder="“So we beat on, boats against the current…”"
                    rows={3}
                    style={{ ...fieldStyle, display: 'block', minHeight: 72, padding: 11, resize: 'vertical', lineHeight: 1.45 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => removeQuote(index)}
                      style={{
                        border: '1px solid rgba(255,130,130,0.28)',
                        borderRadius: 8,
                        color: '#ffb3b3',
                        background: 'rgba(255,80,80,0.08)',
                        cursor: 'pointer',
                        padding: '5px 8px',
                        font: `600 11px ${fontFamily}`,
                      }}
                    >
                      Remove quote
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 17 }}>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Edits update your local library on this device.</p>
        <button type="button" onClick={removeBook} style={{ border: '1px solid rgba(255,130,130,0.35)', borderRadius: 8, color: '#ffb3b3', background: 'rgba(255,80,80,0.09)', cursor: 'pointer', padding: '7px 9px', font: `600 11px ${fontFamily}`, whiteSpace: 'nowrap' }}>
          Remove book
        </button>
      </div>
    </aside>
  )
}

export default BookDetails
