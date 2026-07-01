const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// Patch magnifier lines
content = content.replace(
    /\{cadLines\.map\(l => \(\s*<line\s*key=\{\`mag-l-\$\{l\.id\}\`\}/g,
    `{visibleCadLines.map(l => (\n                                <line\n                                key={\`mag-l-\${l.id}\`}`
);

// Patch magnifier pts
content = content.replace(
    /\{cadLines\.map\(l => \(\s*<React\.Fragment key=\{\`mag-pts-\$\{l\.id\}\`\}>/g,
    `{visibleCadLines.map(l => (\n                              <React.Fragment key={\`mag-pts-\${l.id}\`}>`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log("Magnifier replacement done.");
