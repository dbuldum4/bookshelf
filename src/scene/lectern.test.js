import { describe, expect, it } from 'vitest'
import {
  LECTERN_MAX_BOOKS,
  LECTERN_POSITION,
  lecternAddsRigidBodies,
  lecternBookLayout,
  lecternDeskWidth,
  lecternShouldWobble,
  nowReadingBooks,
  shouldShowLectern,
} from './lectern'

const library = [
  { id: 'reading-a', title: 'A', status: 'Reading', shelfId: 'library' },
  { id: 'want', title: 'B', status: 'Want to Read', shelfId: 'library' },
  { id: 'finished', title: 'C', status: 'Finished', shelfId: 'library' },
  { id: 'reading-b', title: 'D', status: 'Reading', shelfId: 'other' },
]

describe('now-reading lectern', () => {
  it('shows only books with status Reading', () => {
    expect(nowReadingBooks(library).map((book) => book.id)).toEqual(['reading-a', 'reading-b'])
    expect(nowReadingBooks(null)).toEqual([])
  })

  it('hides the lectern when none are Reading', () => {
    const idle = library.map((book) => ({ ...book, status: 'Want to Read' }))
    expect(shouldShowLectern('fixed', idle)).toBe(false)
    expect(shouldShowLectern('custom', [])).toBe(false)
  })

  it('ignores the lectern in Play (no extra rigid bodies)', () => {
    expect(shouldShowLectern('play', library)).toBe(false)
    expect(lecternAddsRigidBodies()).toBe(false)
  })

  it('ignores the lectern in Arrange', () => {
    expect(shouldShowLectern('arrange', library)).toBe(false)
  })

  it('shows in Walk, Orbit, and Rotate when a book is Reading', () => {
    expect(shouldShowLectern('fixed', library)).toBe(true)
    expect(shouldShowLectern('custom', library)).toBe(true)
    expect(shouldShowLectern('rotate', library)).toBe(true)
  })

  it('places the lectern near the room origin', () => {
    expect(Math.hypot(LECTERN_POSITION[0], LECTERN_POSITION[2])).toBeLessThan(6)
    expect(LECTERN_POSITION[1]).toBe(0)
    expect(LECTERN_POSITION[2]).toBeGreaterThan(0)
  })

  it('does not remove Reading books from their shelves', () => {
    const slots = lecternBookLayout(library)
    expect(slots.map((slot) => slot.id)).toEqual(['reading-a', 'reading-b'])
    expect(library.map((book) => book.shelfId)).toEqual(['library', 'library', 'library', 'other'])
  })

  it('honors reducedMotion with no wobble', () => {
    expect(lecternShouldWobble(true)).toBe(false)
    expect(lecternShouldWobble(false)).toBe(true)
  })

  it('caps display copies so the desk stays compact', () => {
    const many = Array.from({ length: LECTERN_MAX_BOOKS + 3 }, (_, index) => ({
      id: `r-${index}`,
      status: 'Reading',
      shelfId: 'library',
    }))
    const slots = lecternBookLayout(many)
    expect(slots).toHaveLength(LECTERN_MAX_BOOKS)
    expect(slots[0].position[0]).toBeLessThan(0)
    expect(slots[slots.length - 1].position[0]).toBeGreaterThan(0)
    expect(lecternDeskWidth(slots.length)).toBeGreaterThan(1)
  })
})
