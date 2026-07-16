export function getWebGLContext(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return null
  const attrs = {
    failIfMajorPerformanceCaveat: options.failIfMajorPerformanceCaveat === true,
  }
  const types = ['webgl2', 'webgl', 'experimental-webgl']
  for (const type of types) {
    try {
      const gl = canvas.getContext(type, attrs)
      if (gl && typeof gl.isContextLost === 'function' && gl.isContextLost()) continue
      if (gl) return gl
    } catch {
      // try next
    }
  }
  return null
}

export function isWebGLAvailable(documentRef = globalThis.document) {
  if (!documentRef || typeof documentRef.createElement !== 'function') return false
  const canvas = documentRef.createElement('canvas')
  const gl = getWebGLContext(canvas)
  if (!gl) return false
  // release probe context if possible
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  } catch {}
  return true
}
