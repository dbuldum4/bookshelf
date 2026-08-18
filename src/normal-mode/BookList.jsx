import { useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Search, Star, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import {
  LIBRARY_SORT_OPTIONS,
  READING_STATUSES,
  sortLibrary,
} from '../library'

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  )
}

function progressLabel(book) {
  if (!book.pageCount) return book.status
  return `${Math.min(100, Math.round((book.currentPage / book.pageCount) * 100))}% · ${book.currentPage}/${book.pageCount}`
}

function CoverThumb({ coverUrl, color, title }) {
  const [failed, setFailed] = useState(false)
  if (!coverUrl || failed) {
    return (
      <div
        aria-hidden="true"
        className="h-20 w-14 flex-shrink-0 rounded-md shadow"
        style={{ background: color }}
      />
    )
  }
  return (
    <img
      src={coverUrl}
      alt={`Cover of ${title}`}
      onError={() => setFailed(true)}
      className="h-20 w-14 flex-shrink-0 rounded-md object-cover shadow"
      style={{ background: color }}
    />
  )
}

const statusColors = {
  'Want to Read': 'secondary',
  Reading: 'default',
  Finished: 'outline',
}

const EMPTY_BULK_IDS = new Set()

function BookList({
  library,
  shelves,
  selectedBookId,
  onSelectBook,
  onAddBook,
  bulkBookIds,
  onToggleBulkBook,
  onSetBulkBooks,
  onClearBulkBooks,
  onBulkStatus,
  onBulkTag,
  onBulkMove,
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [shelfFilter, setShelfFilter] = useState('All')
  const [authorFilter, setAuthorFilter] = useState('All')
  const [tagFilter, setTagFilter] = useState('All')
  const [ratingFilter, setRatingFilter] = useState('All')
  const [sortBy, setSortBy] = useState('shelf')
  const [bulkTag, setBulkTag] = useState('')
  const searchRef = useRef(null)
  const selectAllRef = useRef(null)

  const shelfNameById = useMemo(
    () => Object.fromEntries(shelves.map((shelf) => [shelf.id, shelf.name])),
    [shelves]
  )

  const authorOptions = useMemo(
    () => uniqueSorted(library.map((book) => book.author?.trim())),
    [library]
  )

  const tagOptions = useMemo(
    () => uniqueSorted(library.flatMap((book) => book.tags || [])),
    [library]
  )

  const visibleBooks = useMemo(() => {
    const search = query.trim().toLowerCase()
    const filtered = library.filter((book) => {
      const matchesStatus = status === 'All' || book.status === status
      const matchesShelf = shelfFilter === 'All' || book.shelfId === shelfFilter
      const matchesAuthor = authorFilter === 'All' || (book.author || '').trim() === authorFilter
      const matchesTag = tagFilter === 'All' || (book.tags || []).includes(tagFilter)
      const matchesRating =
        ratingFilter === 'All' ||
        (ratingFilter === '0' ? !book.rating : book.rating >= Number(ratingFilter))
      const matchesSearch =
        !search ||
        [
          book.title,
          book.author,
          ...(book.tags || []),
          ...(book.quotes || []),
          book.notes || '',
          shelfNameById[book.shelfId] || '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(search)
      return matchesStatus && matchesShelf && matchesAuthor && matchesTag && matchesRating && matchesSearch
    })
    return sortLibrary(filtered, sortBy)
  }, [library, query, status, shelfFilter, authorFilter, tagFilter, ratingFilter, sortBy, shelfNameById])

  const checkedIds = bulkBookIds instanceof Set ? bulkBookIds : EMPTY_BULK_IDS
  const checkedCount = checkedIds.size
  const checkedList = [...checkedIds]
  const visibleCheckedCount = visibleBooks.filter((book) => checkedIds.has(book.id)).length
  const allVisibleChecked = visibleBooks.length > 0 && visibleCheckedCount === visibleBooks.length

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = visibleCheckedCount > 0 && !allVisibleChecked
    }
  }, [visibleCheckedCount, allVisibleChecked])

  useEffect(() => {
    if (checkedCount === 0) setBulkTag('')
  }, [checkedCount])

  const toggleVisibleBulk = () => {
    if (!onSetBulkBooks) return
    const visibleIds = visibleBooks.map((book) => book.id)
    if (allVisibleChecked) {
      onSetBulkBooks(checkedList.filter((id) => !visibleIds.includes(id)))
      return
    }
    onSetBulkBooks([...new Set([...checkedList, ...visibleIds])])
  }

  const applyStatus = (value) => {
    if (!value || !onBulkStatus) return
    onBulkStatus(checkedList, value)
  }

  const applyMove = (shelfId) => {
    if (!shelfId || !onBulkMove) return
    onBulkMove(checkedList, shelfId)
  }

  const submitBulkTag = (event) => {
    event.preventDefault()
    if (!onBulkTag) return
    if (onBulkTag(checkedList, bulkTag)) setBulkTag('')
  }

  const activeFilterCount = [status, shelfFilter, authorFilter, tagFilter, ratingFilter].filter(
    (v) => v !== 'All'
  ).length

  const clearFilters = () => {
    setQuery('')
    setStatus('All')
    setShelfFilter('All')
    setAuthorFilter('All')
    setTagFilter('All')
    setRatingFilter('All')
    setSortBy('shelf')
    searchRef.current?.focus()
  }

  useEffect(() => {
    if (shelfFilter !== 'All' && !shelves.some((shelf) => shelf.id === shelfFilter)) {
      setShelfFilter('All')
    }
  }, [shelfFilter, shelves])

  useEffect(() => {
    if (authorFilter !== 'All' && !authorOptions.includes(authorFilter)) {
      setAuthorFilter('All')
    }
  }, [authorFilter, authorOptions])

  useEffect(() => {
    if (tagFilter !== 'All' && !tagOptions.includes(tagFilter)) {
      setTagFilter('All')
    }
  }, [tagFilter, tagOptions])

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, author, tag, or quote"
            className="pl-9"
          />
        </div>
        <Button onClick={onAddBook}>
          <BookOpen className="mr-2 h-4 w-4" />
          Add book
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto min-w-[8rem]">
          <option value="All">All statuses</option>
          {READING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={shelfFilter} onChange={(e) => setShelfFilter(e.target.value)} className="w-auto min-w-[8rem]">
          <option value="All">All shelves</option>
          {shelves.map((shelf) => (
            <option key={shelf.id} value={shelf.id}>
              {shelf.name}
            </option>
          ))}
        </Select>
        <Select value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)} className="w-auto min-w-[8rem]">
          <option value="All">All authors</option>
          {authorOptions.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </Select>
        <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-auto min-w-[8rem]">
          <option value="All">All tags</option>
          {tagOptions.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </Select>
        <Select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="w-auto min-w-[8rem]">
          <option value="All">All ratings</option>
          <option value="0">Not rated</option>
          <option value="5">5 stars</option>
          <option value="4">4+ stars</option>
          <option value="3">3+ stars</option>
          <option value="2">2+ stars</option>
          <option value="1">1+ stars</option>
        </Select>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-auto min-w-[8rem]">
          {LIBRARY_SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear {activeFilterCount}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {typeof onToggleBulkBook === 'function' && (
          <label className="inline-flex items-center gap-2">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleChecked}
              disabled={!visibleBooks.length}
              onChange={toggleVisibleBulk}
              aria-label="Select all visible books"
              className="h-4 w-4 accent-primary"
            />
            <span>Select visible</span>
          </label>
        )}
        <span>
          {visibleBooks.length} of {library.length} books
          {activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount === 1 ? '' : 's'}`}
        </span>
      </div>

      {checkedCount > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3"
        >
          <span className="text-sm font-medium">{checkedCount} selected</span>
          <Select
            aria-label="Set status for selected books"
            value=""
            onChange={(event) => applyStatus(event.target.value)}
            className="w-auto min-w-[8rem]"
          >
            <option value="">Set status</option>
            {READING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <form onSubmit={submitBulkTag} className="flex min-w-[12rem] flex-1 items-center gap-2">
            <Input
              value={bulkTag}
              onChange={(event) => setBulkTag(event.target.value)}
              placeholder="Add tag"
              aria-label="Tag to add to selected books"
            />
            <Button type="submit" variant="secondary" size="sm">
              Add tag
            </Button>
          </form>
          <Select
            aria-label="Move selected books to shelf"
            value=""
            onChange={(event) => applyMove(event.target.value)}
            className="w-auto min-w-[8rem]"
          >
            <option value="">Move to shelf</option>
            {shelves.map((shelf) => (
              <option key={shelf.id} value={shelf.id}>
                {shelf.name}
              </option>
            ))}
          </Select>
          <Button type="button" variant="ghost" size="sm" onClick={onClearBulkBooks}>
            Clear
          </Button>
        </div>
      )}

      {visibleBooks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">No books found</h3>
          <p className="text-sm text-muted-foreground">Try clearing filters or add a new book.</p>
        </div>
      ) : (
        <div className="grid flex-1 gap-4 overflow-y-auto pb-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleBooks.map((book) => (
            <div
              key={book.id}
              className={`flex rounded-lg border bg-card text-card-foreground shadow-sm transition-colors ${
                selectedBookId === book.id ? 'ring-2 ring-ring' : ''
              }`}
            >
              {typeof onToggleBulkBook === 'function' && (
                <label className="flex cursor-pointer items-start pt-4 pl-3">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(book.id)}
                    onChange={() => onToggleBulkBook(book.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Select ${book.title}`}
                    className="mt-1 h-4 w-4 accent-primary"
                  />
                </label>
              )}
              <button
                type="button"
                onClick={() => onSelectBook(book.id)}
                className="min-w-0 flex-1 rounded-lg p-4 text-left hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <div className="flex gap-4">
                  <CoverThumb coverUrl={book.coverUrl} color={book.color} title={book.title} />
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-serif font-medium leading-tight">{book.title}</h4>
                    <p className="truncate text-sm text-muted-foreground">{book.author}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={statusColors[book.status] || 'secondary'}>{book.status}</Badge>
                      {book.rating > 0 && (
                        <span className="inline-flex items-center text-xs text-amber-600">
                          <Star className="mr-0.5 h-3 w-3 fill-current" />
                          {book.rating}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{progressLabel(book)}</p>
                    <p className="truncate text-xs text-muted-foreground">{shelfNameById[book.shelfId]}</p>
                  </div>
                </div>
                {book.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {book.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {book.tags.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{book.tags.length - 4}</span>
                    )}
                  </div>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export { BookList }
