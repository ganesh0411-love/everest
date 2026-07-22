const fs = require('fs');
const code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');
const lines = code.split('\n');
const start = lines.findIndex(l => l.includes('TransformWrapper'));
console.log(lines.slice(start, start + 80).join('\n'));
