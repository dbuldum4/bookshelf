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
}

const actionButton = (primary = false) => ({
  border: primary ? '1px solid rgba(169, 131, 255, 0.7)' : '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  cursor: 'pointer',
  color: '#fff',
  background: primary ? 'rgba(126, 91, 226, 0.82)' : 'rgba(255,255,255,0.08)',
  padding: '11px 14px',
  font: '600 14px/1.2 ' + fontFamily,
  textAlign: 'left',
  width: '100%',
})

export default function FirstRun({ onBrowseDemo, onStartEmpty, onImport, onStatus }) {
  const fileRef = useRef(null)
  const dialogRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    const firstButton = dialog?.querySelector('button')
    if (firstButton instanceof HTMLElement) firstButton.focus()
  }, [])

  const importFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImporting(true)
    setError('')
    try {
      if (file.size > MAX_IMPORT_BYTES) {
        const message = 'That file is too large to import (max 5 MB).'
        setError(message)
        onStatus?.(message)
        return
      }
      const text = await file.text()
      const parsed = parseLibraryFile(text, file.name)
      onImport({ books: parsed.books, shelves: parsed.shelves })
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not import that library file.'
      setError(message)
      onStatus?.(message)
    } finally {
      setImporting(false)
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
          <button type="button" onClick={onBrowseDemo} style={actionButton(true)}>
            Browse the demo library
          </button>
          <button type="button" onClick={onStartEmpty} style={actionButton()}>
            Start empty
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            style={{ ...actionButton(), opacity: importing ? 0.55 : 1 }}
          >
            {importing ? 'Importing…' : 'Import a file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,text/csv,.csv"
            aria-label="Import a library file"
            onChange={importFile}
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
