const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

const oldStr1 = `            const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '8' : '11';
            const mobileStrokeWidth = strokeWidth;
            const mobileHighlightStrokeWidth = isMobile ? '2.5' : '3';`;

const newStr1 = `            const isMobile = window.innerWidth < 768;
            
            // Dynamic scaling based on viewport width (mercator meters). 
            // 400m is roughly a comfortable zoom level for subdivision viewing.
            const zoomScale = Math.max(0.1, Math.min(1, 400 / viewport.width));
            
            // Defect 2 Fix: Scale down label font size dynamically.
            const calcFontSize = isMobile ? Math.max(7, Math.round(11 * zoomScale)) : Math.max(9, Math.round(13 * zoomScale));
            const mobileFontSize = calcFontSize.toString();
            
            // Defect 1 Fix: Crisp, thin vector lines without bulging (max 1.5px, scales down to 0.5px when zoomed out)
            const calcStroke = Math.max(0.5, parseFloat(strokeWidth) * zoomScale).toFixed(1);
            const mobileStrokeWidth = calcStroke;
            
            const mobileHighlightStrokeWidth = isMobile ? '2.5' : '3';`;

c = c.replace(oldStr1, newStr1);

const oldStr2 = `<VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\` : '';`;
const newStr2 = `<VendorOption name="conflictResolution">true</VendorOption><VendorOption name="goodnessOfFit">0.7</VendorOption><VendorOption name="polygonAlign">mbr</VendorOption></TextSymbolizer>\` : '';`;

c = c.replace(oldStr2, newStr2);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Patched styling.');
