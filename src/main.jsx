import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const style = document.createElement('style')
style.textContent = `
  html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #05010f; }
  * { box-sizing: border-box; }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
