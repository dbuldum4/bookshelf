/** Shared flag so play-mode book grabs don't also rotate the first-person look. */
let lookLocked = false

export function lockLook() {
  lookLocked = true
}

export function unlockLook() {
  lookLocked = false
}

export function isLookLocked() {
  return lookLocked
}

/** Force-clear (mode changes / unmount safety). */
export function resetLookLock() {
  lookLocked = false
}
