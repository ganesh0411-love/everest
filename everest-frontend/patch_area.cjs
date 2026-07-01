const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /\} else \{\s*const poly = visibleCadPolygons\.find\(p => \{\s*const centroid = p\.pts\.reduce\(\(acc, pt\) => \(\{ x: acc\.x \+ pt\.x, y: acc\.y \+ pt\.y \}\), \{ x: 0, y: 0 \}\);\s*centroid\.x \/= p\.pts\.length;\s*centroid\.y \/= p\.pts\.length;\s*const centerNode = cadNodes\.find\(n => Math\.hypot\(n\.x - centroid\.x, n\.y - centroid\.y\) < 20\);\s*return !!centerNode;\s*\}\);\s*if \(poly\) areaPixels = poly\.area;\s*\}/m;

const replacement = `} else {
          areaPixels = visibleCadPolygons.reduce((sum, p) => sum + p.area, 0);
      }`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
