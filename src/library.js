const STORAGE_KEY = 'bookshelf-library-v3'
const LEGACY_STORAGE_KEY_V2 = 'bookshelf-library-v2'
const LEGACY_STORAGE_KEY_V1 = 'bookshelf-library-v1'

export const READING_STATUSES = ['Want to Read', 'Reading', 'Paused', 'Finished', 'Did Not Finish']
export const BOOK_FORMATS = ['physical', 'ebook', 'audiobook']

/** Default named case every library starts with (and migrations land on). */
export const DEFAULT_SHELF_ID = 'library'
export const DEFAULT_SHELF_NAME = 'Library'

/** Physical shelf bounds (world units / integer rows). */
export const SHELF_WIDTH_MIN = 3.2
export const SHELF_WIDTH_MAX = 12
export const SHELF_ROWS_MIN = 1
export const SHELF_ROWS_MAX = 6
export const DEFAULT_SHELF_WIDTH = 7.6
export const DEFAULT_SHELF_ROWS = 4

export const SHELF_SIDE_THICKNESS = 0.3
export const SHELF_ROW_SPACING = 2.0
export const SHELF_BOOK_GAP = 0.018
export const SHELF_INNER_MARGIN = 0.35

const BOOKS = [
  ['the-great-gatsby', 'The Great Gatsby', 'F. Scott Fitzgerald'],
  ['beloved', 'Beloved', 'Toni Morrison'],
  ['nineteen-eighty-four', '1984', 'George Orwell'],
  ['jane-eyre', 'Jane Eyre', 'Charlotte Brontë'],
  ['the-stranger', 'The Stranger', 'Albert Camus'],
  ['frankenstein', 'Frankenstein', 'Mary Shelley'],
  ['the-bell-jar', 'The Bell Jar', 'Sylvia Plath'],
  ['invisible-man', 'Invisible Man', 'Ralph Ellison'],
  ['the-trial', 'The Trial', 'Franz Kafka'],
  ['kindred', 'Kindred', 'Octavia E. Butler'],
  ['the-odyssey', 'The Odyssey', 'Homer'],
  ['middlemarch', 'Middlemarch', 'George Eliot'],
  ['dune', 'Dune', 'Frank Herbert'],
  ['the-left-hand-of-darkness', 'The Left Hand of Darkness', 'Ursula K. Le Guin'],
  ['one-hundred-years-of-solitude', 'One Hundred Years of Solitude', 'Gabriel García Márquez'],
  ['the-sun-also-rises', 'The Sun Also Rises', 'Ernest Hemingway'],
  ['the-color-purple', 'The Color Purple', 'Alice Walker'],
  ['slaughterhouse-five', 'Slaughterhouse-Five', 'Kurt Vonnegut'],
  ['the-name-of-the-rose', 'The Name of the Rose', 'Umberto Eco'],
  ['never-let-me-go', 'Never Let Me Go', 'Kazuo Ishiguro'],
  ['pride-and-prejudice', 'Pride and Prejudice', 'Jane Austen'],
  ['the-master-and-margarita', 'The Master and Margarita', 'Mikhail Bulgakov'],
  ['their-eyes-were-watching-god', 'Their Eyes Were Watching God', 'Zora Neale Hurston'],
  ['the-picture-of-dorian-gray', 'The Picture of Dorian Gray', 'Oscar Wilde'],
  ['the-remains-of-the-day', 'The Remains of the Day', 'Kazuo Ishiguro'],
  ['the-handmaids-tale', "The Handmaid's Tale", 'Margaret Atwood'],
  ['things-fall-apart', 'Things Fall Apart', 'Chinua Achebe'],
  ['the-secret-history', 'The Secret History', 'Donna Tartt'],
  ['the-lathe-of-heaven', 'The Lathe of Heaven', 'Ursula K. Le Guin'],
  ['a-room-of-ones-own', "A Room of One's Own", 'Virginia Woolf'],
  ['the-little-prince', 'The Little Prince', 'Antoine de Saint-Exupéry'],
  ['fahrenheit-451', 'Fahrenheit 451', 'Ray Bradbury'],
  ['the-brothers-karamazov', 'The Brothers Karamazov', 'Fyodor Dostoevsky'],
  ['paradise-lost', 'Paradise Lost', 'John Milton'],
  ['the-count-of-monte-cristo', 'The Count of Monte Cristo', 'Alexandre Dumas'],
  ['the-waves', 'The Waves', 'Virginia Woolf'],
  ['parable-of-the-sower', 'Parable of the Sower', 'Octavia E. Butler'],
  ['east-of-eden', 'East of Eden', 'John Steinbeck'],
  ['the-book-of-disquiet', 'The Book of Disquiet', 'Fernando Pessoa'],
  ['the-shadow-of-the-wind', 'The Shadow of the Wind', 'Carlos Ruiz Zafón'],
]

const COLORS = [
  '#b3303a', '#2d5a8a', '#2e7d52', '#c98a2b', '#6a3d8a',
  '#8a2b3c', '#1f4d6b', '#5a7a2b', '#a83a2b', '#3a4a8a',
  '#7a5a2b', '#2b6a6a',
]

function defaultStatus(index) {
  if (index % 9 === 0) return 'Reading'
  if (index % 4 === 0) return 'Finished'
  return 'Want to Read'
}

function makeId(title, index) {
  const slug = String(title || 'book')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'book'
  const unique = globalThis.crypto?.randomUUID?.().slice(0, 8)
    || `${Date.now().toString(36)}-${index}`
  return `${slug}-${unique}`
}

function asNumber(value, fallback = 0) {
  if (typeof value === 'string') {
    value = value.replace(/,/g, '').trim()
  }
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback
}

const ALLOWED_COVER_HOST = 'covers.openlibrary.org'
const MAX_FIELD_LENGTH = 20000 // notes / quotes
const MAX_SHORT_FIELD = 500
const MAX_ID_LENGTH = 120
const MAX_TAGS = 40
const MAX_QUOTES = 50
const MAX_READS = 50
const MAX_BOOKS_IMPORT = 10000
const MAX_CURRENT_PAGE_WITHOUT_COUNT = 100000
const MAX_IMPORT_TEXT_LENGTH = 5_000_000
/** Soft room AABB so presets stay inside CameraRig walk bounds (±40). */
export const ROOM_LAYOUT_BOUND = 38

export function sanitizeCoverUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return ''
  try {
    const u = new URL(url.trim())
    if (u.protocol !== 'https:') return ''
    if (u.hostname !== ALLOWED_COVER_HOST) return ''
    return u.href
  } catch {
    return ''
  }
}

function asStringField(value, maxLen = MAX_SHORT_FIELD) {
  if (typeof value === 'number' && Number.isFinite(value)) value = String(value)
  if (typeof value !== 'string') return ''
  return value.slice(0, maxLen)
}

function asIsoDateString(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    try { return new Date(value).toISOString().slice(0, MAX_SHORT_FIELD) } catch { return '' }
  }
  if (typeof value !== 'string') return ''
  // Keep free-form date strings for inputs, but bound length for storage safety.
  return value.slice(0, MAX_SHORT_FIELD)
}

function isValidColor(color) {
  if (typeof color !== 'string' || !color.trim()) return false
  const trimmed = color.trim()
  // accept #rgb #rrggbb #rrggbbaa or simple css color names already in COLORS
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return true
  if (COLORS.includes(trimmed) || COLORS.includes(color)) return true
  // allow simple named colors used in app if any - otherwise reject empty
  return /^[a-zA-Z]+$/.test(trimmed) && trimmed.length < 30
}

function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim().slice(0, MAX_SHORT_FIELD))
    .filter(Boolean))]
    .slice(0, MAX_TAGS)
}

