const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

const regex = /return cadLines\.filter\(l => \{\s*if \(\!l\.surveyId\) return true;\s*if \(visibleSurveyIds\.has\(l\.surveyId\)\) return true;\s*const lk1 = `\$\{l\.p1\.x\.toFixed\(3\)\},\$\{l\.p1\.y\.toFixed\(3\)\}->\$\{l\.p2\.x\.toFixed\(3\)\},\$\{l\.p2\.y\.toFixed\(3\)\}`;\s*const lk2 = `\$\{l\.p2\.x\.toFixed\(3\)\},\$\{l\.p2\.y\.toFixed\(3\)\}->\$\{l\.p1\.x\.toFixed\(3\)\},\$\{l\.p1\.y\.toFixed\(3\)\}`;\s*return visiblePolyEdges\.has\(lk1\) \|\| visiblePolyEdges\.has\(lk2\);\s*\}\);/m;

const replacement = `return cadLines.filter(l => {
        const lk1 = \`\${l.p1.x.toFixed(3)},\${l.p1.y.toFixed(3)}->\${l.p2.x.toFixed(3)},\${l.p2.y.toFixed(3)}\`;
        const lk2 = \`\${l.p2.x.toFixed(3)},\${l.p2.y.toFixed(3)}->\${l.p1.x.toFixed(3)},\${l.p1.y.toFixed(3)}\`;
        const isShared = visiblePolyEdges.has(lk1) || visiblePolyEdges.has(lk2);
        
        // Rule 2: Shared Edge Exception (keep if it bounds a currently valid closed polygon)
        if (isShared) return true;

        if (!l.surveyId) {
            // Prevent orphan null-survey lines from leaking into workspace once surveys exist
            return cadSurveys.length === 0;
        }

        // Rule 1: Remove completely if it belongs to an unchecked survey and isn't shared
        return visibleSurveyIds.has(l.surveyId);
      });`;

if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
    console.log("Regex replacement successful.");
} else {
    console.log("Regex failed to match.");
}
