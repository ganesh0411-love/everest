const fs = require('fs');
const content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('h16') && lines[i].includes('M4')) {
        console.log('Found SVG on line', i, lines[i]);
    }
}
