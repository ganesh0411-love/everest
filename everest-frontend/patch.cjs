
const fs = require('fs');
const path = require('path');
const file = path.join('src', 'components', 'AdminDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    /\} else if \(cadTool === 'SELECT_TEXT'\) \{[\s\S]*?\} else if \(cadTool === 'SELECT_METRIC'\) \{/,
    } else if (cadTool === 'SELECT_TEXT') {
         if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === 'text') {
             const tid = e.target.getAttribute('data-id');
             if (tid) targetText = allCadTexts.find(t => t.id === tid) || null;
         }
      } else if (cadTool === 'SELECT_METRIC') {
);

content = content.replace(
    /setCadSelectedText\(null\);\s*setCadSelectedMetric\(null\);\s*\}/,
    setCadSelectedText(null);
                       setCadSelectedMetric(null);
                       setCadEditInputs(p => ({ ...p, isMovingText: false }));
                     }
);

content = content.replace(
    /\{allCadTexts\.map\(txt => \{\s*const isSelected = cadSelectedText === txt\.id;\s*return \(\s*<text\s*key=\{txt\.id\}/,
    {allCadTexts.map(txt => {
                     const isSelected = cadSelectedText === txt.id;
                     return (
                        <text
                           key={txt.id}
                           data-id={txt.id}
);

content = content.replace(
    /\{typeof cadSelectedText !== 'undefined' && cadSelectedText && \(\(\) => \{/,
    {typeof cadSelectedText !== 'undefined' && cadSelectedText && !cadEditInputs.isMovingText && (() => {
);

fs.writeFileSync(file, content);
console.log('Patched AdminDashboard.jsx');

