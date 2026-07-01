const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const targetStr = `                  let polySurveyId = null;
                  pts.forEach((pt, idx) => {
                      const nextPt = pts[(idx + 1) % pts.length];
                      const lnIdx = cadLines.findIndex(l => 
                         (Math.hypot(l.p1.x - pt.x, l.p1.y - pt.y) < 1e-4 && Math.hypot(l.p2.x - nextPt.x, l.p2.y - nextPt.y) < 1e-4) ||
                         (Math.hypot(l.p2.x - pt.x, l.p2.y - pt.y) < 1e-4 && Math.hypot(l.p1.x - nextPt.x, l.p1.y - nextPt.y) < 1e-4)
                      );
                      if (lnIdx !== -1 && cadLines[lnIdx].surveyId) {
                          polySurveyId = cadLines[lnIdx].surveyId;
                      }
                  });`;

const replaceStr = `                  const surveyCounts = {};
                  pts.forEach((pt, idx) => {
                      const nextPt = pts[(idx + 1) % pts.length];
                      const lnIdx = cadLines.findIndex(l => 
                         (Math.hypot(l.p1.x - pt.x, l.p1.y - pt.y) < 1e-4 && Math.hypot(l.p2.x - nextPt.x, l.p2.y - nextPt.y) < 1e-4) ||
                         (Math.hypot(l.p2.x - pt.x, l.p2.y - pt.y) < 1e-4 && Math.hypot(l.p1.x - nextPt.x, l.p1.y - nextPt.y) < 1e-4)
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

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replaceStr);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("polySurveyId logic updated.");
} else {
    console.log("Target not found.");
}
