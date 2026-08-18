import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultShelf, DEFAULT_SHELF_ID, loadLibraryState, saveLibraryState } from './library'
import {
  deserializeLibraryState,
  LIBRARY_STORAGE_KEY,
  librarySavedAt,
  loadLibraryStateAsync,
  readLibraryFromIndexedDB,
  serializeLibraryState,
  writeLibraryToIndexedDB,
} from './libraryStorage'

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key) => values.get(key) ?? null),
    setItem: vi.fn((key, value) => values.set(key, String(value))),
    removeItem: vi.fn((key) => values.delete(key)),
    values,
  }
}

function createRequest() {
  return {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  }
}

function succeed(request, result) {
  request.result = result
  queueMicrotask(() => request.onsuccess?.({ target: request }))
}

function createMemoryIndexedDB() {
  const databases = new Map()

  return {
    open(name, version = 1) {
      const request = createRequest()
      queueMicrotask(() => {
        let entry = databases.get(name)
        const oldVersion = entry?.version ?? 0
        if (!entry) {
          entry = { version, stores: new Map() }
          databases.set(name, entry)
        }
        if (version > entry.version) entry.version = version

        const db = {
          name,
          version: entry.version,
          objectStoreNames: {
            contains: (storeName) => entry.stores.has(storeName),
          },
          createObjectStore(storeName) {
            if (!entry.stores.has(storeName)) entry.stores.set(storeName, new Map())
            return {}
          },
          close() {},
          transaction(storeName) {
            if (!entry.stores.has(storeName)) throw new Error(`Missing store ${storeName}`)
            const store = entry.stores.get(storeName)
            const tx = {
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore() {
                return {
                  get(key) {
                    const req = createRequest()
                    succeed(req, store.has(key) ? store.get(key) : undefined)
                    return req
                  },
                  put(value, key) {
                    const req = createRequest()
                    store.set(key, value)
                    succeed(req, key)
                    queueMicrotask(() => tx.oncomplete?.({ target: tx }))
                    return req
                  },
                }
              },
            }
            return tx
          },
        }

        request.result = db
        if (oldVersion < version) {
          request.onupgradeneeded?.({ target: request, oldVersion, newVersion: version })
        }
        request.onsuccess?.({ target: request })
      })
      return request
    },
  }
}

function createFailingIndexedDB(mode = 'request-error') {
  return {
    open() {
      if (mode === 'throw') throw new Error('indexedDB blocked')
      const request = createRequest()
      request.error = new Error('indexedDB failed')
      queueMicrotask(() => request.onerror?.({ target: request }))
      return request
    },
  }
}

function sampleState(overrides = {}) {
  return {
    books: [{ id: 'dune', title: 'Dune', author: 'Frank Herbert', shelfId: DEFAULT_SHELF_ID }],
    shelves: [createDefaultShelf()],
    ...overrides,
  }
}

describe('serialize helpers', () => {
  it('serializes books, shelves, and a savedAt timestamp', () => {
    const raw = serializeLibraryState(sampleState(), 1_700_000_000_000)
    const parsed = JSON.parse(raw)
    expect(parsed.books[0].id).toBe('dune')
    expect(parsed.shelves[0].id).toBe(DEFAULT_SHELF_ID)
    expect(parsed.savedAt).toBe(1_700_000_000_000)
  })

  it('round-trips a snapshot through deserializeLibraryState', () => {
    const raw = serializeLibraryState(sampleState({ savedAt: 42 }), 42)
    expect(deserializeLibraryState(raw)).toEqual({
      books: sampleState().books,
      shelves: sampleState().shelves,
      savedAt: 42,
    })
  })

  it('deserializes an already-parsed record and a legacy book array', () => {
    expect(deserializeLibraryState({
      books: sampleState().books,
      shelves: sampleState().shelves,
      savedAt: '99',
    })).toMatchObject({ savedAt: 99, books: sampleState().books })
    expect(deserializeLibraryState([{ id: 'legacy', title: 'Old' }])).toEqual({
      books: [{ id: 'legacy', title: 'Old' }],
      shelves: [],
      savedAt: 0,
    })
  })

  it('returns null for invalid JSON or a corrupt shape', () => {
    expect(deserializeLibraryState('{not-json')).toBeNull()
    expect(deserializeLibraryState(JSON.stringify({ books: 'nope' }))).toBeNull()
    expect(deserializeLibraryState('')).toBeNull()
    expect(deserializeLibraryState(null)).toBeNull()
  })

  it('reads savedAt with a numeric fallback', () => {
    expect(librarySavedAt({ savedAt: 12 })).toBe(12)
    expect(librarySavedAt({}, 7)).toBe(7)
    expect(librarySavedAt(null)).toBe(0)
  })
})

