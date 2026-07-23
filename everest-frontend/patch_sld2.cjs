const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// We need to fix the BoundaryWMSLayer SLD logic we injected.
// The previous injection was:
const targetSLD = `            if (isHighlightSubdiv && activeVillage && activeSurvey) {
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
            }`;

const newSLD = `            if (isHighlightSubdiv && activeSurvey) {
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

if (code.includes(targetSLD)) {
    code = code.replace(targetSLD, newSLD);
    fs.writeFileSync('src/components/AdminDashboard.jsx', code);
    console.log("Patched BoundaryWMSLayer SLD filter with survey_number successfully.");
} else {
    console.log("Could not find the target SLD string to replace!");
    // fallback with regex
    let escaped = targetSLD.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(escaped);
    if (code.match(re)) {
        code = code.replace(re, newSLD);
        fs.writeFileSync('src/components/AdminDashboard.jsx', code);
        console.log("Patched BoundaryWMSLayer SLD filter via regex successfully.");
    } else {
        console.log("Still failed.");
    }
}
