const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf-8');

// 1. Remove isMasterDashEnabled state
content = content.replace(
    /\s*const \[isMasterDashEnabled, setIsMasterDashEnabled\] = React\.useState\(true\);/g,
    ''
);

// 2. Update visibleCadPolygons
const vcpRegex = /const visibleCadPolygons = React\.useMemo\(\(\) => \{\s*return cadPolygons\.filter\(p => \{\s*if \(\!p\.surveyId\) return true;\s*const s = cadSurveys\.find\(s => s\.id === p\.surveyId\);\s*if \(\!s\) return true;\s*if \(\!checkedSurveyNos\.includes\(s\.surveyNo\)\) return false;\s*if \(isMasterDashEnabled\) return true;\s*return s\.isVisible;\s*\}\);\s*\}, \[cadPolygons, cadSurveys, checkedSurveyNos, isMasterDashEnabled\]\);/g;

content = content.replace(vcpRegex, 
`const visibleCadPolygons = React.useMemo(() => {
      return cadPolygons.filter(p => {
         if (!p.surveyId) return true;
         const s = cadSurveys.find(s => s.id === p.surveyId);
         if (!s) return true;
         if (!checkedSurveyNos.includes(s.surveyNo)) return false;
         
         const isMasterDash = !cadSurveys.some(sub => sub.surveyNo === s.surveyNo && sub.isVisible);
         if (isMasterDash) return true;
         
         return s.isVisible;
      });
    }, [cadPolygons, cadSurveys, checkedSurveyNos]);`
);

// 3. Update visibleSurveyIds
const vsiRegex = /const visibleSurveyIds = new Set\(cadSurveys\.filter\(s => \{\s*if \(\!checkedSurveyNos\.includes\(s\.surveyNo\)\) return false;\s*if \(isMasterDashEnabled\) return true;\s*return s\.isVisible;\s*\}\)\.map\(s => s\.id\)\);/g;

content = content.replace(vsiRegex,
`const visibleSurveyIds = new Set(cadSurveys.filter(s => {
          if (!checkedSurveyNos.includes(s.surveyNo)) return false;
          
          const isMasterDash = !cadSurveys.some(sub => sub.surveyNo === s.surveyNo && sub.isVisible);
          if (isMasterDash) return true;
          
          return s.isVisible;
      }).map(s => s.id));`
);

// 4. Update visibleCadLines dependencies
content = content.replace(
    /\}, \[cadLines, cadSurveys, cadPolygons, checkedSurveyNos, isMasterDashEnabled\]\);/g,
    `}, [cadLines, cadSurveys, cadPolygons, checkedSurveyNos]);`
);

// 5. Update header Sub-division button
const headerBtnRegex = /<span className="truncate">\s*\{isMasterDashEnabled \? 'Sub-division - All' : \(cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\) \? `Sub-division - \$\{cadSurveys\.find\(s => s\.id === cadActiveSurveyId && s\.isVisible\)\.subDivisionNo\}` : 'Sub-division -'\)\}\s*<\/span>/g;

content = content.replace(headerBtnRegex,
`<span className="truncate">
                          {(() => {
                             if (checkedSurveyNos.length === 0) return 'Sub-division -';
                             const activeObj = cadSurveys.find(s => s.id === cadActiveSurveyId && s.isVisible);
                             if (activeObj) return \`Sub-division - \${activeObj.subDivisionNo}\`;
                             return 'Sub-division - All';
                          })()}
                        </span>`
);

