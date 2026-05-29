import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// <webaudio-knob> etc. are registered by /vendor/webaudio-controls.js (see index.html)
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
