const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// Patch 1: Majority rule for polySurveyId
const targetStr1 = `                  let newestIdx = -1;
                  let polySurveyId = null;
                  faceEdges.forEach(edge => {
                      const lnIdx = cadLines.findIndex(l => 
                          (Math.hypot(l.p1.x - edge.from.x, l.p1.y - edge.from.y) < 1e-3 && Math.hypot(l.p2.x - edge.to.x, l.p2.y - edge.to.y) < 1e-3) ||
                          (Math.hypot(l.p2.x - edge.from.x, l.p2.y - edge.from.y) < 1e-3 && Math.hypot(l.p1.x - edge.to.x, l.p1.y - edge.to.y) < 1e-3)
                      );
                      if (lnIdx > newestIdx) {
                          newestIdx = lnIdx;
                          polySurveyId = cadLines[lnIdx].surveyId;
                      }
                  });`;

const replaceStr1 = `                  const surveyCounts = {};
                  faceEdges.forEach(edge => {
                      const lnIdx = cadLines.findIndex(l => 
                          (Math.hypot(l.p1.x - edge.from.x, l.p1.y - edge.from.y) < 1e-3 && Math.hypot(l.p2.x - edge.to.x, l.p2.y - edge.to.y) < 1e-3) ||
                          (Math.hypot(l.p2.x - edge.from.x, l.p2.y - edge.from.y) < 1e-3 && Math.hypot(l.p1.x - edge.to.x, l.p1.y - edge.to.y) < 1e-3)
                      );
                      if (lnIdx !== -1 && cadLines[lnIdx].surveyId) {
                          const sId = cadLines[lnIdx].surveyId;
                          surveyCounts[sId] = (surveyCounts[sId] || 0) + 1;
                      }
                  });
                  let polySurveyId = null;
                  let maxCount = 0;
                  for (let sId in surveyCounts) {
                      if (surveyCounts[sId] > maxCount) {
                          maxCount = surveyCounts[sId];
                          polySurveyId = sId;
                      }
                  }`;

content = content.replace(targetStr1, replaceStr1);

// Patch 2: Header Mismatch
const targetStr2_1 = `{cadSurveys.find(s => s.id === cadActiveSurveyId) ? \`Survey No \${cadSurveys.find(s => s.id === cadActiveSurveyId).surveyNo}\` : 'Survey No'}`;
const replaceStr2_1 = `{cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible) ? \`Survey No \${cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible).surveyNo}\` : cadSurveys.find(s => s.isVisible) ? \`Survey No \${cadSurveys.find(s => s.isVisible).surveyNo}\` : 'Survey No'}`;

const targetStr2_2 = `{cadSurveys.find(s => s.id === cadActiveSurveyId) ? \`Sub-division - \${cadSurveys.find(s => s.id === cadActiveSurveyId).subDivisionNo}\` : 'Sub-division -'}`;
const replaceStr2_2 = `{cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible) ? \`Sub-division - \${cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible).subDivisionNo}\` : cadSurveys.find(s => s.isVisible) ? \`Sub-division - \${cadSurveys.find(s => s.isVisible).subDivisionNo}\` : 'Sub-division -'}`;

content = content.replace(targetStr2_1, replaceStr2_1);
content = content.replace(targetStr2_2, replaceStr2_2);

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log("Patches applied successfully.");
