const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  /<button onClick=\{\(\) => setCadEditInputs\(p => \(\{ \.\.\.p, isMovingText: !p\.isMovingText \}\)\)\} className=\{`flex-1 font-bold py-1\.5 rounded text-\[10px\] transition-colors \$\{cadEditInputs\.isMovingText \? 'bg-fuchsia-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'\}`\}>\s*\{cadEditInputs\.isMovingText \? 'MOVING' : 'MOVE'\}\s*<\/button>/,
  '<button onClick={(e) => { e.stopPropagation(); setCadEditInputs(p => ({ ...p, isMovingText: true })); setCadPointerGesture({ startX: e.clientX, startY: e.clientY, isDragging: false, isDraggingMetric: false, isDraggingText: true, isDraggingLineBody: false, targetText: txt, targetNode: null, targetLine: null, targetCircle: null, targetMetric: null }); }} className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-1.5 rounded text-[10px] transition-colors">MOVE</button>'
);

c = c.replace(
  /let polyWidth = maxX - minX;\s*let polyHeight = maxY - minY;\s*let calculatedSize = Math\.max\(10, Math\.min\(80, Math\.min\(polyWidth, polyHeight\) \* 0\.2\)\);\s*const survey = p\.surveyId \? cadSurveys\.find\(s => s\.id === p\.surveyId\) : null;\s*let defaultText = '';\s*if \(survey\) \{\s*defaultText = survey\.surveyNo \+ \(survey\.subDivisionNo \? '\/' \+ survey\.subDivisionNo : ''\);\s*\}/,
  `let polyWidth = maxX - minX;
          let polyHeight = maxY - minY;
          
          const survey = p.surveyId ? cadSurveys.find(s => s.id === p.surveyId) : null;
          let defaultText = '';
          if (survey) {
             defaultText = survey.surveyNo + (survey.subDivisionNo ? '/' + survey.subDivisionNo : '');
          }
          
          let maxAllowedByWidth = (polyWidth * 0.8) / Math.max(1, defaultText.length * 0.6);
          let maxAllowedByHeight = polyHeight * 0.7;
          let calculatedSize = Math.max(8, Math.min(80, Math.min(maxAllowedByWidth, maxAllowedByHeight)));`
);

c = c.replace(
  /\{allCadTexts\.map\(txt => \{\s*const isSelected = cadSelectedText === txt\.id;\s*return \(\s*<text\s*data-id=\{txt\.id\}/,
  `{allCadTexts.map(txt => {
                     const isSelected = cadSelectedText === txt.id;
                     const isMoving = isSelected && cadEditInputs.isMovingText;
                     const fsVal = txt.fontSize || 14;
                     const w = (txt.text || '').length * fsVal * 0.6;
                     return (
                        <g key={txt.id} transform={txt.rotation ? \`rotate(\${txt.rotation}, \${txt.x}, \${txt.y})\` : undefined}>
                           {isMoving && (
                               <rect x={txt.x - (txt.isPolygonText ? w/2 : 0) - 5} y={txt.y - (txt.isPolygonText ? fsVal/2 : fsVal) - 5} width={w + 10} height={fsVal + 10} fill="none" stroke="#fbcfe8" strokeWidth={cadViewport.width * 0.002 || 2} strokeDasharray="4,4" />
                           )}
                           <text
                              data-id={txt.id}`
);

c = c.replace(
  /className="transition-colors duration-200 cursor-pointer"\s*transform=\{txt\.rotation \? `rotate\(\$\{txt\.rotation\}, \$\{txt\.x\}, \$\{txt\.y\}\)` : undefined\}/,
  'className="transition-colors duration-200 cursor-pointer"'
);

c = c.replace(
  /\{txt\.text\}\s*<\/text>\s*\);\s*\}\)\}/g,
  `{txt.text}
                           </text>
                        </g>
                     );
                  })}`
);

c = c.replace(
  /background: '#020617'/g,
  "background: 'transparent'"
);

fs.writeFileSync(file, c);
console.log('Patch 4 complete.');
