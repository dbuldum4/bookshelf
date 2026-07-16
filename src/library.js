const STORAGE_KEY = 'bookshelf-library-v3'
const LEGACY_STORAGE_KEY_V2 = 'bookshelf-library-v2'
const LEGACY_STORAGE_KEY_V1 = 'bookshelf-library-v1'

export const READING_STATUSES = ['Want to Read', 'Reading', 'Finished']

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
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback
}

function normalizeTags(value) {
  const tags = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  return [...new Set(tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean))]
}

function normalizeQuotes(value) {
  const quotes = Array.isArray(value)
    ? value
    : typeof value === 'string' && value.trim()
      ? [value]
      : []
  return quotes
    .filter((quote) => typeof quote === 'string')
    .map((quote) => quote.trim())
    .filter(Boolean)
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
    ? book.shelfId
    : defaultShelfId
  return {
    id: typeof book.id === 'string' && book.id ? book.id : makeId(book.title, index),
    title: typeof book.title === 'string' && book.title.trim() ? book.title.trim() : 'Untitled book',
    author: typeof book.author === 'string' && book.author.trim() ? book.author.trim() : 'Unknown author',
    color: typeof book.color === 'string' ? book.color : COLORS[index % COLORS.length],
    status: READING_STATUSES.includes(book.status) ? book.status : 'Want to Read',
    notes: typeof book.notes === 'string' ? book.notes : '',
    rating: Math.min(5, asNumber(book.rating)),
    currentPage: Math.min(asNumber(book.currentPage), pageCount || Number.MAX_SAFE_INTEGER),
    pageCount,
    tags: normalizeTags(book.tags),
    quotes: normalizeQuotes(book.quotes),
    startedAt: typeof book.startedAt === 'string' ? book.startedAt : '',
    finishedAt: typeof book.finishedAt === 'string' ? book.finishedAt : '',
    isbn: typeof book.isbn === 'string' ? book.isbn : '',
    coverUrl: typeof book.coverUrl === 'string' ? book.coverUrl : '',
    createdAt: typeof book.createdAt === 'string' ? book.createdAt : new Date().toISOString(),
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
  const books = rawBooks.map((book, index) => {
    const normalized = normalizeBook(book, index, fallbackId)
    if (!shelfIds.has(normalized.shelfId)) normalized.shelfId = fallbackId
    return normalized
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

  const saved = readStoredJson(STORAGE_KEY)
  if (saved && typeof saved === 'object' && !Array.isArray(saved) && Array.isArray(saved.books)) {
    return finalizeLoadedState(saved)
  }
  // v3 accidentally saved as bare books array
  if (Array.isArray(saved)) return finalizeLoadedState(booksFromLegacyArray(saved))

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
    return true
  } catch {
    return false
  }
}

/** @deprecated Prefer saveLibraryState. Accepts a books array or full state. */
export function saveLibrary(libraryOrState) {
  if (Array.isArray(libraryOrState)) {
    return saveLibraryState({
      books: libraryOrState,
      shelves: [createDefaultShelf()],
    })
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
  const count = Array.isArray(libraryOrState)
    ? libraryOrState.length
    : Array.isArray(libraryOrState?.books)
      ? libraryOrState.books.length
      : 0
  return { filename: name, count }
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
  return null
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
 * Parse Goodreads-style or simple CSV exports into normalized library books.
 * Accepts headers like Title, Author, ISBN13, My Rating, Exclusive Shelf, Date Read.
 */
export function parseLibraryCsv(text) {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Choose a non-empty CSV file to import.')
  }

  const rows = splitCsvRows(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) {
    throw new Error('That CSV file does not contain any books.')
  }

  const headers = parseCsvLine(rows[0]).map(normalizeHeaderKey)
  if (!headers.some((header) => header === 'title' || header === 'book title')) {
    throw new Error('CSV must include a Title column (Goodreads export works).')
  }

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

    const author = cell(row, ['author', 'author l f', 'additional authors']) || 'Unknown author'
    const isbn = cleanIsbn(cell(row, ['isbn13', 'isbn 13', 'isbn']))
    const pageCount = asNumber(cell(row, ['number of pages', 'pages', 'page count']))
    const rating = Math.min(5, asNumber(cell(row, ['my rating', 'rating', 'stars'])))
    const status = resolveGoodreadsStatus(row)
    const finishedAt = parseLooseDate(cell(row, ['date read', 'date finished', 'finished at', 'finished']))
    const startedAt = parseLooseDate(cell(row, ['date started', 'started at', 'started']))
    const createdAt = parseLooseDate(cell(row, ['date added', 'created at', 'added']))
    const notes = cell(row, ['my review', 'private notes', 'notes', 'review'])
    const shelves = cell(row, ['bookshelves', 'tags'])
    const tags = shelves
      ? shelves.split(/[,;]/).map((tag) => tag.trim()).filter(Boolean)
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
 * and Goodreads-style CSV exports.
 */
export function parseLibraryFile(text, filename = '') {
  const name = String(filename || '').toLowerCase()
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) throw new Error('Choose a non-empty library file to import.')

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
    ? book.covers.find((id) => Number.isInteger(id) && id > 0)
    : null

  return {
    title: typeof book.title === 'string' ? book.title : '',
    author: authorNames.filter(Boolean).join(', '),
    pageCount: asNumber(book.number_of_pages),
    isbn,
    coverUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '',
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
      return {
        id: typeof book.key === 'string' ? book.key.replaceAll('/', '-') : `suggestion-${relevanceRank}`,
        title: typeof book.title === 'string' ? book.title : 'Untitled book',
        author: Array.isArray(book.author_name) ? book.author_name.filter(Boolean).join(', ') : '',
        firstPublishYear: asNumber(book.first_publish_year),
        rating,
        ratingsCount,
        coverUrl: Number.isInteger(book.cover_i) && book.cover_i > 0
          ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
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
  if (typeof value !== 'string' || value.length < 4) return null
  const year = Number(value.slice(0, 4))
  return Number.isInteger(year) ? year : null
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
      pagesRead += asNumber(book.pageCount)
      if (yearFromDateString(book.finishedAt) === year) finishedThisYear += 1
    } else if (status === 'Reading') {
      pagesRead += asNumber(book.currentPage)
    }
  }

  return {
    total: books.length,
    byStatus,
    finishedThisYear,
    pagesRead,
    averageRating: ratedCount ? ratingSum / ratedCount : 0,
    ratedCount,
    ratingCounts,
    year,
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

  const reordered = [...mates]
  const [moved] = reordered.splice(matePos, 1)
  reordered.splice(targetPos, 0, moved)

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
