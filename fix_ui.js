const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// 1. Move joystick to left
c = c.replace(
    'className="absolute bottom-8 right-8 z-[120] opacity-80 hover:opacity-100 transition-opacity bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl p-2 select-none touch-none scale-75 origin-bottom-right"',
    'className="absolute bottom-8 right-16 z-[120] opacity-80 hover:opacity-100 transition-opacity bg-slate-800 rounded-full border-4 border-slate-700 shadow-2xl p-2 select-none touch-none scale-75 origin-bottom-right"'
);

// 2. Replace the mobile UI block with Desktop + Mobile responsive blocks
const startTag = '{/* TOP-LEFT CONTROLS: HORIZONTAL ICON PAIR */}';
const endTag = '{/* BOTTOM-LEFT LEGEND: Hidden in Live Map Mode */}';

const startIndex = c.indexOf(startTag);
const endIndex = c.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
    console.error("Tags not found!");
    process.exit(1);
}

const replacementBlock = `{/* DESKTOP CONTROLS: ORIGINAL VERTICAL ICON STACK */}
              <div className="absolute top-6 left-6 z-[150] hidden md:flex flex-col items-center gap-3 pointer-events-none">
                  {/* Icon 1: Search Icon */}
                  <button onClick={(e) => { e.stopPropagation(); setIsLandSearchModalOpen(true); }} className="w-10 h-10 rounded-full bg-slate-800/80 text-white shadow-lg border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors pointer-events-auto" title="Search">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                  </button>
                  {/* Icon 2: Land Search Icon */}
                  <button onClick={(e) => { e.stopPropagation(); setIsLandSearchModalOpen(!isLandSearchModalOpen); }} className={\`w-10 h-10 rounded-full text-white shadow-lg border flex items-center justify-center transition-colors pointer-events-auto \${isLandSearchModalOpen ? 'bg-blue-600 border-blue-400' : 'bg-slate-800/80 border-slate-600 hover:bg-slate-700'}\`} title="Land Search">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                  </button>
                  {/* Icon 3: 360° Map Rotation Control Icon */}
                  <div className="flex items-center bg-slate-800/90 text-white rounded-full shadow-lg border border-slate-600 pointer-events-auto overflow-hidden">
                      <button onClick={(e) => { e.stopPropagation(); setMapRotation(r => (r - 15 + 360) % 360); }} className="px-2 py-2 hover:bg-slate-700 active:bg-slate-600 transition-colors" title="Rotate Left 15°">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setMapRotation(0); }} className="px-1.5 py-2 hover:bg-slate-700 active:bg-slate-600 transition-colors flex items-center justify-center text-[10px] font-bold font-mono min-w-[28px]" title="Reset North (0°)">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-300 shrink-0" style={{ transform: \`rotate(\${mapRotation}deg)\` }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="12 2 15 12 12 10 9 12 12 2" fill="currentColor"/><circle cx="12" cy="12" r="9"/></svg>
                          {mapRotation !== 0 && <span className="ml-1 text-fuchsia-400">{mapRotation}°</span>}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setMapRotation(r => (r + 15) % 360); }} className="px-2 py-2 hover:bg-slate-700 active:bg-slate-600 transition-colors" title="Rotate Right 15°">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                      </button>
                  </div>
                  {/* Icon 4: Current Location / GPS Center Icon */}
                  <button onClick={handleGpsCenter} className="w-10 h-10 rounded-full bg-slate-800/80 text-white shadow-lg border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors pointer-events-auto" title="GPS Center / Current Location">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
                  </button>
                  {/* Icon 5: Cadastral / Sub-division Layer Toggle Icon */}
                  <div className="relative pointer-events-auto">
                      <button onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(!isLayerMenuOpen); }} className={\`w-10 h-10 rounded-full text-white shadow-lg border flex items-center justify-center transition-colors \${isLayerMenuOpen || isCadastralEnabled || isFMBEnabled ? 'bg-cyan-600 border-cyan-400' : 'bg-slate-800/80 border-slate-600 hover:bg-slate-700'}\`} title="Map Layers (Cadastral / Sub-division)">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4zm0 4l8 4 8-4m-16 4l8 4 8-4" />
                          </svg>
                      </button>
                      
                      {isLayerMenuOpen && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>
                              <h3 className="text-white font-black text-xs uppercase tracking-widest border-b border-slate-700 pb-2 mb-3">Map Layers</h3>
                              
                              <div className="flex flex-col gap-3">
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <div className="relative flex items-center justify-center">
                                          <input 
                                              type="checkbox" 
                                              checked={isCadastralEnabled}
                                              onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setIsCadastralEnabled(checked);
                                                  if (checked) {
                                                      setIsVillageEnabled(true);
                                                      setIsTalukEnabled(true);
                                                      setIsDistrictEnabled(true);
                                                  }
                                              }}
                                              className="peer appearance-none w-5 h-5 border border-slate-500 rounded bg-slate-800 checked:bg-[#FF1493] checked:border-[#FF1493] transition-colors cursor-pointer shadow-inner"
                                          />
                                          <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                      <span className="text-[13px] font-bold text-slate-300 group-hover:text-white transition-colors">Cadastral</span>
                                  </label>

                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <div className="relative flex items-center justify-center">
                                          <input 
                                              type="checkbox" 
                                              checked={isFMBEnabled}
                                              onChange={(e) => {
                                                  const checked = e.target.checked;
                                                  setIsFMBEnabled(checked);
                                                  if (checked) {
                                                      setIsVillageEnabled(true);
                                                      setIsTalukEnabled(true);
                                                      setIsDistrictEnabled(true);
                                                  }
                                              }}
                                              className="peer appearance-none w-5 h-5 border border-slate-500 rounded bg-slate-800 checked:bg-[#00FF00] checked:border-[#00FF00] transition-colors cursor-pointer shadow-inner"
                                          />
                                          <svg className="absolute w-3.5 h-3.5 text-slate-900 pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                      <span className="text-[13px] font-bold text-slate-300 group-hover:text-white transition-colors">Subdivision</span>
                                  </label>
                              </div>
                          </div>
                      )}
                  </div>
              </div>

              {/* MOBILE TOP-LEFT CONTROLS: HORIZONTAL ICON PAIR */}
              <div className="absolute top-6 left-6 z-[150] flex md:hidden flex-row items-center gap-3 pointer-events-none max-w-md">
                  {/* Icon 1: Search Icon */}
                  <button onClick={(e) => { e.stopPropagation(); setIsLandSearchModalOpen(true); }} className="w-10 h-10 rounded-full bg-slate-800/80 text-white shadow-lg border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors pointer-events-auto" title="Search">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                  </button>
                  {/* Icon 2: Land Search Icon */}
                  <button onClick={(e) => { e.stopPropagation(); setIsLandSearchModalOpen(!isLandSearchModalOpen); }} className={\`w-10 h-10 rounded-full text-white shadow-lg border flex items-center justify-center transition-colors pointer-events-auto \${isLandSearchModalOpen ? 'bg-blue-600 border-blue-400' : 'bg-slate-800/80 border-slate-600 hover:bg-slate-700'}\`} title="Land Search">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                  </button>
              </div>

              {/* MOBILE RIGHT-BOTTOM CONTROLS: COLLAPSIBLE VERTICAL STACK */}
              <div className="absolute bottom-20 right-3 z-[150] flex md:hidden flex-col items-center pointer-events-none max-w-md">
                  {/* Collapse/Expand Toggle Arrow */}
                  <button 
                      onClick={(e) => { e.stopPropagation(); setIsStackCollapsed(!isStackCollapsed); }}
                      className="w-8 h-8 mb-3 rounded-full bg-slate-800/80 text-white shadow-lg border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors pointer-events-auto"
                      title={isStackCollapsed ? "Expand Map Controls" : "Collapse Map Controls"}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className={\`h-4 w-4 transition-transform duration-300 \${isStackCollapsed ? 'rotate-180' : ''}\`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                  </button>
                  
                  {/* Stacked Icons Container */}
                  <div className={\`flex flex-col items-center gap-3 transition-all duration-300 origin-bottom pointer-events-auto overflow-visible \${isStackCollapsed ? 'opacity-0 max-h-0 scale-y-0 translate-y-4' : 'opacity-100 max-h-96 scale-y-100 translate-y-0'}\`}>
                      {/* Icon 3: 360° Map Rotation Control Icon (Mobile: Center only) */}
                      <div className="flex flex-col items-center bg-slate-800/90 text-white rounded-full shadow-lg border border-slate-600 pointer-events-auto overflow-hidden">
                          <button onClick={(e) => { e.stopPropagation(); setMapRotation(0); }} className="px-2 py-2 hover:bg-slate-700 active:bg-slate-600 transition-colors flex flex-col items-center justify-center text-[10px] font-bold font-mono min-h-[32px] min-w-[32px]" title="Reset North (0°)">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform duration-300 shrink-0 mb-1" style={{ transform: \`rotate(\${mapRotation}deg)\` }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polygon points="12 2 15 12 12 10 9 12 12 2" fill="currentColor"/><circle cx="12" cy="12" r="9"/></svg>
                              {mapRotation !== 0 ? <span className="text-fuchsia-400">{mapRotation}°</span> : <span>360°</span>}
                          </button>
                      </div>
                      {/* Icon 4: Current Location / GPS Center Icon */}
                      <button onClick={handleGpsCenter} className="w-10 h-10 rounded-full bg-slate-800/80 text-white shadow-lg border border-slate-600 flex items-center justify-center hover:bg-slate-700 transition-colors pointer-events-auto" title="GPS Center / Current Location">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
                      </button>
                      {/* Icon 5: Cadastral / Sub-division Layer Toggle Icon */}
                      <div className="relative pointer-events-auto">
                          <button onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(!isLayerMenuOpen); }} className={\`w-10 h-10 rounded-full text-white shadow-lg border flex items-center justify-center transition-colors \${isLayerMenuOpen || isCadastralEnabled || isFMBEnabled ? 'bg-cyan-600 border-cyan-400' : 'bg-slate-800/80 border-slate-600 hover:bg-slate-700'}\`} title="Map Layers (Cadastral / Sub-division)">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7l8-4 8 4-8 4-8-4zm0 4l8 4 8-4m-16 4l8 4 8-4" />
                              </svg>
                          </button>
                          
                          {isLayerMenuOpen && (
                              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-right-4 z-[200]" onClick={(e) => e.stopPropagation()}>
                                  <h3 className="text-white font-black text-xs uppercase tracking-widest border-b border-slate-700 pb-2 mb-3">Map Layers</h3>
                                  
                                  <div className="flex flex-col gap-3">
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                          <div className="relative flex items-center justify-center">
                                              <input 
                                                  type="checkbox" 
                                                  checked={isCadastralEnabled}
                                                  onChange={(e) => {
                                                      const checked = e.target.checked;
                                                      setIsCadastralEnabled(checked);
                                                      if (checked) {
                                                          setIsVillageEnabled(true);
                                                          setIsTalukEnabled(true);
                                                          setIsDistrictEnabled(true);
                                                      }
                                                  }}
                                                  className="peer appearance-none w-5 h-5 border border-slate-500 rounded bg-slate-800 checked:bg-[#FF1493] checked:border-[#FF1493] transition-colors cursor-pointer shadow-inner"
                                              />
                                              <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                          </div>
                                          <span className="text-[13px] font-bold text-slate-300 group-hover:text-white transition-colors">Cadastral</span>
                                      </label>
  
                                      <label className="flex items-center gap-3 cursor-pointer group">
                                          <div className="relative flex items-center justify-center">
                                              <input 
                                                  type="checkbox" 
                                                  checked={isFMBEnabled}
                                                  onChange={(e) => {
                                                      const checked = e.target.checked;
                                                      setIsFMBEnabled(checked);
                                                      if (checked) {
                                                          setIsVillageEnabled(true);
                                                          setIsTalukEnabled(true);
                                                          setIsDistrictEnabled(true);
                                                      }
                                                  }}
                                                  className="peer appearance-none w-5 h-5 border border-slate-500 rounded bg-slate-800 checked:bg-[#00FF00] checked:border-[#00FF00] transition-colors cursor-pointer shadow-inner"
                                              />
                                              <svg className="absolute w-3.5 h-3.5 text-slate-900 pointer-events-none opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                          </div>
                                          <span className="text-[13px] font-bold text-slate-300 group-hover:text-white transition-colors">Subdivision</span>
                                      </label>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
`;

c = c.substring(0, startIndex) + replacementBlock + c.substring(endIndex);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log("Done");
