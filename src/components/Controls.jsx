const controlPanelStyle = {
  display: 'flex',
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

const controlButtonStyle = (active) => ({
  border: 'none',
  cursor: 'pointer',
  padding: '8px 16px',
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.2,
  color: active ? '#fff' : 'rgba(255,255,255,0.6)',
  background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
  borderRadius: 8,
  transition: 'all 0.2s ease',
})

const modeLabels = {
  fixed: 'Fixed View',
  rotate: 'Rotate',
  custom: 'Customize',
  play: 'Play',
}

function Controls({ mode, setMode, galaxyMode, setGalaxyMode, onReset }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        <div style={controlPanelStyle}>
          {Object.entries(modeLabels).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              style={controlButtonStyle(mode === value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={controlPanelStyle}>
          {['pixelated', 'realistic'].map((value) => (
            <button
              key={value}
              onClick={() => setGalaxyMode(value)}
              style={controlButtonStyle(galaxyMode === value)}
            >
              {value === 'pixelated' ? 'Pixelated' : 'Realistic'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'play' && (
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          }}
        >
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
              transition: 'all 0.2s ease',
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
