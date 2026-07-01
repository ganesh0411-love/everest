const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /let polySurveyId = null;\s*pts\.forEach\(\(pt, idx\) => \{[\s\S]*?polySurveyId = cadLines\[lnIdx\]\.surveyId;\s*\}\s*\}\);\s*faces\.push\(\{ id:/;

const replacement = `const surveyCounts = {};
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
                  }
                  faces.push({ id:`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
