const fs = require('fs');
const targetPath = 'src/components/AdminDashboard.jsx';
let fileContent = fs.readFileSync(targetPath, 'utf8').replace(/\r\n/g, '\n');

// Add missing state variables
const stateVars = `
  const [multiSurveyData, setMultiSurveyData] = React.useState([]);
  const [activeSurveyId, setActiveSurveyId] = React.useState(null);
  const [hiddenSurveys, setHiddenSurveys] = React.useState([]);
  const [isSurveyDropdownOpen, setIsSurveyDropdownOpen] = React.useState(false);
  const SURVEY_COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6', '#f97316'];
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = React.useState(false);
  const [isPerimeterDropdownOpen, setIsPerimeterDropdownOpen] = React.useState(false);
  const [isLayersDropdownOpen, setIsLayersDropdownOpen] = React.useState(false);
  const [isPolygonAreaMinimized, setIsPolygonAreaMinimized] = React.useState(false);
  const [selectedPerimeterUnit, setSelectedPerimeterUnit] = React.useState('Ft');
`;

if (!fileContent.includes('const [isPolygonAreaMinimized')) {
    fileContent = fileContent.replace('const [cadLines, setCadLines] = React.useState([]);', 'const [cadLines, setCadLines] = React.useState([]);' + stateVars);
}

// Replace the TOP HEADER block
const topHeaderStart = fileContent.indexOf('{/* WORKSPACE COMPACT TOP HEADER */}');
const topHeaderEndStr = '{cadPrompt && (() => {';
let topHeaderEnd = fileContent.indexOf(topHeaderEndStr, topHeaderStart);

// If using old cadPrompt rendering
if (topHeaderEnd === -1) {
    topHeaderEnd = fileContent.indexOf('{cadPrompt && (', topHeaderStart);
}

