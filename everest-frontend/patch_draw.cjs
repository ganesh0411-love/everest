const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /let finalLen = cadScale \? \(Math\.hypot\(cadAnchorNode\.x - snapPt\.x, cadAnchorNode\.y - snapPt\.y\) \* cadScale\)\.toFixed\(2\) : null;\s*setCadLines\(prev => \[\.\.\.prev, \{ id: newId, p1: \{ x: cadAnchorNode\.x, y: cadAnchorNode\.y \}, p2: snapPt, fixedLength: finalLen, strokeWidth: 4, hexColor: '#38bdf8' \}\]\);/m;

const replacement = `let finalLen = cadScale ? (Math.hypot(cadAnchorNode.x - snapPt.x, cadAnchorNode.y - snapPt.y) * cadScale).toFixed(2) : null;
              
              const activeSurvey = cadSurveys.find(s => s.id === cadActiveSurveyId);
              const assignedHexColor = activeSurvey ? activeSurvey.hexColor : '#38bdf8';
              
              setCadLines(prev => [...prev, { id: newId, p1: { x: cadAnchorNode.x, y: cadAnchorNode.y }, p2: snapPt, fixedLength: finalLen, strokeWidth: 4, hexColor: assignedHexColor, surveyId: cadActiveSurveyId }]);`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
