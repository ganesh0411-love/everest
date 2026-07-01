const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// 1. Add states
content = content.replace(
    /const \[isSurveyDropdownOpen, setIsSurveyDropdownOpen\] = React\.useState\(false\);/g,
    `const [isSurveyDropdownOpen, setIsSurveyDropdownOpen] = React.useState(false);
    const [isSubDivisionDropdownOpen, setIsSubDivisionDropdownOpen] = React.useState(false);
    const [checkedSurveyNos, setCheckedSurveyNos] = React.useState([]);
    const [isMasterDashEnabled, setIsMasterDashEnabled] = React.useState(true);`
);

// 2. Update visibleCadPolygons
content = content.replace(
    /const visibleCadPolygons = React\.useMemo\(\(\) => \{\s*return cadPolygons\.filter\(p => \{\s*if \(\!p\.surveyId\) return true;\s*const s = cadSurveys\.find\(s => s\.id === p\.surveyId\);\s*return s \? s\.isVisible : true;\s*\}\);\s*\}, \[cadPolygons, cadSurveys\]\);/g,
    `const visibleCadPolygons = React.useMemo(() => {
      return cadPolygons.filter(p => {
         if (!p.surveyId) return true;
         const s = cadSurveys.find(s => s.id === p.surveyId);
         if (!s) return true;
         if (!checkedSurveyNos.includes(s.surveyNo)) return false;
         if (isMasterDashEnabled) return true;
         return s.isVisible;
      });
    }, [cadPolygons, cadSurveys, checkedSurveyNos, isMasterDashEnabled]);`
);

// 3. Update visibleCadLines survey ids
content = content.replace(
    /const visibleSurveyIds = new Set\(cadSurveys\.filter\(s => s\.isVisible\)\.map\(s => s\.id\)\);/g,
    `const visibleSurveyIds = new Set(cadSurveys.filter(s => {
          if (!checkedSurveyNos.includes(s.surveyNo)) return false;
          if (isMasterDashEnabled) return true;
          return s.isVisible;
      }).map(s => s.id));`
);

// 4. Update visibleCadLines dependencies
content = content.replace(
    /\}, \[cadLines, cadSurveys, cadPolygons\]\);/g,
    `}, [cadLines, cadSurveys, cadPolygons, checkedSurveyNos, isMasterDashEnabled]);`
);

// 5. Update submitCadPrompt survey creation
content = content.replace(
    /setCadSurveys\(prev => \[\.\.\.prev, \{ id: newSurveyId, surveyNo: cadPromptSurveyNo, subDivisionNo: cadPromptSubDiv, hexColor: surveyColor, isVisible: true \}\]\);/g,
    `setCadSurveys(prev => [...prev, { id: newSurveyId, surveyNo: cadPromptSurveyNo, subDivisionNo: cadPromptSubDiv, hexColor: surveyColor, isVisible: false }]);
          setCheckedSurveyNos(prev => prev.includes(cadPromptSurveyNo) ? prev : [...prev, cadPromptSurveyNo]);`
);

// 6. Update Top Header UI (Dropdown Buttons)
const headerRegex = /<div className="flex-1 flex flex-col justify-center px-3 py-1\.5 min-w-0">\s*<button onClick=\{\(\) => setIsSurveyDropdownOpen\(\!isSurveyDropdownOpen\)\} className="flex items-center justify-between w-full text-white font-black text-\[13px\] hover:text-sky-400 transition-colors outline-none leading-tight">\s*<span className="truncate">\s*\{cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\) \? `Survey No \$\{cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\)\.surveyNo\}` : cadSurveys\.find\(s => s\.isVisible\) \? `Survey No \$\{cadSurveys\.find\(s => s\.isVisible\)\.surveyNo\}` : 'Survey No'\}\s*<\/span>\s*<span className="text-\[10px\] text-slate-400">-<\/span>\s*<\/button>\s*<button onClick=\{\(\) => setIsSurveyDropdownOpen\(\!isSurveyDropdownOpen\)\} className="flex items-center justify-between w-full text-slate-400 font-bold text-\[10px\] hover:text-sky-400 transition-colors outline-none leading-tight mt-0\.5">\s*<span className="truncate">\s*\{cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\) \? `Sub-division - \$\{cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\)\.subDivisionNo\}` : cadSurveys\.find\(s => s\.isVisible\) \? `Sub-division - \$\{cadSurveys\.find\(s => s\.isVisible\)\.subDivisionNo\}` : 'Sub-division -'\}\s*<\/span>\s*<span className="text-\[9px\]">-<\/span>\s*<\/button>\s*<\/div>/g;

content = content.replace(headerRegex, 
`<div className="flex-1 flex flex-col justify-center px-3 py-1.5 min-w-0">
                     <button onClick={() => { setIsSurveyDropdownOpen(!isSurveyDropdownOpen); setIsSubDivisionDropdownOpen(false); }} className="flex items-center justify-between w-full text-white font-black text-[13px] hover:text-sky-400 transition-colors outline-none leading-tight">
                        <span className="truncate">
                          {checkedSurveyNos.length > 0 ? \`Survey No \${checkedSurveyNos.join(', ')}\` : 'Survey No'}
                        </span> 
                        <span className="text-[10px] text-slate-400">▼</span>
                      </button>
                     <button onClick={() => { setIsSubDivisionDropdownOpen(!isSubDivisionDropdownOpen); setIsSurveyDropdownOpen(false); }} className="flex items-center justify-between w-full text-slate-400 font-bold text-[10px] hover:text-sky-400 transition-colors outline-none leading-tight mt-0.5">
                        <span className="truncate">
                          {isMasterDashEnabled ? 'Sub-division - All' : (cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible) ? \`Sub-division - \${cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible).subDivisionNo}\` : 'Sub-division -')}
                        </span> 
                        <span className="text-[9px]">▼</span>
                      </button>
                   </div>`
);

