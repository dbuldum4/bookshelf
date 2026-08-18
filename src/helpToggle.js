/** True when this keydown should toggle the Help overlay. */
export function isHelpToggleEvent(event) {
  if (!event || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
    return false
  }
  // Prefer the produced character so AZERTY Shift+, ("?") works.
  if (event.key === '?') return true
  // Some QWERTY browsers report Shift+Slash as key "/" instead of "?".
  // Require code Slash so AZERTY Shift+: (key "/") does not toggle Help.
  return event.key === '/' && event.shiftKey && event.code === 'Slash'
}
