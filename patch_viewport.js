const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

const oldStr1 = 'if (cadPointersRef.current.size === 0) {';
const newStr1 = `if (cadPointersRef.current.size === 0) {
      // FIX: Sync native SVG viewport back to React state to trigger tile and WMS layer fetches
      setCadViewport({ ...cadViewportRef.current });`;

c = c.replace(oldStr1, newStr1);

const oldStr2 = `if (cadLayerGroupRef.current) {
        const cx = next.x + next.width / 2;
        const cy = next.y + next.height / 2;
        cadLayerGroupRef.current.setAttribute('transform', \`rotate(\${mapRotation}, \${cx}, \${cy})\`);
    }`;
const newStr2 = `if (cadLayerGroupRef.current) {
        const cx = next.x + next.width / 2;
        const cy = next.y + next.height / 2;
        cadLayerGroupRef.current.setAttribute('transform', \`rotate(\${mapRotation}, \${cx}, \${cy})\`);
    }
    
    // FIX: Debounce sync native viewport to React state for zoom
    if (window.cadWheelTimer) clearTimeout(window.cadWheelTimer);
    window.cadWheelTimer = setTimeout(() => {
        setCadViewport({ ...cadViewportRef.current });
    }, 150);`;

c = c.replace(oldStr2, newStr2);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Patched viewport sync.');
