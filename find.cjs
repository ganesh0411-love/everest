const fs = require('fs');
const c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');
const lines = c.split('\n');
const idx = lines.findIndex(l => l.includes('title="GPS"'));
if (idx !== -1) {
    console.log(lines.slice(Math.max(0, idx - 250), idx).join('\n'));
}
