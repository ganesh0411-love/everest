const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');
let lines = c.split('\n');

const polygonAreaJSX = `
            {/* MUTUALLY EXCLUSIVE CARDS CONTAINER */}
            {(() => {
                const landPoly = visibleCadPolygons.find(p => p.id === cadSelectedPolygon);
                const landSurvey = (landPoly && landPoly.surveyId) ? cadSurveys.find(s => s.id === landPoly.surveyId) : null;
                const showLandInfo = cadSelectedPolygon && landPoly;

                return (
                    <div className="absolute left-4 md:left-6 z-[120] flex gap-3 pointer-events-none items-end" style={{ bottom: mapConfig.active ? '1.5rem' : '4.5rem' }}>
                       
                       {/* 1. POLYGON AREA CARD */}
                       {activeArea && (
                          isPolygonAreaCardVisible ? (
                           <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="bg-slate-900/95 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 w-max flex flex-col animate-in zoom-in-95 duration-200 pointer-events-auto">
                             <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1 gap-4">
                                <span className="text-[9px] md:text-[10px] text-fuchsia-400 font-black uppercase tracking-widest leading-none mb-1">Polygon Area</span>
                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(false); }} className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-800" title="Minimize">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                             </div>
                             <div className="font-mono text-[10px] md:text-xs text-white grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 whitespace-nowrap pointer-events-none">
                               <span className="text-slate-400 text-left">Hectare:</span><span className="font-bold text-right">{activeArea.hectare.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                               <span className="text-slate-400 text-left">Are:</span><span className="font-bold text-right">{activeArea.are.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                               <span className="text-slate-400 text-left">Acre:</span><span className="font-bold text-right">{activeArea.acre.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                               <span className="text-slate-400 text-left">Cent:</span><span className="font-bold text-right">{activeArea.cent.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                               <span className="text-slate-400 text-left">Sq. Ft:</span><span className="font-bold text-right">{activeArea.sqFt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                             </div>
                           </div>
                          ) : (
                           <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(true); setIsLandInfoCardVisible(false); }} className="bg-slate-900/90 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 text-fuchsia-400 hover:text-fuchsia-300 flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-800 transition-all duration-300 pointer-events-auto shadow-[0_0_15px_rgba(232,121,249,0.3)]" title="Restore Polygon Area">
                               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                           </button>
                          )
                       )}

                       {/* 2. LAND INFORMATION CARD */}
                       {showLandInfo && (
                           isLandInfoCardVisible ? (
                               <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className="bg-white p-3 md:p-4 rounded-xl shadow-2xl border border-slate-200 w-[280px] flex flex-col animate-in zoom-in-95 duration-200 text-slate-800 pointer-events-auto">
                                   <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 gap-4">
                                       <div className="flex items-center gap-2 text-indigo-600 font-black tracking-widest text-[11px] uppercase">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                           Land Information
                                       </div>
                                       <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsLandInfoCardVisible(false); }} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100" title="Minimize">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                       </button>
                                   </div>
                                   
                                   {cadPinLocation && (
                                       <div className="flex items-center gap-2 mb-3">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-blue-500"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>
                                           <a href={\`https://maps.google.com/?q=\${cadPinLocation.lat.toFixed(6)},\${cadPinLocation.lng.toFixed(6)}\`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-xs hover:underline decoration-blue-600/50">
                                               {cadPinLocation.lat.toFixed(5)}, {cadPinLocation.lng.toFixed(5)}
                                           </a>
                                       </div>
                                   )}

                                   <div className="grid grid-cols-3 gap-2 mb-3">
                                       <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg text-center overflow-hidden">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-500 mb-1"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="22"/><line x1="15" y1="22" x2="15" y2="22"/><line x1="9" y1="6" x2="9" y2="6"/><line x1="15" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="9" y2="10"/><line x1="15" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="9" y2="14"/><line x1="15" y1="14" x2="15" y2="14"/></svg>
                                           <span className="text-[9px] text-slate-500 font-semibold mb-0.5">District</span>
                                           <span className="text-[10px] font-bold text-slate-800 truncate w-full px-1" title={selDistrict || '-'}>{selDistrict || '-'}</span>
                                       </div>
                                       <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg text-center overflow-hidden">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500 mb-1"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                           <span className="text-[9px] text-slate-500 font-semibold mb-0.5">Taluk</span>
                                           <span className="text-[10px] font-bold text-slate-800 truncate w-full px-1" title={selTaluk || '-'}>{selTaluk || '-'}</span>
                                       </div>
                                       <div className="flex flex-col items-center justify-center p-2 bg-slate-50 rounded-lg text-center overflow-hidden">
                                           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-500 mb-1"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                           <span className="text-[9px] text-slate-500 font-semibold mb-0.5">Village</span>
                                           <span className="text-[10px] font-bold text-slate-800 truncate w-full px-1" title={selVillage || '-'}>{selVillage || '-'}</span>
                                       </div>
                                   </div>

                                   <div className="flex border-t border-slate-100 pt-3">
                                       <div className="flex-1 flex flex-col border-r border-slate-100 px-2 text-center">
                                           <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-semibold mb-1">
                                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-teal-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                               Survey No.
                                           </div>
                                           <span className="text-teal-600 font-bold text-[13px]">{(landSurvey && landSurvey.surveyNo) || '-'}</span>
                                       </div>
                                       <div className="flex-1 flex flex-col px-2 text-center">
                                           <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-semibold mb-1">
                                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-500"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                                               Sub-div No.
                                           </div>
                                           <span className="text-indigo-600 font-bold text-[13px]">{(landSurvey && landSurvey.subDivisionNo) || '-'}</span>
                                       </div>
                                   </div>
                               </div>
                           ) : (
                               <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsLandInfoCardVisible(true); setIsPolygonAreaCardVisible(false); }} className="bg-white p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-200 text-indigo-600 hover:text-indigo-500 flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-50 transition-all duration-300 pointer-events-auto shadow-[0_0_15px_rgba(79,70,229,0.2)]" title="Restore Land Information">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                               </button>
                           )
                       )}
                    </div>
                );
            })()}
`;

const blockStartLine = lines.findIndex(l => l.includes('{activeArea ? (')) + 1; // 1st occurrence is not what we want
const actualBlockStartLine = lines.findIndex((l, i) => i >= blockStartLine && l.includes('{activeArea ? ('));
const blockEndLine = lines.findIndex((l, i) => i > actualBlockStartLine && l.includes('{cadLines.length >= 3 && cadOpenNodes && cadOpenNodes.length > 0 && ('));

if (actualBlockStartLine !== -1 && blockEndLine !== -1) {
    lines.splice(actualBlockStartLine, blockEndLine - actualBlockStartLine, polygonAreaJSX);
    fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', lines.join('\n'));
    console.log('Successfully replaced active area block!');
} else {
    console.log('Could not find active area block!');
}
