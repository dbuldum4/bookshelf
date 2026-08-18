import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addEmptyShelf,
  applyBookFieldUpdates,
  applyRoomPreset,
  applyShelfTransform,
  bookFieldUpdatesAreNoOp,
  booksFitOnShelf,
  booksOnShelf,
  bookWorldFocusPosition,
  buildShelfBooks,
  buildShelfCaseLayout,
  clampShelvesToRoom,
  computeGoalProgress,
  computeLibraryStats,
  computeYearInReview,
  createDefaultShelf,
  createLibrary,
  createLibraryState,
  createShelf,
  DEFAULT_SHELF_ID,
  deleteEmptyShelf,
  dismissLibraryBackupReminder,
  ensureLibraryCapacity,
  loadLibrary,
  loadLibraryState,
  loadReadingGoals,
  markLibraryBackupDone,
  normalizeReadingGoals,
  mergeBookRecords,
  mergeLibraryStates,
  mergeNotes,
  normalizeLibraryState,
  parseLibraryCsv,
  parseLibraryFile,
  parseLibraryImport,
  saveReadingGoals,
  insertionIndexFromLocalPoint,
  reorderBookOnShelf,
  reorderBookToIndex,
  ROOM_LAYOUT_BOUND,
  sanitizeCoverUrl,
  saveLibrary,
  saveLibraryState,
  SHELF_ROWS_MAX,
  SHELF_WIDTH_MAX,
  shelfRowYs,
  shouldRemindLibraryBackup,
  sortLibrary,
  tryReorderBookOnShelf,
  tryReorderBookToIndex,
} from './library'

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    values,
  }
}

