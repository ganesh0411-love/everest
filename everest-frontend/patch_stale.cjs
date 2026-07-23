const fs = require('fs');

let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// Add setCadSelectedPolygon(null) to fetchAndHighlight
code = code.replace(
    /setLsHighlightPoly\(null\);/g,
    `setLsHighlightPoly(null);\n        setCadSelectedPolygon(null);`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Fixed stale polygon retention!');
