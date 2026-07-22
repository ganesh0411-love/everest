const fs = require('fs');

let c = fs.readFileSync('../everest-frontend/src/components/AdminDashboard.jsx', 'utf8');
c = c.replace(/setLsHighlightPoly\(points\);\s*setTimeout\(\(\) => setLsHighlightPoly\(null\), 3000\); \/\/ Hide after 3 seconds/g, 'setLsHighlightPoly(points);');
fs.writeFileSync('../everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Timeout removed!');