// 7. Replace the old Dropdown UI rendering block
const dropdownUiRegex = /\{isSurveyDropdownOpen && \(\s*<>\s*<div className="fixed inset-0 z-40" onClick=\{\(\) => setIsSurveyDropdownOpen\(false\)\}><\/div>\s*<div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-\[200px\] flex flex-col max-h-\[300px\] overflow-y-auto">\s*\{cadSurveys\.length === 0 \? \(\s*<div className="px-4 py-2 text-xs text-slate-400 italic text-center">No surveys created yet<\/div>\s*\) : \(\s*cadSurveys\.map\(survey => \(\s*<div key=\{survey\.id\} className="flex items-center justify-between px-4 py-2 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700\/50 last:border-0" onClick=\{\(\) => setCadActiveSurveyId\(survey\.id\)\}>\s*<div className="flex items-center gap-3">\s*<input \s*type="checkbox" \s*checked=\{survey\.isVisible\} \s*onChange=\{\(e\) => \{ e\.stopPropagation\(\); setCadSurveys\(prev => prev\.map\(s => s\.id === survey\.id \? \{ \.\.\.s, isVisible: e\.target\.checked \} : s\)\); \}\} \s*onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*className="w-4 h-4 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" \s*\/>\s*<div className="flex flex-col">\s*<span className=\{`text-xs font-bold \$\{cadActiveSurveyId === survey\.id \? 'text-white' : 'text-slate-300'\}`\}>\{survey\.surveyNo\}<\/span>\s*<span className="text-\[10px\] text-slate-400">\{survey\.subDivisionNo \|\| '-'\}<\/span>\s*<\/div>\s*<\/div>\s*<div className="w-3 h-3 rounded-full shadow-sm" style=\{\{ backgroundColor: survey\.hexColor \}\}\><\/div>\s*<\/div>\s*\)\)\s*\)\}\s*<\/div>\s*<\/>\s*\)\}/;

content = content.replace(dropdownUiRegex,
`{isSurveyDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSurveyDropdownOpen(false)}></div>
                        <div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[120px] flex flex-col max-h-[300px] overflow-y-auto">
                           {cadSurveys.length === 0 ? (
                               <div className="px-4 py-2 text-xs text-slate-400 italic text-center">No surveys</div>
                           ) : (
                               Array.from(new Set(cadSurveys.map(s => s.surveyNo))).map(surveyNo => (
                                   <div key={surveyNo} className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50 last:border-0" onClick={(e) => { e.stopPropagation(); setCheckedSurveyNos(prev => prev.includes(surveyNo) ? prev.filter(n => n !== surveyNo) : [...prev, surveyNo]); }}>
                                       <input 
                                           type="checkbox" 
                                           checked={checkedSurveyNos.includes(surveyNo)} 
                                           onChange={(e) => { e.stopPropagation(); setCheckedSurveyNos(prev => e.target.checked ? [...prev, surveyNo] : prev.filter(n => n !== surveyNo)); }} 
                                           onClick={(e) => e.stopPropagation()}
                                           className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" 
                                       />
                                       <span className="text-xs font-bold text-slate-200">{surveyNo}</span>
                                   </div>
                               ))
                           )}
                        </div>
                      </>
                   )}
                   {isSubDivisionDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSubDivisionDropdownOpen(false)}></div>
                        <div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[180px] flex flex-col max-h-[300px] overflow-y-auto">
                           {/* MASTER DASH ROW */}
                           <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50" onClick={(e) => { e.stopPropagation(); setIsMasterDashEnabled(!isMasterDashEnabled); }}>
                               <input 
                                   type="checkbox" 
                                   checked={isMasterDashEnabled} 
                                   onChange={(e) => { e.stopPropagation(); setIsMasterDashEnabled(e.target.checked); }} 
                                   onClick={(e) => e.stopPropagation()}
                                   className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" 
                               />
                               <span className="text-xs font-bold text-slate-200">- (All Sub-divisions)</span>
                           </div>

                           {/* DEPENDENT CASCADE ROWS */}
                           {cadSurveys.filter(s => checkedSurveyNos.includes(s.surveyNo)).length === 0 ? (
                               <div className="px-4 py-2 text-xs text-slate-400 italic text-center">No active sub-divisions</div>
                           ) : (
                               cadSurveys.filter(s => checkedSurveyNos.includes(s.surveyNo)).map(survey => (
                                   <div key={survey.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50 last:border-0" onClick={(e) => { e.stopPropagation(); setIsMasterDashEnabled(false); setCadSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isVisible: !s.isVisible } : s)); setCadActiveSurveyId(survey.id); }}>
                                       <div className="flex items-center gap-3">
                                           <input 
                                               type="checkbox" 
                                               checked={survey.isVisible} 
                                               onChange={(e) => { e.stopPropagation(); setIsMasterDashEnabled(false); setCadSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isVisible: e.target.checked } : s)); setCadActiveSurveyId(survey.id); }} 
                                               onClick={(e) => e.stopPropagation()}
                                               className="w-3.5 h-3.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" 
                                           />
                                           <span className={\`text-xs font-bold \${cadActiveSurveyId === survey.id ? 'text-white' : 'text-slate-300'}\`}>{survey.surveyNo} / {survey.subDivisionNo || '-'}</span>
                                       </div>
                                       <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: survey.hexColor }}></div>
                                   </div>
                               ))
                           )}
                        </div>
                      </>
                   )}`
);

fs.writeFileSync('src/components/AdminDashboard.jsx', content, 'utf-8');
console.log("Dropdown replacement done.");
