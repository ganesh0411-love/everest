const fs = require('fs');

let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Fix executeFlyTo viewport padding
code = code.replace(/let viewW = Math.max\(parcelWidth \* 2\.5, 400\);/g, 'let viewW = Math.max(parcelWidth * 1.5, 400);');
code = code.replace(/let viewH = Math.max\(parcelHeight \* 2\.5, 400\);/g, 'let viewH = Math.max(parcelHeight * 1.5, 400);');

// 2. Fix BoundaryWMSLayer Cyan highlight
code = code.replace(
    /const mobileHighlightStrokeWidth = isMobile \? '1\.5' : '3';\s+const createTextSymbolizer = \(color\) => labelProperty \? `<TextSymbolizer>/,
    `const mobileHighlightStrokeWidth = isMobile ? '2.5' : '4';
            const createTextSymbolizer = (color) => labelProperty ? \`<TextSymbolizer>`
);
code = code.replace(/const highlightTextSymbolizer = createTextSymbolizer\('#FFFF00'\);/, "const highlightTextSymbolizer = createTextSymbolizer('#00FFFF');");
// Replace #FFFF00 in stroke color inside BoundaryWMSLayer
code = code.replace(
    /<LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00<\/CssParameter>/g,
    '<LineSymbolizer><Stroke><CssParameter name="stroke">#00FFFF</CssParameter>'
);

// 3. Fix CadastralWMSLayer Text (Smaller, Orange-Red, White Halo)
code = code.replace(
    /const mobileFontSize = isMobile \? '14' : '24';/,
    "const mobileFontSize = isMobile ? '10' : '20';"
);
code = code.replace(
    /const mobileStrokeWidth = isMobile \? '1\.5' : '4';/,
    "const mobileStrokeWidth = isMobile ? '1' : '2';"
);
code = code.replace(
    /<Halo><Radius>1<\/Radius><Fill><CssParameter name="fill">#FF0000<\/CssParameter><\/Fill><\/Halo><Fill><CssParameter name="fill">#FFFF00<\/CssParameter><\/Fill>/,
    '<Halo><Radius>1</Radius><Fill><CssParameter name="fill">#FFFFFF</CssParameter></Fill></Halo><Fill><CssParameter name="fill">#FF4500</CssParameter></Fill>'
);

// 4. Swap Rendering Order in the first instance (Line ~5050)
const regex1 = /\{isFMBEnabled && cadViewport\.width <= 1000 && \([\s\S]*?<BoundaryWMSLayer[\s\S]*?layerName="cadastral_data_wms:view_fmb"[\s\S]*?\)\}[\s\S]*?\{isCadastralEnabled && cadViewport\.width <= 5000 && \([\s\S]*?<CadastralWMSLayer[\s\S]*?\)\}/m;
code = code.replace(regex1, match => {
    const lines = match.split('\n');
    const fmbBlock = lines.slice(0, 3).join('\n');
    const cadBlock = lines.slice(3).join('\n');
    return cadBlock + '\n' + fmbBlock;
});

// 5. Swap Rendering Order in the second instance (Line ~6070)
// Because we already replaced the first, we can do it globally by finding any FMB block followed by Cadastral block.
// Wait, the regex above will replace the first match. Let's do it with a more generic approach:
const block1Regex = /(\{isFMBEnabled[^\}]+<BoundaryWMSLayer[^>]+layerName="cadastral_data_wms:view_fmb"[^\}]+\})\s*(\{isCadastralEnabled[^\}]+<CadastralWMSLayer[^\}]+\})/g;

code = code.replace(block1Regex, (match, fmb, cad) => {
    return cad + '\n                                  ' + fmb;
});

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('AdminDashboard patched successfully.');