if (topHeaderStart !== -1 && topHeaderEnd !== -1) {
    const newHeader = `
               {/* WORKSPACE COMPACT TOP HEADER */}
               <div className="bg-slate-800/90 backdrop-blur border-b border-r border-slate-700 w-[calc(100%-60px)] flex justify-between items-center shrink-0 shadow-sm z-[150] relative rounded-br-2xl p-2">
                 
                 {/* LEFT: AREA & PARAMETER (VERTICAL STACK) */}
                 <div className="flex-1 flex flex-col justify-center items-start px-2 border-r border-slate-700/50 min-w-0 overflow-hidden">
                    <button onClick={() => { setIsAreaDropdownOpen(!isAreaDropdownOpen); setIsPerimeterDropdownOpen(false); }} className="flex items-center gap-1.5 text-white font-black text-sm hover:text-emerald-400 transition-colors shrink-0 outline-none w-full">
                      <span className="truncate">{cadComputedArea ? (
                          selectedAreaUnit === 'Hectare' ? cadComputedArea.hectare.toFixed(4) :
                          selectedAreaUnit === 'Ares' ? cadComputedArea.are.toFixed(4) :
                          selectedAreaUnit === 'Acre' ? cadComputedArea.acre.toFixed(4) :
                          selectedAreaUnit === 'Cent' ? cadComputedArea.cent.toFixed(2) :
                          selectedAreaUnit === 'Sq. Ft' ? cadComputedArea.sqFt.toFixed(2) :
                          selectedAreaUnit === 'Sq. M' ? cadComputedArea.sqMeters.toFixed(2) : '--'
                      ) : "--"}</span> <span className="text-[10px] text-slate-400 whitespace-nowrap ml-auto">{selectedAreaUnit} ⏷</span>
                    </button>
                    
                    <button onClick={() => { setSelectedPerimeterUnit(selectedPerimeterUnit === 'Ft' ? 'M' : 'Ft'); setIsAreaDropdownOpen(false); }} className="flex items-center gap-1.5 text-white font-black text-sm hover:text-fuchsia-400 transition-colors shrink-0 outline-none w-full mt-1">
                      <span className="truncate">{(() => {
                          let totalMeters = cadLines.reduce((acc, l) => acc + (l.fixedLength ? parseFloat(l.fixedLength) : (cadScale ? Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale : 0)), 0);
                          if (selectedPerimeterUnit === 'Ft') {
                              return (totalMeters * 3.28084).toFixed(2);
                          } else {
                              return totalMeters.toFixed(2);
                          }
                      })()}</span> <span className="text-[10px] text-slate-400 whitespace-nowrap ml-auto">Tot {selectedPerimeterUnit} ⇄</span>
                    </button>
                 </div>

                 {/* RIGHT: SURVEY DATA (VERTICAL STACK) */}
                 <div className="flex-1 flex flex-col justify-center items-start px-3 min-w-0 overflow-hidden border-r border-slate-700/50">
                    <button onClick={() => { setIsSurveyDropdownOpen(!isSurveyDropdownOpen); setIsLayersDropdownOpen(false); }} className="flex items-center justify-between w-full text-slate-300 font-bold text-xs hover:text-indigo-400 transition-colors shrink-0 outline-none">
                      <span className="truncate">S.No {multiSurveyData?.find(s => s.id === activeSurveyId)?.surveyNo || '-'}</span> <span className="text-[9px]">⏷</span>
                    </button>
                    <button className="flex items-center justify-between w-full text-slate-300 font-bold text-xs hover:text-indigo-400 transition-colors shrink-0 outline-none mt-1.5">
                      <span className="truncate">Sub-D -</span> <span className="text-[9px]">⏷</span>
                    </button>
                 </div>
                 
                 {/* FAR RIGHT: LAYERS & TOGGLES */}
                 <div className="flex-1 flex items-center justify-center px-2 min-w-0">
                    <button onClick={() => { setIsLayersDropdownOpen(!isLayersDropdownOpen); setIsSurveyDropdownOpen(false); }} className="flex items-center gap-1.5 text-slate-300 font-bold text-xs hover:text-cyan-400 transition-colors shrink-0 outline-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                      <span className="truncate">Layers</span> <span className="text-[9px]">⏷</span>
                    </button>
                 </div>

                 {/* DROPDOWNS */}
                 {isAreaDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsAreaDropdownOpen(false)}></div>
                      <div className="absolute top-full left-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[120px] flex flex-col">
                         {['Hectare', 'Ares', 'Acre', 'Cent', 'Sq. Ft', 'Sq. M'].map(unit => (
                             <button key={unit} onClick={() => { setSelectedAreaUnit(unit); setIsAreaDropdownOpen(false); }} className={\`px-4 py-2 text-xs font-bold text-left hover:bg-slate-700 transition-colors \${selectedAreaUnit === unit ? 'text-emerald-400' : 'text-slate-300'}\`}>
                                {unit}
                             </button>
                         ))}
                      </div>
                    </>
                 )}
                 
                 {isSurveyDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsSurveyDropdownOpen(false)}></div>
                      <div className="absolute top-full right-1/3 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[150px] flex flex-col max-h-[300px] overflow-y-auto">
                        {multiSurveyData?.length === 0 ? (
                          <div className="px-4 py-2 text-xs font-medium text-slate-400 italic text-center border-b border-slate-700/50 mb-1">No Surveys<br/>Registered</div>
                        ) : (
                          multiSurveyData?.map(s => (
                             <button key={s.id} onClick={() => { setActiveSurveyId(s.id); setIsSurveyDropdownOpen(false); }} className="px-4 py-2 text-xs font-bold text-left hover:bg-slate-700 transition-colors flex justify-between items-center group">
                                <div className="flex items-center gap-2 truncate">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: s.color }}></span>
                                    <span className={\`truncate \${s.id === activeSurveyId ? 'text-cyan-400' : 'text-slate-300 group-hover:text-white'}\`}>{s.surveyNo}</span>
                                </div>
                             </button>
                          ))
                        )}
                        <button onClick={() => { setShowMultiSurveyModal(true); setIsSurveyDropdownOpen(false); }} className="px-4 py-2.5 mt-1 text-xs font-black text-center text-emerald-400 hover:bg-slate-700 transition-colors border-t border-slate-700 border-dashed uppercase tracking-wider">
                            + Manage
                        </button>
                      </div>
                    </>
                 )}

                 {isLayersDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsLayersDropdownOpen(false)}></div>
                      <div className="absolute top-full right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-2 z-50 min-w-[200px] flex flex-col max-h-[300px] overflow-y-auto">
                        <div className="px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-700 mb-1">Survey Layers</div>
                        {multiSurveyData?.length === 0 ? (
                          <div className="px-4 py-3 text-[10px] text-slate-500 italic text-center">No layers active</div>
                        ) : (
                          multiSurveyData?.map(s => (
                             <div key={s.id} className="px-4 py-2 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center gap-2 truncate pr-2">
                                    <span className="w-3 h-3 rounded shadow-sm border border-slate-600 shrink-0" style={{ backgroundColor: hiddenSurveys.includes(s.id) ? 'transparent' : s.color }}></span>
                                    <span className={\`text-xs font-bold truncate \${hiddenSurveys.includes(s.id) ? 'text-slate-500 line-through' : 'text-slate-200'}\`}>{s.surveyNo}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setHiddenSurveys(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]); }} className="text-slate-400 hover:text-white transition-colors shrink-0 p-1">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        {hiddenSurveys.includes(s.id) ? <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22"/> : <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>}
                                    </svg>
                                </button>
                             </div>
                          ))
                        )}
                      </div>
                    </>
                 )}
               </div>
            </div>
               
               {/* COLLAPSE/EXPAND POLYGON AREA */}
               <div className="absolute top-[88px] left-4 z-[120]">
                  <button onClick={() => setIsPolygonAreaMinimized(!isPolygonAreaMinimized)} className="bg-slate-800 border border-slate-600 text-slate-300 hover:text-white px-2 py-1 rounded shadow-md text-[9px] font-black uppercase flex items-center gap-1 transition-colors">
                      {isPolygonAreaMinimized ? 'Expand Area Info' : 'Minimize Area Info'}
                  </button>
               </div>
               
               <div className={\`absolute top-[110px] left-4 z-[110] flex flex-col gap-2 transition-all duration-300 origin-top-left \${isPolygonAreaMinimized ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}\`}>
`;

    fileContent = fileContent.substring(0, topHeaderStart) + newHeader + fileContent.substring(topHeaderEnd);
    
    // Also we need to make sure the original "Polygon Area" block closes its container properly!
    // But since the original code didn't wrap it in a div that we just opened, we can just close the div after the polygon area display!
    const areaDisplayEnd = fileContent.indexOf('</div>', fileContent.indexOf('Total Area')) + 6;
    if (areaDisplayEnd > 6) {
        fileContent = fileContent.substring(0, areaDisplayEnd) + '\\n</div>\\n' + fileContent.substring(areaDisplayEnd);
    }
}

fs.writeFileSync(targetPath, fileContent, 'utf8');
console.log('Manually patched UI!');
