const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

const s1 = c.indexOf('{/* Magnetic Snap Pulse Indicator */}');
const startIdx = c.indexOf('{allCadTexts.map(txt => {', s1);
const endIdx = c.indexOf('})}', startIdx) + 3;

if (startIdx !== -1 && endIdx !== -1) {
    const replacementStr = `{allCadTexts.map(txt => {
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
                              data-id={txt.id}
                              x={txt.x} y={txt.y}
                              fill={isSelected ? "#fbcfe8" : (txt.hexColor || "#e2e8f0")}
                              fontSize={fsVal}
                              fontWeight="bold"
                              className="transition-colors duration-200 cursor-pointer"
                              pointerEvents={cadTool === 'SELECT_TEXT' ? "auto" : "none"}
                              textAnchor={txt.isPolygonText ? "middle" : "start"}
                              dominantBaseline={txt.isPolygonText ? "central" : "auto"}
                           >
                              {txt.text}
                           </text>
                        </g>
                     );
                  })}`;
    
    c = c.substring(0, startIdx) + replacementStr + c.substring(endIdx);
}

// Also replace the popup visibility condition
c = c.replace(
  /\{typeof cadSelectedText !== 'undefined' && cadSelectedText && \(\(\) => \{/g,
  `{typeof cadSelectedText !== 'undefined' && cadSelectedText && !cadEditInputs.isMovingText && (() => {`
);

// Also replace dynamic sizing block
c = c.replace(
  /let polyWidth = maxX - minX;\s*let polyHeight = maxY - minY;\s*let calculatedSize = Math\.max\(10, Math\.min\(80, Math\.min\(polyWidth, polyHeight\) \* 0\.2\)\);\s*const survey = p\.surveyId \? cadSurveys\.find\(s => s\.id === p\.surveyId\) : null;\s*let defaultText = '';\s*if \(survey\) \{\s*defaultText = survey\.surveyNo \+ \(survey\.subDivisionNo \? '\/' \+ survey\.subDivisionNo : ''\);\s*\}/g,
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


fs.writeFileSync(file, c);
console.log('Fixed loop cleanly.');