// 6. Update the Sub-division Dropdown DOM completely
const dropdownRegex = /\{isSubDivisionDropdownOpen && \(\s*<>\s*<div className="fixed inset-0 z-40" onClick=\{\(\) => setIsSubDivisionDropdownOpen\(false\)\}><\/div>\s*<div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-\[180px\] flex flex-col max-h-\[300px\] overflow-y-auto">\s*\{\/\* MASTER DASH ROW \*\/\}\s*<div className="flex items-center gap-3 px-3 py-1\.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700\/50" onClick=\{\(e\) => \{ e\.stopPropagation\(\); setIsMasterDashEnabled\(\!isMasterDashEnabled\); \}\}>\s*<input \s*type="checkbox" \s*checked=\{isMasterDashEnabled\} \s*onChange=\{\(e\) => \{ e\.stopPropagation\(\); setIsMasterDashEnabled\(e\.target\.checked\); \}\} \s*onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*className="w-3\.5 h-3\.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" \s*\/>\s*<span className="text-xs font-bold text-slate-200">- \(All Sub-divisions\)<\/span>\s*<\/div>\s*\{\/\* DEPENDENT CASCADE ROWS \*\/\}\s*\{cadSurveys\.filter\(s => checkedSurveyNos\.includes\(s\.surveyNo\)\)\.length === 0 \? \(\s*<div className="px-4 py-2 text-xs text-slate-400 italic text-center">No active sub-divisions<\/div>\s*\) : \(\s*cadSurveys\.filter\(s => checkedSurveyNos\.includes\(s\.surveyNo\)\)\.map\(survey => \(\s*<div key=\{survey\.id\} className="flex items-center justify-between px-3 py-1\.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700\/50 last:border-0" onClick=\{\(e\) => \{ e\.stopPropagation\(\); setIsMasterDashEnabled\(false\); setCadSurveys\(prev => prev\.map\(s => s\.id === survey\.id \? \{ \.\.\.s, isVisible: \!s\.isVisible \} : s\)\); setCadActiveSurveyId\(survey\.id\); \}\}>\s*<div className="flex items-center gap-3">\s*<input \s*type="checkbox" \s*checked=\{survey\.isVisible\} \s*onChange=\{\(e\) => \{ e\.stopPropagation\(\); setIsMasterDashEnabled\(false\); setCadSurveys\(prev => prev\.map\(s => s\.id === survey\.id \? \{ \.\.\.s, isVisible: e\.target\.checked \} : s\)\); setCadActiveSurveyId\(survey\.id\); \}\} \s*onClick=\{\(e\) => e\.stopPropagation\(\)\}\s*className="w-3\.5 h-3\.5 rounded border-slate-600 text-sky-500 focus:ring-sky-500 bg-slate-700 cursor-pointer" \s*\/>\s*<span className=\{`text-xs font-bold \$\{cadActiveSurveyId === survey\.id \? 'text-white' : 'text-slate-300'\}`\}>\{survey\.surveyNo\} \/ \{survey\.subDivisionNo \|\| '-'\}<\/span>\s*<\/div>\s*<div className="w-2\.5 h-2\.5 rounded-full shadow-sm" style=\{\{ backgroundColor: survey\.hexColor \}\}\><\/div>\s*<\/div>\s*\)\)\s*\)\}\s*<\/div>\s*<\/>\s*\)\}/;

content = content.replace(dropdownRegex,
`{isSubDivisionDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsSubDivisionDropdownOpen(false)}></div>
                        <div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[180px] flex flex-col max-h-[300px] overflow-y-auto">
                           {/* MASTER DASH ROW */}
                           <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50" onClick={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => checkedSurveyNos.includes(s.surveyNo) ? { ...s, isVisible: false } : s)); }}>
                               <input 
                                   type="checkbox" 
                                   checked={!cadSurveys.some(s => checkedSurveyNos.includes(s.surveyNo) && s.isVisible)} 
                                   onChange={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => checkedSurveyNos.includes(s.surveyNo) ? { ...s, isVisible: false } : s)); }} 
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
                                   <div key={survey.id} className="flex items-center justify-between px-3 py-1.5 hover:bg-slate-700 transition-colors cursor-pointer border-b border-slate-700/50 last:border-0" onClick={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isVisible: !s.isVisible } : s)); setCadActiveSurveyId(survey.id); }}>
                                       <div className="flex items-center gap-3">
                                           <input 
                                               type="checkbox" 
                                               checked={survey.isVisible} 
                                               onChange={(e) => { e.stopPropagation(); setCadSurveys(prev => prev.map(s => s.id === survey.id ? { ...s, isVisible: e.target.checked } : s)); setCadActiveSurveyId(survey.id); }} 
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
console.log("Replacement complete.");
