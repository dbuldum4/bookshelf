import { useEffect, useId, useState } from 'react'
import {
  booksOnShelf,
  ROOM_PRESETS,
  SHELF_ROWS_MAX,
  SHELF_ROWS_MIN,
  SHELF_WIDTH_MAX,
  SHELF_WIDTH_MIN,
} from '../library'

const controlPanelStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 0,
  padding: 4,
  background: 'rgba(20, 18, 35, 0.55)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 12,
  boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  pointerEvents: 'auto',
}

const controlButtonStyle = (active, reducedMotion = false) => ({
  border: 'none',
  cursor: 'pointer',
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.2,
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
  borderRadius: 8,
  transition: reducedMotion ? 'none' : 'all 0.2s ease',
})

const modeLabels = {
  fixed: 'Walk',
  rotate: 'Rotate',
  custom: 'Orbit',
  arrange: 'Arrange',
  play: 'Play',
}

const fieldStyle = {
  width: '100%',
  height: 32,
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 8,
  color: '#fff',
  background: 'rgba(255,255,255,0.07)',
  padding: '0 8px',
  fontSize: 12,
  outline: 'none',
}

function Controls({
  mode,
  setMode,
  reducedMotion,
  onReset,
  shelves = [],
  selectedShelf,
  selectedShelfId,
  onSelectShelf,
  onRenameShelf,
  onTransformShelf,
  onAddShelf,
  onDeleteShelf,
  onApplyRoomPreset,
  books = [],
  onNormalMode,
}) {
  const [controlsOpen, setControlsOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(selectedShelf?.name || '')
  const controlsId = useId()
  const arrange = mode === 'arrange'
  const memberCount = selectedShelf ? booksOnShelf(books, selectedShelf.id).length : 0

  // Draft name while typing so the field can be cleared and retyped; commit on blur.
  useEffect(() => {
    setNameDraft(selectedShelf?.name || '')
  }, [selectedShelf?.id, selectedShelf?.name])

  return (
    <>
      <div className="scene-controls-bar">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={onNormalMode}
            style={{
              ...controlButtonStyle(false, reducedMotion),
              background: 'rgba(255,255,255,0.1)',
            }}
          >
            Normal mode
          </button>
        </div>
        <button
          type="button"
          className="scene-controls-toggle"
          aria-expanded={controlsOpen}
          aria-controls={controlsId}
          onClick={() => setControlsOpen((open) => !open)}
          style={controlButtonStyle(controlsOpen, reducedMotion)}
        >
          {controlsOpen ? 'Hide controls' : 'Controls'}
        </button>

        <div
          id={controlsId}
          className={`scene-controls-groups${controlsOpen ? ' is-expanded' : ''}`}
        >
          <div style={controlPanelStyle} role="group" aria-label="View mode">
            {Object.entries(modeLabels).map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                style={controlButtonStyle(mode === value, reducedMotion)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {(mode === 'fixed' || mode === 'play') && (
        <div
          className="scene-walk-hint"
          style={{
            position: 'absolute',
            left: 16,
            bottom: 24,
            zIndex: 20,
            color: 'rgba(255,255,255,0.62)',
            fontSize: 12,
            fontWeight: 500,
            background: 'rgba(20, 18, 35, 0.5)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '8px 12px',
            pointerEvents: 'none',
            maxWidth: 220,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          WASD move · drag to look
        </div>
      )}

      {mode === 'rotate' && (
        <div
          className="scene-walk-hint"
          style={{
            position: 'absolute',
            left: 16,
            bottom: 24,
            zIndex: 20,
            color: 'rgba(255,255,255,0.62)',
            fontSize: 12,
            fontWeight: 500,
            background: 'rgba(20, 18, 35, 0.5)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '8px 12px',
            pointerEvents: 'none',
            maxWidth: 220,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
          Auto-orbit around the room
        </div>
      )}

      {arrange && selectedShelf && (
        <div
          className="scene-arrange-panel"
          aria-label="Arrange shelf"
          style={{
            ...controlPanelStyle,
            position: 'absolute',
            right: 16,
            bottom: 24,
            width: 280,
            maxWidth: 'calc(100vw - 32px)',
            flexDirection: 'column',
            gap: 8,
            padding: 12,
            alignItems: 'stretch',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong style={{ color: '#fff', fontSize: 13 }}>Arrange shelves</strong>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
              {memberCount} book{memberCount === 1 ? '' : 's'}
            </span>
          </div>

          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
            ACTIVE SHELF
            <select
              aria-label="Active shelf"
              value={selectedShelfId}
              onChange={(event) => onSelectShelf(event.target.value)}
              style={{ ...fieldStyle, marginTop: 4 }}
            >
              {shelves.map((shelf) => (
                <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
              ))}
            </select>
          </label>

          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
            NAME
            <input
              aria-label="Shelf name"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => onRenameShelf?.(selectedShelf.id, nameDraft)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              style={{ ...fieldStyle, marginTop: 4 }}
            />
          </label>

          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
            WIDTH ({selectedShelf.width.toFixed(1)})
            <input
              aria-label="Shelf width"
              type="range"
              min={SHELF_WIDTH_MIN}
              max={SHELF_WIDTH_MAX}
              step={0.1}
              value={selectedShelf.width}
              onChange={(event) => onTransformShelf(selectedShelf.id, { width: Number(event.target.value) })}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>

          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
            ROWS ({selectedShelf.rows})
            <input
              aria-label="Shelf rows"
              type="range"
              min={SHELF_ROWS_MIN}
              max={SHELF_ROWS_MAX}
              step={1}
              value={selectedShelf.rows}
              onChange={(event) => onTransformShelf(selectedShelf.id, { rows: Number(event.target.value) })}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>

          <label style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 700, letterSpacing: 0.6 }}>
            YAW ({Math.round((selectedShelf.yaw * 180) / Math.PI)}°)
            <input
              aria-label="Shelf yaw"
              type="range"
              min={-Math.PI}
              max={Math.PI}
              step={0.01}
              value={selectedShelf.yaw}
              onChange={(event) => onTransformShelf(selectedShelf.id, { yaw: Number(event.target.value) })}
              style={{ width: '100%', marginTop: 4 }}
            />
          </label>

          <p style={{ margin: 0, color: 'rgba(255,255,255,0.48)', fontSize: 11, lineHeight: 1.35 }}>
            Drag a case on the floor to move it. Orbit the room to frame the layout.
          </p>

          <div role="group" aria-label="Room layout presets" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ROOM_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.id}
                title={preset.description}
                onClick={() => onApplyRoomPreset?.(preset.id)}
                style={{
                  ...controlButtonStyle(false, reducedMotion),
                  flex: '1 1 auto',
                  minWidth: '4.5rem',
                  background: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.88)',
                  fontSize: 12,
                  padding: '7px 10px',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              onClick={onAddShelf}
              style={{ ...controlButtonStyle(false, reducedMotion), flex: 1, background: 'rgba(126, 91, 226, 0.55)', color: '#fff' }}
            >
              + Shelf
            </button>
            <button
              type="button"
              onClick={() => onDeleteShelf(selectedShelf.id)}
              disabled={memberCount > 0 || shelves.length <= 1}
              style={{
                ...controlButtonStyle(false, reducedMotion),
                flex: 1,
                opacity: memberCount > 0 || shelves.length <= 1 ? 0.35 : 1,
              }}
              title={memberCount > 0 ? 'Empty the shelf before deleting' : shelves.length <= 1 ? 'Keep at least one shelf' : 'Delete shelf'}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {mode === 'play' && (
        <div className="scene-play-bar">
          <div
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontWeight: 500,
              background: 'rgba(20, 18, 35, 0.55)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '8px 18px',
            }}
          >
            Drag a book to grab it — release to fling
          </div>
          <button
            type="button"
            onClick={onReset}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(20, 18, 35, 0.55)',
              backdropFilter: 'blur(20px) saturate(140%)',
              WebkitBackdropFilter: 'blur(20px) saturate(140%)',
              borderRadius: 10,
              padding: '8px 16px',
              transition: reducedMotion ? 'none' : 'all 0.2s ease',
            }}
          >
            Reset
          </button>
        </div>
      )}
    </>
  )
}

export default Controls
