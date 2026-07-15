import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildShelfBooks, createLibrary, loadLibrary, saveLibrary } from './library'

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
