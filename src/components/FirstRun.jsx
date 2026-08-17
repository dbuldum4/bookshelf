import { useEffect, useRef, useState } from 'react'
import { parseLibraryFile } from '../library'

const MAX_IMPORT_BYTES = 5_000_000

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 80,
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'rgba(5, 1, 15, 0.62)',
}

const cardStyle = {
  width: 'min(440px, calc(100vw - 32px))',
  padding: '22px 22px 20px',
  color: '#fff',
  background: 'rgba(15, 14, 29, 0.92)',
  backdropFilter: 'blur(28px) saturate(145%)',
  WebkitBackdropFilter: 'blur(28px) saturate(145%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 18,
  boxShadow: '0 24px 70px rgba(0,0,0,0.52)',
  fontFamily,
  display: 'grid',
  gap: 12,
  outline: 'none',
}

const actionButton = (primary = false, disabled = false) => ({
  border: primary ? '1px solid rgba(169, 131, 255, 0.7)' : '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  cursor: disabled ? 'default' : 'pointer',
  color: '#fff',
  background: primary ? 'rgba(126, 91, 226, 0.82)' : 'rgba(255,255,255,0.08)',
  padding: '11px 14px',
  font: '600 14px/1.2 ' + fontFamily,
  textAlign: 'left',
  width: '100%',
  opacity: disabled ? 0.55 : 1,
})

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function getFocusableElements(root) {
  if (!root) return []
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) => el instanceof HTMLElement && el.offsetParent !== null
  )
}

export default function FirstRun({ onBrowseDemo, onStartEmpty, onImport, onStatus }) {
  const fileRef = useRef(null)
  const dialogRef = useRef(null)
  const liveRef = useRef(true)
  const importIdRef = useRef(0)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    liveRef.current = true
    return () => {
      liveRef.current = false
      importIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    const dialog = dialogRef.current
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

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const importId = importIdRef.current + 1
    importIdRef.current = importId
    setImporting(true)
    setError('')
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        const message = 'That file is too large to import (max 5 MB).'
        if (!liveRef.current || importId !== importIdRef.current) return
        setError(message)
        onStatus?.(message)
        return
      }
      const text = await file.text()
      const parsed = parseLibraryFile(text, file.name)
      if (!liveRef.current || importId !== importIdRef.current) return
      onImport({ books: parsed.books, shelves: parsed.shelves })
    } catch (caught) {
      if (!liveRef.current || importId !== importIdRef.current) return
      const message = caught instanceof Error ? caught.message : 'Could not import that library file.'
      setError(message)
      onStatus?.(message)
    } finally {
      if (liveRef.current && importId === importIdRef.current) setImporting(false)
    }
  }

  return (
    <div style={overlayStyle}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-title"
        data-modal="true"
        tabIndex={-1}
        style={cardStyle}
      >
        <p style={{ margin: 0, color: '#baa7ef', fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Welcome
        </p>
        <h2 id="first-run-title" style={{ margin: 0, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 26, fontWeight: 500 }}>
          Set up your library
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.68)', fontSize: 14, lineHeight: 1.55 }}>
          Browse a starter collection, start with empty shelves, or import a backup you already have.
        </p>
        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            onClick={onBrowseDemo}
            disabled={importing}
            style={actionButton(true, importing)}
          >
            Browse the demo library
          </button>
          <button
            type="button"
            onClick={onStartEmpty}
            disabled={importing}
            style={actionButton(false, importing)}
          >
            Start empty
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={actionButton(false, importing)}
          >
            {importing ? 'Importing…' : 'Import a file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,text/csv,.csv"
            aria-label="Import a library file"
            onChange={importFile}
            disabled={importing}
            style={{ display: 'none' }}
          />
        </div>
        {error && (
          <p role="alert" style={{ margin: 0, color: '#ffb4b4', fontSize: 12, lineHeight: 1.4 }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