function normalizeQuotes(value) {
  const quotes = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? [value]
      : []
  return quotes
    .filter((quote) => typeof quote === 'string')
    .map((quote) => quote.trim().slice(0, MAX_FIELD_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_QUOTES)
}

/** paperback/hardcover (and similar print bindings) collapse to physical. */
export function mapBookFormat(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (
    raw === 'paperback'
    || raw === 'hardcover'
    || raw === 'hardback'
    || raw === 'hard cover'
    || raw === 'paper back'
    || raw === 'physical'
    || raw === 'print'
  ) {
    return 'physical'
  }
  if (raw === 'ebook' || raw === 'e-book' || raw === 'e book' || raw === 'digital' || raw === 'kindle' || raw === 'epub') {
    return 'ebook'
  }
  if (raw === 'audio' || raw === 'audiobook' || raw === 'audio book' || raw === 'audible') {
    return 'audiobook'
  }
  return BOOK_FORMATS.includes(raw) ? raw : ''
}

function normalizeReads(value) {
  const list = Array.isArray(value) ? value : []
  const seen = new Set()
  const reads = []
  for (const entry of list) {
    let startedAt = ''
    let finishedAt = ''
    if (typeof entry === 'string') {
      finishedAt = asIsoDateString(entry)
    } else if (entry && typeof entry === 'object') {
      startedAt = asIsoDateString(entry.startedAt)
      finishedAt = asIsoDateString(entry.finishedAt)
    }
    if (!startedAt && !finishedAt) continue
    const key = `${startedAt}|${finishedAt}`
    if (seen.has(key)) continue
    seen.add(key)
    reads.push({ startedAt, finishedAt })
    if (reads.length >= MAX_READS) break
  }
  return reads
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function makeShelfId(name, index = 0) {
  const slug = String(name || 'shelf')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'shelf'
  const unique = globalThis.crypto?.randomUUID?.().slice(0, 8)
    || `${Date.now().toString(36)}-${index}`
  return `${slug}-${unique}`
}

export function normalizeShelf(value, index = 0) {
  const shelf = value && typeof value === 'object' ? value : {}
  const width = Number(shelf.width)
  const rows = Number(shelf.rows)
  const x = Number(shelf.x)
  const z = Number(shelf.z)
  const yaw = Number(shelf.yaw)
  return {
    id: typeof shelf.id === 'string' && shelf.id ? shelf.id : makeShelfId(shelf.name, index),
    name: typeof shelf.name === 'string' && shelf.name.trim() ? shelf.name.trim() : `Shelf ${index + 1}`,
    x: Number.isFinite(x) ? x : index * 9,
    z: Number.isFinite(z) ? z : 0,
    yaw: Number.isFinite(yaw) ? yaw : 0,
    width: Number.isFinite(width)
      ? clamp(width, SHELF_WIDTH_MIN, SHELF_WIDTH_MAX)
      : DEFAULT_SHELF_WIDTH,
    rows: Number.isFinite(rows)
      ? clamp(Math.round(rows), SHELF_ROWS_MIN, SHELF_ROWS_MAX)
      : DEFAULT_SHELF_ROWS,
  }
}

export function createDefaultShelf(overrides = {}) {
  return normalizeShelf({
    id: DEFAULT_SHELF_ID,
    name: DEFAULT_SHELF_NAME,
    x: 0,
    z: 0,
    yaw: 0,
    width: DEFAULT_SHELF_WIDTH,
    rows: DEFAULT_SHELF_ROWS,
    ...overrides,
  })
}

export function createShelf(draft = {}, index = 0) {
  return normalizeShelf({
    name: draft.name || `Shelf ${index + 1}`,
    x: draft.x ?? index * 9,
    z: draft.z ?? 0,
    yaw: draft.yaw ?? 0,
    width: draft.width ?? DEFAULT_SHELF_WIDTH,
    rows: draft.rows ?? DEFAULT_SHELF_ROWS,
    ...draft,
    id: draft.id || makeShelfId(draft.name, index),
  }, index)
}

function normalizeBook(value, index, defaultShelfId = DEFAULT_SHELF_ID) {
  const book = value && typeof value === 'object' ? value : {}
  const pageCount = asNumber(book.pageCount)
  const shelfId = typeof book.shelfId === 'string' && book.shelfId
    ? book.shelfId.slice(0, MAX_ID_LENGTH)
    : defaultShelfId
  const pageCap = pageCount > 0 ? pageCount : MAX_CURRENT_PAGE_WITHOUT_COUNT
  const rawIsbn = asStringField(book.isbn)
  const cleanedIsbn = cleanIsbn(rawIsbn)
  const isbn = cleanedIsbn && isValidIsbn(cleanedIsbn) ? cleanedIsbn : rawIsbn

  const title = asStringField(book.title).trim() || 'Untitled book'
  const author = asStringField(book.author).trim() || 'Unknown author'
  const rawId = asStringField(book.id, MAX_ID_LENGTH).trim()
  const id = rawId || makeId(title, index)

  let createdAt = asIsoDateString(book.createdAt)
  if (!createdAt) createdAt = new Date().toISOString()

  return {
    id,
    title,
    author,
    color: isValidColor(book.color) ? book.color.trim() : COLORS[index % COLORS.length],
    status: READING_STATUSES.includes(book.status) ? book.status : 'Want to Read',
    notes: typeof book.notes === 'string' ? book.notes.slice(0, MAX_FIELD_LENGTH) : '',
    rating: Math.min(5, asNumber(book.rating)),
    currentPage: Math.min(asNumber(book.currentPage), pageCap),
    pageCount,
    tags: normalizeTags(book.tags),
    quotes: normalizeQuotes(book.quotes),
    startedAt: asIsoDateString(book.startedAt),
    finishedAt: asIsoDateString(book.finishedAt),
    isbn: isbn.slice(0, MAX_SHORT_FIELD),
    coverUrl: sanitizeCoverUrl(book.coverUrl),
    format: mapBookFormat(book.format),
    reads: normalizeReads(book.reads),
    createdAt,
    shelfId,
  }
}

export function createLibrary() {
  return BOOKS.map(([id, title, author], index) => normalizeBook({
    id,
    title,
    author,
    color: COLORS[index % COLORS.length],
    status: defaultStatus(index),
    shelfId: DEFAULT_SHELF_ID,
  }, index))
}

/** Full app state: books + named shelves in a shared room. */
export function createLibraryState() {
  return {
    books: createLibrary(),
    shelves: [createDefaultShelf()],
  }
}

export function createBook(draft, index, defaultShelfId = DEFAULT_SHELF_ID) {
  return normalizeBook({
    ...draft,
    id: makeId(draft.title, index),
    color: COLORS[index % COLORS.length],
    status: draft.status || 'Want to Read',
    shelfId: draft.shelfId || defaultShelfId,
  }, index, defaultShelfId)
}

/**
 * Ensure every book points at a known shelf, shelves are normalized,
 * and at least one shelf exists. Returns a new state object.
 */
export function normalizeLibraryState(state) {
  const rawShelves = Array.isArray(state?.shelves) ? state.shelves : []
  const usedShelfIds = new Set()
  let shelves = rawShelves.map((shelf, index) => {
    const normalized = normalizeShelf(shelf, index)
    let id = normalized.id
    let suffix = 2
    while (usedShelfIds.has(id)) {
      id = `${normalized.id}-${suffix}`
      suffix += 1
    }
    usedShelfIds.add(id)
    return id === normalized.id ? normalized : { ...normalized, id }
  })
  if (!shelves.length) shelves = [createDefaultShelf()]

  const shelfIds = new Set(shelves.map((shelf) => shelf.id))
  const fallbackId = shelves[0].id
  const rawBooks = Array.isArray(state?.books) ? state.books : Array.isArray(state) ? state : []
  const seenIds = new Set()
  const books = rawBooks.map((book, index) => {
    const normalized = normalizeBook(book, index, fallbackId)
    if (!shelfIds.has(normalized.shelfId)) normalized.shelfId = fallbackId
    if (!seenIds.has(normalized.id)) {
      seenIds.add(normalized.id)
      return normalized
    }
    let id = makeId(normalized.title, index)
    while (seenIds.has(id)) id = makeId(normalized.title, index + Math.random())
    seenIds.add(id)
    return { ...normalized, id }
  })

  return { books, shelves }
}

/**
 * Grow shelves (width/rows up to max) and/or spawn extra cases so every book
 * packs onto a visible plank. Used on load and import so overflow never
 * silently disappears from the 3D scene.
 *
 * @returns {{ books: object[], shelves: object[], adjusted: boolean, message?: string }}
 */
export function ensureLibraryCapacity(state) {
  const base = normalizeLibraryState(state)
  let books = base.books.map((book) => ({ ...book }))
  let shelves = base.shelves.map((shelf) => ({ ...shelf }))
  let adjusted = false
  let spilled = false

  // Snapshot of shelf ids to iterate; we may append new cases while looping.
  const shelfIds = shelves.map((shelf) => shelf.id)
  for (const shelfId of shelfIds) {
    const shelfIndex = shelves.findIndex((shelf) => shelf.id === shelfId)
    if (shelfIndex < 0) continue

    let shelf = shelves[shelfIndex]
    let members = booksOnShelf(books, shelf.id)
    if (booksFitOnShelf(members, shelf)) continue

    // Prefer growing the existing case before inventing new ones.
    let next = normalizeShelf({ ...shelf, width: SHELF_WIDTH_MAX })
    if (booksFitOnShelf(members, next)) {
      shelves[shelfIndex] = next
      adjusted = true
      continue
    }
    next = normalizeShelf({ ...shelf, width: SHELF_WIDTH_MAX, rows: SHELF_ROWS_MAX })
    shelves[shelfIndex] = next
    shelf = next
    adjusted = true
    if (booksFitOnShelf(members, shelf)) continue

    // Still over capacity: keep what fits on the maxed case, spill the rest.
    const packed = packBooksIntoRows(members, shelf)
    let overflow = packed.slice(shelf.rows).flat()
    if (!overflow.length) continue
    spilled = true

    while (overflow.length) {
      const overflowShelf = createShelf({
        name: `Shelf ${shelves.length + 1}`,
        x: shelves[shelves.length - 1].x + shelves[shelves.length - 1].width + 2.5,
        z: shelves[shelves.length - 1].z,
        yaw: 0,
        width: SHELF_WIDTH_MAX,
        rows: SHELF_ROWS_MAX,
      }, shelves.length)
      shelves = [...shelves, overflowShelf]

      const overflowPacked = packBooksIntoRows(overflow, overflowShelf)
      const batch = overflowPacked.slice(0, overflowShelf.rows).flat()
      // Safety: a single book always fits a max case; never stall the loop.
      const take = batch.length > 0 ? batch : overflow.slice(0, 1)
      const takeIds = new Set(take.map((book) => book.id))
      books = books.map((book) => (
        takeIds.has(book.id) ? { ...book, shelfId: overflowShelf.id } : book
      ))
      overflow = overflow.filter((book) => !takeIds.has(book.id))
    }
  }

  const message = spilled
    ? 'Some books needed extra shelves so everything stays visible. Check Arrange mode to place the new cases.'
    : adjusted
      ? 'Some shelves were resized so every book stays visible.'
      : undefined

  return { books, shelves, adjusted: adjusted || spilled, message }
}

function readStoredJson(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key))
  } catch {
    return null
  }
}

function booksFromLegacyArray(rawBooks) {
  const books = (Array.isArray(rawBooks) ? rawBooks : []).map((book, index) =>
    normalizeBook(book, index, DEFAULT_SHELF_ID)
  )
  return normalizeLibraryState({ books, shelves: [createDefaultShelf()] })
}

function finalizeLoadedState(state) {
  const { books, shelves } = ensureLibraryCapacity(state)
  return { books, shelves }
}

