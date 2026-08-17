import { useEffect, useId, useRef } from 'react'

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const HELP_ITEMS = [
  {
    title: 'Walk',
    detail: 'WASD to move, Space to jump, drag to look around.',
  },
  {
    title: 'Select books',
    detail: 'Arrow keys move between books. Home and End jump to the first or last book.',
  },
  {
    title: 'Escape',
    detail: 'Closes open panels and clears the selected book.',
  },
  {
    title: 'Arrange',
    detail: 'Drag cases on the floor to place them.',
  },
  {
    title: 'Play',
    detail: 'Drag books to grab them, then release to fling.',
  },
  {
    title: 'Normal / 3D',
    detail: 'Switch views from the top controls.',
  },
]

const dialogStyle = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 380,
  maxWidth: 'calc(100vw - 32px)',
  maxHeight: 'calc(100vh - 32px)',
  overflow: 'auto',
  color: '#fff',
  background: 'rgba(15, 14, 29, 0.88)',
  backdropFilter: 'blur(28px) saturate(145%)',
  WebkitBackdropFilter: 'blur(28px) saturate(145%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 16,
  boxShadow: '0 24px 70px rgba(0,0,0,0.52)',
  fontFamily,
  padding: '14px 14px 16px',
  display: 'grid',
  gap: 14,
  zIndex: 41,
  pointerEvents: 'auto',
  outline: 'none',
}

const sectionLabel = {
  margin: '0 0 4px',
  color: 'rgba(255,255,255,0.52)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
}

const triggerStyle = (open, reducedMotion = false) => ({
  border: '1px solid rgba(255,255,255,0.12)',
  cursor: 'pointer',
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  color: open ? '#fff' : 'rgba(255,255,255,0.85)',
  background: open ? 'rgba(255,255,255,0.16)' : 'rgba(20, 18, 35, 0.55)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  borderRadius: 12,
  boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  fontFamily,
  transition: reducedMotion ? 'none' : 'all 0.2s ease',
  pointerEvents: 'auto',
})

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(root) {
  if (!root) return []
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) => el instanceof HTMLElement && el.offsetParent !== null
  )
}

function triggerWrapStyle(is3D, besideSettings) {
  if (besideSettings) {
    // Sit immediately left of the Settings trigger (top: 16, right: 16, ~90px wide).
    return { position: 'absolute', top: 16, right: 114, zIndex: 30, pointerEvents: 'none' }
  }
  if (is3D) {
    return { position: 'absolute', top: 16, right: 16, zIndex: 30, pointerEvents: 'none' }
  }
  // Normal mode: header row, left of the "3D view" button.
  return { position: 'absolute', top: 12, right: 132, zIndex: 30, pointerEvents: 'none' }
}

function HelpOverlay({
  open,
  onOpenChange,
  reducedMotion = false,
  is3D = true,
  besideSettings = false,
}) {
  const panelId = useId()
  const titleId = useId()
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusables = getFocusableElements(dialog)
    if (focusables[0]) {
      focusables[0].focus()
    } else if (dialog) {
      dialog.focus()
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onOpenChange(false)
        return
      }

      if (event.key !== 'Tab' || !dialog) return

      const list = getFocusableElements(dialog)
      if (!list.length) {
        event.preventDefault()
        return
      }

      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    // Capture so Escape closes Help before App clears book selection.
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      if (trigger) {
        trigger.focus()
      } else if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [open, onOpenChange])

  return (
    <>
      {besideSettings && (
        <style>
          {`
            .scene-controls-bar { right: 188px; }
            @media (max-width: 768px) {
              .scene-controls-bar { right: 176px; }
            }
          `}
        </style>
      )}

      <div className="help-overlay-root" style={triggerWrapStyle(is3D, besideSettings)}>
        <div style={{ pointerEvents: 'auto' }}>
          <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-haspopup="dialog"
            title="Keyboard and mode help (?)"
            onClick={() => onOpenChange(!open)}
            style={triggerStyle(open, reducedMotion)}
          >
            Help
          </button>
        </div>
      </div>

      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => onOpenChange(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(0, 0, 0, 0.45)',
            }}
          />
          <div
            ref={dialogRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-modal="true"
            tabIndex={-1}
            style={dialogStyle}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <h2
                id={titleId}
                style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 20, fontWeight: 500 }}
              >
                Help
              </h2>
              <button
                type="button"
                aria-label="Close help"
                onClick={() => onOpenChange(false)}
                style={{
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.62)',
                  background: 'transparent',
                  borderRadius: 8,
                  flex: '0 0 auto',
                }}
              >
                ×
              </button>
            </div>

            <p style={{ margin: 0, color: 'rgba(255,255,255,0.62)', fontSize: 13, lineHeight: 1.45 }}>
              Keyboard shortcuts and view modes.
            </p>

            <dl style={{ margin: 0, display: 'grid', gap: 12 }}>
              {HELP_ITEMS.map((item) => (
                <div key={item.title}>
                  <dt style={sectionLabel}>{item.title}</dt>
                  <dd style={{ margin: 0, color: 'rgba(255,255,255,0.86)', fontSize: 13, lineHeight: 1.45 }}>
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>

            <p style={{ margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.4 }}>
              Press ? to open or close this help.
            </p>
          </div>
        </>
      )}
    </>
  )
}

export default HelpOverlay
