const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /if \(cadPrompt\.targetId\) \{[\s\S]*?\} else if \(cadPrompt\.node\) \{/m;

const replacement = `if (cadPrompt.targetId) {
                let valStr = cadPromptValue.trim();
                let num = parseFloat(valStr);
                if (isNaN(num) || num <= 0) { setCadPrompt(null); return; }
                
                if (cadPromptUnit === 'feet') {
                    num = num * 0.3048;
                    valStr = num.toFixed(2);
                }
                
                const line = cadLines.find(l => l.id === cadPrompt.targetId);
                if (line) {
                   const pxLength = Math.hypot(line.p1.x - line.p2.x, line.p1.y - line.p2.y);
                   if (!cadScale) {
                     setCadScale(num / pxLength);
                     setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, fixedLength: valStr, surveyId: newSurveyId, hexColor: surveyColor } : l));
                   } else {
                     const targetPx = num / cadScale;
                     const ratio = targetPx / pxLength;
                     const newP2 = {
                       x: line.p1.x + (line.p2.x - line.p1.x) * ratio,
                       y: line.p1.y + (line.p2.y - line.p1.y) * ratio
                     };
                     setCadLines(prev => prev.map(l => l.id === line.id ? { ...l, p2: newP2, fixedLength: valStr, surveyId: newSurveyId, hexColor: surveyColor } : l));
                     if (cadTool === 'ADD_LINE' && cadAnchorNode) {
                        if (Math.hypot(cadAnchorNode.x - line.p2.x, cadAnchorNode.y - line.p2.y) < 1e-4) {
                           setCadAnchorNode(newP2);
                        }
                     }
                   }
                }
            } else if (cadPrompt.node) {`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
