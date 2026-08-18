import { describe, expect, it } from 'vitest'
import { createHistory } from './history'

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

  it('clones snapshots so later mutations do not rewrite history', () => {
    const history = createHistory()
    const snapshot = snap('a')
    history.push(snapshot)
    snapshot.books[0].title = 'Mutated'

    expect(history.undo(snap('now')).books[0].title).toBe('Book a')
  })
})
