const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. BoundaryWMSLayer top
const oldText1 = `const createTextSymbolizer = (color) => labelProperty ? \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>\${labelProperty}</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">11</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#000000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">\${color}</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\` : '';
            const textSymbolizer = createTextSymbolizer(labelColor || strokeColor);
            const highlightTextSymbolizer = createTextSymbolizer('#FFFF00');

            let ruleContent = \`<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule>\`;`;

const newText1 = `const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '8' : '11';
            const mobileStrokeWidth = isMobile ? '1' : strokeWidth;
            const mobileHighlightStrokeWidth = isMobile ? '2' : '3';

            const createTextSymbolizer = (color) => labelProperty ? \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>\${labelProperty}</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">\${mobileFontSize}</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#000000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">\${color}</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\` : '';
            const textSymbolizer = createTextSymbolizer(labelColor || strokeColor);
            const highlightTextSymbolizer = createTextSymbolizer('#FFFF00');

            let ruleContent = \`<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${mobileStrokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule>\`;`;

code = code.replace(oldText1, newText1);

// 2. BoundaryWMSLayer - replace 3 with mobileHighlightStrokeWidth
code = code.replace(/<LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00<\/CssParameter><CssParameter name="stroke-width">3<\/CssParameter><\/Stroke><\/LineSymbolizer>/g, 
'<LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00</CssParameter><CssParameter name="stroke-width">${mobileHighlightStrokeWidth}</CssParameter></Stroke></LineSymbolizer>');

// 3. CadastralWMSLayer font & stroke
const oldText2 = `// Single bounding box request guarantees label deduplication at polygon centroid
            const textSymbolizer = \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>survey_number</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">24</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#FF0000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">#FFFF00</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\`;
            const sld = \`<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>cadastral_data_wms:view_cadastral</Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">#FF1493</CssParameter><CssParameter name="stroke-width">4</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>\`;`;

const newText2 = `// Single bounding box request guarantees label deduplication at polygon centroid
            const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '10' : '24';
            const mobileStrokeWidth = isMobile ? '1.5' : '4';
            const textSymbolizer = \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>survey_number</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">\${mobileFontSize}</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#FF0000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">#FFFF00</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\`;
            const sld = \`<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>cadastral_data_wms:view_cadastral</Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">#FF1493</CssParameter><CssParameter name="stroke-width">\${mobileStrokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>\`;`;

code = code.replace(oldText2, newText2);

// 4. fetchAndHighlight padding
const oldText3 = `let viewW = Math.max(parcelWidth * 2.5, 400);
                  let viewH = Math.max(parcelHeight * 2.5, 400);`;

const newText3 = `const isMobile = window.innerWidth < 768;
                  const padFactor = isMobile ? 1.5 : 2.5;
                  const minViewPx = isMobile ? 150 : 400;
                  
                  let viewW = Math.max(parcelWidth * padFactor, minViewPx);
                  let viewH = Math.max(parcelHeight * padFactor, minViewPx);`;

code = code.replace(oldText3, newText3);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Mobile optimizations applied exactly.');
