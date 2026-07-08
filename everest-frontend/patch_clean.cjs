const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

const startIdx = c.indexOf('{allCadTexts.map(txt => {');
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
    fs.writeFileSync(file, c);
    console.log('Successfully replaced exact index range!');
} else {
    console.log('Could not find start/end indices.');
}
