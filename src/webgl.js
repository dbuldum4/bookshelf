export function getWebGLContext(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return null
  try {
    return canvas.getContext('webgl2')
      || canvas.getContext('webgl')
      || canvas.getContext('experimental-webgl')
  } catch {
    return null
  }
}

export function isWebGLAvailable(documentRef = globalThis.document) {
  if (!documentRef || typeof documentRef.createElement !== 'function') return false
  return Boolean(getWebGLContext(documentRef.createElement('canvas')))
}
