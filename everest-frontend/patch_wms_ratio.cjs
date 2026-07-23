const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// We need to replace the pxW and pxH calculations in both BoundaryWMSLayer and CadastralWMSLayer
const fixAspectRatio = `
            const maxPx = Math.min(2048, Math.round(window.innerWidth * 1.5));
            let pxW, pxH;
            if (vW >= vH) {
                pxW = maxPx;
                pxH = Math.max(1, Math.round(maxPx * (vH / vW)));
            } else {
                pxH = maxPx;
                pxW = Math.max(1, Math.round(maxPx * (vW / vH)));
            }
`;

// Replace in BoundaryWMSLayer (around line 273)
code = code.replace(
    /const pxW = Math\.min\(2048, Math\.round\(window\.innerWidth \* 1\.5\)\);\s*const pxH = Math\.min\(2048, Math\.round\(window\.innerHeight \* 1\.5\)\);/g,
    fixAspectRatio.trim()
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Fixed SVG text stretch issue!');
