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

const buttonStyle = {
  border: '1px solid rgba(169,131,255,0.7)',
  borderRadius: 10,
  padding: '10px 16px',
  color: '#fff',
  background: 'rgba(126,91,226,0.82)',
  cursor: 'pointer',
  font: '600 14px inherit',
}

const secondaryButtonStyle = {
  ...buttonStyle,
  border: '1px solid rgba(255,255,255,0.18)',
  background: 'rgba(255,255,255,0.08)',
}

class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Bookshelf could not render.', error, info.componentStack)
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children

    const { fallback } = this.props
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback({ error: this.state.error, reset: this.reset })
      }
      return fallback
    }

    return (
      <main role="alert" style={shellStyle}>
        <section style={{ width: 'min(480px, 100%)', padding: 28, border: '1px solid rgba(255,255,255,0.15)', borderRadius: 18, background: 'rgba(15,14,29,0.82)', textAlign: 'center' }}>
          <p style={{ margin: '0 0 8px', color: '#baa7ef', fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Bookshelf paused</p>
          <h1 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.68)', lineHeight: 1.55 }}>
            Your library is usually kept in this browser’s local storage. If a save recently failed, export a backup from the library panel when you can.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={this.reset}
              style={buttonStyle}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={secondaryButtonStyle}
            >
              Reload page
            </button>
          </div>
        </section>
      </main>
    )
  }
}

export default ErrorBoundary