describe('library persistence', () => {
  let storage

  beforeEach(() => {
    storage = makeStorage()
    vi.stubGlobal('window', { localStorage: storage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves and reloads a normalized library state with shelves', () => {
    const books = [{ id: 'test', title: '  Test Book  ', author: 'Author', status: 'Reading', currentPage: 25, pageCount: 20, tags: [' sci-fi ', 'sci-fi'], shelfId: DEFAULT_SHELF_ID }]
    const state = { books, shelves: [createDefaultShelf()] }

    expect(saveLibraryState(state)).toBe(true)
    const loaded = loadLibraryState()
    expect(loaded.books).toEqual([
      expect.objectContaining({ id: 'test', title: 'Test Book', currentPage: 20, pageCount: 20, tags: ['sci-fi'], shelfId: DEFAULT_SHELF_ID }),
    ])
    expect(loaded.shelves[0]).toEqual(expect.objectContaining({ id: DEFAULT_SHELF_ID, name: 'Library' }))
  })

  it('migrates bare v2 book arrays onto a default Library shelf', () => {
    storage.values.set('bookshelf-library-v2', JSON.stringify([
      { id: 'custom', title: 'Custom', author: 'A', status: 'Reading' },
    ]))

    const state = loadLibraryState()
    expect(state.books).toHaveLength(1)
    expect(state.books[0]).toEqual(expect.objectContaining({
      id: 'custom',
      title: 'Custom',
      shelfId: DEFAULT_SHELF_ID,
    }))
    expect(state.shelves).toHaveLength(1)
  })

  it('migrates legacy status and notes onto the built-in catalog', () => {
    storage.values.set('bookshelf-library-v1', JSON.stringify([
      { id: 'the-great-gatsby', status: 'Finished', notes: 'Revisit the ending.' },
    ]))

    const books = loadLibrary()
    expect(books).toHaveLength(40)
    expect(books[0]).toEqual(expect.objectContaining({
      id: 'the-great-gatsby',
      status: 'Finished',
      notes: 'Revisit the ending.',
      shelfId: DEFAULT_SHELF_ID,
    }))
  })

  it('falls back safely when storage cannot be read or written', () => {
    storage.getItem.mockImplementation(() => { throw new Error('blocked') })
    storage.setItem.mockImplementation(() => { throw new Error('full') })

    expect(loadLibrary()).toHaveLength(createLibrary().length)
    expect(saveLibrary([])).toBe(false)
  })

  it('does not fall through to v2 when v3 key exists but is corrupt', () => {
    storage.values.set('bookshelf-library-v3', '{not-json')
    storage.values.set('bookshelf-library-v2', JSON.stringify([
      { id: 'from-v2', title: 'Should Not Load', author: 'A', status: 'Reading' },
    ]))

    const state = loadLibraryState()
    expect(state.books.some((book) => book.id === 'from-v2')).toBe(false)
    expect(state.books).toHaveLength(createLibrary().length)
  })

  it('does not fall through to v2 when v3 is valid JSON with a corrupt shape', () => {
    storage.values.set('bookshelf-library-v3', JSON.stringify({ books: 'nope' }))
    storage.values.set('bookshelf-library-v2', JSON.stringify([
      { id: 'from-v2', title: 'Should Not Load', author: 'A' },
    ]))

    const state = loadLibraryState()
    expect(state.books.some((book) => book.id === 'from-v2')).toBe(false)
    expect(state.books).toHaveLength(createLibrary().length)
  })

  it('clears legacy storage keys after a successful v3 save', () => {
    storage.values.set('bookshelf-library-v2', '[]')
    storage.values.set('bookshelf-library-v1', '[]')

    expect(saveLibraryState({
      books: [{ id: 'a', title: 'A', author: 'B' }],
      shelves: [createDefaultShelf()],
    })).toBe(true)

    expect(storage.removeItem).toHaveBeenCalledWith('bookshelf-library-v2')
    expect(storage.removeItem).toHaveBeenCalledWith('bookshelf-library-v1')
    expect(storage.values.has('bookshelf-library-v2')).toBe(false)
    expect(storage.values.has('bookshelf-library-v1')).toBe(false)
    expect(storage.values.has('bookshelf-library-v3')).toBe(true)
  })

  it('preserves existing shelves when saveLibrary is given a books array', () => {
    const customShelf = createDefaultShelf({ id: 'fiction', name: 'Fiction', x: 9 })
    saveLibraryState({
      books: [{ id: 'a', title: 'A', author: 'B', shelfId: 'fiction' }],
      shelves: [createDefaultShelf(), customShelf],
    })

    expect(saveLibrary([{ id: 'b', title: 'B', author: 'C', shelfId: DEFAULT_SHELF_ID }])).toBe(true)
    const loaded = loadLibraryState()
    expect(loaded.books).toHaveLength(1)
    expect(loaded.books[0].title).toBe('B')
    expect(loaded.shelves.map((shelf) => shelf.id)).toEqual([DEFAULT_SHELF_ID, 'fiction'])
  })
})

describe('normalize and sanitize', () => {
  it('sanitizes cover URLs to https covers.openlibrary.org only', () => {
    expect(sanitizeCoverUrl('https://covers.openlibrary.org/b/id/1-M.jpg'))
      .toBe('https://covers.openlibrary.org/b/id/1-M.jpg')
    expect(sanitizeCoverUrl('http://covers.openlibrary.org/b/id/1-M.jpg')).toBe('')
    expect(sanitizeCoverUrl('https://evil.example/cover.jpg')).toBe('')
    expect(sanitizeCoverUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeCoverUrl('')).toBe('')
    expect(sanitizeCoverUrl(null)).toBe('')
  })

  it('dedupes book IDs in normalizeLibraryState', () => {
    const state = normalizeLibraryState({
      books: [
        { id: 'same', title: 'First', author: 'A' },
        { id: 'same', title: 'Second', author: 'B' },
        { id: 'unique', title: 'Third', author: 'C' },
      ],
      shelves: [createDefaultShelf()],
    })

    const ids = state.books.map((book) => book.id)
    expect(new Set(ids).size).toBe(3)
    expect(ids[0]).toBe('same')
    expect(ids[1]).not.toBe('same')
    expect(ids[2]).toBe('unique')
  })

  it('coerces numeric ISBNs from JSON import', () => {
    const result = parseLibraryImport(JSON.stringify([
      { title: 'Dune', author: 'Frank Herbert', isbn: 9780441172719 },
    ]))
    expect(result.books[0].isbn).toBe('9780441172719')
  })

  it('rejects non-openlibrary cover URLs when normalizing imported books', () => {
    const result = parseLibraryImport(JSON.stringify([
      {
        title: 'A',
        author: 'B',
        coverUrl: 'https://evil.example/x.jpg',
      },
    ]))
    expect(result.books[0].coverUrl).toBe('')
  })
})

describe('shelf layout and capacity', () => {
  it('is deterministic, centered, and non-overlapping for a row', () => {
    const library = createLibrary().slice(10, 20)
    const first = buildShelfBooks(library, 1)
    const second = buildShelfBooks(library, 1)

    expect(first).toEqual(second)
    expect(first).toHaveLength(10)

    for (let index = 1; index < first.length; index += 1) {
      const previousRight = first[index - 1].position[0] + first[index - 1].width / 2
      const currentLeft = first[index].position[0] - first[index].width / 2
      expect(currentLeft).toBeGreaterThan(previousRight - 1e-9)
    }

    const leftEdge = first[0].position[0] - first[0].width / 2
    const last = first[first.length - 1]
    const rightEdge = last.position[0] + last.width / 2
    expect(leftEdge + rightEdge).toBeCloseTo(0, 10)
  })

  it('packs the default catalog onto the default Library case', () => {
    const state = createLibraryState()
    expect(booksFitOnShelf(state.books, state.shelves[0])).toBe(true)
    const layout = buildShelfCaseLayout(state.books, state.shelves[0])
    expect(layout).toHaveLength(state.shelves[0].rows)
    expect(layout.flat()).toHaveLength(state.books.length)
  })

  it('blocks shrinking a shelf below its books', () => {
    const state = createLibraryState()
    const shelf = state.shelves[0]
    const result = applyShelfTransform(shelf, state.books, { rows: 1, width: 3.2 })
    expect(result.ok).toBe(false)
  })

  it('only deletes empty non-final shelves', () => {
    const shelves = addEmptyShelf([createDefaultShelf()], { name: 'Fiction' })
    const books = createLibrary()
    expect(deleteEmptyShelf(shelves, books, shelves[0].id).ok).toBe(false)
    expect(deleteEmptyShelf(shelves, books, shelves[1].id).ok).toBe(true)
    expect(deleteEmptyShelf([createDefaultShelf()], books, DEFAULT_SHELF_ID).ok).toBe(false)
  })

  it('treats author and tags blurs with the same values as no-ops', () => {
    const book = {
      id: 'a',
      title: 'Dune',
      author: 'Frank Herbert',
      tags: ['sf', 'classic'],
      notes: 'Keep',
    }
    expect(bookFieldUpdatesAreNoOp(book, { author: 'Frank Herbert' })).toBe(true)
    expect(bookFieldUpdatesAreNoOp(book, { tags: ['sf', 'classic'] })).toBe(true)
    expect(bookFieldUpdatesAreNoOp(book, { author: 'Frank H.' })).toBe(false)
    expect(bookFieldUpdatesAreNoOp(book, { tags: ['sf'] })).toBe(false)
    expect(applyBookFieldUpdates(book, { author: 'Frank H.' }).author).toBe('Frank H.')
  })

  it('marks moving the first book up as an unchanged reorder', () => {
    const shelf = createDefaultShelf()
    const books = [
      { id: 'a', shelfId: shelf.id, title: 'A' },
      { id: 'b', shelfId: shelf.id, title: 'B' },
      { id: 'c', shelfId: shelf.id, title: 'C' },
    ]
    const up = tryReorderBookOnShelf(books, 'a', -1, shelf)
    expect(up.ok).toBe(true)
    expect(up.changed).toBe(false)
    expect(booksOnShelf(up.books, shelf.id).map((book) => book.id)).toEqual(['a', 'b', 'c'])

    const swap = tryReorderBookOnShelf(books, 'a', 1, shelf)
    expect(swap.ok).toBe(true)
    expect(swap.changed).toBe(true)
    expect(booksOnShelf(swap.books, shelf.id).map((book) => book.id)).toEqual(['b', 'a', 'c'])
  })

  it('reorders books within a shelf without disturbing other shelves', () => {
    const books = [
      { id: 'a', shelfId: DEFAULT_SHELF_ID, title: 'A' },
      { id: 'x', shelfId: 'other', title: 'X' },
      { id: 'b', shelfId: DEFAULT_SHELF_ID, title: 'B' },
      { id: 'c', shelfId: DEFAULT_SHELF_ID, title: 'C' },
    ]
    const next = reorderBookOnShelf(books, 'a', 1)
    expect(booksOnShelf(next, DEFAULT_SHELF_ID).map((book) => book.id)).toEqual(['b', 'a', 'c'])
    expect(next.find((book) => book.id === 'x').shelfId).toBe('other')
  })

  it('moves a book to an absolute shelf index for 3D drag-to-reorder', () => {
    const books = [
      { id: 'a', shelfId: DEFAULT_SHELF_ID, title: 'A' },
      { id: 'x', shelfId: 'other', title: 'X' },
      { id: 'b', shelfId: DEFAULT_SHELF_ID, title: 'B' },
      { id: 'c', shelfId: DEFAULT_SHELF_ID, title: 'C' },
    ]
    const next = reorderBookToIndex(books, 'c', 0)
    expect(booksOnShelf(next, DEFAULT_SHELF_ID).map((book) => book.id)).toEqual(['c', 'a', 'b'])
    expect(booksOnShelf(next, 'other').map((book) => book.id)).toEqual(['x'])

    const same = reorderBookToIndex(books, 'b', 1)
    expect(booksOnShelf(same, DEFAULT_SHELF_ID).map((book) => book.id)).toEqual(['a', 'b', 'c'])
  })

  it('maps a local shelf point to an insertion index among remaining books', () => {
    const shelf = createDefaultShelf({ width: 8, rows: 2 })
    const mates = [
      { id: 'a', shelfId: shelf.id, title: 'A' },
      { id: 'b', shelfId: shelf.id, title: 'B' },
      { id: 'c', shelfId: shelf.id, title: 'C' },
    ]
    const layout = buildShelfCaseLayout(mates.filter((book) => book.id !== 'b'), shelf)
    const first = layout[0][0]
    const last = layout[0][layout[0].length - 1]
    const rowY = shelfRowYs(shelf.rows)[0]

    expect(insertionIndexFromLocalPoint(
      mates,
      shelf,
      first.position[0] - first.width,
      rowY + first.position[1],
      'b',
    )).toBe(0)

    expect(insertionIndexFromLocalPoint(
      mates,
      shelf,
      last.position[0] + last.width,
      rowY + last.position[1],
      'b',
    )).toBe(2)
  })

  it('rejects a reorder that would create an overflow row', () => {
    const shelf = createDefaultShelf({ width: 3.5, rows: 2 })
    const books = Array.from({ length: 8 }, (_, index) => ({
      id: `book-${18 + index}`,
      title: `Book ${index}`,
      shelfId: shelf.id,
    }))

    expect(buildShelfCaseLayout(books, shelf).flat()).toHaveLength(8)
    const result = tryReorderBookOnShelf(books, 'book-21', 1, shelf)
    expect(result.ok).toBe(false)
    expect(result.reason).toMatch(/capacity/i)

    const byIndex = tryReorderBookToIndex(books, 'book-21', 0, shelf)
    // Absolute moves can still overflow depending on packing; either ok with fit or reject.
    if (!byIndex.ok) expect(byIndex.reason).toMatch(/capacity/i)
    else expect(booksFitOnShelf(booksOnShelf(byIndex.books, shelf.id), shelf)).toBe(true)
  })

  it('expands a shelf and spills overflow onto new cases so every book is visible', () => {
    const tiny = createDefaultShelf({ width: 3.2, rows: 1 })
    // Far more than one max-size case can hold (width 12 × rows 6).
    const books = Array.from({ length: 200 }, (_, index) => ({
      id: `overflow-${index}`,
      title: `Book ${index}`,
      author: 'A',
      shelfId: DEFAULT_SHELF_ID,
    }))
    const result = ensureLibraryCapacity({ books, shelves: [tiny] })

    expect(result.adjusted).toBe(true)
    expect(result.message).toMatch(/extra shelves|resized/i)
    expect(result.shelves[0].width).toBe(SHELF_WIDTH_MAX)
    expect(result.shelves[0].rows).toBe(SHELF_ROWS_MAX)
    expect(result.shelves.length).toBeGreaterThan(1)

    for (const shelf of result.shelves) {
      expect(booksFitOnShelf(booksOnShelf(result.books, shelf.id), shelf)).toBe(true)
      const layout = buildShelfCaseLayout(booksOnShelf(result.books, shelf.id), shelf)
      expect(layout.flat()).toHaveLength(booksOnShelf(result.books, shelf.id).length)
    }
    expect(result.books).toHaveLength(200)
  })

  it('grows width/rows without spawning shelves when a max case is enough', () => {
    const tiny = createDefaultShelf({ width: 3.2, rows: 1 })
    const books = createLibrary() // default catalog fits a max case after resize
    const result = ensureLibraryCapacity({ books, shelves: [tiny] })
    expect(result.adjusted).toBe(true)
    expect(result.shelves).toHaveLength(1)
    expect(booksFitOnShelf(result.books, result.shelves[0])).toBe(true)
  })

  it('aims book focus at the packed plank rather than only the shelf center', () => {
    const state = createLibraryState()
    state.shelves[0] = { ...state.shelves[0], x: 10, z: 2, yaw: Math.PI / 2 }
    const first = state.books[0]
    const last = state.books[state.books.length - 1]
    const a = bookWorldFocusPosition(first, state.books, state.shelves)
    const b = bookWorldFocusPosition(last, state.books, state.shelves)
    expect(a.id).toBe(first.id)
    expect(b.id).toBe(last.id)
    // Different rows/x offsets should not collapse to the same aim point.
    expect(a.x !== b.x || a.y !== b.y || a.z !== b.z).toBe(true)
    // The aim remains on the book while the camera position follows the
    // rotated case's outward normal.
    expect(a.cameraX - a.x).toBeCloseTo(3.2, 10)
    expect(a.cameraZ - a.z).toBeCloseTo(0, 10)
  })
})

describe('library sort and stats', () => {
  it('sorts by title, rating, and finished date', () => {
    const books = [
      { title: 'Zebra', author: 'Ann', rating: 2, finishedAt: '2024-01-01', createdAt: '2024-01-01' },
      { title: 'Apple', author: 'Bob', rating: 5, finishedAt: '2026-03-01', createdAt: '2025-01-01' },
      { title: 'Mango', author: 'Ann', rating: 4, finishedAt: '', createdAt: '2026-01-01' },
    ]

    expect(sortLibrary(books, 'title').map((book) => book.title)).toEqual(['Apple', 'Mango', 'Zebra'])
    expect(sortLibrary(books, 'rating').map((book) => book.title)).toEqual(['Apple', 'Mango', 'Zebra'])
    expect(sortLibrary(books, 'finished').map((book) => book.title)).toEqual(['Apple', 'Zebra', 'Mango'])
    expect(sortLibrary(books, 'shelf').map((book) => book.title)).toEqual(['Zebra', 'Apple', 'Mango'])
  })

  it('computes finished-this-year, pages read, and rating averages', () => {
    const stats = computeLibraryStats([
      { status: 'Finished', pageCount: 300, currentPage: 300, rating: 5, finishedAt: '2026-02-10' },
      { status: 'Finished', pageCount: 200, currentPage: 200, rating: 3, finishedAt: '2025-11-01' },
      { status: 'Reading', pageCount: 400, currentPage: 40, rating: 0, finishedAt: '' },
      { status: 'Want to Read', pageCount: 100, currentPage: 0, rating: 0, finishedAt: '' },
    ], new Date('2026-07-15T12:00:00Z'))

    expect(stats.finishedThisYear).toBe(1)
    expect(stats.pagesRead).toBe(540)
    expect(stats.pagesFinishedThisYear).toBe(300)
    expect(stats.averageRating).toBe(4)
    expect(stats.ratedCount).toBe(2)
    expect(stats.ratingCounts[5]).toBe(1)
    expect(stats.byStatus.Finished).toBe(2)
    expect(stats.year).toBe(2026)
  })

  it('builds a year-in-review with monthly finishes, ratings, and prior year', () => {
    const review = computeYearInReview([
      { id: 'a', title: 'Alpha', author: 'Ann', status: 'Finished', pageCount: 300, rating: 5, finishedAt: '2026-01-15' },
      { id: 'b', title: 'Beta', author: 'Bob', status: 'Finished', pageCount: 120, rating: 4, finishedAt: '2026-01-28' },
      { id: 'c', title: 'Gamma', author: 'Ann', status: 'Finished', pageCount: 200, rating: 3, finishedAt: '2026-06-02' },
      { id: 'd', title: 'Delta', author: 'Dee', status: 'Finished', pageCount: 90, rating: 5, finishedAt: '2025-12-01' },
      { id: 'e', title: 'Reading', author: 'Eve', status: 'Reading', pageCount: 400, currentPage: 40, rating: 0, finishedAt: '' },
    ], 2026)

    expect(review.year).toBe(2026)
    expect(review.finishedCount).toBe(3)
    expect(review.pagesFinished).toBe(620)
    expect(review.previousYearFinished).toBe(1)
    expect(review.monthlyFinished[0]).toBe(2)
    expect(review.monthlyFinished[5]).toBe(1)
    expect(review.averageRating).toBeCloseTo(4)
    expect(review.ratedCount).toBe(3)
    expect(review.ratingCounts[5]).toBe(1)
    expect(review.books.map((book) => book.title)).toEqual(['Gamma', 'Beta', 'Alpha'])
    expect(review.topRated.map((book) => book.title)).toEqual(['Alpha', 'Beta', 'Gamma'])
  })

  it('treats stored calendar dates as calendar dates in negative UTC offsets', () => {
    const originalTimezone = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      const book = { id: 'new-year', title: 'New Year', status: 'Finished', pageCount: 100, finishedAt: '2026-01-01' }
      const stats = computeLibraryStats([book], new Date(2026, 6, 1))
      const review = computeYearInReview([book], 2026)

      expect(stats.finishedThisYear).toBe(1)
      expect(stats.pagesFinishedThisYear).toBe(100)
      expect(review.finishedCount).toBe(1)
      expect(review.monthlyFinished[0]).toBe(1)
      expect(review.previousYearFinished).toBe(0)
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimezone
    }
  })
})

describe('reading goals', () => {
  beforeEach(() => {
    const store = new Map()
    const storage = {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => { store.set(key, String(value)) },
      removeItem: (key) => { store.delete(key) },
    }
    vi.stubGlobal('window', { localStorage: storage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('normalizes goals and clamps invalid values', () => {
    expect(normalizeReadingGoals(null)).toEqual({ books: 0, pages: 0 })
    expect(normalizeReadingGoals({ books: 24.6, pages: '10000' })).toEqual({ books: 25, pages: 10000 })
    expect(normalizeReadingGoals({ books: -3, pages: -1 })).toEqual({ books: 0, pages: 0 })
  })

  it('persists goals per calendar year', () => {
    expect(loadReadingGoals(2026)).toEqual({ books: 0, pages: 0 })
    expect(saveReadingGoals(2026, { books: 24, pages: 8000 })).toBe(true)
    expect(loadReadingGoals(2026)).toEqual({ books: 24, pages: 8000 })
    expect(loadReadingGoals(2025)).toEqual({ books: 0, pages: 0 })
    expect(saveReadingGoals(2025, { books: 12, pages: 0 })).toBe(true)
    expect(loadReadingGoals(2025)).toEqual({ books: 12, pages: 0 })
    expect(loadReadingGoals(2026)).toEqual({ books: 24, pages: 8000 })
  })

  it('reports a storage failure instead of claiming goals were saved', () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => { throw new Error('storage unavailable') },
      },
    })

    expect(saveReadingGoals(2026, { books: 24, pages: 8000 })).toBe(false)
  })

  it('computes goal progress including met and inactive states', () => {
    expect(computeGoalProgress(5, 0)).toEqual({
      active: false, current: 5, target: 0, ratio: 0, remaining: 0, met: false,
    })
    expect(computeGoalProgress(6, 12)).toEqual({
      active: true, current: 6, target: 12, ratio: 0.5, remaining: 6, met: false,
    })
    expect(computeGoalProgress(15, 12)).toMatchObject({
      active: true, current: 15, target: 12, ratio: 1, remaining: 0, met: true,
    })
  })
})

describe('csv and json import', () => {
  it('imports a Goodreads-style CSV export onto the default shelf', () => {
    const csv = [
      'Title,Author,ISBN13,My Rating,Exclusive Shelf,Date Read,Date Added,Number of Pages,Bookshelves,My Review',
      '"Dune","Frank Herbert","9780441172719",5,read,2026/01/15,2025/12/01,412,"sci-fi, classics","Epic."',
      '"Unread Book","Someone","9780141439518",0,to-read,,2026/02/01,200,tbr,',
      '"Current","Writer","",4,currently-reading,,2026/03/01,350,,',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.count).toBe(3)
    expect(result.format).toBe('csv')
    expect(result.shelves[0].id).toBe(DEFAULT_SHELF_ID)
    expect(result.books[0]).toEqual(expect.objectContaining({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'Finished',
      rating: 5,
      pageCount: 412,
      finishedAt: '2026-01-15',
      notes: 'Epic.',
      tags: ['sci-fi', 'classics'],
      shelfId: DEFAULT_SHELF_ID,
    }))
    expect(result.books[1].status).toBe('Want to Read')
    expect(result.books[2].status).toBe('Reading')
  })

  it('routes csv and json through parseLibraryFile', () => {
    const csv = 'Title,Author\n"Hello","World"\n'
    expect(parseLibraryFile(csv, 'export.csv').books[0].title).toBe('Hello')

    const json = JSON.stringify([{ title: 'JSON Book', author: 'A' }])
    expect(parseLibraryFile(json, 'library.json').books[0].title).toBe('JSON Book')
  })

  it('round-trips multi-shelf export JSON', () => {
    const payload = {
      format: 'bookshelf-library',
      version: 2,
      books: [
        { id: 'a', title: 'A', author: 'X', shelfId: 'fiction' },
        { id: 'b', title: 'B', author: 'Y', shelfId: 'library' },
      ],
      shelves: [
        { id: 'library', name: 'Library', x: 0, z: 0, yaw: 0, width: 7.6, rows: 4 },
        { id: 'fiction', name: 'Fiction', x: 10, z: 2, yaw: 0.5, width: 5, rows: 3 },
      ],
    }
    const result = parseLibraryImport(JSON.stringify(payload))
    expect(result.shelves).toHaveLength(2)
    expect(result.books.find((book) => book.id === 'a').shelfId).toBe('fiction')
    expect(result.shelves.find((shelf) => shelf.id === 'fiction').name).toBe('Fiction')
  })

  it('rejects duplicate shelf IDs during JSON import', () => {
    const payload = {
      format: 'bookshelf-library',
      version: 2,
      books: [{ id: 'book', title: 'Book', shelfId: 'same' }],
      shelves: [
        { id: 'same', name: 'One' },
        { id: 'same', name: 'Two' },
      ],
    }

    expect(() => parseLibraryImport(JSON.stringify(payload))).toThrow(/duplicate shelf IDs/i)
  })

  it('repairs duplicate shelf IDs in persisted state without duplicate cases', () => {
    const state = normalizeLibraryState({
      books: [{ id: 'book', title: 'Book', shelfId: 'same' }],
      shelves: [
        { id: 'same', name: 'One' },
        { id: 'same', name: 'Two' },
      ],
    })

    expect(new Set(state.shelves.map((shelf) => shelf.id)).size).toBe(2)
    expect(state.books[0].shelfId).toBe('same')
  })

  it('maps status from multi-value Bookshelves when Exclusive Shelf is absent', () => {
    const csv = [
      'Title,Author,Bookshelves',
      '"Reading Now","A","currently-reading, fantasy"',
      '"Done","B","read, favorites"',
      '"Queued","C","to-read, tbr"',
      '"Tags only","D","sci-fi, classics"',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.books.map((book) => book.status)).toEqual([
      'Reading',
      'Finished',
      'Want to Read',
      'Want to Read',
    ])
    // Exclusive shelf tokens are not stored as free-form tags.
    expect(result.books[0].tags).toEqual(['fantasy'])
    expect(result.books[1].tags).toEqual(['favorites'])
    expect(result.books[2].tags).toEqual(['tbr'])
    expect(result.books[3].tags).toEqual(['sci-fi', 'classics'])
  })

  it('parses page counts with thousands separators', () => {
    const csv = [
      'Title,Author,Number of Pages',
      '"Long Book","A","1,024"',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.books[0].pageCount).toBe(1024)
  })

  it('prefers Exclusive Shelf over Bookshelves for status', () => {
    const csv = [
      'Title,Author,Exclusive Shelf,Bookshelves',
      '"Still reading","A","currently-reading","read, favorites"',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.books[0].status).toBe('Reading')
  })

  it('stores only checksum-valid ISBNs from CSV', () => {
    const csv = [
      'Title,Author,ISBN13',
      '"Valid","A","9780441172719"',
      '"Invalid checksum","B","9780441172710"',
      '"Short","C","12345"',
      '"Long garbage","D","1234567890123"',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.books[0].isbn).toBe('9780441172719')
    expect(result.books[1].isbn).toBe('')
    expect(result.books[2].isbn).toBe('')
    expect(result.books[3].isbn).toBe('')
  })
})

describe('merge import', () => {
  it('updates matched books and appends new ones', () => {
    const current = normalizeLibraryState({
      books: [
        {
          id: 'keep-me',
          title: 'Dune',
          author: 'Frank Herbert',
          status: 'Want to Read',
          notes: 'Mine',
          isbn: '9780441172719',
          shelfId: DEFAULT_SHELF_ID,
        },
      ],
      shelves: [createDefaultShelf()],
    })
    const incoming = normalizeLibraryState({
      books: [
        {
          id: 'other-id',
          title: 'Dune',
          author: 'Frank Herbert',
          status: 'Finished',
          notes: '',
          rating: 5,
          isbn: '9780441172719',
          shelfId: DEFAULT_SHELF_ID,
        },
        {
          id: 'new-book',
          title: 'Neuromancer',
          author: 'William Gibson',
          status: 'Reading',
          shelfId: DEFAULT_SHELF_ID,
        },
      ],
      shelves: [createDefaultShelf()],
    })

    const result = mergeLibraryStates(current, incoming)
    expect(result.added).toBe(1)
    expect(result.updated).toBe(1)
    expect(result.total).toBe(2)
    const dune = result.books.find((book) => book.id === 'keep-me')
    expect(dune.status).toBe('Finished')
    expect(dune.rating).toBe(5)
    expect(dune.notes).toBe('Mine')
    expect(result.books.some((book) => book.title === 'Neuromancer')).toBe(true)
  })

  it('adds unknown shelves from the import', () => {
    const current = createLibraryState()
    const extra = createShelf({ id: 'sci-fi', name: 'Sci-Fi', x: 12, z: 0 }, 1)
    const incoming = {
      books: [{ id: 'a', title: 'A', author: 'B', shelfId: 'sci-fi' }],
      shelves: [createDefaultShelf(), extra],
    }
    const result = mergeLibraryStates(current, incoming)
    expect(result.shelves.some((shelf) => shelf.id === 'sci-fi')).toBe(true)
    expect(result.books.some((book) => book.shelfId === 'sci-fi' && book.title === 'A')).toBe(true)
  })

  it('reindexes ISBN after match-by-id so later rows do not duplicate', () => {
    const current = normalizeLibraryState({
      books: [{
        id: 'keep',
        title: 'Dune',
        author: 'Frank Herbert',
        isbn: '',
        shelfId: DEFAULT_SHELF_ID,
      }],
      shelves: [createDefaultShelf()],
    })
    const incoming = normalizeLibraryState({
      books: [
        {
          id: 'keep',
          title: 'Dune',
          author: 'Frank Herbert',
          isbn: '9780441172719',
          shelfId: DEFAULT_SHELF_ID,
        },
        {
          id: 'dup-row',
          title: 'Dune (alt)',
          author: 'Someone Else',
          isbn: '9780441172719',
          rating: 4,
          shelfId: DEFAULT_SHELF_ID,
        },
      ],
      shelves: [createDefaultShelf()],
    })
    const result = mergeLibraryStates(current, incoming)
    expect(result.books.filter((book) => book.isbn === '9780441172719')).toHaveLength(1)
    expect(result.updated).toBe(2)
    expect(result.added).toBe(0)
    expect(result.books.find((book) => book.id === 'keep').rating).toBe(4)
  })

  it('appends differing notes instead of dropping import text', () => {
    expect(mergeNotes('Local note', 'Imported note')).toContain('Local note')
    expect(mergeNotes('Local note', 'Imported note')).toContain('Imported note')
    expect(mergeNotes('Same', 'Same')).toBe('Same')
    const merged = mergeBookRecords(
      { id: '1', title: 'T', author: 'A', notes: 'Mine', shelfId: DEFAULT_SHELF_ID },
      { id: '1', title: 'T', author: 'A', notes: 'Theirs', shelfId: DEFAULT_SHELF_ID },
    )
    expect(merged.notes).toContain('Mine')
    expect(merged.notes).toContain('Theirs')
  })

  it('caps long title, tags, and quotes on normalize', () => {
    const long = 'x'.repeat(2000)
    const state = normalizeLibraryState({
      books: [{
        id: long,
        title: long,
        author: long,
        tags: Array.from({ length: 80 }, (_, i) => `tag-${i}-${long}`),
        quotes: Array.from({ length: 80 }, () => long),
        notes: long + long,
        shelfId: DEFAULT_SHELF_ID,
      }],
      shelves: [createDefaultShelf()],
    })
    const book = state.books[0]
    expect(book.id.length).toBeLessThanOrEqual(120)
    expect(book.title.length).toBeLessThanOrEqual(500)
    expect(book.author.length).toBeLessThanOrEqual(500)
    expect(book.tags.length).toBeLessThanOrEqual(40)
    expect(book.quotes.length).toBeLessThanOrEqual(50)
    expect(book.notes.length).toBeLessThanOrEqual(20000)
  })
})

describe('backup reminders', () => {
  let storage

  beforeEach(() => {
    storage = makeStorage()
    vi.stubGlobal('window', { localStorage: storage })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reminds when there are books and no backup yet', () => {
    expect(shouldRemindLibraryBackup({ bookCount: 3, now: 1_000_000 })).toBe(true)
    expect(shouldRemindLibraryBackup({ bookCount: 0, now: 1_000_000 })).toBe(false)
  })

  it('stops reminding after backup or dismiss', () => {
    const now = Date.parse('2026-07-16T12:00:00.000Z')
    markLibraryBackupDone(now)
    expect(shouldRemindLibraryBackup({ bookCount: 5, now })).toBe(false)
    expect(shouldRemindLibraryBackup({
      bookCount: 5,
      now: now + 8 * 24 * 60 * 60 * 1000,
    })).toBe(true)

    dismissLibraryBackupReminder(7, now + 8 * 24 * 60 * 60 * 1000)
    expect(shouldRemindLibraryBackup({
      bookCount: 5,
      now: now + 8 * 24 * 60 * 60 * 1000,
    })).toBe(false)
  })
})

describe('room presets', () => {
  it('lays shelves along a wall and preserves book membership', () => {
    const shelves = [
      createDefaultShelf(),
      createShelf({ id: 'b', name: 'B', width: 5 }, 1),
      createShelf({ id: 'c', name: 'C', width: 5 }, 2),
    ]
    const books = [
      { id: '1', title: 'One', author: 'A', shelfId: DEFAULT_SHELF_ID },
      { id: '2', title: 'Two', author: 'A', shelfId: 'b' },
    ]
    const result = applyRoomPreset({ books, shelves }, 'wall')
    expect(result.ok).toBe(true)
    expect(result.shelves).toHaveLength(3)
    expect(result.shelves.every((shelf) => shelf.z === -2 && shelf.yaw === 0)).toBe(true)
    expect(result.books.map((book) => book.shelfId)).toEqual([DEFAULT_SHELF_ID, 'b'])
    // Spaced left-to-right without overlap centers.
    const xs = result.shelves.map((shelf) => shelf.x)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
  })

  it('builds an L-shape with a right wing for extra cases', () => {
    const shelves = [
      createDefaultShelf(),
      createShelf({ id: 'b', name: 'B' }, 1),
      createShelf({ id: 'c', name: 'C' }, 2),
    ]
    const result = applyRoomPreset({ books: [], shelves }, 'l-shape')
    expect(result.ok).toBe(true)
    const wing = result.shelves.filter((shelf) => Math.abs(shelf.yaw + Math.PI / 2) < 1e-6)
    expect(wing.length).toBeGreaterThan(0)
  })

  it('gallery places facing rows when there are enough shelves', () => {
    const shelves = [
      createDefaultShelf(),
      createShelf({ id: 'b', name: 'B' }, 1),
      createShelf({ id: 'c', name: 'C' }, 2),
      createShelf({ id: 'd', name: 'D' }, 3),
    ]
    const result = applyRoomPreset({ books: [], shelves }, 'gallery')
    expect(result.ok).toBe(true)
    expect(result.shelves.some((shelf) => shelf.yaw === 0)).toBe(true)
    expect(result.shelves.some((shelf) => Math.abs(shelf.yaw - Math.PI) < 1e-6)).toBe(true)
  })

  it('scales oversized layouts into the walkable room', () => {
    const shelves = Array.from({ length: 12 }, (_, index) => (
      createShelf({ id: `s${index}`, name: `S${index}`, width: SHELF_WIDTH_MAX }, index)
    ))
    const result = applyRoomPreset({ books: [], shelves }, 'wall')
    expect(result.ok).toBe(true)
    expect(result.scaled).toBe(true)
    for (const shelf of result.shelves) {
      expect(Math.abs(shelf.x)).toBeLessThanOrEqual(ROOM_LAYOUT_BOUND + 1)
      expect(Math.abs(shelf.z)).toBeLessThanOrEqual(ROOM_LAYOUT_BOUND + 1)
    }
    const clamped = clampShelvesToRoom([
      { id: 'far', name: 'Far', x: 200, z: 200, yaw: 0, width: 8, rows: 4 },
    ])
    expect(clamped.adjusted).toBe(true)
    expect(Math.abs(clamped.shelves[0].x)).toBeLessThan(ROOM_LAYOUT_BOUND)
    expect(Math.abs(clamped.shelves[0].z)).toBeLessThan(ROOM_LAYOUT_BOUND)
  })
})
