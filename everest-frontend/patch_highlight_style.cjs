const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// Replace FMB Map Highlight
code = code.replace(
    /fill="rgba\(255, 255, 0, 0\.3\)"\s*stroke="#FFD700"\s*strokeWidth=\{cadViewport\.width \/ 400\}\s*style=\{\{ pointerEvents: 'none' \}\}/g,
    `fill="transparent"
                             stroke="#FFD700"
                             strokeWidth="4"
                             vectorEffect="non-scaling-stroke"
                             style={{ pointerEvents: 'none' }}`
);

// Replace Cadastral Map Highlight
code = code.replace(
    /fill="rgba\(255, 255, 0, 0\.2\)"\s*stroke="#FFFF00"\s*strokeWidth=\{Math\.max\(cadViewport\.width \* 0\.005, 3\)\}/g,
    `fill="transparent"
                             stroke="#FFD700"
                             strokeWidth="4"`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log("Patched highlight styles");
