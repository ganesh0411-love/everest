const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Update strokeWidth="1" to strokeWidth="1.5" for the Subdivision layer (BoundaryWMSLayer with view_fmb)
code = code.replace(
    /strokeWidth="1" labelProperty="sub_division"/g,
    'strokeWidth="1.5" labelProperty="sub_division"'
);

// 2. Update font size for Survey number in CadastralWMSLayer (from 11 to 24)
code = code.replace(
    /<CssParameter name="font-size">11<\/CssParameter>/g,
    (match, offset, string) => {
        // We only want to replace the second occurrence which is in CadastralWMSLayer
        // Or we can just replace the specific string block in CadastralWMSLayer
        return match;
    }
);

// Specifically target the textSymbolizer in CadastralWMSLayer
const cadTextSymbolizer = `<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>survey_number</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">11</CssParameter>`;
const newCadTextSymbolizer = `<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>survey_number</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">24</CssParameter>`;
code = code.replace(cadTextSymbolizer, newCadTextSymbolizer);

// 3. Update stroke-width for Survey number in CadastralWMSLayer (from 1 to 4)
const cadLineSymbolizer = `<CssParameter name="stroke">#FF1493</CssParameter><CssParameter name="stroke-width">1</CssParameter>`;
const newCadLineSymbolizer = `<CssParameter name="stroke">#FF1493</CssParameter><CssParameter name="stroke-width">4</CssParameter>`;
code = code.replace(cadLineSymbolizer, newCadLineSymbolizer);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Fixed styling!');
