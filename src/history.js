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

  function push(snapshot) {
    undoStack.push(cloneSnapshot(snapshot))
    if (undoStack.length > limit) undoStack.shift()
    redoStack.length = 0
    lastKey = null
    return undoStack.length
  }

  function coalesce(snapshot, key) {
    if (key != null && key === lastKey && undoStack.length > 0) {
      redoStack.length = 0
      return undoStack.length
    }
    undoStack.push(cloneSnapshot(snapshot))
    if (undoStack.length > limit) undoStack.shift()
    redoStack.length = 0
    lastKey = key ?? null
    return undoStack.length
  }

  function undo(current) {
    if (!undoStack.length) return null
    const previous = undoStack.pop()
    if (current != null) redoStack.push(cloneSnapshot(current))
    lastKey = null
    return previous
  }

  function redo(current) {
    if (!redoStack.length) return null
    const next = redoStack.pop()
    if (current != null) undoStack.push(cloneSnapshot(current))
    lastKey = null
    return next
  }

  return {
    push,
    undo,
    redo,
    coalesce,
    canUndo() {
      return undoStack.length > 0
    },
    canRedo() {
      return redoStack.length > 0
    },
  }
}