export function loadLibraryState() {
  const fallback = createLibraryState()
  if (typeof window === 'undefined') return fallback

  let rawV3 = null
  try {
    rawV3 = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return fallback
  }

  // v3 key present — never fall through to legacy
  if (rawV3 != null) {
    let saved = null
    try {
      saved = JSON.parse(rawV3)
    } catch {
      return finalizeLoadedState(fallback)
    }
    if (Array.isArray(saved)) return finalizeLoadedState(booksFromLegacyArray(saved))
    if (saved && typeof saved === 'object' && Array.isArray(saved.books)) {
      return finalizeLoadedState(saved)
    }
    // corrupt shape
    return finalizeLoadedState(fallback)
  }

  // no v3 — migrate legacy
  const v2 = readStoredJson(LEGACY_STORAGE_KEY_V2)
  if (Array.isArray(v2)) return finalizeLoadedState(booksFromLegacyArray(v2))
  if (v2 && typeof v2 === 'object' && Array.isArray(v2.books)) {
    return finalizeLoadedState(v2)
  }

  const v1 = readStoredJson(LEGACY_STORAGE_KEY_V1)
  if (!Array.isArray(v1)) return fallback

  const legacyById = new Map(
    v1
      .filter((book) => book && typeof book === 'object' && typeof book.id === 'string')
      .map((book) => [book.id, book])
  )
  const books = fallback.books.map((book, index) => normalizeBook({
    ...book,
    ...legacyById.get(book.id),
    shelfId: DEFAULT_SHELF_ID,
  }, index))
  return finalizeLoadedState({ books, shelves: [createDefaultShelf()] })
}

/** @deprecated Prefer loadLibraryState — returns books only for older callers. */
export function loadLibrary() {
  return loadLibraryState().books
}

export function saveLibraryState(state) {
  if (typeof window === 'undefined') return false
  try {
    const normalized = normalizeLibraryState(state)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY_V2)
      window.localStorage.removeItem(LEGACY_STORAGE_KEY_V1)
    } catch {
      // Legacy cleanup is best-effort; v3 write already succeeded.
    }
    return true
  } catch {
    return false
  }
}

function readExistingShelves() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [createDefaultShelf()]
    const data = JSON.parse(raw)
    if (data && Array.isArray(data.shelves) && data.shelves.length) {
      return data.shelves.map((shelf, index) => normalizeShelf(shelf, index))
    }
  } catch {
    // fall through
  }
  return [createDefaultShelf()]
}

/** @deprecated Prefer saveLibraryState. Accepts a books array or full state. */
export function saveLibrary(libraryOrState) {
  if (Array.isArray(libraryOrState)) {
    let shelves = [createDefaultShelf()]
    try {
      if (typeof window !== 'undefined') shelves = readExistingShelves()
    } catch {
      // keep default shelf
    }
    return saveLibraryState({ books: libraryOrState, shelves })
  }
  return saveLibraryState(libraryOrState)
}

export const LIBRARY_EXPORT_FORMAT = 'bookshelf-library'
export const LIBRARY_EXPORT_VERSION = 2

const BOOK_EXPORT_FIELDS = [
  'id',
  'title',
  'author',
  'color',
  'status',
  'notes',
  'rating',
  'currentPage',
  'pageCount',
  'tags',
  'quotes',
  'startedAt',
  'finishedAt',
  'isbn',
  'coverUrl',
  'format',
  'reads',
  'createdAt',
  'shelfId',
]

const SHELF_EXPORT_FIELDS = ['id', 'name', 'x', 'z', 'yaw', 'width', 'rows']

function pickBookFields(book) {
  const next = {}
  for (const field of BOOK_EXPORT_FIELDS) next[field] = book[field]
  return next
}

function pickShelfFields(shelf) {
  const next = {}
  for (const field of SHELF_EXPORT_FIELDS) next[field] = shelf[field]
  return next
}

/** Build a portable, versioned snapshot of the full library (books + shelves). */
export function buildLibraryExport(libraryOrState) {
  const state = Array.isArray(libraryOrState)
    ? normalizeLibraryState({ books: libraryOrState, shelves: [createDefaultShelf()] })
    : normalizeLibraryState(libraryOrState)
  return {
    format: LIBRARY_EXPORT_FORMAT,
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    books: state.books.map((book, index) => pickBookFields(normalizeBook(book, index))),
    shelves: state.shelves.map((shelf, index) => pickShelfFields(normalizeShelf(shelf, index))),
  }
}

export function libraryToJson(libraryOrState) {
  return `${JSON.stringify(buildLibraryExport(libraryOrState), null, 2)}\n`
}

function extractImportedState(data) {
  if (Array.isArray(data)) {
    return {
      books: data,
      shelves: null,
      format: null,
      version: null,
    }
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Library JSON must be an array of books or an object with a books array.')
  }

  if (typeof data.format === 'string' && data.format !== LIBRARY_EXPORT_FORMAT) {
    throw new Error(`Unsupported library format “${data.format}”.`)
  }

  if (data.version != null) {
    const version = Number(data.version)
    if (!Number.isInteger(version) || version < 1 || version > LIBRARY_EXPORT_VERSION) {
      throw new Error(`Unsupported library version “${data.version}”.`)
    }
  }

  const books = Array.isArray(data.books)
    ? data.books
    : Array.isArray(data.library)
      ? data.library
      : null
  if (!books) throw new Error('Library JSON must include a books array.')

  return {
    books,
    shelves: Array.isArray(data.shelves) ? data.shelves : null,
    format: data.format || null,
    version: data.version ?? null,
  }
}

/**
 * Parse and validate a library JSON string.
 * Accepts versioned export (v1 books-only or v2 books+shelves) or a bare books array.
 */
