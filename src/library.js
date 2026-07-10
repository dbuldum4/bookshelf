const STORAGE_KEY = 'bookshelf-library-v1'

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

export function createLibrary() {
  return BOOKS.map(([id, title, author], index) => ({
    id,
    title,
    author,
    color: COLORS[index % COLORS.length],
    status: defaultStatus(index),
    notes: '',
  }))
}

export function loadLibrary() {
  const fallback = createLibrary()
  if (typeof window === 'undefined') return fallback

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    if (!Array.isArray(saved)) return fallback

    const savedById = new Map(saved.map((book) => [book.id, book]))
    return fallback.map((book) => {
      const savedBook = savedById.get(book.id)
      return savedBook
        ? {
            ...book,
            status: READING_STATUSES.includes(savedBook.status)
              ? savedBook.status
              : book.status,
            notes: typeof savedBook.notes === 'string' ? savedBook.notes : '',
          }
        : book
    })
  } catch {
    return fallback
  }
}

export function saveLibrary(library) {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(
      library.map(({ id, status, notes }) => ({ id, status, notes }))
    )
  )
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
