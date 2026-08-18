import { describe, expect, it } from 'vitest'
import { COALESCE_IDLE_MS, createHistory } from './history'
import { bookFieldUpdatesAreNoOp } from './library'

function snap(id) {
  return {
    books: [{ id, title: `Book ${id}` }],
    shelves: [{ id: 'library', name: 'Library' }],
  }
}

describe('createHistory', () => {
  it('undoes and redoes library snapshots', () => {
    const history = createHistory()
    const before = snap('a')
    const after = snap('b')

    history.push(before)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)

    expect(history.undo(after)).toEqual(before)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(true)

    expect(history.redo(before)).toEqual(after)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
  })

  it('returns null when there is nothing to undo or redo', () => {
    const history = createHistory()
    expect(history.undo(snap('now'))).toBe(null)
    expect(history.redo(snap('now'))).toBe(null)
  })

  it('clears redo when a new snapshot is pushed', () => {
    const history = createHistory()
    history.push(snap('a'))
    history.undo(snap('b'))
    expect(history.canRedo()).toBe(true)

    history.push(snap('c'))
    expect(history.canRedo()).toBe(false)
    expect(history.redo(snap('c'))).toBe(null)
    expect(history.undo(snap('c'))).toEqual(snap('c'))
  })

  it('drops the oldest snapshot once the stack reaches max', () => {
    const history = createHistory(2)
    history.push(snap('a'))
    history.push(snap('b'))
    history.push(snap('c'))

    expect(history.undo(snap('now'))).toEqual(snap('c'))
    expect(history.undo(snap('c'))).toEqual(snap('b'))
    expect(history.undo(snap('b'))).toBe(null)
  })

  it('defaults the stack size to 40', () => {
    const history = createHistory()
    for (let index = 0; index < 41; index += 1) {
      history.push(snap(String(index)))
    }

    let remaining = 0
    let current = snap('now')
    while (true) {
      const previous = history.undo(current)
      if (!previous) break
      remaining += 1
      current = previous
    }
    expect(remaining).toBe(40)
  })

  it('coalesce keeps the first snapshot for the same key', () => {
    const history = createHistory()
    history.coalesce(snap('before'), 'title')
    history.coalesce(snap('mid'), 'title')
    history.coalesce(snap('late'), 'title')

    expect(history.undo(snap('now'))).toEqual(snap('before'))
    expect(history.undo(snap('before'))).toBe(null)
  })

  it('coalesce starts a new entry when the key changes', () => {
    const history = createHistory()
    history.coalesce(snap('rename-before'), 'rename')
    history.coalesce(snap('move-before'), 'move')

    expect(history.undo(snap('now'))).toEqual(snap('move-before'))
    expect(history.undo(snap('move-before'))).toEqual(snap('rename-before'))
  })

  it('push after coalesce starts a new undo group', () => {
    const history = createHistory()
    history.coalesce(snap('typed'), 'text')
    history.push(snap('added'))

    expect(history.undo(snap('now'))).toEqual(snap('added'))
    expect(history.undo(snap('added'))).toEqual(snap('typed'))
  })

  it('undo clears the coalesce key so the next burst is a new entry', () => {
    const history = createHistory()
    history.coalesce(snap('a'), 'text')
    const restored = history.undo(snap('b'))
    expect(restored).toEqual(snap('a'))

    history.coalesce(snap('c'), 'text')
    expect(history.undo(snap('d'))).toEqual(snap('c'))
  })

  it('still coalesces a single arrange-drag of the same shelf', () => {
    const history = createHistory()
    history.coalesce(snap('start'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 0 })
    history.coalesce(snap('mid'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 80 })
    history.coalesce(snap('end'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 200 })

    expect(history.undo(snap('now'))).toEqual(snap('start'))
    expect(history.undo(snap('start'))).toBe(null)
  })

  it('two sequential moves of the same shelf produce two undo steps after idle', () => {
    const history = createHistory()
    history.coalesce(snap('pre-1'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 0 })
    history.coalesce(snap('mid-1'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 50 })
    history.coalesce(snap('pre-2'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 50 + COALESCE_IDLE_MS + 1 })
    history.coalesce(snap('mid-2'), 'move:s1', { ttl: COALESCE_IDLE_MS, now: 50 + COALESCE_IDLE_MS + 40 })

    expect(history.undo(snap('now'))).toEqual(snap('pre-2'))
    expect(history.undo(snap('pre-2'))).toEqual(snap('pre-1'))
    expect(history.undo(snap('pre-1'))).toBe(null)
  })

  it('endCoalesce expires a move:shelfId key so the next drag is a new undo step', () => {
    const history = createHistory()
    history.coalesce(snap('pre-1'), 'move:s1')
    history.coalesce(snap('mid-1'), 'move:s1')
    history.endCoalesce()
    history.coalesce(snap('pre-2'), 'move:s1')

    expect(history.undo(snap('now'))).toEqual(snap('pre-2'))
    expect(history.undo(snap('pre-2'))).toEqual(snap('pre-1'))
  })

  it('does not grow history for no-op author and tags updates', () => {
    const history = createHistory()
    const book = { id: 'a', title: 'Dune', author: 'Frank Herbert', tags: ['sf', 'classic'] }
    const snapshot = { books: [book], shelves: [{ id: 'library', name: 'Library' }] }

    const recordUpdate = (updates) => {
      if (bookFieldUpdatesAreNoOp(book, updates)) return
      history.push(snapshot)
    }

    recordUpdate({ author: 'Frank Herbert' })
    recordUpdate({ tags: ['sf', 'classic'] })
    expect(history.canUndo()).toBe(false)

    recordUpdate({ author: 'Frank H.' })
    expect(history.canUndo()).toBe(true)
  })

  it('clones snapshots so later mutations do not rewrite history', () => {
    const history = createHistory()
    const snapshot = snap('a')
    history.push(snapshot)
    snapshot.books[0].title = 'Mutated'

    expect(history.undo(snap('now')).books[0].title).toBe('Book a')
  })
})