export function parseLibraryImport(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Choose a non-empty JSON file to import.')
  }
  if (text.length > MAX_IMPORT_TEXT_LENGTH) {
    throw new Error('That library file is too large to import.')
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  const extracted = extractImportedState(data)
  if (!extracted.books.length) {
    throw new Error('That library file does not contain any books.')
  }
  if (extracted.books.length > MAX_BOOKS_IMPORT) {
    throw new Error(`Library imports are limited to ${MAX_BOOKS_IMPORT} books.`)
  }

  const shelves = (extracted.shelves && extracted.shelves.length
    ? extracted.shelves
    : [createDefaultShelf()]
  ).map((shelf, index) => normalizeShelf(shelf, index))

  const shelfIds = new Set(shelves.map((shelf) => shelf.id))
  if (shelfIds.size !== shelves.length) {
    throw new Error('That library file contains duplicate shelf IDs.')
  }
  const fallbackId = shelves[0].id
  const seenIds = new Set()
  const books = extracted.books.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Book at position ${index + 1} is not a valid object.`)
    }

    const book = pickBookFields(normalizeBook(entry, index, fallbackId))
    if (!shelfIds.has(book.shelfId)) book.shelfId = fallbackId
    if (seenIds.has(book.id)) {
      book.id = makeId(book.title, index)
    }
    seenIds.add(book.id)
    return book
  })

  const state = normalizeLibraryState({ books, shelves })
  return {
    books: state.books,
    shelves: state.shelves,
    count: state.books.length,
    format: extracted.format,
    version: extracted.version,
  }
}

/** Trigger a browser download of the library as JSON. */
export function downloadLibraryExport(libraryOrState, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Export is only available in the browser.')
  }

  const json = libraryToJson(libraryOrState)
  const stamp = new Date().toISOString().slice(0, 10)
  const name = filename || `bookshelf-library-${stamp}.json`
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
  markLibraryBackupDone()
  const count = Array.isArray(libraryOrState)
    ? libraryOrState.length
    : Array.isArray(libraryOrState?.books)
      ? libraryOrState.books.length
      : 0
  return { filename: name, count }
}

/* ------------------------------------------------------------------ */
/* Backup reminders                                                    */
/* ------------------------------------------------------------------ */

export const BACKUP_REMINDER_DAYS = 7
export const BACKUP_STORAGE_KEY = 'bookshelf-last-backup-at'
export const BACKUP_DISMISS_STORAGE_KEY = 'bookshelf-backup-dismissed-until'

export function markLibraryBackupDone(now = Date.now()) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(BACKUP_STORAGE_KEY, new Date(now).toISOString())
    window.localStorage.removeItem(BACKUP_DISMISS_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function dismissLibraryBackupReminder(days = BACKUP_REMINDER_DAYS, now = Date.now()) {
  if (typeof window === 'undefined') return false
  try {
    const until = now + Math.max(1, days) * 24 * 60 * 60 * 1000
    window.localStorage.setItem(BACKUP_DISMISS_STORAGE_KEY, new Date(until).toISOString())
    return true
  } catch {
    return false
  }
}

/**
 * True when the user has books and has not exported (or dismissed) recently.
 * @param {{ bookCount?: number, now?: number, days?: number }} [options]
 */
export function shouldRemindLibraryBackup(options = {}) {
  const bookCount = options.bookCount ?? 0
  const now = options.now ?? Date.now()
  const days = options.days ?? BACKUP_REMINDER_DAYS
  if (!bookCount || typeof window === 'undefined') return false

  try {
    const dismissedUntil = Date.parse(window.localStorage.getItem(BACKUP_DISMISS_STORAGE_KEY) || '')
    if (Number.isFinite(dismissedUntil) && now < dismissedUntil) return false

    const lastRaw = window.localStorage.getItem(BACKUP_STORAGE_KEY)
    if (!lastRaw) return true
    const last = Date.parse(lastRaw)
    if (!Number.isFinite(last)) return true
    return now - last >= days * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

/* ------------------------------------------------------------------ */
/* Merge import                                                        */
/* ------------------------------------------------------------------ */

const STATUS_RANK = {
  'Want to Read': 0,
  Paused: 1,
  Reading: 2,
  'Did Not Finish': 2,
  Finished: 3,
}

function normalizeMatchKey(title, author) {
  const clean = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return `${clean(title)}|${clean(author)}`
}

function earlierIso(a, b) {
  const ta = Date.parse(a || '')
  const tb = Date.parse(b || '')
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta <= tb ? a : b
  if (Number.isFinite(ta)) return a
  if (Number.isFinite(tb)) return b
  return a || b || ''
}

function laterIso(a, b) {
  const ta = Date.parse(a || '')
  const tb = Date.parse(b || '')
  if (Number.isFinite(ta) && Number.isFinite(tb)) return ta >= tb ? a : b
  if (Number.isFinite(ta)) return a
  if (Number.isFinite(tb)) return b
  return a || b || ''
}

function preferNonEmpty(current, incoming) {
  if (typeof current === 'string' && current.trim()) return current
  if (typeof incoming === 'string' && incoming.trim()) return incoming
  return current || incoming || ''
}

/**
 * Merge notes without clobbering local text. If both differ, append import under a separator.
 */
export function mergeNotes(current, incoming) {
  const a = typeof current === 'string' ? current.trim() : ''
  const b = typeof incoming === 'string' ? incoming.trim() : ''
  if (!a) return b.slice(0, MAX_FIELD_LENGTH)
  if (!b) return a.slice(0, MAX_FIELD_LENGTH)
  if (a === b || a.includes(b)) return a.slice(0, MAX_FIELD_LENGTH)
  if (b.includes(a)) return b.slice(0, MAX_FIELD_LENGTH)
  return `${a}\n\n---\n\n${b}`.slice(0, MAX_FIELD_LENGTH)
}

/** Merge two book records matched as the same edition. Keeps current id + shelf. */
export function mergeBookRecords(current, incoming, index = 0) {
  const left = normalizeBook(current, index)
  const right = normalizeBook(incoming, index, left.shelfId)
  const leftRank = STATUS_RANK[left.status] ?? 0
  const rightRank = STATUS_RANK[right.status] ?? 0
  const status = rightRank > leftRank ? right.status : left.status
  const pageCount = Math.max(left.pageCount, right.pageCount)
  let currentPage = Math.max(left.currentPage, right.currentPage)
  if (pageCount > 0) currentPage = Math.min(currentPage, pageCount)
  if (status === 'Finished' && pageCount > 0) currentPage = pageCount

  return normalizeBook({
    ...left,
    title: preferNonEmpty(left.title, right.title),
    author: preferNonEmpty(left.author, right.author),
    notes: mergeNotes(left.notes, right.notes),
    isbn: preferNonEmpty(left.isbn, right.isbn),
    coverUrl: preferNonEmpty(left.coverUrl, right.coverUrl),
    color: left.color || right.color,
    status,
    rating: Math.max(left.rating, right.rating),
    pageCount,
    currentPage,
    tags: normalizeTags([...(left.tags || []), ...(right.tags || [])]),
    quotes: normalizeQuotes([...(left.quotes || []), ...(right.quotes || [])]),
    startedAt: earlierIso(left.startedAt, right.startedAt),
    finishedAt: laterIso(left.finishedAt, right.finishedAt),
    format: preferNonEmpty(left.format, right.format),
    reads: normalizeReads([...(left.reads || []), ...(right.reads || [])]),
    createdAt: earlierIso(left.createdAt, right.createdAt) || left.createdAt,
    shelfId: left.shelfId,
    id: left.id,
  }, index, left.shelfId)
}

/**
 * Merge an imported library into the current one.
 * Matches books by id, then ISBN, then title+author. Adds new shelves by id.
 *
 * @returns {{ books, shelves, added, updated, total, message?: string, adjusted: boolean }}
 */
export function mergeLibraryStates(currentState, incomingState) {
  const current = normalizeLibraryState(currentState)
  const incoming = normalizeLibraryState(incomingState)

  const shelves = current.shelves.map((shelf) => ({ ...shelf }))
  const shelfIds = new Set(shelves.map((shelf) => shelf.id))
  for (const shelf of incoming.shelves) {
    if (shelfIds.has(shelf.id)) continue
    shelves.push({ ...shelf })
    shelfIds.add(shelf.id)
  }

  const books = current.books.map((book) => ({ ...book }))
  const byId = new Map(books.map((book, index) => [book.id, index]))
  const byIsbn = new Map()
  const byTitleAuthor = new Map()
  books.forEach((book, index) => {
    if (book.isbn) byIsbn.set(book.isbn, index)
    byTitleAuthor.set(normalizeMatchKey(book.title, book.author), index)
  })

  let added = 0
  let updated = 0

  for (const raw of incoming.books) {
    const candidate = normalizeBook(raw, books.length, shelves[0]?.id || DEFAULT_SHELF_ID)
    let matchIndex = byId.has(candidate.id) ? byId.get(candidate.id) : -1
    if (matchIndex < 0 && candidate.isbn && byIsbn.has(candidate.isbn)) {
      matchIndex = byIsbn.get(candidate.isbn)
    }
    if (matchIndex < 0) {
      const key = normalizeMatchKey(candidate.title, candidate.author)
      if (byTitleAuthor.has(key)) matchIndex = byTitleAuthor.get(key)
    }

    if (matchIndex >= 0) {
      const merged = mergeBookRecords(books[matchIndex], candidate, matchIndex)
      books[matchIndex] = merged
      // Refresh indexes so later rows in this import can match newly filled ISBN/title.
      byId.set(merged.id, matchIndex)
      if (merged.isbn) byIsbn.set(merged.isbn, matchIndex)
      byTitleAuthor.set(normalizeMatchKey(merged.title, merged.author), matchIndex)
      updated += 1
      continue
    }

    // Match phase already covers existing ids; new rows keep candidate.id.
    let shelfId = candidate.shelfId
    if (!shelfIds.has(shelfId)) shelfId = shelves[0]?.id || DEFAULT_SHELF_ID
    const next = { ...candidate, shelfId }
    books.push(next)
    const newIndex = books.length - 1
    byId.set(next.id, newIndex)
    if (next.isbn) byIsbn.set(next.isbn, newIndex)
    byTitleAuthor.set(normalizeMatchKey(next.title, next.author), newIndex)
    added += 1
  }

  const fitted = ensureLibraryCapacity({ books, shelves })
  return {
    books: fitted.books,
    shelves: fitted.shelves,
    added,
    updated,
    total: fitted.books.length,
    adjusted: fitted.adjusted,
    message: fitted.message,
  }
}

/* ------------------------------------------------------------------ */
/* Room presets (reposition existing cases; keeps ids / books)         */
/* ------------------------------------------------------------------ */

export const ROOM_PRESETS = [
  {
    id: 'wall',
    label: 'Wall',
    description: 'Cases side-by-side along the back wall',
  },
  {
    id: 'l-shape',
    label: 'L-shape',
    description: 'Back wall plus a right-hand wing',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    description: 'Two facing rows with an aisle between',
  },
]

const ROOM_PRESET_GAP = 1.15
const CASE_DEPTH_HALF = 0.9

function layoutShelvesInRow(shelves, { z, yaw, startX = null }) {
  const total = shelves.reduce(
    (sum, shelf, index) => sum + shelf.width + (index > 0 ? ROOM_PRESET_GAP : 0),
    0,
  )
  let cursor = startX == null ? -total / 2 : startX
  return shelves.map((shelf) => {
    const next = {
      ...shelf,
      x: cursor + shelf.width / 2,
      z,
      yaw,
    }
    cursor += shelf.width + ROOM_PRESET_GAP
    return next
  })
}

/** Approximate world AABB extents for a yawed case, then fit inside walk bounds. */
export function clampShelvesToRoom(shelves, bound = ROOM_LAYOUT_BOUND) {
  const list = Array.isArray(shelves) ? shelves : []
  if (!list.length) return { shelves: list, scaled: false, adjusted: false }

  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity

  for (const shelf of list) {
    const halfW = (shelf.width || DEFAULT_SHELF_WIDTH) / 2 + 0.4
    const yaw = shelf.yaw || 0
    const cos = Math.abs(Math.cos(yaw))
    const sin = Math.abs(Math.sin(yaw))
    const extX = halfW * cos + CASE_DEPTH_HALF * sin
    const extZ = halfW * sin + CASE_DEPTH_HALF * cos
    minX = Math.min(minX, shelf.x - extX)
    maxX = Math.max(maxX, shelf.x + extX)
    minZ = Math.min(minZ, shelf.z - extZ)
    maxZ = Math.max(maxZ, shelf.z + extZ)
  }

  const spanX = Math.max(1e-6, maxX - minX)
  const spanZ = Math.max(1e-6, maxZ - minZ)
  const limit = bound * 2
  let scale = 1
  if (spanX > limit) scale = Math.min(scale, limit / spanX)
  if (spanZ > limit) scale = Math.min(scale, limit / spanZ)

  const outside = minX < -bound || maxX > bound || minZ < -bound || maxZ > bound
  // Leave in-bounds layouts untouched (do not re-center a neat wall at z=-2).
  if (scale >= 1 - 1e-9 && !outside) {
    return { shelves: list, scaled: false, adjusted: false }
  }

  const cx = (minX + maxX) / 2
  const cz = (minZ + maxZ) / 2
  return {
    shelves: list.map((shelf) => ({
      ...shelf,
      x: (shelf.x - cx) * scale,
      z: (shelf.z - cz) * scale,
    })),
    scaled: scale < 1 - 1e-9,
    adjusted: true,
  }
}

/**
 * Apply a room preset to shelf positions/yaws. Book membership is unchanged.
 * @returns {{ ok: true, books, shelves, scaled?: boolean } | { ok: false, reason: string }}
 */
export function applyRoomPreset(state, presetId) {
  const base = normalizeLibraryState(state)
  if (!base.shelves.length) {
    return { ok: false, reason: 'Add a shelf before applying a room layout.' }
  }

  const preset = ROOM_PRESETS.find((entry) => entry.id === presetId)
  if (!preset) {
    return { ok: false, reason: 'Unknown room layout.' }
  }

  let shelves
  if (presetId === 'wall') {
    shelves = layoutShelvesInRow(base.shelves, { z: -2, yaw: 0 })
  } else if (presetId === 'l-shape') {
    const split = Math.max(1, Math.ceil(base.shelves.length / 2))
    const back = layoutShelvesInRow(base.shelves.slice(0, split), { z: -2, yaw: 0 })
    // Right wall sits past the back row; cases face −X into the room.
    const wingStartX = back.length
      ? Math.max(...back.map((shelf) => shelf.x + shelf.width / 2)) + ROOM_PRESET_GAP + 1.2
      : 6
    const wing = base.shelves.slice(split)
    // Local width maps to world Z when yaw = −π/2, so step along Z by width.
    let zCursor = -2 + 1.6
    const wingLaid = wing.map((shelf) => {
      const next = {
        ...shelf,
        x: wingStartX,
        z: zCursor + shelf.width / 2,
        yaw: -Math.PI / 2,
      }
      zCursor += shelf.width + ROOM_PRESET_GAP
      return next
    })
    shelves = [...back, ...wingLaid]
  } else if (presetId === 'gallery') {
    const left = []
    const right = []
    base.shelves.forEach((shelf, index) => {
      if (index % 2 === 0) left.push(shelf)
      else right.push(shelf)
    })
    if (!right.length && left.length > 1) {
      right.push(left.pop())
    }
    const backRow = layoutShelvesInRow(left.length ? left : base.shelves, { z: -5, yaw: 0 })
    const frontRow = layoutShelvesInRow(right, { z: 5, yaw: Math.PI })
    shelves = [...backRow, ...frontRow]
  } else {
    return { ok: false, reason: 'Unknown room layout.' }
  }

  const fitted = clampShelvesToRoom(shelves)
  return {
    ok: true,
    books: base.books,
    shelves: fitted.shelves.map((shelf, index) => normalizeShelf(shelf, index)),
    scaled: fitted.scaled,
    adjusted: fitted.adjusted,
  }
}

/** Parse a single CSV line with RFC 4180-style quoting. */
export function parseCsvLine(line) {
  const cells = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      cells.push(current)
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current)
  return cells
}

function splitCsvRows(text) {
  const rows = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (char === '"') {
      inQuotes = !inQuotes
      current += char
      continue
    }
    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      if (current.trim()) rows.push(current)
      current = ''
      continue
    }
    current += char
  }

  if (current.trim()) rows.push(current)
  return rows
}

function normalizeHeaderKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function cell(row, keys) {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim()
  }
  return ''
}

/** Map a single Goodreads shelf token. Returns null when unrecognized. */
function matchGoodreadsShelf(value) {
  const shelf = String(value || '').trim().toLowerCase()
  if (shelf === 'currently-reading' || shelf === 'currently reading' || shelf === 'reading') {
    return 'Reading'
  }
  if (shelf === 'read' || shelf === 'finished') return 'Finished'
  if (shelf === 'to-read' || shelf === 'to read' || shelf === 'want to read') return 'Want to Read'
  if (shelf === 'did-not-finish' || shelf === 'did not finish' || shelf === 'dnf') return 'Did Not Finish'
  if (shelf === 'paused' || shelf === 'on-hold' || shelf === 'on hold') return 'Paused'
  return null
}

const STORYGRAPH_HEADER_MARKERS = ['read status', 'last date read', 'dates read', 'star rating']

/** StoryGraph exports use Authors + Read Status (not Goodreads Exclusive Shelf). */
export function isStoryGraphCsv(headers) {
  const set = headers instanceof Set ? headers : new Set(headers)
  return STORYGRAPH_HEADER_MARKERS.some((header) => set.has(header))
}

function matchStoryGraphStatus(value) {
  const status = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  if (!status) return null
  if (status === 'read' || status === 'finished' || status === 'complete' || status === 'completed') {
    return 'Finished'
  }
  if (status === 'currently-reading' || status === 'currently reading' || status === 'reading') {
    return 'Reading'
  }
  if (
    status === 'to-read'
    || status === 'to read'
    || status === 'to-be-read'
    || status === 'to be read'
    || status === 'tbr'
    || status === 'want to read'
  ) {
    return 'Want to Read'
  }
  if (status === 'did-not-finish' || status === 'did not finish' || status === 'dnf') {
    return 'Did Not Finish'
  }
  if (status === 'paused' || status === 'on-hold' || status === 'on hold') return 'Paused'
  return matchGoodreadsShelf(status)
}

function resolveStoryGraphStatus(row) {
  const mapped = matchStoryGraphStatus(cell(row, ['read status', 'status']))
  if (mapped) return mapped
  return resolveGoodreadsStatus(row)
}

/** Split StoryGraph Dates Read into { startedAt, finishedAt } entries. */
export function parseStoryGraphDatesRead(value) {
  const raw = String(value || '').trim()
  if (!raw) return []
  const reads = []
  for (const part of raw.split(',').map((entry) => entry.trim()).filter(Boolean)) {
    const slashRange = part.match(/^(\d{4}\/\d{1,2}\/\d{1,2})\s*[-–]\s*(\d{4}\/\d{1,2}\/\d{1,2})$/)
    if (slashRange) {
      reads.push({
        startedAt: parseLooseDate(slashRange[1]),
        finishedAt: parseLooseDate(slashRange[2]),
      })
      continue
    }
    const isoRange = part.match(/^(\d{4}-\d{2}-\d{2})\s*[-–]\s*(\d{4}-\d{2}-\d{2})$/)
    if (isoRange) {
      reads.push({
        startedAt: parseLooseDate(isoRange[1]),
        finishedAt: parseLooseDate(isoRange[2]),
      })
      continue
    }
    const finishedAt = parseLooseDate(part)
    if (finishedAt) reads.push({ startedAt: '', finishedAt })
  }
  return reads
}

/**
 * Resolve reading status from CSV columns.
 * Prefer Exclusive Shelf / Shelf / Status. Fall back to Bookshelves only by
 * scanning comma-separated tokens for a known exclusive-shelf value so multi-tag
 * cells like "currently-reading, fantasy" do not collapse to Want to Read.
 */
function resolveGoodreadsStatus(row) {
  const exclusive = cell(row, ['exclusive shelf', 'shelf', 'status'])
  if (exclusive) {
    const mapped = matchGoodreadsShelf(exclusive)
    if (mapped) return mapped
    // Exclusive shelf is sometimes free-form; still try token split.
    for (const token of exclusive.split(/[,;]/).map((part) => part.trim()).filter(Boolean)) {
      const tokenMapped = matchGoodreadsShelf(token)
      if (tokenMapped) return tokenMapped
    }
    return 'Want to Read'
  }

  const bookshelves = cell(row, ['bookshelves'])
  if (!bookshelves) return 'Want to Read'
  for (const token of bookshelves.split(/[,;]/).map((part) => part.trim()).filter(Boolean)) {
    const mapped = matchGoodreadsShelf(token)
    if (mapped) return mapped
  }
  return 'Want to Read'
}

function parseLooseDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  // Goodreads often uses YYYY/MM/DD
  const slash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (slash) {
    const [, y, m, d] = slash
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = Date.parse(raw)
  if (!Number.isFinite(parsed)) return ''
  const date = new Date(parsed)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function cleanIsbn(value) {
  return String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()
}

/**
 * Parse Goodreads- or StoryGraph-style CSV exports into normalized library books.
 * StoryGraph is detected from headers such as Read Status, Last Date Read, Dates Read, Star Rating.
 */
export function parseLibraryCsv(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Choose a non-empty CSV file to import.')
  }
  if (text.length > MAX_IMPORT_TEXT_LENGTH) {
    throw new Error('That library file is too large to import.')
  }

  const rows = splitCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) {
    throw new Error('That CSV file does not contain any books.')
  }

  const headers = parseCsvLine(rows[0]).map(normalizeHeaderKey)
  if (!headers.some((header) => header === 'title' || header === 'book title')) {
    throw new Error('CSV must include a Title column (Goodreads or StoryGraph export works).')
  }

  const headerSet = new Set(headers)
  const storygraph = isStoryGraphCsv(headerSet)
  const hasDatesRead = headerSet.has('dates read')

  const books = []
  const seenIds = new Set()

  for (let index = 1; index < rows.length; index += 1) {
    const cells = parseCsvLine(rows[index])
    if (!cells.some((value) => String(value || '').trim())) continue

    const row = {}
    headers.forEach((header, headerIndex) => {
      if (header) row[header] = cells[headerIndex] ?? ''
    })

    const title = cell(row, ['title', 'book title'])
    if (!title) continue

    const author = cell(row, ['authors', 'author', 'author l f', 'additional authors']) || 'Unknown author'
    const isbn = cleanIsbn(cell(row, ['isbn uid', 'isbn13', 'isbn 13', 'isbn']))
    const pageCount = asNumber(cell(row, ['number of pages', 'pages', 'page count']))
    const rating = Math.min(5, asNumber(cell(row, ['star rating', 'my rating', 'rating', 'stars'])))
    const status = storygraph ? resolveStoryGraphStatus(row) : resolveGoodreadsStatus(row)
    let finishedAt = parseLooseDate(cell(row, [
      'last date read',
      'date read',
      'date finished',
      'finished at',
      'finished',
    ]))
    let startedAt = parseLooseDate(cell(row, ['date started', 'started at', 'started']))
    let reads = []
    if (hasDatesRead) {
      reads = parseStoryGraphDatesRead(row['dates read'] || '')
      const lastRead = reads[reads.length - 1]
      if (lastRead?.finishedAt) finishedAt = lastRead.finishedAt
      if (!startedAt && reads[0]?.startedAt) startedAt = reads[0].startedAt
    }
    const createdAt = parseLooseDate(cell(row, ['date added', 'created at', 'added']))
    const notes = cell(row, ['review', 'my review', 'private notes', 'notes'])
    const shelves = cell(row, ['tags', 'bookshelves'])
    const tags = shelves
      ? shelves
        .split(/[,;]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((tag) => storygraph || !matchGoodreadsShelf(tag))
      : []

    const draft = {
      title,
      author,
      isbn: isValidIsbn(isbn) ? isbn : '',
      pageCount,
      rating,
      status,
      notes,
      tags,
      finishedAt,
      startedAt,
      format: mapBookFormat(cell(row, ['format', 'binding'])),
      reads: hasDatesRead ? reads : undefined,
      createdAt: createdAt || undefined,
      currentPage: status === 'Finished' && pageCount ? pageCount : 0,
    }

    const book = pickBookFields(normalizeBook({ ...draft, shelfId: DEFAULT_SHELF_ID }, index - 1))
    if (seenIds.has(book.id)) book.id = makeId(book.title, index)
    seenIds.add(book.id)
    books.push(book)
  }

  if (!books.length) {
    throw new Error('That CSV file does not contain any books.')
  }
  if (books.length > MAX_BOOKS_IMPORT) {
    throw new Error(`Library imports are limited to ${MAX_BOOKS_IMPORT} books.`)
  }

  const shelves = [createDefaultShelf()]
  return {
    books,
    shelves,
    count: books.length,
    format: 'csv',
    version: null,
  }
}

function looksLikeCsv(text) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || ''
  if (!firstLine.includes(',')) return false
  const headers = parseCsvLine(firstLine).map(normalizeHeaderKey)
  return headers.includes('title') || headers.includes('book title')
}

/**
 * Parse a library transfer file. Supports versioned JSON, bare book arrays,
 * and Goodreads- or StoryGraph-style CSV exports.
 */
export function parseLibraryFile(text, filename = '') {
  const name = String(filename || '').toLowerCase()
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) throw new Error('Choose a non-empty library file to import.')
  if (typeof text === 'string' && text.length > MAX_IMPORT_TEXT_LENGTH) {
    throw new Error('That library file is too large to import.')
  }

  if (name.endsWith('.csv') || (!name.endsWith('.json') && looksLikeCsv(trimmed))) {
    return parseLibraryCsv(text)
  }

  try {
    return parseLibraryImport(text)
  } catch (error) {
    if (looksLikeCsv(trimmed)) return parseLibraryCsv(text)
    throw error
  }
}

function isValidIsbn(isbn) {
  if (/^\d{13}$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
      0
    )
    return sum % 10 === 0
  }
  if (!/^\d{9}[\dX]$/.test(isbn)) return false
  const sum = [...isbn].reduce(
    (total, digit, index) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - index),
    0
  )
  return sum % 11 === 0
}

async function fetchAuthorName(author) {
  const key = typeof author?.key === 'string' ? author.key : ''
  if (!/^\/authors\/OL\d+A$/.test(key)) return ''
  try {
    const response = await fetch(`https://openlibrary.org${key}.json`)
    if (!response.ok) return ''
    const data = await response.json()
    return typeof data.name === 'string' ? data.name : ''
  } catch {
    return ''
  }
}