describe('IDB-fail fallback', () => {
  let storage

  beforeEach(() => {
    storage = makeStorage()
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('indexedDB', undefined)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saveLibraryState still writes localStorage when IndexedDB is missing', () => {
    expect(saveLibraryState(sampleState())).toBe(true)
    const stored = JSON.parse(storage.values.get(LIBRARY_STORAGE_KEY))
    expect(stored.books[0].title).toBe('Dune')
    expect(typeof stored.savedAt).toBe('number')
    expect(loadLibraryState().books[0].id).toBe('dune')
  })

  it('saveLibraryState returns false when localStorage quota is exceeded', () => {
    storage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(saveLibraryState(sampleState())).toBe(false)
  })

  it('loadLibraryStateAsync falls back to localStorage when IndexedDB is missing', async () => {
    saveLibraryState(sampleState())
    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].id).toBe('dune')
    expect(loaded.shelves[0].id).toBe(DEFAULT_SHELF_ID)
  })

  it('loadLibraryStateAsync falls back to localStorage when IndexedDB open fails', async () => {
    const failing = createFailingIndexedDB('throw')
    vi.stubGlobal('window', { localStorage: storage, indexedDB: failing })
    vi.stubGlobal('indexedDB', failing)
    saveLibraryState(sampleState())

    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].title).toBe('Dune')
  })

  it('loadLibraryStateAsync falls back to localStorage when IndexedDB requests error', async () => {
    const failing = createFailingIndexedDB('request-error')
    vi.stubGlobal('window', { localStorage: storage, indexedDB: failing })
    vi.stubGlobal('indexedDB', failing)
    saveLibraryState(sampleState())

    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].id).toBe('dune')
  })
})

describe('IndexedDB persistence', () => {
  let storage
  let memoryIdb

  beforeEach(() => {
    storage = makeStorage()
    memoryIdb = createMemoryIndexedDB()
    vi.stubGlobal('window', { localStorage: storage, indexedDB: memoryIdb })
    vi.stubGlobal('indexedDB', memoryIdb)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saveLibraryState writes both localStorage and IndexedDB', async () => {
    expect(saveLibraryState(sampleState())).toBe(true)
    const fromIdb = await vi.waitFor(() => readLibraryFromIndexedDB().then((record) => {
      expect(record?.books[0].id).toBe('dune')
      return record
    }))
    expect(fromIdb.savedAt).toBeGreaterThan(0)
    expect(JSON.parse(storage.values.get(LIBRARY_STORAGE_KEY)).savedAt).toBe(fromIdb.savedAt)
  })

  it('loadLibraryStateAsync migrates localStorage into IndexedDB', async () => {
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(sampleState(), 50))
    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].id).toBe('dune')

    const migrated = await readLibraryFromIndexedDB()
    expect(migrated.books[0].id).toBe('dune')
    expect(migrated.savedAt).toBe(50)
  })

  it('loadLibraryStateAsync prefers the IndexedDB snapshot when one exists', async () => {
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(sampleState({
      books: [{ id: 'older', title: 'Local', author: 'A', shelfId: DEFAULT_SHELF_ID }],
    }), 10))
    await writeLibraryToIndexedDB({
      books: [{ id: 'newer', title: 'Indexed', author: 'B', shelfId: DEFAULT_SHELF_ID }],
      shelves: [createDefaultShelf()],
      savedAt: 99,
    })

    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].id).toBe('newer')
    expect(loaded.savedAt).toBe(99)
  })
})
