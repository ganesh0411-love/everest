const fs = require('fs');

let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

const sldTarget = `const textSymbolizer = labelProperty ? \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>\${labelProperty}</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">11</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#000000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">\${labelColor || strokeColor}</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\` : '';
            const sld = \`<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>\${layerName}</Name><UserStyle><FeatureTypeStyle><Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule></FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>\`;`;

const sldReplacement = `const createTextSymbolizer = (color) => labelProperty ? \`<TextSymbolizer><Geometry><ogc:Function name="centroid"><ogc:PropertyName>the_geom</ogc:PropertyName></ogc:Function></Geometry><Label><ogc:PropertyName>\${labelProperty}</ogc:PropertyName></Label><Font><CssParameter name="font-family">Arial</CssParameter><CssParameter name="font-size">11</CssParameter><CssParameter name="font-weight">bold</CssParameter></Font><LabelPlacement><PointPlacement><AnchorPoint><AnchorPointX>0.5</AnchorPointX><AnchorPointY>0.5</AnchorPointY></AnchorPoint></PointPlacement></LabelPlacement><Halo><Radius>1</Radius><Fill><CssParameter name="fill">#000000</CssParameter></Fill></Halo><Fill><CssParameter name="fill">\${color}</CssParameter></Fill><VendorOption name="conflictResolution">true</VendorOption></TextSymbolizer>\` : '';
            const textSymbolizer = createTextSymbolizer(labelColor || strokeColor);
            const highlightTextSymbolizer = createTextSymbolizer('#FFFF00');

            let ruleContent = \`<Rule><LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>\${textSymbolizer}</Rule>\`;

            if (isHighlightSubdiv && activeVillage && activeSurvey) {
                ruleContent = \`<Rule>
                    <ogc:Filter>
                        <ogc:And>
                            <ogc:PropertyIsEqualTo><ogc:PropertyName>vname</ogc:PropertyName><ogc:Literal>\${activeVillage}</ogc:Literal></ogc:PropertyIsEqualTo>
                            <ogc:PropertyIsEqualTo><ogc:PropertyName>survey_no</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsEqualTo>
                        </ogc:And>
                    </ogc:Filter>
                    <LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></LineSymbolizer>
                    \${highlightTextSymbolizer}
                </Rule>
                <Rule>
                    <ogc:Filter>
                        <ogc:Not>
                            <ogc:And>
                                <ogc:PropertyIsEqualTo><ogc:PropertyName>vname</ogc:PropertyName><ogc:Literal>\${activeVillage}</ogc:Literal></ogc:PropertyIsEqualTo>
                                <ogc:PropertyIsEqualTo><ogc:PropertyName>survey_no</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsEqualTo>
                            </ogc:And>
                        </ogc:Not>
                    </ogc:Filter>
                    <LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>
                    \${textSymbolizer}
                </Rule>\`;
            }

            const sld = \`<StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>\${layerName}</Name><UserStyle><FeatureTypeStyle>\${ruleContent}</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>\`;`;

if (code.includes(sldTarget)) {
    code = code.replace(sldTarget, sldReplacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', code);
    console.log("Patched SLD string literal successfully");
} else {
    console.log("String literal did not match! Something must be slightly off with spaces.");
    // Let's use regex that ignores spaces
    let escaped = sldTarget.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(escaped);
    if (code.match(re)) {
        code = code.replace(re, sldReplacement);
        fs.writeFileSync('src/components/AdminDashboard.jsx', code);
        console.log("Patched SLD via whitespace-agnostic regex successfully");
    } else {
        console.log("Still couldn't find the target!");
    }
}