export async function lookupBookByIsbn(value) {
  const isbn = String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()
  if (!isValidIsbn(isbn)) {
    throw new Error('Enter a valid ISBN-10 or ISBN-13.')
  }

  const response = await fetch(
    `https://openlibrary.org/isbn/${encodeURIComponent(isbn)}.json`
  )
  if (response.status === 404) throw new Error('No book was found for that ISBN.')
  if (!response.ok) throw new Error('The book lookup is unavailable. Please try again.')

  const book = await response.json()
  const authorNames = await Promise.all((book.authors || []).map(fetchAuthorName))
  const coverId = Array.isArray(book.covers)
    ? book.covers.map(Number).find((id) => Number.isInteger(id) && id > 0)
    : null

  return {
    title: typeof book.title === 'string' ? book.title : '',
    author: authorNames.filter(Boolean).join(', '),
    pageCount: asNumber(book.number_of_pages),
    isbn,
    coverUrl: coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
      : `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
  }
}

export async function searchAcclaimedBooks(value, signal) {
  const query = String(value || '').trim()
  if (query.length < 2) return []

  const params = new URLSearchParams({
    q: query,
    fields: 'key,title,author_name,cover_i,first_publish_year,ratings_average,ratings_count',
    limit: '20',
  })
  const response = await fetch(`https://openlibrary.org/search.json?${params}`, { signal })
  if (!response.ok) throw new Error('Book suggestions are unavailable right now.')

  const data = await response.json()
  return (Array.isArray(data.docs) ? data.docs : [])
    .map((book, relevanceRank) => {
      const rating = Number(book.ratings_average) || 0
      const ratingsCount = asNumber(book.ratings_count)
      const coverI = Number(book.cover_i)
      return {
        id: typeof book.key === 'string' ? book.key.replaceAll('/', '-') : `suggestion-${relevanceRank}`,
        title: typeof book.title === 'string' ? book.title : 'Untitled book',
        author: Array.isArray(book.author_name) ? book.author_name.filter(Boolean).join(', ') : '',
        firstPublishYear: asNumber(book.first_publish_year),
        rating,
        ratingsCount,
        coverUrl: Number.isInteger(coverI) && coverI > 0
          ? `https://covers.openlibrary.org/b/id/${coverI}-M.jpg`
          : '',
        acclaimScore: rating * Math.log10(ratingsCount + 1),
        relevanceRank,
      }
    })
    .sort((a, b) => b.acclaimScore - a.acclaimScore || a.relevanceRank - b.relevanceRank)
    .slice(0, 8)
    .map((book, index) => ({ ...book, acclaimRank: index + 1 }))
}

function bookRandom(index, salt) {
  const value = Math.sin((index + 1) * 91.345 + salt * 17.123) * 43758.5453
  return value - Math.floor(value)
}

/** Sort keys shown in the library list. */
export const LIBRARY_SORT_OPTIONS = [
  { value: 'shelf', label: 'Shelf order' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'author', label: 'Author A–Z' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'finished', label: 'Recently finished' },
  { value: 'recent', label: 'Recently added' },
]

function compareText(a, b) {
  return String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base' })
}

function compareDateDesc(a, b) {
  const left = a ? Date.parse(a) : Number.NaN
  const right = b ? Date.parse(b) : Number.NaN
  const leftValid = Number.isFinite(left)
  const rightValid = Number.isFinite(right)
  if (leftValid && rightValid) return right - left
  if (leftValid) return -1
  if (rightValid) return 1
  return 0
}

/** Return a new array sorted by the given library sort key. */
export function sortLibrary(books, sortBy = 'shelf') {
  const list = Array.isArray(books) ? [...books] : []
  switch (sortBy) {
    case 'title':
      return list.sort((a, b) => compareText(a.title, b.title) || compareText(a.author, b.author))
    case 'author':
      return list.sort((a, b) => compareText(a.author, b.author) || compareText(a.title, b.title))
    case 'rating':
      return list.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)
        || compareText(a.title, b.title))
    case 'finished':
      return list.sort((a, b) => compareDateDesc(a.finishedAt, b.finishedAt)
        || compareText(a.title, b.title))
    case 'recent':
      return list.sort((a, b) => compareDateDesc(a.createdAt, b.createdAt)
        || compareText(a.title, b.title))
    case 'shelf':
    default:
      return list
  }
}

