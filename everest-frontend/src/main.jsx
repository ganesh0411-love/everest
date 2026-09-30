import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { migrateToBatlagundu, repairAndMergeBatlagundu, restoreTirunelveliStaff, fixTirunelveliMerge, purgeTirunelveliComplete, nukeAllTirunelveli } from './utils/migration.js'

import ErrorBoundary from './components/ErrorBoundary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

defineCustomElements(window);
window.migrateToBatlagundu = migrateToBatlagundu;
window.repairAndMergeBatlagundu = repairAndMergeBatlagundu;
window.restoreTirunelveliStaff = restoreTirunelveliStaff;
window.fixTirunelveliMerge = fixTirunelveliMerge;
window.purgeTirunelveliComplete = purgeTirunelveliComplete;
window.nukeAllTirunelveli = nukeAllTirunelveli;






