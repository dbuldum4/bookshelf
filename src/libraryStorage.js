export const LIBRARY_STORAGE_KEY = 'bookshelf-library-v3'
export const LEGACY_STORAGE_KEY_V2 = 'bookshelf-library-v2'
export const LEGACY_STORAGE_KEY_V1 = 'bookshelf-library-v1'

export const LIBRARY_IDB_NAME = 'bookshelf'
export const LIBRARY_IDB_STORE = 'kv'
export const LIBRARY_IDB_KEY = 'library'
const LIBRARY_IDB_VERSION = 1

// Hung indexedDB.open must not block hydrate/persist forever.
export const LIBRARY_IDB_OPEN_TIMEOUT_MS = 1500

let writeGeneration = 0
let writeTail = Promise.resolve()
let hydration = { done: true, initialSavedAt: 0 }

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

export function isLibraryHydrated() {
  return hydration.done
}

export function getProvisionalLibrarySavedAt() {
  return hydration.initialSavedAt
}

// First-paint LS is provisional until a successful IDB read (or IDB is absent).
export function markLibraryLoadPending(savedAt) {
  hydration = { done: false, initialSavedAt: toTimestamp(savedAt, 0) }
}

export function markLibraryLoadSettled() {
  hydration.done = true
}

export function resetLibraryPersistence() {
  writeGeneration += 1
  writeTail = Promise.resolve()
  hydration = { done: true, initialSavedAt: 0 }
}

/**
 * Prefer a newer IDB snapshot over first-paint LS. If the user already typed
 * on that stale copy, replay those book/shelf edits on top of IDB instead of
 * dropping the keystrokes or writing the stale LS library over IDB.
 */
export function resolveHydratedLibraryState({ initial, current, remote }) {
  if (!remote) return current
  const initialAt = librarySavedAt(initial)
  const remoteAt = librarySavedAt(remote)
  if (remoteAt <= initialAt) return current
  if (libraryRecordsEqual(initial, current)) return remote
  return rebaseLibraryEdits(initial, current, remote)
}

export function libraryRecordsEqual(left, right) {
  return stableLibraryJson(left) === stableLibraryJson(right)
}

/** Apply initial→current add/edit/delete onto a newer remote snapshot. */
export function rebaseLibraryEdits(initial, current, remote) {
  return {
    books: rebaseKeyedRows(initial?.books, current?.books, remote?.books),
    shelves: rebaseKeyedRows(initial?.shelves, current?.shelves, remote?.shelves),
    savedAt: Date.now(),
  }
}

function stableLibraryJson(state) {
  return JSON.stringify({
    books: Array.isArray(state?.books) ? state.books : [],
    shelves: Array.isArray(state?.shelves) ? state.shelves : [],
  })
}

function rebaseKeyedRows(initialList, currentList, remoteList) {
  const initialById = rowsById(initialList)
  const currentRows = Array.isArray(currentList) ? currentList : []
  const remoteRows = Array.isArray(remoteList) ? remoteList : []
  const currentById = rowsById(currentRows)
  const merged = []
  const seen = new Set()

  for (const remoteRow of remoteRows) {
    const id = remoteRow?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    if (initialById.has(id) && !currentById.has(id)) continue
    const currentRow = currentById.get(id)
    const initialRow = initialById.get(id)
    if (currentRow && initialRow && !rowsEqual(initialRow, currentRow)) {
      merged.push(currentRow)
    } else {
      merged.push(remoteRow)
    }
  }

  for (const currentRow of currentRows) {
    const id = currentRow?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    const initialRow = initialById.get(id)
    if (!initialRow || !rowsEqual(initialRow, currentRow)) merged.push(currentRow)
  }

  return merged
}

function rowsById(list) {
  const map = new Map()
  for (const row of Array.isArray(list) ? list : []) {
    if (row && typeof row.id === 'string' && row.id) map.set(row.id, row)
  }
  return map
}

function rowsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function indexedDBWriteOptions() {
  if (isLibraryHydrated()) return {}
  return { skipIfNewerThan: getProvisionalLibrarySavedAt() }
}

