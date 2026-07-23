const fs = require('fs');

let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// Patch BoundaryWMSLayer
code = code.replace(
    /const createTextSymbolizer = \(color\) => labelProperty \? `<TextSymbolizer>([^`]+)font-size">11([^`]+)TextSymbolizer>` : '';/,
    `const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '7' : '11';
            const mobileStrokeWidth = isMobile ? Math.max(1, strokeWidth * 0.5) : strokeWidth;
            const mobileHighlightStrokeWidth = isMobile ? '1.5' : '3';
            const createTextSymbolizer = (color) => labelProperty ? \`<TextSymbolizer>$1font-size">\${mobileFontSize}$2TextSymbolizer>\` : '';`
);

code = code.replace(
    /let ruleContent = `<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\$\{strokeColor\}<\/CssParameter><CssParameter name="stroke-width">\$\{strokeWidth\}<\/CssParameter><\/Stroke><\/LineSymbolizer>\$\{textSymbolizer\}<\/Rule>`;/,
    `let ruleContent = \`<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${mobileStrokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule>\`;`
);

// We need to replace all instances of ${strokeWidth} with ${mobileStrokeWidth} inside the conditional rules
code = code.replace(
    /<CssParameter name="stroke-width">\$\{strokeWidth\}<\/CssParameter>/g,
    '<CssParameter name="stroke-width">${mobileStrokeWidth}</CssParameter>'
);

// We need to replace all instances of >3< (for stroke-width="3" in highlights) with >${mobileHighlightStrokeWidth}<
code = code.replace(
    /<CssParameter name="stroke-width">3<\/CssParameter>/g,
    '<CssParameter name="stroke-width">${mobileHighlightStrokeWidth}</CssParameter>'
);

// Patch CadastralWMSLayer
code = code.replace(
    /const textSymbolizer = `<TextSymbolizer>([^`]+)font-size">24([^`]+)TextSymbolizer>`;\s+const sld = `<StyledLayerDescriptor([^`]+)stroke-width">4<\/CssParameter>([^`]+)StyledLayerDescriptor>`;/,
    `const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '14' : '24';
            const mobileStrokeWidth = isMobile ? '1.5' : '4';
            const textSymbolizer = \`<TextSymbolizer>$1font-size">\${mobileFontSize}$2TextSymbolizer>\`;
            const sld = \`<StyledLayerDescriptor$3stroke-width">\${mobileStrokeWidth}</CssParameter>$4StyledLayerDescriptor>\`;`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Mobile styles patched successfully.');
