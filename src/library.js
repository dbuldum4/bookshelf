const STORAGE_KEY = 'bookshelf-library-v2'
const LEGACY_STORAGE_KEY = 'bookshelf-library-v1'

export const READING_STATUSES = ['Want to Read', 'Reading', 'Finished']

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

function normalizeBook(value, index) {
  const book = value && typeof value === 'object' ? value : {}
  const pageCount = asNumber(book.pageCount)
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
  }
}

export function createLibrary() {
  return BOOKS.map(([id, title, author], index) => normalizeBook({
    id,
    title,
    author,
    color: COLORS[index % COLORS.length],
    status: defaultStatus(index),
  }, index))
}

export function createBook(draft, index) {
  return normalizeBook({
    ...draft,
    id: makeId(draft.title, index),
    color: COLORS[index % COLORS.length],
    status: draft.status || 'Want to Read',
  }, index)
}

function readStoredLibrary(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key))
    return Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

export function loadLibrary() {
  const fallback = createLibrary()
  if (typeof window === 'undefined') return fallback

  const saved = readStoredLibrary(STORAGE_KEY)
  if (saved) return saved.map(normalizeBook)

  const legacy = readStoredLibrary(LEGACY_STORAGE_KEY)
  if (!legacy) return fallback

  const legacyById = new Map(
    legacy
      .filter((book) => book && typeof book === 'object' && typeof book.id === 'string')
      .map((book) => [book.id, book])
  )
  return fallback.map((book, index) => normalizeBook({
    ...book,
    ...legacyById.get(book.id),
  }, index))
}

export function saveLibrary(library) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
    return true
  } catch {
    return false
  }
}

export const LIBRARY_EXPORT_FORMAT = 'bookshelf-library'
export const LIBRARY_EXPORT_VERSION = 1

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
]

function pickBookFields(book) {
  const next = {}
  for (const field of BOOK_EXPORT_FIELDS) next[field] = book[field]
  return next
}

/** Build a portable, versioned snapshot of the full library. */
export function buildLibraryExport(library) {
  const books = (Array.isArray(library) ? library : []).map((book, index) =>
    pickBookFields(normalizeBook(book, index))
  )
  return {
    format: LIBRARY_EXPORT_FORMAT,
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    books,
  }
}

export function libraryToJson(library) {
  return `${JSON.stringify(buildLibraryExport(library), null, 2)}\n`
}

function extractImportedBooks(data) {
  if (Array.isArray(data)) return data

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
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

  if (Array.isArray(data.books)) return data.books
  if (Array.isArray(data.library)) return data.library

  throw new Error('Library JSON must include a books array.')
}

/**
 * Parse and validate a library JSON string.
 * Accepts the versioned export shape or a bare books array.
 * Returns normalized books that round-trip every library field.
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

  const rawBooks = extractImportedBooks(data)
  if (!rawBooks.length) {
    throw new Error('That library file does not contain any books.')
  }

  const seenIds = new Set()
  const books = rawBooks.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Book at position ${index + 1} is not a valid object.`)
    }

    const book = pickBookFields(normalizeBook(entry, index))
    if (seenIds.has(book.id)) {
      book.id = makeId(book.title, index)
    }
    seenIds.add(book.id)
    return book
  })

  return {
    books,
    count: books.length,
    format: data && typeof data === 'object' && !Array.isArray(data) ? data.format || null : null,
    version: data && typeof data === 'object' && !Array.isArray(data) ? data.version ?? null : null,
  }
}

/** Trigger a browser download of the library as JSON. */
export function downloadLibraryExport(library, filename) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('Export is only available in the browser.')
  }

  const json = libraryToJson(library)
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
  return { filename: name, count: Array.isArray(library) ? library.length : 0 }
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

export function buildShelfBooks(library, shelfIndex) {
  const start = shelfIndex * 10
  const shelfBooks = library.slice(start, start + 10)
  const geometry = shelfBooks.map((book, index) => {
    const globalIndex = start + index
    return {
      ...book,
      width: 0.54 + bookRandom(globalIndex, 1) * 0.18,
      height: 1.02 + bookRandom(globalIndex, 2) * 0.28,
      depth: 0.52 + bookRandom(globalIndex, 3) * 0.16,
      tilt: bookRandom(globalIndex, 4) > 0.84
        ? (bookRandom(globalIndex, 5) - 0.5) * 0.16
        : 0,
    }
  })
  const gap = 0.018
  const totalWidth = geometry.reduce((sum, book) => sum + book.width, 0)
    + Math.max(0, geometry.length - 1) * gap
  let x = -totalWidth / 2

  return geometry.map((book) => {
    const position = [x + book.width / 2, book.height / 2, 0]
    x += book.width + gap
    return { ...book, position }
  })
}