function yearFromDateString(value) {
  if (typeof value !== 'string' || !value) return null
  const calendarDate = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?(?:$|T)/)
  if (calendarDate) return Number(calendarDate[1])
  const parsed = Date.parse(value)
  if (Number.isFinite(parsed)) return new Date(parsed).getFullYear()
  if (value.length >= 4) {
    const year = Number(value.slice(0, 4))
    return Number.isInteger(year) ? year : null
  }
  return null
}

function monthFromDateString(value) {
  if (typeof value !== 'string' || !value) return null
  const calendarDate = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?(?:$|T)/)
  if (calendarDate) {
    const month = Number(calendarDate[2])
    return month >= 1 && month <= 12 ? month - 1 : null
  }
  const parsed = Date.parse(value)
  if (Number.isFinite(parsed)) return new Date(parsed).getMonth()
  // YYYY-MM or YYYY-MM-DD without full parse
  if (value.length >= 7 && value[4] === '-') {
    const month = Number(value.slice(5, 7))
    if (Number.isInteger(month) && month >= 1 && month <= 12) return month - 1
  }
  return null
}

/**
 * Aggregate reading stats for the library panel dashboard.
 * pagesRead counts finished pageCount plus in-progress currentPage.
 */
export function computeLibraryStats(library, now = new Date()) {
  const books = Array.isArray(library) ? library : []
  const year = now.getFullYear()
  const byStatus = Object.fromEntries(READING_STATUSES.map((status) => [status, 0]))
  const ratingCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let finishedThisYear = 0
  let pagesRead = 0
  let pagesFinishedThisYear = 0
  let ratingSum = 0
  let ratedCount = 0

  for (const book of books) {
    const status = READING_STATUSES.includes(book.status) ? book.status : 'Want to Read'
    byStatus[status] += 1

    const rating = Math.min(5, Math.max(0, Math.round(Number(book.rating) || 0)))
    ratingCounts[rating] += 1
    if (rating > 0) {
      ratingSum += rating
      ratedCount += 1
    }

    if (status === 'Finished') {
      const pages = asNumber(book.pageCount)
      pagesRead += pages
      if (yearFromDateString(book.finishedAt) === year) {
        finishedThisYear += 1
        pagesFinishedThisYear += pages
      }
    } else if (status === 'Reading') {
      pagesRead += asNumber(book.currentPage)
    }
  }

  return {
    total: books.length,
    byStatus,
    finishedThisYear,
    pagesRead,
    pagesFinishedThisYear,
    averageRating: ratedCount ? ratingSum / ratedCount : 0,
    ratedCount,
    ratingCounts,
    year,
  }
}

/* ------------------------------------------------------------------ */
/* Reading goals                                                       */
/* ------------------------------------------------------------------ */

export const READING_GOALS_STORAGE_KEY = 'bookshelf-reading-goals'
/** Soft caps so accidental huge inputs do not break the UI. */
export const READING_GOAL_MAX_BOOKS = 10_000
export const READING_GOAL_MAX_PAGES = 10_000_000

/**
 * Normalize a goals object. Zero means "no goal set" for that metric.
 * @returns {{ books: number, pages: number }}
 */
export function normalizeReadingGoals(value) {
  const books = Math.min(
    READING_GOAL_MAX_BOOKS,
    Math.max(0, Math.round(Number(value?.books) || 0)),
  )
  const pages = Math.min(
    READING_GOAL_MAX_PAGES,
    Math.max(0, Math.round(Number(value?.pages) || 0)),
  )
  return { books, pages }
}

