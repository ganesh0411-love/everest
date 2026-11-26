import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { migrateToBatlagundu, repairAndMergeBatlagundu, restoreTirunelveliStaff, fixTirunelveliMerge, purgeTirunelveliComplete, nukeAllTirunelveli } from './utils/migration.js'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

import ErrorBoundary from './components/ErrorBoundary.jsx'

// One-time Storage Migration: Purge stale offline ledger, customer caches, and defunct Gullapuram branch data
const CACHE_PURGE_VERSION = 'everest_cache_purge_v3';
try {
  if (localStorage.getItem(CACHE_PURGE_VERSION) !== 'true') {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const kLower = k.toLowerCase();
      if (
        kLower.includes('gullapuram') ||
        k === 'everest_deleted_customers' ||
        k === 'everest_recycle_bin' ||
        k === 'everest_customers' ||
        k === 'everest_branches' ||
        k.startsWith('everest_ledger_') ||
        k.startsWith('everest_cashbook_')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(CACHE_PURGE_VERSION, 'true');
    console.info(`[Storage Migration v3] Purged ${keysToRemove.length} stale cache keys.`);
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
