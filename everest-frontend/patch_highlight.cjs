const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

const regex = /{\/\* Progressive Yellow Highlight Polygon \*\/}\s*{lsHighlightPoly && \(/g;
const replacement = `{/* Progressive Yellow Highlight Polygon */}
                    {(lsHighlightPoly && cadViewport.width <= 15000) && (`;

const newCode = code.replace(regex, replacement);

if (newCode === code) {
    console.log("No replacements made!");
} else {
    fs.writeFileSync('src/components/AdminDashboard.jsx', newCode);
    console.log("Replaced lsHighlightPoly visibility condition successfully.");
}
