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
  if (Array.isArray(value)) return value.filter((tag) => typeof tag === 'string' && tag.trim())
  if (typeof value !== 'string') return []
  return value.split(',').map((tag) => tag.trim()).filter(Boolean)
}

function normalizeBook(book, index) {
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

export function loadLibrary() {
  const fallback = createLibrary()
  if (typeof window === 'undefined') return fallback

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (Array.isArray(saved)) return saved.map(normalizeBook)

    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY))
    if (!Array.isArray(legacy)) return fallback

    const legacyById = new Map(legacy.map((book) => [book.id, book]))
    return fallback.map((book, index) => normalizeBook({
      ...book,
      ...legacyById.get(book.id),
    }, index))
  } catch {
    return fallback
  }
}

export function saveLibrary(library) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(library))
}

export async function lookupBookByIsbn(value) {
  const isbn = String(value || '').replace(/[^0-9Xx]/g, '').toUpperCase()
  if (isbn.length !== 10 && isbn.length !== 13) {
    throw new Error('Enter a valid 10- or 13-digit ISBN.')
  }

  const response = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`
  )
  if (!response.ok) throw new Error('The book lookup is unavailable. Please try again.')

  const data = await response.json()
  const book = data[`ISBN:${isbn}`]
  if (!book) throw new Error('No book was found for that ISBN.')

  return {
    title: book.title || '',
    author: book.authors?.map((author) => author.name).filter(Boolean).join(', ') || '',
    pageCount: asNumber(book.number_of_pages),
    isbn,
    coverUrl: book.cover?.medium || `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
  }
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
