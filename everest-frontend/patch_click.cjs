const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const targetLogic = `                 if (cadTool === 'IDLE' && cadPolygons.length > 0) {
                     const rawPt = getCadSvgCoords(e.clientX, e.clientY);
                     let hitPoly = null;
                     for (let p of cadPolygons) {
                         if (pointInPolygon(rawPt, p.pts)) {
                             hitPoly = p.id;
                             break;
                         }
                     }
                     if (hitPoly) {
                         setCadSelectedPolygon(hitPoly);
                         setCadSelectedNode(null);
                         setCadSelectedLine(null);
                         setCadSelectedCircle(null);
                     } else {
                         setCadSelectedPolygon(null);
                     }
                 }`;

const replacementLogic = `                 if (cadTool === 'IDLE' && cadPolygons.length > 0) {
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
                         if (hitSurveyId) {
                             setCadActiveSurveyId(hitSurveyId);
                         }
                         setCadSelectedNode(null);
                         setCadSelectedLine(null);
                         setCadSelectedCircle(null);
                     } else {
                         setCadSelectedPolygon(null);
                     }
                 }`;

if (content.includes(targetLogic)) {
    content = content.replace(targetLogic, replacementLogic);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Replaced hitPoly logic correctly.");
} else {
    console.log("Target logic not found.");
}
