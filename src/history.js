export const COALESCE_IDLE_MS = 600

function cloneSnapshot(snapshot) {
  if (typeof structuredClone === 'function') {
    return structuredClone(snapshot)
  }
  return JSON.parse(JSON.stringify(snapshot))
}

/**
 * Linear undo/redo stack of library snapshots (`{ books, shelves }`).
 * `coalesce` keeps the first snapshot of a burst so undo restores the pre-edit library.
 */
export function createHistory(max = 40) {
  const limit = Math.max(1, Math.floor(Number(max)) || 40)
  const undoStack = []
  const redoStack = []
  let lastKey = null
  let lastKeyAt = null

  function clearCoalesce() {
    lastKey = null
    lastKeyAt = null
  }

  function push(snapshot) {
    undoStack.push(cloneSnapshot(snapshot))
    if (undoStack.length > limit) undoStack.shift()
    redoStack.length = 0
    clearCoalesce()
    return undoStack.length
  }

  function coalesce(snapshot, key, options) {
    const now = Number.isFinite(options?.now) ? options.now : Date.now()
    const ttl = Number.isFinite(options?.ttl) ? options.ttl : null
    const expired = ttl != null && (lastKeyAt == null || now - lastKeyAt > ttl)
    if (key != null && key === lastKey && undoStack.length > 0 && !expired) {
      lastKeyAt = now
      redoStack.length = 0
      return undoStack.length
    }
    undoStack.push(cloneSnapshot(snapshot))
    if (undoStack.length > limit) undoStack.shift()
    redoStack.length = 0
    lastKey = key ?? null
    lastKeyAt = now
    return undoStack.length
  }

  function endCoalesce() {
    clearCoalesce()
  }

  function undo(current) {
    if (!undoStack.length) return null
    const previous = undoStack.pop()
    if (current != null) redoStack.push(cloneSnapshot(current))
    clearCoalesce()
    return previous
  }

  function redo(current) {
    if (!redoStack.length) return null
    const next = redoStack.pop()
    if (current != null) undoStack.push(cloneSnapshot(current))
    clearCoalesce()
    return next
  }

  return {
    push,
    undo,
    redo,
    coalesce,
    endCoalesce,
    canUndo() {
      return undoStack.length > 0
    },
    canRedo() {
      return redoStack.length > 0
    },
  }
}
