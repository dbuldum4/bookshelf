import { describe, expect, it, vi } from 'vitest'
import {
  INSTANCE_COVERLESS_THRESHOLD,
  bucketInstancedSpines,
  countCoverlessBooks,
  disposeSpineInstanceResources,
  isCoverlessBook,
  partitionRowBooksForLod,
  quantizeSpineSize,
  shouldInstanceCoverlessSpines,
  shouldKeepUniqueBookMesh,
  spineInstanceBucketKey,
  spineStatusColor,
} from './instancedSpines'

describe('shouldInstanceCoverlessSpines', () => {
  it('is false in play mode even when quality is low or the library is huge', () => {
    expect(shouldInstanceCoverlessSpines({
      mode: 'play',
      graphicsQuality: 'low',
      coverlessCount: 400,
    })).toBe(false)
  })

  it('is true when graphics quality is low', () => {
    expect(shouldInstanceCoverlessSpines({
      mode: 'fixed',
      graphicsQuality: 'low',
      coverlessCount: 3,
    })).toBe(true)
  })

  it('is true when coverless count is more than 80', () => {
    expect(shouldInstanceCoverlessSpines({
      mode: 'custom',
      graphicsQuality: 'high',
      coverlessCount: INSTANCE_COVERLESS_THRESHOLD + 1,
    })).toBe(true)
  })

  it('stays unique at the 80 threshold on medium and high quality', () => {
    expect(shouldInstanceCoverlessSpines({
      mode: 'fixed',
      graphicsQuality: 'medium',
      coverlessCount: INSTANCE_COVERLESS_THRESHOLD,
    })).toBe(false)
    expect(shouldInstanceCoverlessSpines({
      mode: 'fixed',
      graphicsQuality: 'high',
      coverlessCount: INSTANCE_COVERLESS_THRESHOLD,
    })).toBe(false)
  })
})

describe('countCoverlessBooks', () => {
  it('counts books without a cover url', () => {
    expect(countCoverlessBooks([
      { id: 'a', coverUrl: '' },
      { id: 'b' },
      { id: 'c', coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg' },
    ])).toBe(2)
    expect(isCoverlessBook({ coverUrl: '' })).toBe(true)
    expect(isCoverlessBook({ coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg' })).toBe(false)
    expect(countCoverlessBooks(null)).toBe(0)
  })
})

describe('shouldKeepUniqueBookMesh', () => {
  it('keeps selected books, covers, and the reorder-drag source unique', () => {
    expect(shouldKeepUniqueBookMesh({ id: 'sel' }, { selectedBookId: 'sel' })).toBe(true)
    expect(shouldKeepUniqueBookMesh(
      { id: 'cover', coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg' },
      { selectedBookId: null },
    )).toBe(true)
    expect(shouldKeepUniqueBookMesh(
      { id: 'drag' },
      { reorderSourceId: 'drag' },
    )).toBe(true)
  })

  it('allows coverless unselected books to instance', () => {
    expect(shouldKeepUniqueBookMesh(
      { id: 'plain', color: '#b3303a' },
      { selectedBookId: 'other', reorderSourceId: null },
    )).toBe(false)
  })
})

describe('partitionRowBooksForLod', () => {
  const books = [
    { id: 'plain', color: '#b3303a', width: 0.6, height: 1.1, depth: 0.55 },
    { id: 'sel', color: '#2d5a8a', width: 0.6, height: 1.1, depth: 0.55 },
    { id: 'cover', coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg', width: 0.6, height: 1.1, depth: 0.55 },
    { id: 'drag', color: '#2e7d52', width: 0.6, height: 1.1, depth: 0.55 },
  ]

  it('keeps every book unique when instancing is off', () => {
    const { unique, instanced } = partitionRowBooksForLod(books, { instanceCoverless: false })
    expect(unique).toEqual(books)
    expect(instanced).toEqual([])
  })

  it('splits coverless unselected books into the instanced list', () => {
    const { unique, instanced } = partitionRowBooksForLod(books, {
      instanceCoverless: true,
      selectedBookId: 'sel',
      reorderSourceId: 'drag',
    })
    expect(unique.map((book) => book.id)).toEqual(['sel', 'cover', 'drag'])
    expect(instanced.map((book) => book.id)).toEqual(['plain'])
  })
})

describe('bucketInstancedSpines', () => {
  it('buckets by color and quantized size', () => {
    const buckets = bucketInstancedSpines([
      { id: 'a', color: '#B3303A', width: 0.54, height: 1.12, depth: 0.5, position: [0, 0.5, 0] },
      { id: 'b', color: '#b3303a', width: 0.56, height: 1.1, depth: 0.52, position: [1, 0.5, 0] },
      { id: 'c', color: '#2d5a8a', width: 0.54, height: 1.12, depth: 0.5, position: [2, 0.5, 0] },
    ])
    expect(buckets).toHaveLength(2)
    const red = buckets.find((bucket) => bucket.color.toLowerCase() === '#b3303a')
    const blue = buckets.find((bucket) => bucket.color.toLowerCase() === '#2d5a8a')
    expect(red.books.map((book) => book.id)).toEqual(['a', 'b'])
    expect(blue.books.map((book) => book.id)).toEqual(['c'])
    expect(spineInstanceBucketKey({ color: '#B3303A', width: 0.54, height: 1.12, depth: 0.5 }))
      .toBe(spineInstanceBucketKey({ color: '#b3303a', width: 0.56, height: 1.1, depth: 0.52 }))
    expect(quantizeSpineSize(0.54)).toBe(quantizeSpineSize(0.56))
  })
})

describe('spineStatusColor', () => {
  it('maps reading status for optional instanced LOD ribbons', () => {
    expect(spineStatusColor('Reading')).toBe('#d4af37')
    expect(spineStatusColor('Finished')).toBe('#3d8b57')
    expect(spineStatusColor('unknown')).toBe(null)
  })
})

describe('disposeSpineInstanceResources', () => {
  it('disposes geometry, material, and texture on unmount', () => {
    const texture = { dispose: vi.fn() }
    const geometry = { dispose: vi.fn() }
    const material = { dispose: vi.fn(), map: texture }
    disposeSpineInstanceResources([geometry, material, texture])
    expect(geometry.dispose).toHaveBeenCalledTimes(1)
    expect(material.dispose).toHaveBeenCalledTimes(1)
    expect(texture.dispose).toHaveBeenCalledTimes(1)
  })
})
