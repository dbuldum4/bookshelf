import { useEffect, useMemo, useRef, useState } from 'react'
import { Calendar, Loader2, Search, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import {
  lookupBookByIsbn,
  READING_STATUSES,
  searchAcclaimedBooks,
} from '../library'

function today() {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function BookSheet({
  book,
  shelves,
  open,
  onOpenChange,
  onAddBook,
  onUpdateBook,
  onDeleteBook,
  onStatus,
}) {
  const isAdding = !book
  const [draft, setDraft] = useState({
    title: '',
    author: '',
    isbn: '',
    pageCount: '',
    coverUrl: '',
    shelfId: shelves[0]?.id || '',
    status: 'Want to Read',
    rating: 0,
    currentPage: '',
    startedAt: '',
    finishedAt: '',
    tags: '',
    notes: '',
  })
  const [tagsDraft, setTagsDraft] = useState('')
  const [lookupError, setLookupError] = useState('')
  const [lookingUp, setLookingUp] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(0)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState('')
  const [coverFailed, setCoverFailed] = useState(false)
  const isbnRequestId = useRef(0)
  const blurTimer = useRef(null)
  const titleInputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    if (book) {
      setDraft({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        pageCount: book.pageCount || '',
        coverUrl: book.coverUrl || '',
        shelfId: book.shelfId || shelves[0]?.id || '',
        status: book.status || 'Want to Read',
        rating: book.rating || 0,
        currentPage: book.currentPage || '',
        startedAt: book.startedAt || '',
        finishedAt: book.finishedAt || '',
        tags: (book.tags || []).join(', '),
        notes: book.notes || '',
      })
      setTagsDraft((book.tags || []).join(', '))
    } else {
      setDraft({
        title: '',
        author: '',
        isbn: '',
        pageCount: '',
        coverUrl: '',
        shelfId: shelves[0]?.id || '',
        status: 'Want to Read',
        rating: 0,
        currentPage: '',
        startedAt: '',
        finishedAt: '',
        tags: '',
        notes: '',
      })
      setTagsDraft('')
    }
    setLookupError('')
    setSuggestions([])
    setShowSuggestions(false)
    setSuggestionError('')
    setCoverFailed(false)
  }, [book, open, shelves])

  useEffect(() => {
    if (isAdding && open) {
      window.setTimeout(() => titleInputRef.current?.focus(), 0)
    }
  }, [isAdding, open])

  const handleChange = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
    if (!isAdding && book) {
      if (field === 'tags') return
      if (field === 'currentPage' || field === 'pageCount') {
        onUpdateBook({ [field]: value })
      } else if (field === 'rating') {
        onUpdateBook({ rating: Number(value) })
      } else if (field === 'status') {
        const updates = { status: value }
        if (value === 'Reading' && !draft.startedAt) updates.startedAt = today()
        if (value === 'Finished' && !draft.finishedAt) updates.finishedAt = today()
        onUpdateBook(updates)
      } else if (field === 'shelfId') {
        onUpdateBook({ shelfId: value })
      } else {
        onUpdateBook({ [field]: value })
      }
    }
  }

  const handleTagsBlur = () => {
    const tags = tagsDraft
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    if (!isAdding) onUpdateBook({ tags })
    setDraft((current) => ({ ...current, tags: tags.join(', ') }))
  }

  const updateQuote = (index, value) => {
    if (!book) return
    onUpdateBook({ quotes: (book.quotes || []).map((q, i) => (i === index ? value : q)) })
  }

  const addQuote = () => {
    if (!book) return
    onUpdateBook({ quotes: [...(book.quotes || []), ''] })
  }

  const removeQuote = (index) => {
    if (!book) return
    onUpdateBook({ quotes: (book.quotes || []).filter((_, i) => i !== index) })
  }

  useEffect(() => {
    if (!isAdding) {
      setShowSuggestions(false)
      setSuggestions([])
      return undefined
    }
    const search = draft.title.trim()
    if (search.length < 2 || !showSuggestions) {
      setSuggestions([])
      setLoadingSuggestions(false)
      setSuggestionError('')
      return undefined
    }
    const controller = new AbortController()
    setLoadingSuggestions(true)
    const timer = window.setTimeout(async () => {
      try {
        const results = await searchAcclaimedBooks(search, controller.signal)
        if (controller.signal.aborted) return
        setSuggestions(results)
        setActiveSuggestion(0)
      } catch (error) {
        if (error?.name !== 'AbortError' && !controller.signal.aborted) {
          setSuggestions([])
          setSuggestionError(error instanceof Error ? error.message : 'Book suggestions are unavailable.')
        }
      } finally {
        if (!controller.signal.aborted) setLoadingSuggestions(false)
      }
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [draft.title, showSuggestions, isAdding])

  const chooseSuggestion = (suggestion) => {
    setDraft((current) => ({
      ...current,
      title: suggestion.title,
      author: suggestion.author,
      coverUrl: suggestion.coverUrl,
    }))
    setShowSuggestions(false)
    setSuggestions([])
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

  const findByIsbn = async () => {
    if (!draft.isbn.trim()) return
    const requestId = ++isbnRequestId.current
    setLookingUp(true)
    setLookupError('')
    try {
      const result = await lookupBookByIsbn(draft.isbn)
      if (requestId !== isbnRequestId.current) return
      setDraft((current) => ({
        ...current,
        ...result,
        shelfId: current.shelfId || shelves[0]?.id,
      }))
      if (!isAdding && book) {
        onUpdateBook({ ...result })
      }
    } catch (error) {
      if (requestId !== isbnRequestId.current) return
      setLookupError(error instanceof Error ? error.message : 'Could not look up that ISBN.')
    } finally {
      if (requestId === isbnRequestId.current) setLookingUp(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!draft.title.trim()) {
      setLookupError('Add a title before saving the book.')
      return
    }
    const tags = tagsDraft
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    const added = onAddBook({
      ...draft,
      pageCount: Number(draft.pageCount) || 0,
      currentPage: Number(draft.currentPage) || 0,
      rating: Number(draft.rating) || 0,
      tags,
      shelfId: draft.shelfId || shelves[0]?.id,
    })
    if (added) {
      onOpenChange(false)
      onStatus?.('Book added.')
    }
  }

  const confirmDelete = () => {
    if (!book) return
    if (window.confirm(`Remove “${book.title}” from your library?`)) {
      onDeleteBook()
      onOpenChange(false)
    }
  }

  const progress = useMemo(() => {
    const pc = Number(draft.pageCount) || 0
    const cp = Number(draft.currentPage) || 0
    return pc ? Math.min(100, Math.round((cp / pc) * 100)) : 0
  }, [draft.pageCount, draft.currentPage])

  const titleSuggestionsId = `title-suggestions-${book ? book.id : 'new'}`

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader>
        <SheetTitle>{isAdding ? 'Add book' : book.title}</SheetTitle>
        <SheetDescription>
          {isAdding ? 'Search by title or ISBN, then save to your library.' : 'Edit details for this book.'}
        </SheetDescription>
      </SheetHeader>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
        {draft.coverUrl && !coverFailed ? (
          <img
            src={draft.coverUrl}
            alt={`Cover of ${draft.title}`}
            onError={() => setCoverFailed(true)}
            className="mx-auto h-40 w-auto rounded-md object-contain shadow"
          />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="book-title">Title</Label>
          <div className="relative">
            <Input
              ref={titleInputRef}
              id="book-title"
              value={draft.title}
              onChange={(e) => handleChange('title', e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={(e) => {
                const next = e.relatedTarget
                if (next && e.currentTarget.parentElement?.contains(next)) return
                if (blurTimer.current) window.clearTimeout(blurTimer.current)
                blurTimer.current = window.setTimeout(() => {
                  setShowSuggestions(false)
                  blurTimer.current = null
                }, 150)
              }}
              onKeyDown={handleTitleKeyDown}
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={showSuggestions && suggestions.length ? titleSuggestionsId : undefined}
              placeholder="Book title"
            />
            {isAdding && showSuggestions && (loadingSuggestions || suggestions.length > 0 || suggestionError) && (
              <ul
                id={titleSuggestionsId}
                role="listbox"
                className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
              >
                {suggestionError && <li className="px-2 py-1.5 text-sm text-destructive">{suggestionError}</li>}
                {loadingSuggestions && <li className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</li>}
                {suggestions.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    role="option"
                    aria-selected={index === activeSuggestion}
                    onMouseDown={() => chooseSuggestion(suggestion)}
                    className={`cursor-pointer rounded-sm px-2 py-1.5 text-sm ${
                      index === activeSuggestion ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                  >
                    {suggestion.title} <span className="text-muted-foreground">— {suggestion.author}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="book-author">Author</Label>
          <Input
            id="book-author"
            value={draft.author}
            onChange={(e) => handleChange('author', e.target.value)}
            onBlur={(e) => handleChange('author', e.target.value.trim())}
            placeholder="Author"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="book-status">Status</Label>
            <Select id="book-status" value={draft.status} onChange={(e) => handleChange('status', e.target.value)}>
              {READING_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-shelf">Shelf</Label>
            <Select id="book-shelf" value={draft.shelfId} onChange={(e) => handleChange('shelfId', e.target.value)}>
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>
                  {shelf.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="book-rating">Rating</Label>
            <Select id="book-rating" value={draft.rating} onChange={(e) => handleChange('rating', e.target.value)}>
              <option value="0">Not rated</option>
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {'★'.repeat(r)}{'☆'.repeat(5 - r)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-pages">Total pages</Label>
            <Input
              id="book-pages"
              type="number"
              min={0}
              value={draft.pageCount}
              onChange={(e) => handleChange('pageCount', e.target.value)}
              placeholder="—"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="book-progress">Reading progress {draft.pageCount ? `· ${progress}%` : ''}</Label>
          <div className="flex items-center gap-3">
            <Input
              id="book-progress"
              type="number"
              min={0}
              max={draft.pageCount || undefined}
              value={draft.currentPage}
              onChange={(e) => handleChange('currentPage', e.target.value)}
              placeholder="Current page"
            />
            {draft.pageCount > 0 && <span className="text-sm text-muted-foreground">of {draft.pageCount}</span>}
          </div>
          {draft.pageCount > 0 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="book-started">Started</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="book-started"
                type="date"
                value={draft.startedAt}
                onChange={(e) => handleChange('startedAt', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="book-finished">Finished</Label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="book-finished"
                type="date"
                value={draft.finishedAt}
                onChange={(e) => handleChange('finishedAt', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="book-tags">Tags</Label>
          <Input
            id="book-tags"
            value={tagsDraft}
            onFocus={() => setTagsDraft(draft.tags || '')}
            onChange={(e) => setTagsDraft(e.target.value)}
            onBlur={handleTagsBlur}
            placeholder="Classics, sci-fi, favorite"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="book-isbn">ISBN</Label>
          <div className="flex gap-2">
            <Input
              id="book-isbn"
              value={draft.isbn}
              onChange={(e) => handleChange('isbn', e.target.value)}
              placeholder="ISBN-10 or ISBN-13"
            />
            <Button type="button" variant="outline" onClick={findByIsbn} disabled={lookingUp}>
              {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          {lookupError && <p className="text-sm text-destructive">{lookupError}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="book-notes">Notes</Label>
          <Textarea
            id="book-notes"
            value={draft.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="What do you want to remember?"
            rows={4}
          />
        </div>

        {!isAdding && book && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Favorite quotes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addQuote}>
                + Add quote
              </Button>
            </div>
            {(book.quotes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Save lines you want to keep close while reading.</p>
            ) : (
              <div className="space-y-2">
                {(book.quotes || []).map((quote, index) => (
                  <div key={`quote-${index}`} className="space-y-2 rounded-md border p-2">
                    <Textarea
                      value={quote}
                      onChange={(e) => updateQuote(index, e.target.value)}
                      placeholder="“So we beat on, boats against the current…”"
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeQuote(index)}>
                        <X className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-4">
          <div>
            {!isAdding && (
              <Button type="button" variant="destructive" size="sm" onClick={confirmDelete}>
                <Trash2 className="mr-1 h-4 w-4" />
                Remove book
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {isAdding && <Button type="submit">Add book</Button>}
          </div>
        </div>
      </form>
    </Sheet>
  )
}

export { BookSheet }
