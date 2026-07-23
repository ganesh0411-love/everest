const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Add state variable
code = code.replace(
    'const [lsHighlightPoly, setLsHighlightPoly] = React.useState(null);',
    'const [lsHighlightPoly, setLsHighlightPoly] = React.useState(null);\n  const [lsHighlightType, setLsHighlightType] = React.useState(null);'
);

// 2. Update fetchAndHighlight clearing
code = code.replace(
    /const fetchAndHighlight = async \(level, state\) => {\s*setLsHighlightPoly\(null\);/g,
    'const fetchAndHighlight = async (level, state) => {\n        setLsHighlightPoly(null);\n        setLsHighlightType(null);'
);

// 3. Update fetchAndHighlight setting
code = code.replace(
    /if \(geom\) setLsHighlightPoly\(pointsList \|\| points\);\s*else setLsHighlightPoly\(null\);/g,
    'if (geom) { setLsHighlightPoly(pointsList || points); setLsHighlightType(level); } else { setLsHighlightPoly(null); setLsHighlightType(null); }'
);

// 4. Update executeFlyTo clearing
code = code.replace(
    /setLsLoading\('flyTo'\);\s*setLsHighlightPoly\(null\);/g,
    "setLsLoading('flyTo');\n        setLsHighlightPoly(null);\n        setLsHighlightType(null);"
);

// 5. Update executeFlyTo setting
code = code.replace(
    /setLsHighlightPoly\(pointsList \|\| points\);/g,
    "setLsHighlightPoly(pointsList || points);\n                          setLsHighlightType(selSubdiv ? 'subdiv' : 'survey');"
);

// 6. Update SVG rendering condition
code = code.replace(
    /\{\(lsHighlightPoly && cadViewport.width <= 15000\) && \(/g,
    `{(lsHighlightPoly && (
        (lsHighlightType === 'subdiv' && cadViewport.width <= 1000) ||
        ((lsHighlightType === 'survey' || lsHighlightType === 'parcel') && cadViewport.width <= 5000) ||
        (lsHighlightType !== 'subdiv' && lsHighlightType !== 'survey' && lsHighlightType !== 'parcel' && cadViewport.width <= 15000)
    )) && (`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log("Patched highlight sync.");
