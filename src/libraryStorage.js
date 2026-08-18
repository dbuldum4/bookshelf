export const LIBRARY_STORAGE_KEY = 'bookshelf-library-v3'
export const LEGACY_STORAGE_KEY_V2 = 'bookshelf-library-v2'
export const LEGACY_STORAGE_KEY_V1 = 'bookshelf-library-v1'

export const LIBRARY_IDB_NAME = 'bookshelf'
export const LIBRARY_IDB_STORE = 'kv'
export const LIBRARY_IDB_KEY = 'library'
const LIBRARY_IDB_VERSION = 1

export function librarySavedAt(value, fallback = 0) {
  return toTimestamp(value?.savedAt, fallback)
}

export function serializeLibraryState(state, savedAt = Date.now()) {
  return JSON.stringify({
    books: Array.isArray(state?.books) ? state.books : [],
    shelves: Array.isArray(state?.shelves) ? state.shelves : [],
    savedAt: toTimestamp(savedAt, Date.now()),
  })
}

export function deserializeLibraryState(raw) {
  if (raw == null || raw === '') return null

  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return null
    }
  }

  if (Array.isArray(parsed)) {
    return { books: parsed, shelves: [], savedAt: 0 }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed.books) === false) {
    return null
  }

  return {
    books: parsed.books,
    shelves: Array.isArray(parsed.shelves) ? parsed.shelves : [],
    savedAt: toTimestamp(parsed.savedAt, 0),
  }
}

export function isIndexedDBAvailable() {
  return Boolean(getIndexedDB())
}

export async function readLibraryFromIndexedDB() {
  const db = await openLibraryDb()
  if (!db) return null
  try {
    const raw = await new Promise((resolve, reject) => {
      const tx = db.transaction(LIBRARY_IDB_STORE, 'readonly')
      const request = tx.objectStore(LIBRARY_IDB_STORE).get(LIBRARY_IDB_KEY)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    return deserializeLibraryState(raw ?? null)
  } catch {
    return null
  } finally {
    closeDb(db)
  }
}

export async function writeLibraryToIndexedDB(record) {
  const db = await openLibraryDb()
  if (!db) return false
  const payload = deserializeLibraryState(record)
  if (!payload) return false
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(LIBRARY_IDB_STORE, 'readwrite')
      tx.oncomplete = () => resolve(true)
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
      tx.objectStore(LIBRARY_IDB_STORE).put(payload, LIBRARY_IDB_KEY)
    })
    return true
  } catch {
    return false
  } finally {
    closeDb(db)
  }
}

export async function loadLibraryStateAsync() {
  const { loadLibraryState } = await import('./library.js')
  const localState = loadLibraryState()

  if (!isIndexedDBAvailable()) return localState

  try {
    const idbRecord = await readLibraryFromIndexedDB()
    if (!idbRecord) {
      if (hasStoredLocalLibrary()) {
        await writeLibraryToIndexedDB({
          books: localState.books,
          shelves: localState.shelves,
          savedAt: librarySavedAt(localState) || Date.now(),
        })
      }
      return localState
    }

    const { ensureLibraryCapacity } = await import('./library.js')
    const { books, shelves } = ensureLibraryCapacity(idbRecord)
    return { books, shelves, savedAt: librarySavedAt(idbRecord) }
  } catch {
    return localState
  }
}

function toTimestamp(value, fallback) {
  const timestamp = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(timestamp) ? timestamp : fallback
}

function getIndexedDB() {
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) return indexedDB
    if (typeof globalThis !== 'undefined' && globalThis.indexedDB) return globalThis.indexedDB
    if (typeof window !== 'undefined' && window.indexedDB) return window.indexedDB
  } catch {
    // Private mode or a blocked storage API.
  }
  return null
}

function hasStoredLocalLibrary() {
  if (typeof window === 'undefined') return false
  try {
    return (
      window.localStorage.getItem(LIBRARY_STORAGE_KEY) != null
      || window.localStorage.getItem(LEGACY_STORAGE_KEY_V2) != null
      || window.localStorage.getItem(LEGACY_STORAGE_KEY_V1) != null
    )
  } catch {
    return false
  }
}

function closeDb(db) {
  try {
    db.close()
  } catch {
    // Closing is best-effort so later opens are not blocked.
  }
}

async function openLibraryDb() {
  const idb = getIndexedDB()
  if (!idb) return null

  try {
    return await new Promise((resolve, reject) => {
      const request = idb.open(LIBRARY_IDB_NAME, LIBRARY_IDB_VERSION)
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(LIBRARY_IDB_STORE)) {
          db.createObjectStore(LIBRARY_IDB_STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } catch {
    return null
  }
}