/**
 * Load yearly reading goals from localStorage.
 * @param {number} [year]
 * @returns {{ books: number, pages: number }}
 */
export function loadReadingGoals(year = new Date().getFullYear()) {
  if (typeof window === 'undefined') return normalizeReadingGoals(null)
  try {
    const raw = window.localStorage.getItem(READING_GOALS_STORAGE_KEY)
    if (!raw) return normalizeReadingGoals(null)
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return normalizeReadingGoals(null)
    }

    // Per-year map: { "2026": { books, pages }, ... }
    const yearEntry = parsed[String(year)]
    if (yearEntry && typeof yearEntry === 'object') {
      return normalizeReadingGoals(yearEntry)
    }

    // Legacy flat shape { books, pages } with no year keys.
    const hasYearKeys = Object.keys(parsed).some((key) => /^\d{4}$/.test(key))
    if (!hasYearKeys && ('books' in parsed || 'pages' in parsed)) {
      return normalizeReadingGoals(parsed)
    }
  } catch {
    // Quota errors, private mode, or corrupt JSON — treat as unset.
  }
  return normalizeReadingGoals(null)
}

/**
 * Persist reading goals for a calendar year (merged into the year map).
 * @param {number} year
 * @param {{ books?: number, pages?: number }} goals
 */
export function saveReadingGoals(year, goals) {
  if (typeof window === 'undefined') return false
  const y = Number(year)
  if (!Number.isInteger(y) || y < 1970 || y > 2100) return false
  const next = normalizeReadingGoals(goals)
  try {
    let map = {}
    const raw = window.localStorage.getItem(READING_GOALS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (Object.keys(parsed).some((key) => /^\d{4}$/.test(key))) {
          map = { ...parsed }
        } else if ('books' in parsed || 'pages' in parsed) {
          // Migrate flat shape into the year map under the year being saved.
          map = { [String(y)]: normalizeReadingGoals(parsed) }
        }
      }
    }
    map[String(y)] = next
    window.localStorage.setItem(READING_GOALS_STORAGE_KEY, JSON.stringify(map))
    return true
  } catch {
    return false
  }
}

/**
 * Progress toward a single numeric goal. target 0 = inactive.
 * @returns {{ active: boolean, current: number, target: number, ratio: number, remaining: number, met: boolean }}
 */
export function computeGoalProgress(current, target) {
  const cur = Math.max(0, Math.round(Number(current) || 0))
  const tgt = Math.max(0, Math.round(Number(target) || 0))
  if (!tgt) {
    return { active: false, current: cur, target: 0, ratio: 0, remaining: 0, met: false }
  }
  return {
    active: true,
    current: cur,
    target: tgt,
    ratio: Math.min(1, cur / tgt),
    remaining: Math.max(0, tgt - cur),
    met: cur >= tgt,
  }
}

/**
 * Year-scoped reading review built on the same book fields as library stats.
 * Includes monthly finishes, ratings of finished books, and prior-year count.
 *
 * @param {unknown} library
 * @param {number | Date} [yearOrNow] calendar year, or Date (uses that year)
 */
export function computeYearInReview(library, yearOrNow = new Date()) {
  const year = yearOrNow instanceof Date
    ? yearOrNow.getFullYear()
    : (Number.isInteger(Number(yearOrNow)) ? Number(yearOrNow) : new Date().getFullYear())
  const books = Array.isArray(library) ? library : []
  const monthlyFinished = Array.from({ length: 12 }, () => 0)
  const ratingCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const finishedBooks = []
  let previousYearFinished = 0
  let pagesFinished = 0
  let ratingSum = 0
  let ratedCount = 0

  for (const book of books) {
    const status = READING_STATUSES.includes(book.status) ? book.status : 'Want to Read'
    if (status !== 'Finished') continue

    const finishedYear = yearFromDateString(book.finishedAt)
    if (finishedYear === year - 1) previousYearFinished += 1
    if (finishedYear !== year) continue

    const pages = asNumber(book.pageCount)
    pagesFinished += pages
    const rating = Math.min(5, Math.max(0, Math.round(Number(book.rating) || 0)))
    ratingCounts[rating] += 1
    if (rating > 0) {
      ratingSum += rating
      ratedCount += 1
    }

    const month = monthFromDateString(book.finishedAt)
    if (month != null) monthlyFinished[month] += 1

    finishedBooks.push({
      id: book.id,
      title: book.title || 'Untitled',
      author: book.author || '',
      rating,
      finishedAt: book.finishedAt || '',
      pageCount: pages,
      coverUrl: book.coverUrl || '',
      color: book.color || '',
    })
  }

  finishedBooks.sort((a, b) => {
    const byDate = compareDateDesc(a.finishedAt, b.finishedAt)
    if (byDate) return byDate
    return compareText(a.title, b.title)
  })

  const topRated = [...finishedBooks]
    .filter((book) => book.rating > 0)
    .sort((a, b) => b.rating - a.rating || compareDateDesc(a.finishedAt, b.finishedAt) || compareText(a.title, b.title))
    .slice(0, 5)

  return {
    year,
    finishedCount: finishedBooks.length,
    pagesFinished,
    averageRating: ratedCount ? ratingSum / ratedCount : 0,
    ratedCount,
    ratingCounts,
    monthlyFinished,
    previousYearFinished,
    books: finishedBooks,
    topRated,
  }
}

/** Usable inner width for packing spines onto a case. */
export function shelfInnerWidth(shelf) {
  const width = Number(shelf?.width)
  const bay = Number.isFinite(width) ? width : DEFAULT_SHELF_WIDTH
  return Math.max(0.4, bay - SHELF_SIDE_THICKNESS * 2 - SHELF_INNER_MARGIN)
}

function bookSalt(book, fallbackIndex = 0) {
  if (typeof book?.id === 'string' && book.id) {
    let hash = 0
    for (let i = 0; i < book.id.length; i += 1) {
      hash = (hash * 31 + book.id.charCodeAt(i)) >>> 0
    }
    return hash
  }
  return fallbackIndex
}

/** Deterministic spine width for capacity and layout. */
export function bookSpineWidth(book, fallbackIndex = 0) {
  return 0.54 + bookRandom(bookSalt(book, fallbackIndex), 1) * 0.18
}

/**
 * Pack books left-to-right, top-to-bottom into rows using natural spine widths.
 * Returns an array of rows (each row is an array of books in order).
 */
export function packBooksIntoRows(books, shelf) {
  const list = Array.isArray(books) ? books : []
  const inner = shelfInnerWidth(shelf)
  const rows = []
  let current = []
  let used = 0

  list.forEach((book, index) => {
    const width = bookSpineWidth(book, index)
    const needed = current.length === 0 ? width : width + SHELF_BOOK_GAP
    if (current.length > 0 && used + needed > inner + 1e-6) {
      rows.push(current)
      current = [book]
      used = width
    } else {
      current.push(book)
      used += needed
    }
  })
  if (current.length) rows.push(current)
  return rows
}

/** True when every book fits on the shelf without exceeding its row count. */
export function booksFitOnShelf(books, shelf) {
  const rows = Math.max(SHELF_ROWS_MIN, Math.min(SHELF_ROWS_MAX, Math.round(Number(shelf?.rows) || DEFAULT_SHELF_ROWS)))
  return packBooksIntoRows(books, shelf).length <= rows
}

/** Books assigned to a shelf, preserving library order. */
export function booksOnShelf(library, shelfId) {
  return (Array.isArray(library) ? library : []).filter((book) => book.shelfId === shelfId)
}

/**
 * Layout books for one physical row plank (centered, non-overlapping).
 * `library` is the row's books only; `rowSalt` keeps geometry stable across rows.
 */
export function buildShelfBooks(library, rowSalt = 0, shelf = null) {
  const shelfBooks = Array.isArray(library) ? library : []
  const geometry = shelfBooks.map((book, index) => {
    const salt = bookSalt(book, rowSalt * 100 + index)
    return {
      ...book,
      width: 0.54 + bookRandom(salt, 1) * 0.18,
      height: 1.02 + bookRandom(salt, 2) * 0.28,
      depth: 0.52 + bookRandom(salt, 3) * 0.16,
      tilt: bookRandom(salt, 4) > 0.84
        ? (bookRandom(salt, 5) - 0.5) * 0.16
        : 0,
    }
  })

  const gap = SHELF_BOOK_GAP
  let totalWidth = geometry.reduce((sum, book) => sum + book.width, 0)
    + Math.max(0, geometry.length - 1) * gap
  const inner = shelf ? shelfInnerWidth(shelf) : totalWidth
  const scale = totalWidth > inner && totalWidth > 0 ? inner / totalWidth : 1
  if (scale < 1) {
    for (const book of geometry) book.width *= scale
    totalWidth *= scale
  }

  let x = -totalWidth / 2
  return geometry.map((book) => {
    const position = [x + book.width / 2, book.height / 2, 0]
    x += book.width + gap * scale
    return { ...book, position }
  })
}

/**
 * Full case layout: array of rows (length === shelf.rows), each an array of
 * positioned books for that plank. Empty trailing rows are [].
 * Callers should run ensureLibraryCapacity on load/import so packed rows never
 * exceed shelf.rows; overflow rows are still omitted here (no invisible planks).
 */
export function buildShelfCaseLayout(books, shelf) {
  const normalized = normalizeShelf(shelf)
  const packed = packBooksIntoRows(books, normalized)
  const rows = []
  for (let rowIndex = 0; rowIndex < normalized.rows; rowIndex += 1) {
    const rowBooks = packed[rowIndex] || []
    rows.push(buildShelfBooks(rowBooks, rowIndex, normalized))
  }
  return rows
}

/**
 * World-space focus point for camera aim when a book is selected.
 * Uses packed layout so tall/wide cases aim at the book's actual plank.
 */
