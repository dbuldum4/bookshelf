/** Past this many coverless BookMeshes, canvas titles + 6 materials hitch typical scenes. */
export const INSTANCE_COVERLESS_THRESHOLD = 80

export const SPINE_STATUS_COLORS = {
  'Want to Read': '#8a8178',
  Reading: '#d4af37',
  Finished: '#3d8b57',
  Paused: '#64748b',
  'Did Not Finish': '#b7410e',
}

export function isCoverlessBook(book) {
  return !book?.coverUrl
}

export function countCoverlessBooks(books) {
  if (!Array.isArray(books)) return 0
  let count = 0
  for (const book of books) {
    if (isCoverlessBook(book)) count += 1
  }
  return count
}

export function shouldInstanceCoverlessSpines({
  coverlessCount = 0,
  graphicsQuality,
  mode,
} = {}) {
  if (mode === 'play') return false
  if (graphicsQuality === 'low') return true
  return coverlessCount > INSTANCE_COVERLESS_THRESHOLD
}

export function shouldKeepUniqueBookMesh(book, {
  selectedBookId = null,
  reorderSourceId = null,
} = {}) {
  if (!book) return true
  if (book.id === selectedBookId) return true
  if (reorderSourceId && book.id === reorderSourceId) return true
  if (book.coverUrl) return true
  return false
}

export function partitionRowBooksForLod(books, {
  instanceCoverless = false,
  selectedBookId = null,
  reorderSourceId = null,
} = {}) {
  const list = Array.isArray(books) ? books : []
  if (!instanceCoverless) {
    return { unique: list, instanced: [] }
  }

  const unique = []
  const instanced = []
  for (const book of list) {
    if (shouldKeepUniqueBookMesh(book, { selectedBookId, reorderSourceId })) {
      unique.push(book)
    } else {
      instanced.push(book)
    }
  }
  return { unique, instanced }
}

export function quantizeSpineSize(value, fallback = 0.6) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return Math.round(n * 20) / 20 || fallback
}

export function spineStatusColor(status) {
  return SPINE_STATUS_COLORS[status] || null
}

export function spineInstanceBucketKey(book) {
  const color = String(book?.color || '#888888').trim().toLowerCase() || '#888888'
  const width = quantizeSpineSize(book?.width)
  const height = quantizeSpineSize(book?.height, 1.15)
  const depth = quantizeSpineSize(book?.depth, 0.58)
  return `${color}|${width}x${height}x${depth}`
}

export function bucketInstancedSpines(books) {
  const buckets = new Map()
  for (const book of Array.isArray(books) ? books : []) {
    const key = spineInstanceBucketKey(book)
    let bucket = buckets.get(key)
    if (!bucket) {
      bucket = {
        key,
        color: book.color || '#888888',
        width: quantizeSpineSize(book.width),
        height: quantizeSpineSize(book.height, 1.15),
        depth: quantizeSpineSize(book.depth, 0.58),
        books: [],
      }
      buckets.set(key, bucket)
    }
    bucket.books.push(book)
  }
  return [...buckets.values()]
}

export function disposeSpineInstanceResources(resources) {
  if (!resources) return
  const list = Array.isArray(resources) ? resources : [resources]
  const seen = new Set()
  for (const item of list) {
    if (!item || seen.has(item)) continue
    seen.add(item)
    item.dispose?.()
    const map = item.map
    if (map && !seen.has(map)) {
      seen.add(map)
      map.dispose?.()
    }
  }
}
