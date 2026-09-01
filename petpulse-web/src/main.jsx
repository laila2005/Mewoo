import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { installImageFallback } from './utils/imageFallback'

// Proof-of-life for the boot guard in index.html. Reaching this line means the
// bundle parsed and executed; if it is missing, the guard reloads once. Set it
// before render so it is true even if a render error follows (the guard is only
// meant to catch a bundle that never ran at all).
window.__PP_APP_BOOTED = true

// Catches any image whose URL has gone dead, anywhere on the site.
installImageFallback()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
