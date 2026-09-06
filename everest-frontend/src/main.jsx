import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { defineCustomElements } from '@ionic/pwa-elements/loader'
import { migrateToVathalagundu } from './utils/migration.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

defineCustomElements(window);
window.migrateToVathalagundu = migrateToVathalagundu;

