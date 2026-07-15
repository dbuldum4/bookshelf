import { describe, expect, it, vi } from 'vitest'
import { getWebGLContext, isWebGLAvailable } from './webgl'

describe('WebGL availability', () => {
  it('accepts a WebGL2 or WebGL context', () => {
    const context = {}
    const canvas = { getContext: vi.fn((type) => type === 'webgl2' ? context : null) }
    const documentRef = { createElement: vi.fn(() => canvas) }

    expect(getWebGLContext(canvas)).toBe(context)
    expect(isWebGLAvailable(documentRef)).toBe(true)
  })

  it('returns false when context creation fails', () => {
    const documentRef = {
      createElement: () => ({ getContext: () => { throw new Error('WebGL disabled') } }),
    }

    expect(isWebGLAvailable(documentRef)).toBe(false)
    expect(isWebGLAvailable(null)).toBe(false)
  })
})
