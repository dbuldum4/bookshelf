import { describe, expect, it } from 'vitest'
import { buildYearInReviewCardModel } from './yearInReviewImage'

const library = [
  { id: 'a', title: 'Alpha', author: 'Ann', status: 'Finished', pageCount: 300, rating: 5, finishedAt: '2026-01-15' },
  { id: 'b', title: 'Beta', author: 'Bob', status: 'Finished', pageCount: 120, rating: 4, finishedAt: '2026-01-28' },
  { id: 'c', title: 'Gamma', author: 'Ann', status: 'Finished', pageCount: 200, rating: 3, finishedAt: '2026-06-02' },
  { id: 'd', title: 'Delta', author: 'Dee', status: 'Finished', pageCount: 90, rating: 5, finishedAt: '2025-12-01' },
  { id: 'e', title: 'Reading', author: 'Eve', status: 'Reading', pageCount: 400, currentPage: 40, rating: 0, finishedAt: '' },
  { id: 'f', title: 'Sixth', author: 'Sam', status: 'Finished', pageCount: 80, rating: 2, finishedAt: '2026-03-10' },
  { id: 'g', title: 'Seventh', author: 'Sol', status: 'Finished', pageCount: 40, rating: 5, finishedAt: '2026-07-01' },
]

describe('buildYearInReviewCardModel', () => {
  it('builds heading, counts, rating, and top five titles', () => {
    const model = buildYearInReviewCardModel(library, 2026)

    expect(model.year).toBe(2026)
    expect(model.heading).toBe('Bookshelf 2026')
    expect(model.finishedCount).toBe(5)
    expect(model.finishedLabel).toBe('5')
    expect(model.pagesFinished).toBe(740)
    expect(model.pagesLabel).toBe(new Intl.NumberFormat().format(740))
    expect(model.averageRating).toBeCloseTo(3.8)
    expect(model.ratedCount).toBe(5)
    expect(model.ratingLabel).toBe('3.8 ★')
    expect(model.topTitles).toEqual(['Seventh', 'Alpha', 'Beta', 'Gamma', 'Sixth'])
    expect(model.filename).toBe('bookshelf-2026-year-in-review.png')
  })

  it('falls back to finished titles when none are rated', () => {
    const model = buildYearInReviewCardModel([
      { id: 'u', title: 'Unrated', status: 'Finished', pageCount: 110, rating: 0, finishedAt: '2026-02-01' },
      { id: 'v', title: '', status: 'Finished', pageCount: 90, rating: 0, finishedAt: '2026-03-01' },
    ], 2026)

    expect(model.heading).toBe('Bookshelf 2026')
    expect(model.finishedCount).toBe(2)
    expect(model.pagesFinished).toBe(200)
    expect(model.pagesLabel).toBe(new Intl.NumberFormat().format(200))
    expect(model.averageRating).toBe(0)
    expect(model.ratingLabel).toBe('—')
    expect(model.topTitles).toEqual(['Untitled', 'Unrated'])
  })

  it('uses empty titles and an em dash when the year has no finishes', () => {
    const model = buildYearInReviewCardModel([], 2024)

    expect(model.year).toBe(2024)
    expect(model.heading).toBe('Bookshelf 2024')
    expect(model.finishedCount).toBe(0)
    expect(model.finishedLabel).toBe('0')
    expect(model.pagesFinished).toBe(0)
    expect(model.pagesLabel).toBe('0')
    expect(model.ratingLabel).toBe('—')
    expect(model.topTitles).toEqual([])
    expect(model.filename).toBe('bookshelf-2024-year-in-review.png')
  })
})
