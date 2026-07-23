const fs = require('fs');

let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Add activeSubdiv to props
code = code.replace(
    /const BoundaryWMSLayer = \(\{ viewport, baseMercX, baseMercY, layerName, strokeColor, strokeWidth, opacity = 1, labelProperty = null, labelColor = null, activeVillage = null, activeSurvey = null, isHighlightSubdiv = false \}\) => \{/,
    `const BoundaryWMSLayer = ({ viewport, baseMercX, baseMercY, layerName, strokeColor, strokeWidth, opacity = 1, labelProperty = null, labelColor = null, activeVillage = null, activeSurvey = null, activeSubdiv = null, isHighlightSubdiv = false }) => {`
);

// 2. Add activeSubdiv to useEffect dependencies
code = code.replace(
    /\}, \[viewport\.x, viewport\.y, viewport\.width, viewport\.height, baseMercX, baseMercY, layerName, strokeColor, strokeWidth, activeVillage, activeSurvey, isHighlightSubdiv\]\);/g,
    `}, [viewport.x, viewport.y, viewport.width, viewport.height, baseMercX, baseMercY, layerName, strokeColor, strokeWidth, activeVillage, activeSurvey, activeSubdiv, isHighlightSubdiv]);`
);

// 3. Update the SLD logic
const sldTarget = `            if (isHighlightSubdiv && activeSurvey) {
                ruleContent = \`<Rule>
                    <ogc:Filter>
                        <ogc:PropertyIsEqualTo><ogc:PropertyName>survey_number</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsEqualTo>
                    </ogc:Filter>
                    <LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></LineSymbolizer>
                    \${highlightTextSymbolizer}
                </Rule>
                <Rule>
                    <ogc:Filter>
                        <ogc:PropertyIsNotEqualTo><ogc:PropertyName>survey_number</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsNotEqualTo>
                    </ogc:Filter>
                    <LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>
                    \${textSymbolizer}
                </Rule>\`;
            }`;

const sldReplacement = `            if (isHighlightSubdiv && activeSurvey) {
                if (activeSubdiv && activeSubdiv !== 'All') {
                    ruleContent = \`<Rule>
                        <ogc:Filter>
                            <ogc:And>
                                <ogc:PropertyIsEqualTo><ogc:PropertyName>survey_number</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsEqualTo>
                                <ogc:PropertyIsEqualTo><ogc:PropertyName>sub_division</ogc:PropertyName><ogc:Literal>\${activeSubdiv}</ogc:Literal></ogc:PropertyIsEqualTo>
                            </ogc:And>
                        </ogc:Filter>
                        <LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></LineSymbolizer>
                        \${highlightTextSymbolizer}
                    </Rule>
                    <Rule>
                        <ogc:Filter>
                            <ogc:Not>
                                <ogc:And>
                                    <ogc:PropertyIsEqualTo><ogc:PropertyName>survey_number</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsEqualTo>
                                    <ogc:PropertyIsEqualTo><ogc:PropertyName>sub_division</ogc:PropertyName><ogc:Literal>\${activeSubdiv}</ogc:Literal></ogc:PropertyIsEqualTo>
                                </ogc:And>
                            </ogc:Not>
                        </ogc:Filter>
                        <LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>
                        \${textSymbolizer}
                    </Rule>\`;
                } else {
                    ruleContent = \`<Rule>
                        <ogc:Filter>
                            <ogc:PropertyIsEqualTo><ogc:PropertyName>survey_number</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsEqualTo>
                        </ogc:Filter>
                        <LineSymbolizer><Stroke><CssParameter name="stroke">#FFFF00</CssParameter><CssParameter name="stroke-width">3</CssParameter></Stroke></LineSymbolizer>
                        \${highlightTextSymbolizer}
                    </Rule>
                    <Rule>
                        <ogc:Filter>
                            <ogc:PropertyIsNotEqualTo><ogc:PropertyName>survey_number</ogc:PropertyName><ogc:Literal>\${activeSurvey}</ogc:Literal></ogc:PropertyIsNotEqualTo>
                        </ogc:Filter>
                        <LineSymbolizer><Stroke><CssParameter name="stroke">\${strokeColor}</CssParameter><CssParameter name="stroke-width">\${strokeWidth}</CssParameter></Stroke></LineSymbolizer>
                        \${textSymbolizer}
                    </Rule>\`;
                }
            }`;

if (code.includes(sldTarget)) {
    code = code.replace(sldTarget, sldReplacement);
    console.log("Replaced SLD targeting logic successfully.");
} else {
    // try regex
    let escaped = sldTarget.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(escaped);
    if (code.match(re)) {
        code = code.replace(re, sldReplacement);
        console.log("Replaced SLD targeting logic via regex successfully.");
    } else {
        console.log("Failed to match SLD target!");
    }
}

// 4. Update the calls to BoundaryWMSLayer to pass activeSubdiv={selSubdiv}
// Note: We need to update both calls for 'view_fmb'
const wmsTarget1 = `<BoundaryWMSLayer viewport={cadViewport} baseMercX={mapConfig.baseMercX} baseMercY={mapConfig.baseMercY} layerName="cadastral_data_wms:view_fmb" strokeColor="#00FF00" strokeWidth="1.5" labelProperty="sub_division" labelColor="#00FF00" activeVillage={selVillage} activeSurvey={selSurvey} isHighlightSubdiv={lsHighlightType === 'survey' || lsHighlightType === 'subdiv' || !!selSurvey} />`;
const wmsReplacement1 = `<BoundaryWMSLayer viewport={cadViewport} baseMercX={mapConfig.baseMercX} baseMercY={mapConfig.baseMercY} layerName="cadastral_data_wms:view_fmb" strokeColor="#00FF00" strokeWidth="1.5" labelProperty="sub_division" labelColor="#00FF00" activeVillage={selVillage} activeSurvey={selSurvey} activeSubdiv={selSubdiv} isHighlightSubdiv={lsHighlightType === 'survey' || lsHighlightType === 'subdiv' || !!selSurvey} />`;

code = code.replace(new RegExp(wmsTarget1.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'g'), wmsReplacement1);

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log("Patch complete.");
