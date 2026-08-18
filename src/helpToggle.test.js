import { describe, expect, it } from 'vitest'
import { isHelpToggleEvent } from './helpToggle'

function event(partial) {
  return {
    defaultPrevented: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    key: '',
    code: '',
    ...partial,
  }
}

describe('isHelpToggleEvent', () => {
  it('toggles on "?" from any layout', () => {
    expect(isHelpToggleEvent(event({ key: '?' }))).toBe(true)
    expect(isHelpToggleEvent(event({ key: '?', code: 'Comma', shiftKey: true }))).toBe(true)
    expect(isHelpToggleEvent(event({ key: '?', code: 'Slash', shiftKey: true }))).toBe(true)
  })

  it('falls back to Shift+Slash when the browser reports "/"', () => {
    expect(isHelpToggleEvent(event({ key: '/', code: 'Slash', shiftKey: true }))).toBe(true)
  })

  it('does not treat AZERTY "/" (Shift+:) as help', () => {
    expect(isHelpToggleEvent(event({ key: '/', code: 'Period', shiftKey: true }))).toBe(false)
  })

  it('ignores unshifted slash, modifiers, and repeats', () => {
    expect(isHelpToggleEvent(event({ key: '/', code: 'Slash' }))).toBe(false)
    expect(isHelpToggleEvent(event({ key: '?', ctrlKey: true }))).toBe(false)
    expect(isHelpToggleEvent(event({ key: '?', metaKey: true }))).toBe(false)
    expect(isHelpToggleEvent(event({ key: '?', altKey: true }))).toBe(false)
    expect(isHelpToggleEvent(event({ key: '?', repeat: true }))).toBe(false)
    expect(isHelpToggleEvent(event({ key: '?', defaultPrevented: true }))).toBe(false)
  })
})
