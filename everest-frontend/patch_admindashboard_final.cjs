const fs = require('fs');

let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Clear highlight at the start of fetchAndHighlight
code = code.replace(
    /const fetchAndHighlight = async \(level, state\) => \{\s*try \{/,
    `const fetchAndHighlight = async (level, state) => {\n        setLsHighlightPoly(null);\n        try {`
);

// 2. Clear highlight at the start of executeFlyTo
code = code.replace(
    /const executeFlyTo = async \(\) => \{\s*if \(\!selVillage \|\| \!selSurvey\) return;\s*setLsLoading\('flyTo'\);\s*try \{/,
    `const executeFlyTo = async () => {\n        if (!selVillage || !selSurvey) return;\n        setLsLoading('flyTo');\n        setLsHighlightPoly(null);\n        try {`
);

// 3. Update fetchAndHighlight to handle data.feature.bbox if geometry is null (Fixes District/Taluk/Village fallback)
code = code.replace(
    /if \(data\.success && data\.feature && data\.feature\.geometry\) \{\s*const geom = data\.feature\.geometry;\s*let coordinates = \[\];\s*let allRings = \[\];\s*if \(geom\.type === 'Polygon'\) allRings\.push\(geom\.coordinates\[0\]\);\s*else if \(geom\.type === 'MultiPolygon'\) \{\s*geom\.coordinates\.forEach\(poly => allRings\.push\(poly\[0\]\)\);\s*\}\s*\/\/ Flatten for bounds calculation\s*coordinates = allRings\.flat\(\);/g,
    `if (data.success && data.feature) {
              const geom = data.feature.geometry;
              let coordinates = [];
              let allRings = [];
              if (geom && geom.type === 'Polygon') allRings.push(geom.coordinates[0]);
              else if (geom && geom.type === 'MultiPolygon') {
                  geom.coordinates.forEach(poly => allRings.push(poly[0]));
              } else if (!geom && data.feature.bbox) {
                  const b = data.feature.bbox;
                  allRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
              }
              // Flatten for bounds calculation
              coordinates = allRings.flat();`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Fixed fetchAndHighlight in AdminDashboard.jsx!');
