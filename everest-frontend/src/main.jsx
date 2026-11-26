import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { migrateToBatlagundu, repairAndMergeBatlagundu, restoreTirunelveliStaff, fixTirunelveliMerge, purgeTirunelveliComplete, nukeAllTirunelveli } from './utils/migration.js'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

import ErrorBoundary from './components/ErrorBoundary.jsx'

// One-time Storage Migration: Purge stale offline ledger & customer caches to eliminate split-brain divergence across devices
const LEDGER_CACHE_VERSION = 'everest_ledger_cache_v2';
try {
  if (localStorage.getItem(LEDGER_CACHE_VERSION) !== 'true') {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k.startsWith('everest_ledger_') ||
        k === 'everest_customers' ||
        k.startsWith('everest_cashbook_openings') ||
        k.startsWith('everest_cashbook_investments') ||
        k.startsWith('everest_cashbook_particulars') ||
        k.startsWith('everest_cashbook_expenses')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(LEDGER_CACHE_VERSION, 'true');
    console.info(`[Storage Migration] Purged ${keysToRemove.length} stale ledger cache keys.`);
  }
} catch (e) {
  console.warn('[Storage Migration] Notice:', e);
}

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