export function bookWorldFocusPosition(book, library, shelves, standOff = 3.2) {
  const list = Array.isArray(shelves) ? shelves : []
  const shelf = list.find((entry) => entry.id === book?.shelfId) || list[0]
  if (!shelf || !book) {
    return { x: 0, y: 1.5, z: 0, cameraX: 0, cameraZ: 4, id: book?.id }
  }

  const members = booksOnShelf(library, shelf.id)
  const layout = buildShelfCaseLayout(members, shelf)
  const rowYs = shelfRowYs(shelf.rows)
  let localX = 0
  let localY = (rowYs[Math.floor(rowYs.length / 2)] || shelfFrameHeight(shelf.rows) * 0.4) + 0.5
  let localZ = 0

  for (let rowIndex = 0; rowIndex < layout.length; rowIndex += 1) {
    const entry = layout[rowIndex].find((item) => item.id === book.id)
    if (!entry) continue
    localX = entry.position[0]
    localY = (rowYs[rowIndex] || 0) + entry.position[1]
    localZ = entry.position[2] || 0
    break
  }

  const yaw = shelf.yaw || 0
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  // Case group: position (shelf.x, 0, shelf.z), rotation Y = yaw.
  const bookX = shelf.x + localX * cos + localZ * sin
  const bookZ = shelf.z - localX * sin + localZ * cos
  // Aim at the book itself and place the camera in front of the case
  // (+Z local after yaw). Keeping these coordinates separate prevents an
  // off-axis camera from looking beside rotated cases.
  return {
    x: bookX,
    y: localY,
    z: bookZ,
    cameraX: bookX + sin * standOff,
    cameraZ: bookZ + cos * standOff,
    id: book.id,
  }
}

/** Local Y positions for plank centers inside a case group (origin at base). */
export function shelfRowYs(rows) {
  const count = clamp(Math.round(rows) || DEFAULT_SHELF_ROWS, SHELF_ROWS_MIN, SHELF_ROWS_MAX)
  const ys = []
  for (let i = 0; i < count; i += 1) {
    ys.push(0.25 + i * SHELF_ROW_SPACING)
  }
  return ys
}

export function shelfFrameHeight(rows) {
  const count = clamp(Math.round(rows) || DEFAULT_SHELF_ROWS, SHELF_ROWS_MIN, SHELF_ROWS_MAX)
  return count * SHELF_ROW_SPACING + 1.1
}

/**
 * Try to assign a book to a shelf. Returns { ok, books } or { ok:false, reason }.
 */
export function assignBookToShelf(library, bookId, shelfId, shelf) {
  const books = Array.isArray(library) ? library : []
  const next = books.map((book) => (book.id === bookId ? { ...book, shelfId } : book))
  const onShelf = booksOnShelf(next, shelfId)
  if (!booksFitOnShelf(onShelf, shelf)) {
    return { ok: false, reason: 'That shelf is full. Free space or resize it in Arrange mode.' }
  }
  return { ok: true, books: next }
}

/**
 * Reorder a book within its shelf (delta -1 or +1 among shelf mates).
 * Global array order is rewritten so shelf-relative order is preserved.
 */
export function reorderBookOnShelf(library, bookId, delta) {
  const books = Array.isArray(library) ? [...library] : []
  const book = books.find((entry) => entry.id === bookId)
  if (!book || !delta) return books

  const shelfId = book.shelfId
  const mates = books.filter((entry) => entry.shelfId === shelfId)
  const matePos = mates.findIndex((entry) => entry.id === bookId)
  const targetPos = matePos + delta
  if (matePos < 0 || targetPos < 0 || targetPos >= mates.length) return books

  return reorderBookToIndex(books, bookId, targetPos)
}

/**
 * Move a book to an absolute index among its shelf mates.
 * `targetIndex` is the insertion index after the book is removed from the
 * mate list (0 … mates.length - 1, or mates.length - 1 max after clamp for
 * append-at-end via insert after last remaining). Global array order is
 * rewritten so shelf-relative order (and localStorage / JSON export) stays durable.
 */
export function reorderBookToIndex(library, bookId, targetIndex) {
  const books = Array.isArray(library) ? [...library] : []
  const book = books.find((entry) => entry.id === bookId)
  if (!book) return books

  const shelfId = book.shelfId
  const mates = books.filter((entry) => entry.shelfId === shelfId)
  const from = mates.findIndex((entry) => entry.id === bookId)
  if (from < 0) return books

  const reordered = [...mates]
  const [moved] = reordered.splice(from, 1)
  if (reordered.length === 0) return books

  // After removal, valid insert slots are 0..reordered.length (append).
  const insertAt = Math.max(
    0,
    Math.min(reordered.length, Math.round(Number(targetIndex)) || 0),
  )
  // Final index equals insertAt; same order when insertAt === from.
  if (insertAt === from) return books

  reordered.splice(insertAt, 0, moved)

  let cursor = 0
  return books.map((entry) => (entry.shelfId === shelfId ? reordered[cursor++] : entry))
}

/**
 * Reorder a book only when the resulting order still fits its physical case.
 * Packing is order-dependent, so a reorder that looks like a simple swap can
 * otherwise create an extra row that the renderer cannot display.
 */
export function tryReorderBookOnShelf(library, bookId, delta, shelf) {
  const books = reorderBookOnShelf(library, bookId, delta)
  if (!shelf || !booksFitOnShelf(booksOnShelf(books, shelf.id), shelf)) {
    return {
      ok: false,
      reason: 'That reorder would exceed the shelf capacity. Resize the case or move a book first.',
    }
  }
  return { ok: true, books }
}

/**
 * Absolute-index variant of tryReorderBookOnShelf (for 3D drag-to-reorder).
 * Returns { ok, books, changed } or { ok:false, reason }.
 */
export function tryReorderBookToIndex(library, bookId, targetIndex, shelf) {
  const before = Array.isArray(library) ? library : []
  const books = reorderBookToIndex(before, bookId, targetIndex)
  if (!shelf || !booksFitOnShelf(booksOnShelf(books, shelf.id), shelf)) {
    return {
      ok: false,
      reason: 'That reorder would exceed the shelf capacity. Resize the case or move a book first.',
    }
  }
  const shelfId = before.find((entry) => entry.id === bookId)?.shelfId
  const changed = shelfId
    ? booksOnShelf(before, shelfId).some((book, index) => booksOnShelf(books, shelfId)[index]?.id !== book.id)
    : false
  return { ok: true, books, changed }
}

/**
 * Map a point in shelf-local coordinates (x, y) to an insertion index among
 * shelf mates after removing `draggingId`. Used by 3D spine drag-to-reorder.
 * Returns an integer in 0 … mates.length-1 (after removal slot count).
 */
export function insertionIndexFromLocalPoint(mates, shelf, localX, localY, draggingId) {
  const list = Array.isArray(mates) ? mates : []
  if (list.length === 0) return 0

  const without = list.filter((book) => book.id !== draggingId)
  if (without.length === 0) return 0

  const layout = buildShelfCaseLayout(without, shelf)
  const rowYs = shelfRowYs(shelf?.rows)
  const placed = []
  for (let rowIndex = 0; rowIndex < layout.length; rowIndex += 1) {
    const rowY = rowYs[rowIndex] || 0
    for (const entry of layout[rowIndex]) {
      placed.push({
        id: entry.id,
        x: entry.position[0],
        y: rowY + entry.position[1],
        width: entry.width,
      })
    }
  }
  if (placed.length === 0) return 0

  // Score gaps before, between, and after books (reading order).
  let bestIndex = 0
  let bestDist = Infinity
  for (let i = 0; i <= placed.length; i += 1) {
    let gx
    let gy
    if (i === 0) {
      gx = placed[0].x - placed[0].width / 2 - 0.12
      gy = placed[0].y
    } else if (i === placed.length) {
      const last = placed[placed.length - 1]
      gx = last.x + last.width / 2 + 0.12
      gy = last.y
    } else {
      const prev = placed[i - 1]
      const next = placed[i]
      gx = (prev.x + next.x) / 2
      gy = (prev.y + next.y) / 2
    }
    const dx = localX - gx
    const dy = localY - gy
    const dist = dx * dx + dy * dy * 1.35 // prefer horizontal matches slightly
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = i
    }
  }
  return bestIndex
}

/**
 * Propose a shelf transform. Rejects shrinks that would eject books.
 * Returns { ok, shelf } or { ok:false, reason }.
 */
export function applyShelfTransform(shelf, books, updates) {
  const next = normalizeShelf({ ...shelf, ...updates })
  const members = booksOnShelf(books, shelf.id)
  if (!booksFitOnShelf(members, next)) {
    return {
      ok: false,
      reason: 'Too many books for that size. Move some books first, or make the case larger.',
    }
  }
  return { ok: true, shelf: next }
}

/** Create a new empty shelf offset from existing ones. */
export function addEmptyShelf(shelves, draft = {}) {
  const list = Array.isArray(shelves) ? shelves : []
  const index = list.length
  const shelf = createShelf({
    name: draft.name || `Shelf ${index + 1}`,
    x: draft.x ?? (index === 0 ? 0 : list[list.length - 1].x + list[list.length - 1].width + 2.5),
    z: draft.z ?? 0,
    yaw: draft.yaw ?? 0,
    width: draft.width ?? DEFAULT_SHELF_WIDTH,
    rows: draft.rows ?? DEFAULT_SHELF_ROWS,
    ...draft,
  }, index)
  return [...list, shelf]
}

/**
 * Delete a shelf only when empty and not the last remaining case.
 * Returns { ok, shelves } or { ok:false, reason }.
 */
export function deleteEmptyShelf(shelves, books, shelfId) {
  const list = Array.isArray(shelves) ? shelves : []
  if (list.length <= 1) {
    return { ok: false, reason: 'Keep at least one shelf in your library.' }
  }
  if (booksOnShelf(books, shelfId).length > 0) {
    return { ok: false, reason: 'Move or remove all books before deleting this shelf.' }
  }
  if (!list.some((shelf) => shelf.id === shelfId)) {
    return { ok: false, reason: 'That shelf does not exist.' }
  }
  return { ok: true, shelves: list.filter((shelf) => shelf.id !== shelfId) }
}
