/** World pose of the now-reading stand, just in front of room origin (+Z). */
export const LECTERN_POSITION = [0, 0, 3.55]

/** Desk pitch so the top faces the default walk camera. */
export const LECTERN_DESK_TILT = 0.48

export const LECTERN_MAX_BOOKS = 5
export const LECTERN_BOOK_SPACING = 0.46

const HIDDEN_MODES = new Set(['play', 'arrange'])

/** Shelf copies stay put — this is a display list only. */
export function nowReadingBooks(library) {
  return (Array.isArray(library) ? library : []).filter((book) => book?.status === 'Reading')
}

export function shouldShowLectern(mode, library) {
  if (HIDDEN_MODES.has(mode)) return false
  return nowReadingBooks(library).length > 0
}

/** Subtle float is visual-only; never add rigid bodies for the lectern. */
export function lecternShouldWobble(reducedMotion) {
  return !reducedMotion
}

export function lecternAddsRigidBodies() {
  return false
}

export function lecternDeskWidth(bookCount) {
  const count = Math.max(1, Math.min(LECTERN_MAX_BOOKS, Number(bookCount) || 1))
  return Math.max(1.35, count * LECTERN_BOOK_SPACING + 0.42)
}

/**
 * Local slots on the slanted desk (Y up from the plank).
 * Extra Reading books stay on their shelves only.
 */
export function lecternBookLayout(library) {
  const books = nowReadingBooks(library).slice(0, LECTERN_MAX_BOOKS)
  const spacing = LECTERN_BOOK_SPACING
  const startX = -((books.length - 1) * spacing) / 2
  return books.map((book, index) => ({
    id: book.id,
    book,
    position: [startX + index * spacing, 0.02, 0],
    rotation: [0, 0, 0],
    openAngle: 0.24,
    height: 0.9,
    depth: 0.52,
  }))
}
