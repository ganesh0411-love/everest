const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /if \(cadTool === 'IDLE' && cadPolygons\.length > 0\) \{[\s\S]*?let hitPoly = null;[\s\S]*?for \(let p of cadPolygons\) \{[\s\S]*?if \(pointInPolygon\(rawPt, p\.pts\)\) \{[\s\S]*?hitPoly = p\.id;[\s\S]*?break;[\s\S]*?\}[\s\S]*?\}[\s\S]*?if \(hitPoly\) \{[\s\S]*?setCadSelectedPolygon\(hitPoly\);/m;

const replacement = `if (cadTool === 'IDLE' && cadPolygons.length > 0) {
                     const rawPt = getCadSvgCoords(e.clientX, e.clientY);
                     let hitPoly = null;
                     let hitSurveyId = null;
                     for (let p of cadPolygons) {
                         if (pointInPolygon(rawPt, p.pts)) {
                             hitPoly = p.id;
                             hitSurveyId = p.surveyId;
                             break;
                         }
                     }
                     if (hitPoly) {
                         setCadSelectedPolygon(hitPoly);
                         if (hitSurveyId) setCadActiveSurveyId(hitSurveyId);`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
