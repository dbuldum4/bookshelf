import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildShelfBooks,
  computeLibraryStats,
  createLibrary,
  loadLibrary,
  parseLibraryCsv,
  parseLibraryFile,
  saveLibrary,
  sortLibrary,
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

  it('saves and reloads a normalized library', () => {
    const books = [{ id: 'test', title: '  Test Book  ', author: 'Author', status: 'Reading', currentPage: 25, pageCount: 20, tags: [' sci-fi ', 'sci-fi'] }]

    expect(saveLibrary(books)).toBe(true)
    expect(loadLibrary()).toEqual([
      expect.objectContaining({ id: 'test', title: 'Test Book', currentPage: 20, pageCount: 20, tags: ['sci-fi'] }),
    ])
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
    }))
  })

  it('falls back safely when storage cannot be read or written', () => {
    storage.getItem.mockImplementation(() => { throw new Error('blocked') })
    storage.setItem.mockImplementation(() => { throw new Error('full') })

    expect(loadLibrary()).toHaveLength(createLibrary().length)
    expect(saveLibrary([])).toBe(false)
  })
})

describe('shelf layout', () => {
  it('is deterministic, paged in tens, centered, and non-overlapping', () => {
    const library = createLibrary()
    const first = buildShelfBooks(library, 1)
    const second = buildShelfBooks(library, 1)

    expect(first).toEqual(second)
    expect(first).toHaveLength(10)
    expect(first[0].id).toBe(library[10].id)

    for (let index = 1; index < first.length; index += 1) {
      const previousRight = first[index - 1].position[0] + first[index - 1].width / 2
      const currentLeft = first[index].position[0] - first[index].width / 2
      expect(currentLeft).toBeGreaterThan(previousRight)
    }

    const leftEdge = first[0].position[0] - first[0].width / 2
    const last = first[first.length - 1]
    const rightEdge = last.position[0] + last.width / 2
    expect(leftEdge + rightEdge).toBeCloseTo(0, 10)
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

describe('csv import', () => {
  it('imports a Goodreads-style CSV export', () => {
    const csv = [
      'Title,Author,ISBN13,My Rating,Exclusive Shelf,Date Read,Date Added,Number of Pages,Bookshelves,My Review',
      '"Dune","Frank Herbert","9780441172719",5,read,2026/01/15,2025/12/01,412,"sci-fi, classics","Epic."',
      '"Unread Book","Someone","9780141439518",0,to-read,,2026/02/01,200,tbr,',
      '"Current","Writer","",4,currently-reading,,2026/03/01,350,,',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.count).toBe(3)
    expect(result.format).toBe('csv')
    expect(result.books[0]).toEqual(expect.objectContaining({
      title: 'Dune',
      author: 'Frank Herbert',
      status: 'Finished',
      rating: 5,
      pageCount: 412,
      finishedAt: '2026-01-15',
      notes: 'Epic.',
      tags: ['sci-fi', 'classics'],
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
      // Valid ISBN-13 for Dune
      '"Valid","A","9780441172719"',
      // 13 digits but fails checksum
      '"Invalid checksum","B","9780441172710"',
      // Too short noise
      '"Short","C","12345"',
      // Long but non-ISBN garbage
      '"Long garbage","D","1234567890123"',
    ].join('\n')

    const result = parseLibraryCsv(csv)
    expect(result.books[0].isbn).toBe('9780441172719')
    expect(result.books[1].isbn).toBe('')
    expect(result.books[2].isbn).toBe('')
    expect(result.books[3].isbn).toBe('')
  })
})
