const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// Patch magnifier lines
let newContent = content.replace(
    /\{\/\* Render only raw line geometry \?\?\" NO map pin, NO background image \*\/\}\s*\{cadLines\.map\(l => \(/g,
    `{/* Render only raw line geometry ?" NO map pin, NO background image */}
                            {visibleCadLines.map(l => (`
);

// Patch magnifier pts
newContent = newContent.replace(
    /\{\/\* Vertex endpoint dots \?\?\" show p1 and p2 of every line \*\/\}\s*\{cadLines\.map\(l => \(/g,
    `{/* Vertex endpoint dots ?" show p1 and p2 of every line */}
                            {visibleCadLines.map(l => (`
);

if (content !== newContent) {
    fs.writeFileSync('src/components/AdminDashboard.jsx', newContent, 'utf-8');
    console.log("Magnifier replacement successful.");
} else {
    console.log("Magnifier replacement failed.");
}
