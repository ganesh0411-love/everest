const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. BoundaryWMSLayer top
code = code.replace(
    /            const createTextSymbolizer = \(color\) => labelProperty \? `<TextSymbolizer>([^`]*)<\/TextSymbolizer>` : '';\s*const textSymbolizer = createTextSymbolizer\(labelColor \|\| strokeColor\);\s*const highlightTextSymbolizer = createTextSymbolizer\('#FFFF00'\);\s*let ruleContent = `<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\$\{strokeColor\}<\/CssParameter><CssParameter name="stroke-width">\$\{strokeWidth\}<\/CssParameter><\/Stroke><\/LineSymbolizer>\$\{textSymbolizer\}<\/Rule>`;/g,
    `            const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '8' : '11';
            const mobileStrokeWidth = isMobile ? '1' : strokeWidth;
            const mobileHighlightStrokeWidth = isMobile ? '2' : '3';

            const createTextSymbolizer = (color) => labelProperty ? \`<TextSymbolizer>$1</TextSymbolizer>\`.replace('11', mobileFontSize) : '';
            const textSymbolizer = createTextSymbolizer(labelColor || strokeColor);
            const highlightTextSymbolizer = createTextSymbolizer('#FFFF00');

            let ruleContent = \`<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${mobileStrokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule>\`;`
);

// 2. BoundaryWMSLayer - replace 3 with mobileHighlightStrokeWidth
code = code.replace(
    /<LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00<\/CssParameter><CssParameter name="stroke-width">3<\/CssParameter><\/Stroke><\/LineSymbolizer>/g,
    '<LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00</CssParameter><CssParameter name="stroke-width">${mobileHighlightStrokeWidth}</CssParameter></Stroke></LineSymbolizer>'
);

// 3. CadastralWMSLayer font & stroke
code = code.replace(
    /            const textSymbolizer = `<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom<\/ogc:PropertyName><\/ogc:Function><\/Geometry><Label><ogc:PropertyName>survey_number<\/ogc:PropertyName><\/Label><Font><CssParameter name="font-family">Arial<\/CssParameter><CssParameter name="font-size">24<\/CssParameter><CssParameter name="font-weight">bold<\/CssParameter><\/Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0\.5<\/AnchorPointX><AnchorPointY>0\.5<\/AnchorPointY><\/AnchorPoint><\/PointPlacement><\/LabelPlacement><Halo><Radius>1<\/Radius><Fill><CssParameter name="fill">#FF0000<\/CssParameter><\/Fill><\/Halo><Fill><CssParameter name="fill">#FFFF00<\/CssParameter><\/Fill><VendorOption name="conflictResolution">true<\/VendorOption><\/TextSymbolizer>`;\s*const sld = `<StyledLayerDescriptor version="1\.0\.0" xmlns="http:\/\/www\.opengis\.net\/sld" xmlns:ogc="http:\/\/www\.opengis\.net\/ogc"><NamedLayer><Name>cadastral_data_wms:view_cadastral<\/Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">#FF1493<\/CssParameter><CssParameter name="stroke-width">4<\/CssParameter><\/Stroke><\/LineSymbolizer>\$\{textSymbolizer\}<\/Rule><\/FeatureTypeStyle><\/UserStyle><\/NamedLayer><\/StyledLayerDescriptor>`;/,
    `            const isMobile = window.innerWidth < 768;
            const mobileFontSize = isMobile ? '10' : '24';
            const mobileStrokeWidth = isMobile ? '1.5' : '4';
            const textSymbolizer = \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>survey_number</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">\${mobileFontSize}</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#FF0000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">#FFFF00</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\`;
            const sld = \`<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>cadastral_data_wms:view_cadastral</Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">#FF1493</CssParameter><CssParameter name="stroke-width">\${mobileStrokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>\`;`
);

// 4. fetchAndHighlight padding
code = code.replace(
    /                  let viewW = Math\.max\(parcelWidth \* 2\.5, 400\);\s*let viewH = Math\.max\(parcelHeight \* 2\.5, 400\);/g,
    `                  const isMobile = window.innerWidth < 768;
                  const padFactor = isMobile ? 1.5 : 2.5;
                  const minViewPx = isMobile ? 150 : 400;
                  
                  let viewW = Math.max(parcelWidth * padFactor, minViewPx);
                  let viewH = Math.max(parcelHeight * padFactor, minViewPx);`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Mobile optimizations applied.');
