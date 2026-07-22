const fs = require('fs');
let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

code = code.replace(
    /\{lsHighlightPoly && \(\s*<polygon\s*points=\{lsHighlightPoly\.map\(pt => `\$\{pt\.x\},\$\{pt\.y\}`\)\.join\(' '\)\}[\s\S]*?\/>\s*\)\}/,
    `{lsHighlightPoly && (
                 Array.isArray(lsHighlightPoly[0]) ? (
                     lsHighlightPoly.map((ring, idx) => (
                         <polygon
                             key={\`map_hp_\${idx}\`}
                             points={ring.map(p => \`\${p.x},\${p.y}\`).join(' ')}
                             fill="rgba(255, 255, 0, 0.2)"
                             stroke="#FFFF00"
                             strokeWidth={Math.max(cadViewport.width * 0.005, 3)}
                             vectorEffect="non-scaling-stroke"
                             strokeLinejoin="round"
                             pointerEvents="none"
                         />
                     ))
                 ) : (
                     <polygon 
                         points={lsHighlightPoly.map(p => \`\${p.x},\${p.y}\`).join(' ')}
                         fill="rgba(255, 255, 0, 0.2)"
                         stroke="#FFFF00"
                         strokeWidth={Math.max(cadViewport.width * 0.005, 3)}
                         vectorEffect="non-scaling-stroke"
                         strokeLinejoin="round"
                         pointerEvents="none"
                     />
                 )
             )}`
);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Fixed lsHighlightPoly in Map View!');
