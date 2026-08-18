import { useEffect, useId, useRef, useState } from 'react'
import { HELP_DIALOG_ID } from './HelpOverlay'

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const graphicsQualityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const panelStyle = {
  position: 'absolute',
  top: 60,
  right: 0,
  width: 300,
  maxWidth: 'calc(100vw - 32px)',
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
  zIndex: 30,
  pointerEvents: 'auto',
  outline: 'none',
}

const sectionLabel = {
  margin: '0 0 8px',
  color: 'rgba(255,255,255,0.52)',
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
}

const chipRow = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  padding: 4,
  background: 'rgba(255,255,255,0.05)',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
}

const chipStyle = (active, reducedMotion = false) => ({
  border: 'none',
  cursor: 'pointer',
  padding: '8px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: active ? '#fff' : 'rgba(255,255,255,0.62)',
  background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
  borderRadius: 8,
  transition: reducedMotion ? 'none' : 'all 0.2s ease',
  flex: '1 1 auto',
  minWidth: 'fit-content',
})

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

function SettingsPanel({
  galaxyMode,
  setGalaxyMode,
  graphicsQuality,
  setGraphicsQuality,
  reducedMotion,
  setReducedMotion,
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const dialog = dialogRef.current
    const trigger = triggerRef.current
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    // Move focus into the dialog once it mounts.
    const focusables = getFocusableElements(dialog)
    if (focusables[0]) {
      focusables[0].focus()
    } else if (dialog) {
      dialog.focus()
    }

    const onPointerDown = (event) => {
      // Help portals to document.body. Treat that layer as stacked, not outside.
      if (document.getElementById(HELP_DIALOG_ID)) return
      const target = event.target
      if (target instanceof Element && target.closest('[data-help-layer], [data-help-backdrop], .help-overlay-root')) {
        return
      }
      if (rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false)
      }
    }

    // Capture phase so Escape is handled before App's bubble listener clears selection.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (document.getElementById(HELP_DIALOG_ID)) return
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
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

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
      // Restore focus to the Settings trigger (or previous focus) on close.
      if (trigger) {
        trigger.focus()
      } else if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus()
      }
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="settings-panel-root"
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 30,
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', pointerEvents: 'auto' }}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
          style={triggerStyle(open, reducedMotion)}
        >
          Settings
        </button>
      </div>

      {open && (
        <div
          ref={dialogRef}
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
          data-modal="true"
          tabIndex={-1}
          style={panelStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <h2 style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 20, fontWeight: 500 }}>
              Settings
            </h2>
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => setOpen(false)}
              style={{
                ...chipStyle(false, reducedMotion),
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '6px 10px',
                flex: '0 0 auto',
              }}
            >
              ×
            </button>
          </div>

          <section>
            <h3 style={sectionLabel}>Galaxy style</h3>
            <div style={chipRow} role="group" aria-label="Galaxy style">
              {['realistic', 'pixelated'].map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={galaxyMode === value}
                  aria-label={`${value === 'pixelated' ? 'Pixelated' : 'Realistic'} galaxy style`}
                  title={`${value === 'pixelated' ? 'Pixelated' : 'Realistic'} galaxy style`}
                  onClick={() => setGalaxyMode(value)}
                  style={chipStyle(galaxyMode === value, reducedMotion)}
                >
                  {value === 'pixelated' ? 'Pixelated' : 'Realistic'}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 style={sectionLabel}>Graphics quality</h3>
            <div style={chipRow} role="group" aria-label="Graphics quality">
              {graphicsQualityOptions.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={graphicsQuality === value}
                  aria-label={`${label} graphics quality`}
                  title={`${label} graphics quality`}
                  onClick={() => setGraphicsQuality(value)}
                  style={chipStyle(graphicsQuality === value, reducedMotion)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 style={sectionLabel}>Motion</h3>
            <div style={chipRow} role="group" aria-label="Motion preference">
              <button
                type="button"
                aria-pressed={reducedMotion}
                aria-label={reducedMotion ? 'Reduced motion on' : 'Reduced motion off'}
                title={reducedMotion ? 'Reduced motion is on' : 'Reduce motion'}
                onClick={() => setReducedMotion(!reducedMotion)}
                style={chipStyle(reducedMotion, reducedMotion)}
              >
                Reduce motion
              </button>
            </div>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 1.4 }}>
              Graphics quality, galaxy style, and motion preference are saved in this browser.
            </p>
          </section>
        </div>
      )}
    </div>
  )
}

export default SettingsPanel
