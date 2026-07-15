function WebGLFallback({ onRetry }) {
  return (
    <main
      data-testid="webgl-fallback"
      style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 24, color: '#fff', background: 'radial-gradient(circle at 50% 25%, #241650, #05010f 62%)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <section style={{ width: 'min(520px, 100%)', padding: 28, border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18, background: 'rgba(15,14,29,0.76)', boxShadow: '0 24px 70px rgba(0,0,0,0.4)', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', color: '#baa7ef', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Library view available</p>
        <h1 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 500 }}>3D graphics are unavailable</h1>
        <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>Your browser could not start WebGL. You can still search, add, and edit books from My Library.</p>
        <button type="button" onClick={onRetry} style={{ border: '1px solid rgba(169,131,255,0.7)', borderRadius: 10, padding: '10px 16px', color: '#fff', background: 'rgba(126,91,226,0.82)', cursor: 'pointer', font: '600 14px inherit' }}>
          Try 3D view again
        </button>
      </section>
    </main>
  )
}

export default WebGLFallback
