const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// --- ISSUE 1: Restore MOBILE LAYOUT for STATE 2 ---
const state2EndBlock = `                              </>
             )}
{cadPrompt`;

const idxEndBlock = c.indexOf(state2EndBlock);
if (idxEndBlock !== -1) {
    const mobileLayout = `
                 {/* MOBILE LAYOUT (Pencil + Map Toggle) */}
                 <div className="absolute bottom-28 right-4 z-[120] flex md:hidden flex-col items-center gap-3 select-none touch-none"
                      onPointerDown={e => e.stopPropagation()}
                 >
                     <button 
                        className={\`w-12 h-12 rounded-full shadow-2xl border-2 flex justify-center items-center font-bold text-xl transition-all pointer-events-auto \${cadTool === 'ADD_LINE' ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(192,38,211,0.6)] scale-105' : 'bg-slate-800/90 border-slate-600 hover:bg-slate-700 text-white'}\`}
                        onClick={(e) => { 
                           e.stopPropagation();
                           if (cadTool === 'ADD_LINE') {
                              setCadTool('IDLE');
                              setCadAnchorNode(null);
                           } else {
                              setCadTool('ADD_LINE');
                              setCadAnchorNode({ x: cadViewport.x + cadViewport.width / 2, y: cadViewport.y + cadViewport.height / 2, isInitialCenter: true });
                           }
                           setCadSelectedNode(null); 
                        }}
                        title="Add Line / Draw over Satellite Map"
                     >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                        </svg>
                     </button>
                     <button 
                        className="w-12 h-12 rounded-full flex justify-center items-center font-bold transition-all pointer-events-auto shadow-2xl border-2 border-green-400 bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]"
                        onClick={(e) => { e.stopPropagation(); toggleSatelliteMap(); }}
                        title="Toggle Satellite Map OFF"
                     >
                        {mapConfig.isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
                        )}
                     </button>
                 </div>
`;
    c = c.substring(0, idxEndBlock) + mobileLayout + c.substring(idxEndBlock);
}

// --- ISSUE 2: 360° Icon redesign & Auto-North Reset ---
const old360Btn = `<button 
                        onClick={(e) => { e.stopPropagation(); setIsMobile360Active(p => !p); }} 
                        className={\`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all \${isMobile360Active ? 'bg-amber-500 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-800/90 border-slate-600 text-white active:bg-slate-700'}\`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>`;
const new360Btn = `<button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setIsMobile360Active(p => { 
                                if (p) setMapRotation(0); 
                                return !p; 
                            }); 
                        }} 
                        className={\`w-12 h-12 rounded-full flex flex-col items-center justify-center shadow-lg border transition-all \${isMobile360Active ? 'bg-amber-500 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-800/90 border-slate-600 text-white hover:bg-slate-700 active:bg-slate-600'}\`}
                        title="Toggle 360° Rotation"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mb-0.5"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                        <span className="text-[9px] font-black leading-none uppercase">360°</span>
                      </button>`;
c = c.replace(old360Btn, new360Btn);

// --- ISSUE 3: Polygon Area Box Overlay Conflict with Joystick ---
const oldPolygonBox = `<div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className={\`absolute \${mapConfig.active ? 'bottom-6' : 'bottom-16'} left-6 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 w-max flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 transition-all duration-300\`}>`;
const newPolygonBox = `<div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className={\`absolute \${mapConfig.active ? 'bottom-12 md:bottom-6' : 'bottom-32 md:bottom-16'} left-4 md:left-6 z-[120] bg-slate-900/95 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 w-max flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 transition-all duration-300\`}>`;

const oldPolygonTitle = `<span className="text-[10px] text-fuchsia-400 font-black uppercase tracking-widest">Polygon Area</span>`;
const newPolygonTitle = `<span className="text-[9px] md:text-[10px] text-fuchsia-400 font-black uppercase tracking-widest leading-none mb-1">Polygon Area</span>`;

const oldPolygonMetrics = `<div className="font-mono text-xs text-white grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 whitespace-nowrap pointer-events-none">`;
const newPolygonMetrics = `<div className="font-mono text-[10px] md:text-xs text-white grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 whitespace-nowrap pointer-events-none">`;

const oldPolygonRestore = `<button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(true); }} className={\`absolute \${mapConfig.active ? 'bottom-6' : 'bottom-16'} left-6 z-[120] bg-slate-900/90 p-3 rounded-xl shadow-2xl border border-slate-700 text-fuchsia-400 hover:text-fuchsia-300 pointer-events-auto flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-800 transition-all duration-300\`} title="Restore Polygon Area">`;
const newPolygonRestore = `<button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(true); }} className={\`absolute \${mapConfig.active ? 'bottom-12 md:bottom-6' : 'bottom-32 md:bottom-16'} left-4 md:left-6 z-[120] bg-slate-900/90 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 text-fuchsia-400 hover:text-fuchsia-300 pointer-events-auto flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-800 transition-all duration-300\`} title="Restore Polygon Area">`;

c = c.replace(oldPolygonBox, newPolygonBox)
     .replace(oldPolygonTitle, newPolygonTitle)
     .replace(oldPolygonMetrics, newPolygonMetrics)
     .replace(oldPolygonRestore, newPolygonRestore);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
