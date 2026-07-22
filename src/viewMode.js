const STORAGE_KEY = 'bookshelf-view-mode'

export const VIEW_MODES = ['3d', 'normal']

export function loadViewMode() {
  if (typeof window === 'undefined') return '3d'
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return VIEW_MODES.includes(value) ? value : '3d'
  } catch {
    return '3d'
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
