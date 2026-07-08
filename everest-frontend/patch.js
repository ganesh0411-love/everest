const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /} else if \(cadTool === 'SELECT_TEXT'\) \{\s*allCadTexts\.forEach\(txt => \{\s*if \(Math\.hypot\(txt\.x - rawPt\.x, txt\.y - rawPt\.y\) < minSnapDist \* 3\) targetText = txt;\s*\}\);\s*\} else if \(cadTool === 'SELECT_METRIC'\) \{/g,
  '} else if (cadTool === \'SELECT_TEXT\') {\\n         if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === \'text\') {\\n             const tid = e.target.getAttribute(\'data-id\');\\n             if (tid) targetText = allCadTexts.find(t => t.id === tid) || null;\\n         }\\n      } else if (cadTool === \'SELECT_METRIC\') {'
);

c = c.replace(
  /setIsEditingLineMode\(false\);\s*setCadPopupOffset\(\{ x: 0, y: 0 \}\);/g,
  'setIsEditingLineMode(false);\\n           setCadEditInputs(p => ({ ...p, isMovingText: false }));\\n           setCadPopupOffset({ x: 0, y: 0 });'
);

c = c.replace(
  /\{allCadTexts\.map\(txt => \{\s*const isSelected = cadSelectedText === txt\.id;\s*return \(\s*<text/g,
  '{allCadTexts.map(txt => {\\n                     const isSelected = cadSelectedText === txt.id;\\n                     return (\\n                        <text\\n                           data-id={txt.id}'
);

c = c.replace(
  /\{typeof cadSelectedText !== 'undefined' && cadSelectedText && \(\(\) => \{/g,
  '{typeof cadSelectedText !== \'undefined\' && cadSelectedText && !cadEditInputs.isMovingText && (() => {'
);

fs.writeFileSync(file, c);
console.log('Patch complete.');

