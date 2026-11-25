import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { migrateToBatlagundu, repairAndMergeBatlagundu, restoreTirunelveliStaff, fixTirunelveliMerge, purgeTirunelveliComplete, nukeAllTirunelveli } from './utils/migration.js'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

import ErrorBoundary from './components/ErrorBoundary.jsx'

// Initialize native status bar boundary if running inside Capacitor
if (Capacitor.isNativePlatform()) {
  try {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#F0F7F4' }).catch(() => {});
  } catch (e) {
    console.warn('StatusBar init notice:', e);
  }
}

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
