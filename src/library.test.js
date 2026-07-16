import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addEmptyShelf,
  applyShelfTransform,
  booksFitOnShelf,
  booksOnShelf,
  bookWorldFocusPosition,
  buildShelfBooks,
  buildShelfCaseLayout,
  computeLibraryStats,
  createDefaultShelf,
  createLibrary,
  createLibraryState,
  DEFAULT_SHELF_ID,
  deleteEmptyShelf,
  ensureLibraryCapacity,
  loadLibrary,
  loadLibraryState,
  normalizeLibraryState,
  parseLibraryCsv,
  parseLibraryFile,
  parseLibraryImport,
  reorderBookOnShelf,
  saveLibrary,
  saveLibraryState,
  SHELF_ROWS_MAX,
  SHELF_WIDTH_MAX,
  sortLibrary,
  tryReorderBookOnShelf,
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
    expect(stats.averageRating).toBe(4)
    expect(stats.ratedCount).toBe(2)
    expect(stats.ratingCounts[5]).toBe(1)
    expect(stats.byStatus.Finished).toBe(2)
    expect(stats.year).toBe(2026)
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
