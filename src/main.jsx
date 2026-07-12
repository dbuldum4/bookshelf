import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

const style = document.createElement('style')
style.textContent = `
  html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #05010f; }
  * { box-sizing: border-box; }

  /* Visible keyboard focus for all interactive controls */
  :focus:not(:focus-visible) {
    outline: none;
  }
  :focus-visible {
    outline: 2px solid rgba(190, 160, 255, 0.98) !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 3px rgba(126, 91, 226, 0.45) !important;
  }
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  summary:focus-visible,
  [role="button"]:focus-visible,
  [role="option"]:focus-visible,
  [role="tab"]:focus-visible,
  [role="menuitem"]:focus-visible,
  [tabindex]:not([tabindex="-1"]):focus-visible {
    outline: 2px solid rgba(190, 160, 255, 0.98) !important;
    outline-offset: 2px !important;
    box-shadow: 0 0 0 3px rgba(126, 91, 226, 0.45) !important;
  }
  canvas:focus-visible {
    outline: 2px solid rgba(190, 160, 255, 0.98) !important;
    outline-offset: 3px !important;
    box-shadow: 0 0 0 4px rgba(126, 91, 226, 0.4) !important;
  }

  .sr-only {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    padding: 0 !important;
    margin: -1px !important;
    overflow: hidden !important;
    clip: rect(0, 0, 0, 0) !important;
    white-space: nowrap !important;
    border: 0 !important;
  }

  [data-reduced-motion="true"] *,
  [data-reduced-motion="true"] *::before,
  [data-reduced-motion="true"] *::after {
    transition: none !important;
    animation: none !important;
    scroll-behavior: auto !important;
  }

  /* Top scene controls: desktop always expanded; mobile collapsible */
  .scene-controls-bar {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    z-index: 20;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    pointer-events: none;
    max-width: 100%;
  }

  .scene-controls-toggle {
    display: none;
    pointer-events: auto;
    align-self: flex-start;
    backdrop-filter: blur(20px) saturate(140%);
    -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid rgba(255,255,255,0.12) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 30px rgba(0,0,0,0.45);
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .scene-controls-toggle:not([aria-expanded="true"]) {
    background: rgba(20, 18, 35, 0.55) !important;
    color: rgba(255,255,255,0.9) !important;
  }

  .scene-controls-groups {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 12px;
    pointer-events: none;
    min-width: 0;
  }

  .scene-controls-groups > * {
    pointer-events: auto;
  }

  .scene-controls-settings {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    pointer-events: auto;
    min-width: 0;
  }

  .scene-play-bar {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    max-width: calc(100vw - 32px);
    pointer-events: auto;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }

  .scene-shelf-pager {
    z-index: 20;
    max-width: calc(100vw - 32px);
  }

  @media (max-width: 768px) {
    .scene-controls-toggle {
      display: inline-flex;
      align-items: center;
    }

    .scene-controls-groups {
      display: none;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      max-height: min(52vh, calc(100dvh - 96px));
      overflow-x: hidden;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
      padding-right: 2px;
    }

    .scene-controls-groups.is-expanded {
      display: flex;
    }

    .scene-controls-settings {
      flex-direction: column;
      align-items: stretch;
      width: 100%;
    }

    .scene-controls-groups .scene-controls-settings > *,
    .scene-controls-groups > div[role="group"] {
      flex-wrap: wrap;
      width: 100%;
      max-width: 100%;
    }

    .scene-controls-groups button {
      flex: 1 1 auto;
      min-width: min(100%, 5.5rem);
    }

    .scene-play-bar {
      bottom: 16px;
      left: 16px;
      right: 16px;
      transform: none;
      max-width: none;
    }

    .scene-play-bar > div,
    .scene-play-bar > button {
      flex: 1 1 auto;
      text-align: center;
    }

    .scene-shelf-pager {
      right: 12px !important;
      bottom: 16px !important;
      left: auto;
    }
  }
`
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
