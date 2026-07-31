const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// 1. Update setCadPinchInitial
const oldPinchInitial = `      setCadPinchInitial({ dist, cx, cy, view: { ...cadViewport } });`;
const newPinchInitial = `      const angle = Math.atan2(pts[1].clientY - pts[0].clientY, pts[1].clientX - pts[0].clientX) * (180 / Math.PI);
      setCadPinchInitial({ dist, cx, cy, view: { ...cadViewport }, angle, initialRotation: mapRotation });`;
c = c.replace(oldPinchInitial, newPinchInitial);

// 2. Add touch rotation logic to handleMove
const oldHandleMove = `      const scaleDelta = dist > 5 ? cadPinchInitial.dist / dist : 1;`;
const newHandleMove = `      const scaleDelta = dist > 5 ? cadPinchInitial.dist / dist : 1;
      if (isMobile360Active && cadPinchInitial.angle !== undefined) {
          const currentAngle = Math.atan2(pts[1].clientY - pts[0].clientY, pts[1].clientX - pts[0].clientX) * (180 / Math.PI);
          let deltaAngle = currentAngle - cadPinchInitial.angle;
          if (deltaAngle > 180) deltaAngle -= 360;
          if (deltaAngle < -180) deltaAngle += 360;
          let newRot = (cadPinchInitial.initialRotation + deltaAngle) % 360;
          if (newRot < 0) newRot += 360;
          setMapRotation(Math.round(newRot));
      }`;
c = c.replace(oldHandleMove, newHandleMove);

// 3. Replace STATE 2 map controls
const state2Start = c.indexOf('{/* STATE 2: LIVE MAP MODE - FLOATING ACTION BUTTONS (ADD LINE & SATELLITE TOGGLE) */}');
const state2EndStr = '{cadPrompt && (() => {';
const state2End = c.indexOf(state2EndStr);

if (state2Start !== -1 && state2End !== -1) {
  const replacement = `{/* STATE 2: LIVE MAP MODE - FLOATING ACTION BUTTONS (ADD LINE & SATELLITE TOGGLE) */}
             {mapConfig.active && (
             <>
                 {/* DESKTOP LAYOUT (Pencil + Map Toggle only - others are at top-left) */}
                 <div className="absolute bottom-8 right-8 z-[120] hidden md:flex items-center gap-3 select-none touch-none"
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
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
                        )}
                     </button>
                 </div>

                 {/* MOBILE LAYOUT (Stacked Controls) */}
                 <div className="absolute top-6 left-6 z-[150] flex md:hidden items-center gap-2 pointer-events-none">
                     <button onClick={(e) => { e.stopPropagation(); setIsLandSearchModalOpen(true); }} className="w-10 h-10 rounded-full bg-slate-800/90 text-white shadow-xl border border-slate-600 flex items-center justify-center pointer-events-auto active:bg-slate-700">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                     </button>
                     <button onClick={(e) => { e.stopPropagation(); setIsLandSearchModalOpen(!isLandSearchModalOpen); }} className={\`w-10 h-10 rounded-full text-white shadow-xl border flex items-center justify-center pointer-events-auto transition-colors \${isLandSearchModalOpen ? 'bg-blue-600 border-blue-400' : 'bg-slate-800/90 border-slate-600 active:bg-slate-700'}\`}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                     </button>
                 </div>

                 <div className="absolute bottom-8 right-4 z-[120] flex items-end gap-5 md:hidden pointer-events-none select-none touch-none" onPointerDown={e => e.stopPropagation()}>
                     <button 
                        className={\`w-12 h-12 rounded-full shadow-2xl border-2 flex justify-center items-center font-bold text-xl pointer-events-auto transition-all \${cadTool === 'ADD_LINE' ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_15px_rgba(192,38,211,0.6)] scale-105' : 'bg-slate-800/90 border-slate-600 text-white'}\`}
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
                     >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                     </button>

                     <div className="flex flex-col gap-3 pointer-events-auto items-center">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setIsMobile360Active(p => !p); }} 
                          className={\`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all \${isMobile360Active ? 'bg-amber-500 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-800/90 border-slate-600 text-white active:bg-slate-700'}\`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>

                        <button onClick={handleGpsCenter} className="w-10 h-10 rounded-full bg-slate-800/90 text-white shadow-lg border border-slate-600 flex items-center justify-center active:bg-slate-700" title="GPS Center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(!isLayerMenuOpen); }} className={\`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-colors \${isLayerMenuOpen || isCadastralEnabled || isFMBEnabled ? 'bg-cyan-600 border-cyan-400 text-white' : 'bg-slate-800/90 border-slate-600 text-white active:bg-slate-700'}\`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                        </button>

                        <button 
                          className="w-12 h-12 rounded-full flex justify-center items-center font-bold transition-all shadow-2xl border-2 border-green-400 bg-green-600 active:bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)]"
                          onClick={(e) => { e.stopPropagation(); toggleSatelliteMap(); }}
                        >
                          {mapConfig.isLoading ? (
                              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                          ) : (
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>
                          )}
                        </button>
                     </div>
                 </div>
             </>
             )}\n`;

  c = c.substring(0, state2Start) + replacement + c.substring(state2End);
}

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Mobile layout and rotation logic applied.');
