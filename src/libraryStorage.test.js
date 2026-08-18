import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultShelf, DEFAULT_SHELF_ID, loadLibraryState, saveLibraryState, saveLibraryStateAsync } from './library'
import {
  deserializeLibraryState,
  LIBRARY_IDB_OPEN_TIMEOUT_MS,
  LIBRARY_STORAGE_KEY,
  librarySavedAt,
  loadLibraryStateAsync,
  markLibraryLoadPending,
  readLibraryFromIndexedDB,
  resetLibraryPersistence,
  resolveHydratedLibraryState,
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
    onblocked: null,
  }
}

function createMemoryIndexedDB({ putDelay } = {}) {
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
            let ops = 0
            let completed = false
            const tx = {
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore() {
                return {
                  get(key) {
                    const req = createRequest()
                    begin()
                    queueMicrotask(() => {
                      req.result = store.has(key) ? store.get(key) : undefined
                      req.onsuccess?.({ target: req })
                      end()
                    })
                    return req
                  },
                  put(value, key) {
                    const req = createRequest()
                    begin()
                    const delay = typeof putDelay === 'function' ? putDelay() : 0
                    const finish = () => {
                      store.set(key, value)
                      req.result = key
                      req.onsuccess?.({ target: req })
                      end()
                    }
                    if (delay > 0) setTimeout(finish, delay)
                    else queueMicrotask(finish)
                    return req
                  },
                }
              },
            }
            function begin() {
              ops += 1
            }
            function end() {
              ops -= 1
              queueMicrotask(() => {
                if (!completed && ops === 0) {
                  completed = true
                  tx.oncomplete?.({ target: tx })
                }
              })
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
      queueMicrotask(() => {
        if (mode === 'blocked') request.onblocked?.({ target: request })
        else request.onerror?.({ target: request })
      })
      return request
    },
  }
}

