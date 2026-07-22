const STORAGE_KEY = 'bookshelf-view-mode'
const MOBILE_BREAKPOINT = 768

export const VIEW_MODES = ['3d', 'normal']

function prefersNormalMode() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ||
    window.matchMedia('(pointer: coarse)').matches
  )
}

export function getDefaultViewMode() {
  return prefersNormalMode() ? 'normal' : '3d'
}

export function loadViewMode() {
  if (typeof window === 'undefined') return '3d'
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return VIEW_MODES.includes(value) ? value : getDefaultViewMode()
  } catch {
    return getDefaultViewMode()
  }
}

export function saveViewMode(value) {
  if (typeof window === 'undefined') return false
  if (!VIEW_MODES.includes(value)) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
    return true
  } catch {
    return false
  }
}
