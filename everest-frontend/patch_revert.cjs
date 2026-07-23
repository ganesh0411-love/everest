const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Remove the activeSubdiv block
const blockRegex = /if \(activeSubdiv && activeSubdiv !== 'All'\) \{[\s\S]*?\} else \{\s*(ruleContent = `<Rule>[\s\S]*?<\/Rule>`;)\s*\}/;
code = code.replace(blockRegex, '$1');

// 2. Remove activeSubdiv from dependency array
code = code.replace(/activeSurvey, activeSubdiv, isHighlightSubdiv\]\);/g, 'activeSurvey, isHighlightSubdiv]);');

// 3. Remove activeSubdiv prop from BoundaryWMSLayer
code = code.replace(/activeSurvey=\{selSurvey\} activeSubdiv=\{selSubdiv\} isHighlightSubdiv=\{/g, 'activeSurvey={selSurvey} isHighlightSubdiv={');

fs.writeFileSync('AdminDashboard_target.jsx', code);
console.log('AdminDashboard_target.jsx created successfully.');