function createHungIndexedDB() {
  return {
    open() {
      return createRequest()
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

function olderState() {
  return sampleState({
    books: [{ id: 'older', title: 'Local', author: 'A', shelfId: DEFAULT_SHELF_ID }],
  })
}

function newerState() {
  return sampleState({
    books: [{ id: 'newer', title: 'Indexed', author: 'B', shelfId: DEFAULT_SHELF_ID }],
  })
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

describe('resolveHydratedLibraryState', () => {
  const initial = { ...olderState(), savedAt: 10 }
  const remote = { ...newerState(), savedAt: 99 }

  it('adopts a newer IDB snapshot when the user has not edited', () => {
    expect(resolveHydratedLibraryState({
      initial,
      current: initial,
      remote,
    }).books[0].id).toBe('newer')
  })

  it('rebases in-flight edits onto a newer IDB snapshot instead of dropping them', () => {
    const current = {
      ...initial,
      books: [{ ...initial.books[0], title: 'Edited stale copy' }],
    }
    const resolved = resolveHydratedLibraryState({ initial, current, remote })
    expect(resolved.books.find((book) => book.id === 'older')?.title).toBe('Edited stale copy')
    expect(resolved.books.find((book) => book.id === 'newer')?.title).toBe('Indexed')
    expect(resolved.savedAt).toBeGreaterThanOrEqual(99)
  })

  it('keeps the edited book when that id also exists on the newer remote', () => {
    const shared = {
      books: [{ id: 'dune', title: 'Dune', author: 'A', shelfId: DEFAULT_SHELF_ID }],
      shelves: [createDefaultShelf()],
      savedAt: 10,
    }
    const current = {
      ...shared,
      books: [{ id: 'dune', title: 'Dune annotated', author: 'A', shelfId: DEFAULT_SHELF_ID }],
    }
    const remote = {
      books: [
        { id: 'dune', title: 'Dune', author: 'A', shelfId: DEFAULT_SHELF_ID, notes: 'other tab' },
        { id: 'other', title: 'New', author: 'B', shelfId: DEFAULT_SHELF_ID },
      ],
      shelves: shared.shelves,
      savedAt: 99,
    }
    const resolved = resolveHydratedLibraryState({ initial: shared, current, remote })
    expect(resolved.books.find((book) => book.id === 'dune')?.title).toBe('Dune annotated')
    expect(resolved.books.find((book) => book.id === 'other')?.title).toBe('New')
  })

  it('keeps a deletion made during hydrate and still picks up remote-only books', () => {
    const bookA = { id: 'a', title: 'A', author: 'A', shelfId: DEFAULT_SHELF_ID }
    const bookB = { id: 'b', title: 'B', author: 'B', shelfId: DEFAULT_SHELF_ID }
    const bookC = { id: 'c', title: 'C', author: 'C', shelfId: DEFAULT_SHELF_ID }
    const start = { books: [bookA, bookB], shelves: [createDefaultShelf()], savedAt: 10 }
    const current = { ...start, books: [bookA] }
    const remote = { books: [bookA, bookB, bookC], shelves: start.shelves, savedAt: 99 }
    const resolved = resolveHydratedLibraryState({ initial: start, current, remote })
    expect(resolved.books.map((book) => book.id)).toEqual(['a', 'c'])
  })

  it('does not discard a user edit when IDB is not newer', () => {
    const current = {
      ...initial,
      books: [{ ...initial.books[0], title: 'Edited' }],
    }
    const resolved = resolveHydratedLibraryState({
      initial,
      current,
      remote: { ...initial, savedAt: 10 },
    })
    expect(resolved.books[0].title).toBe('Edited')
  })

  it('keeps the in-memory state when IDB is missing', () => {
    const current = {
      ...initial,
      books: [{ ...initial.books[0], title: 'Edited' }],
    }
    expect(resolveHydratedLibraryState({
      initial,
      current,
      remote: null,
    }).books[0].title).toBe('Edited')
  })
})

describe('IDB-fail fallback', () => {
  let storage

  beforeEach(() => {
    storage = makeStorage()
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('indexedDB', undefined)
    resetLibraryPersistence()
  })

  afterEach(() => {
    resetLibraryPersistence()
    vi.useRealTimers()
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

  it('loadLibraryStateAsync falls back to localStorage when IndexedDB is blocked', async () => {
    const failing = createFailingIndexedDB('blocked')
    vi.stubGlobal('window', { localStorage: storage, indexedDB: failing })
    vi.stubGlobal('indexedDB', failing)
    saveLibraryState(sampleState())

    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].id).toBe('dune')
  })

  it('loadLibraryStateAsync proceeds with localStorage if IndexedDB open hangs', async () => {
    vi.useFakeTimers()
    const hung = createHungIndexedDB()
    vi.stubGlobal('window', { localStorage: storage, indexedDB: hung })
    vi.stubGlobal('indexedDB', hung)
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(sampleState(), 10))

    const pending = loadLibraryStateAsync()
    await vi.advanceTimersByTimeAsync(LIBRARY_IDB_OPEN_TIMEOUT_MS)
    const loaded = await pending
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
    resetLibraryPersistence()
  })

  afterEach(() => {
    resetLibraryPersistence()
    vi.useRealTimers()
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
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(olderState(), 10))
    await writeLibraryToIndexedDB({
      ...newerState(),
      savedAt: 99,
    })

    const loaded = await loadLibraryStateAsync()
    expect(loaded.books[0].id).toBe('newer')
    expect(loaded.savedAt).toBe(99)
  })

  it('hydrate-then-save does not overwrite newer IDB with older LS', async () => {
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(olderState(), 10))
    await writeLibraryToIndexedDB({ ...newerState(), savedAt: 99 })

    markLibraryLoadPending(10)
    const initial = loadLibraryState()
    expect(initial.books[0].id).toBe('older')

    const remote = await loadLibraryStateAsync()
    const resolved = resolveHydratedLibraryState({ initial, current: initial, remote })
    expect(resolved.books[0].id).toBe('newer')

    await saveLibraryStateAsync(resolved)
    const idb = await readLibraryFromIndexedDB()
    expect(idb.books[0].id).toBe('newer')
    expect(idb.savedAt).toBeGreaterThanOrEqual(99)
  })

  it('does not persist a pre-hydrate edit over a newer IDB snapshot', async () => {
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(olderState(), 10))
    await writeLibraryToIndexedDB({ ...newerState(), savedAt: 99 })

    markLibraryLoadPending(10)
    const initial = loadLibraryState()
    const edited = {
      ...initial,
      books: [{ ...initial.books[0], title: 'Edited stale copy' }],
    }

    await saveLibraryStateAsync(edited)
    const idb = await readLibraryFromIndexedDB()
    expect(idb.books[0].id).toBe('newer')
    expect(idb.books[0].title).toBe('Indexed')
    expect(idb.savedAt).toBe(99)

    const remote = await loadLibraryStateAsync()
    const resolved = resolveHydratedLibraryState({ initial, current: edited, remote })
    expect(resolved.books[0].id).toBe('newer')
  })

  it('does not discard a user edit before hydrate when IDB is not newer', async () => {
    storage.values.set(LIBRARY_STORAGE_KEY, serializeLibraryState(sampleState(), 50))
    await writeLibraryToIndexedDB({ ...sampleState(), savedAt: 50 })

    markLibraryLoadPending(50)
    const initial = loadLibraryState()
    const edited = {
      ...initial,
      books: [{ ...initial.books[0], title: 'Edited' }],
    }

    const remote = await loadLibraryStateAsync()
    const resolved = resolveHydratedLibraryState({ initial, current: edited, remote })
    expect(resolved.books[0].title).toBe('Edited')

    expect(await saveLibraryStateAsync(resolved)).toBe(true)
    const idb = await readLibraryFromIndexedDB()
    expect(idb.books[0].title).toBe('Edited')
  })

  it('refuses to put an older savedAt over a newer IndexedDB snapshot', async () => {
    await writeLibraryToIndexedDB({ ...newerState(), savedAt: 99 })
    expect(await writeLibraryToIndexedDB({ ...olderState(), savedAt: 10 })).toBe(false)
    const idb = await readLibraryFromIndexedDB()
    expect(idb.books[0].id).toBe('newer')
    expect(idb.savedAt).toBe(99)
  })

  it('keeps the latest IndexedDB write when puts would complete out of order', async () => {
    let putCount = 0
    const delayed = createMemoryIndexedDB({
      putDelay: () => {
        putCount += 1
        return putCount === 1 ? 30 : 0
      },
    })
    vi.stubGlobal('window', { localStorage: storage, indexedDB: delayed })
    vi.stubGlobal('indexedDB', delayed)
    resetLibraryPersistence()

    const first = writeLibraryToIndexedDB({ ...olderState(), savedAt: 1 })
    const second = writeLibraryToIndexedDB({ ...newerState(), savedAt: 2 })
    await Promise.all([first, second])

    const record = await readLibraryFromIndexedDB()
    expect(record.books[0].id).toBe('newer')
    expect(record.savedAt).toBe(2)
  })

  it('saveLibraryStateAsync succeeds when localStorage is full but IndexedDB writes', async () => {
    storage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(await saveLibraryStateAsync(sampleState())).toBe(true)
    const fromIdb = await readLibraryFromIndexedDB()
    expect(fromIdb.books[0].id).toBe('dune')
  })
})
