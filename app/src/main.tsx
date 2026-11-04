import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import './install.ts'
import App from './App.tsx'
import { reloadOnceForNewBuild } from './map/loadMap.ts'

// A lazily loaded file (the map library) is gone because a deploy replaced it: reload once into
// the new version instead of failing. If the reload is skipped, the page shows its own fallback.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewBuild()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
