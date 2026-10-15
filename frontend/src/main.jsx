import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const lastReload = parseInt(sessionStorage.getItem('chunk_reload_ts') || '0', 10);
  const now = Date.now();
  if (now - lastReload > 8000) {
    sessionStorage.setItem('chunk_reload_ts', String(now));
    window.location.reload();
  }
});

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
