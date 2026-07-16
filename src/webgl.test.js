import { describe, expect, it, vi } from 'vitest'
import { getWebGLContext, isWebGLAvailable } from './webgl'

describe('WebGL availability', () => {
  it('accepts a WebGL2 or WebGL context', () => {
    const context = {
      isContextLost: () => false,
      getExtension: vi.fn(() => null),
    }
    const canvas = { getContext: vi.fn((type) => type === 'webgl2' ? context : null) }
    const documentRef = { createElement: vi.fn(() => canvas) }

    expect(getWebGLContext(canvas)).toBe(context)
    expect(isWebGLAvailable(documentRef)).toBe(true)
  })

  it('falls back when an earlier context type throws', () => {
    const context = {
      isContextLost: () => false,
      getExtension: vi.fn(() => null),
    }
    const canvas = {
      getContext: vi.fn((type) => {
        if (type === 'webgl2') throw new Error('webgl2 unavailable')
        if (type === 'webgl') return context
        return null
      }),
    }

    expect(getWebGLContext(canvas)).toBe(context)
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2', expect.any(Object))
    expect(canvas.getContext).toHaveBeenCalledWith('webgl', expect.any(Object))
  })

  it('skips a lost context and tries the next type', () => {
    const lost = { isContextLost: () => true }
    const healthy = {
      isContextLost: () => false,
      getExtension: vi.fn(() => null),
    }
    const canvas = {
      getContext: vi.fn((type) => {
        if (type === 'webgl2') return lost
        if (type === 'webgl') return healthy
        return null
      }),
    }

    expect(getWebGLContext(canvas)).toBe(healthy)
  })

  it('returns null for a null or invalid canvas', () => {
    expect(getWebGLContext(null)).toBe(null)
    expect(getWebGLContext({})).toBe(null)
    expect(getWebGLContext({ getContext: 'nope' })).toBe(null)
  })

  it('passes failIfMajorPerformanceCaveat only when true', () => {
    const context = { isContextLost: () => false }
    const canvas = { getContext: vi.fn(() => context) }

    getWebGLContext(canvas)
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2', {
      failIfMajorPerformanceCaveat: false,
    })

    canvas.getContext.mockClear()
    getWebGLContext(canvas, { failIfMajorPerformanceCaveat: true })
    expect(canvas.getContext).toHaveBeenCalledWith('webgl2', {
      failIfMajorPerformanceCaveat: true,
    })
  })

  it('releases the probe context when available', () => {
    const loseContext = vi.fn()
    const context = {
      isContextLost: () => false,
      getExtension: vi.fn((name) => (name === 'WEBGL_lose_context' ? { loseContext } : null)),
    }
    const canvas = { getContext: vi.fn(() => context) }
    const documentRef = { createElement: vi.fn(() => canvas) }

    expect(isWebGLAvailable(documentRef)).toBe(true)
    expect(context.getExtension).toHaveBeenCalledWith('WEBGL_lose_context')
    expect(loseContext).toHaveBeenCalled()
  })

  it('returns false when context creation fails', () => {
    const documentRef = {
      createElement: () => ({ getContext: () => { throw new Error('WebGL disabled') } }),
    }

    expect(isWebGLAvailable(documentRef)).toBe(false)
    expect(isWebGLAvailable(null)).toBe(false)
  })
})
