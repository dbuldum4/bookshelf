import { READING_STATUSES } from '../library'

const fontFamily =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

const fieldStyle = {
  width: '100%',
  border: '1px solid rgba(255,255,255,0.13)',
  borderRadius: 10,
  color: '#fff',
  background: 'rgba(255,255,255,0.07)',
  font: 'inherit',
  outline: 'none',
}

function BookDetails({ book, onUpdate, onClose }) {
  if (!book) return null

  return (
    <aside
      aria-label={`Details for ${book.title}`}
      style={{
        position: 'absolute',
        top: 76,
        right: 16,
        width: 324,
        maxWidth: 'calc(100vw - 32px)',
        padding: 20,
        color: '#fff',
        background: 'rgba(15, 14, 29, 0.76)',
        backdropFilter: 'blur(28px) saturate(145%)',
        WebkitBackdropFilter: 'blur(28px) saturate(145%)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 18,
        boxShadow: '0 24px 70px rgba(0,0,0,0.52)',
        fontFamily,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 36,
          height: 5,
          marginBottom: 18,
          borderRadius: 99,
          background: book.color,
          boxShadow: `0 0 22px ${book.color}`,
        }}
      />
      <button
        type="button"
        aria-label="Close book details"
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 30,
          height: 30,
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50%',
          color: 'rgba(255,255,255,0.72)',
          background: 'rgba(255,255,255,0.07)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      <h1
        style={{
          maxWidth: 245,
          margin: 0,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1.1,
          letterSpacing: -0.5,
        }}
      >
        {book.title}
      </h1>
      <p
        style={{
          margin: '7px 0 22px',
          color: 'rgba(255,255,255,0.58)',
          fontSize: 14,
        }}
      >
        {book.author}
      </p>

      <label
        style={{
          display: 'block',
          marginBottom: 7,
          color: 'rgba(255,255,255,0.58)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        Reading status
      </label>
      <select
        value={book.status}
        onChange={(event) => onUpdate({ status: event.target.value })}
        style={{ ...fieldStyle, height: 40, padding: '0 11px', marginBottom: 18 }}
      >
        {READING_STATUSES.map((status) => (
          <option key={status} value={status} style={{ color: '#111' }}>
            {status}
          </option>
        ))}
      </select>

      <label
        style={{
          display: 'block',
          marginBottom: 7,
          color: 'rgba(255,255,255,0.58)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        Notes
      </label>
      <textarea
        value={book.notes}
        onChange={(event) => onUpdate({ notes: event.target.value })}
        placeholder="What do you want to remember?"
        rows={5}
        style={{
          ...fieldStyle,
          display: 'block',
          minHeight: 108,
          padding: 11,
          resize: 'vertical',
          lineHeight: 1.45,
        }}
      />
      <p
        style={{
          margin: '10px 1px 0',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
        }}
      >
        Changes are saved on this device.
      </p>
    </aside>
  )
}

export default BookDetails
