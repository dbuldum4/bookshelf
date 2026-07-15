import { useId, useState } from 'react'

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
  fixed: 'Fixed View',
  rotate: 'Rotate',
  custom: 'Customize',
  play: 'Play',
}

const graphicsQualityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function Controls({
  mode,
  setMode,
  galaxyMode,
  setGalaxyMode,
  graphicsQuality,
  setGraphicsQuality,
  reducedMotion,
  setReducedMotion,
  onReset,
  shelfPage,
  shelfPageCount,
  setShelfPage,
}) {
  const showShelfPager = shelfPageCount > 1 && mode !== 'play'
  const [controlsOpen, setControlsOpen] = useState(false)
  const controlsId = useId()

  return (
    <>
      <div className="scene-controls-bar">
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

          <div className="scene-controls-settings">
            <div style={controlPanelStyle} role="group" aria-label="Galaxy style">
              {['pixelated', 'realistic'].map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setGalaxyMode(value)}
                  style={controlButtonStyle(galaxyMode === value, reducedMotion)}
                >
                  {value === 'pixelated' ? 'Pixelated' : 'Realistic'}
                </button>
              ))}
            </div>

            <div style={controlPanelStyle} role="group" aria-label="Graphics quality">
              {graphicsQualityOptions.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={graphicsQuality === value}
                  aria-label={`${label} graphics quality`}
                  title={`${label} graphics quality`}
                  onClick={() => setGraphicsQuality(value)}
                  style={controlButtonStyle(graphicsQuality === value, reducedMotion)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={controlPanelStyle} role="group" aria-label="Motion preference">
              <button
                type="button"
                aria-pressed={reducedMotion}
                aria-label={reducedMotion ? 'Reduced motion on' : 'Reduced motion off'}
                title={reducedMotion ? 'Reduced motion is on' : 'Reduce motion'}
                onClick={() => setReducedMotion(!reducedMotion)}
                style={controlButtonStyle(reducedMotion, reducedMotion)}
              >
                Reduce motion
              </button>
            </div>
          </div>
        </div>
      </div>

      {showShelfPager && (
        <div
          className="scene-shelf-pager"
          aria-label="Bookshelf page"
          style={{
            ...controlPanelStyle,
            position: 'absolute',
            right: 16,
            bottom: 24,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            aria-label="Previous shelf"
            disabled={shelfPage === 0}
            onClick={() => setShelfPage((page) => Math.max(0, page - 1))}
            style={{ ...controlButtonStyle(false, reducedMotion), opacity: shelfPage === 0 ? 0.35 : 1 }}
          >
            ←
          </button>
          <span style={{ padding: '0 6px', color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: 700 }}>
            Shelf {shelfPage + 1} / {shelfPageCount}
          </span>
          <button
            type="button"
            aria-label="Next shelf"
            disabled={shelfPage === shelfPageCount - 1}
            onClick={() => setShelfPage((page) => Math.min(shelfPageCount - 1, page + 1))}
            style={{ ...controlButtonStyle(false, reducedMotion), opacity: shelfPage === shelfPageCount - 1 ? 0.35 : 1 }}
          >
            →
          </button>
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
