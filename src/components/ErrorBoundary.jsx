import { Component } from 'react'

const shellStyle = {
  minHeight: '100%',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  color: '#fff',
  background: 'radial-gradient(circle at top, #201447, #05010f 68%)',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Bookshelf could not render.', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main role="alert" style={shellStyle}>
        <section style={{ width: 'min(480px, 100%)', padding: 28, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 18, background: 'rgba(15,14,29,0.82)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', color: '#baa7ef', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Bookshelf paused</p>
          <h1 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>Your saved library is still on this device. Reload the app to try the scene again.</p>
          <button type="button" onClick={() => window.location.reload()} style={{ border: '1px solid rgba(169,131,255,0.7)', borderRadius: 10, padding: '10px 16px', color: '#fff', background: 'rgba(126,91,226,0.82)', cursor: 'pointer', font: '600 14px inherit' }}>
            Reload bookshelf
          </button>
        </section>
      </main>
    )
  }
}

export default ErrorBoundary