export async function readLibraryFromIndexedDB() {
  const db = await openLibraryDb()
  if (!db) return null
  try {
    return await readRecordFromDb(db)
  } catch {
    return null
  } finally {
    closeDb(db)
  }
}

export async function writeLibraryToIndexedDB(record, options = {}) {
  const payload = deserializeLibraryState(record)
  if (!payload) return false
  const generation = ++writeGeneration
  const skipIfNewerThan = options.skipIfNewerThan
  const run = () => commitLibraryRecord(payload, generation, skipIfNewerThan)
  writeTail = writeTail.then(run, run)
  return writeTail
}

export async function loadLibraryStateAsync() {
  const { loadLibraryState, ensureLibraryCapacity } = await import('./library.js')
  const localState = loadLibraryState()

  if (!isIndexedDBAvailable()) {
    markLibraryLoadSettled()
    return localState
  }

  const db = await openLibraryDb()
  if (!db) return localState

  try {
    const idbRecord = await readRecordFromDb(db)
    markLibraryLoadSettled()
    if (!idbRecord) {
      if (hasStoredLocalLibrary()) {
        const payload = deserializeLibraryState({
          books: localState.books,
          shelves: localState.shelves,
          savedAt: librarySavedAt(localState) || Date.now(),
        })
        if (payload) await putRecordInDb(db, payload)
      }
      return localState
    }

    const { books, shelves } = ensureLibraryCapacity(idbRecord)
    return { books, shelves, savedAt: librarySavedAt(idbRecord) }
  } catch {
    return localState
  } finally {
    closeDb(db)
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

function readRecordFromDb(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_IDB_STORE, 'readonly')
    const request = tx.objectStore(LIBRARY_IDB_STORE).get(LIBRARY_IDB_KEY)
    request.onsuccess = () => resolve(deserializeLibraryState(request.result ?? null))
    request.onerror = () => reject(request.error)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

function putRecordInDb(db, payload) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LIBRARY_IDB_STORE, 'readwrite')
    tx.oncomplete = () => resolve(true)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
    tx.objectStore(LIBRARY_IDB_STORE).put(payload, LIBRARY_IDB_KEY)
  })
}

async function commitLibraryRecord(payload, generation, skipIfNewerThan) {
  if (generation !== writeGeneration) return false

  const db = await openLibraryDb()
  if (!db) return false
  if (generation !== writeGeneration) {
    closeDb(db)
    return false
  }

  try {
    const existing = await readRecordFromDb(db)
    if (generation !== writeGeneration) return false

    const existingAt = librarySavedAt(existing)
    const incomingAt = librarySavedAt(payload)
    if (existing) {
      // Pre-hydrate writes come from first-paint LS and must not replace a newer IDB library.
      if (skipIfNewerThan != null && existingAt > skipIfNewerThan) return false
      if (existingAt > incomingAt) return false
    }
    if (generation !== writeGeneration) return false

    await putRecordInDb(db, payload)
    return true
  } catch {
    return false
  } finally {
    closeDb(db)
  }
}

async function openLibraryDb() {
  const idb = getIndexedDB()
  if (!idb) return null

  try {
    return await new Promise((resolve, reject) => {
      let settled = false
      let request
      const timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error('indexedDB open timed out'))
      }, LIBRARY_IDB_OPEN_TIMEOUT_MS)

      const finish = (fn, value) => {
        if (settled) {
          if (value && typeof value.close === 'function') closeDb(value)
          return
        }
        settled = true
        clearTimeout(timer)
        fn(value)
      }

      try {
        request = idb.open(LIBRARY_IDB_NAME, LIBRARY_IDB_VERSION)
      } catch (error) {
        finish(reject, error)
        return
      }

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(LIBRARY_IDB_STORE)) {
          db.createObjectStore(LIBRARY_IDB_STORE)
        }
      }
      request.onsuccess = () => finish(resolve, request.result)
      request.onerror = () => finish(reject, request.error)
      request.onblocked = () => finish(reject, request.error || new Error('indexedDB blocked'))
    })
  } catch {
    return null
  }
}
