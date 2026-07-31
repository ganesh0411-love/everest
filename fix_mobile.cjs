const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// --- 1. Polygon Area Box Position Fix ---
// The original one we just patched had 'bottom-12 md:bottom-6' and 'bottom-32 md:bottom-16'
const oldBox = `<div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className={\`absolute \${mapConfig.active ? 'bottom-12 md:bottom-6' : 'bottom-32 md:bottom-16'} left-4 md:left-6 z-[120] bg-slate-900/95 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 w-max flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 transition-all duration-300\`}>`;
const newBox = `<div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} className={\`absolute \${mapConfig.active ? 'bottom-6' : 'bottom-[4.5rem] md:bottom-[4.5rem]'} left-4 md:left-6 z-[120] bg-slate-900/95 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 w-max flex flex-col pointer-events-auto animate-in slide-in-from-bottom-4 transition-all duration-300\`}>`;

const oldRest = `<button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(true); }} className={\`absolute \${mapConfig.active ? 'bottom-12 md:bottom-6' : 'bottom-32 md:bottom-16'} left-4 md:left-6 z-[120] bg-slate-900/90 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 text-fuchsia-400 hover:text-fuchsia-300 pointer-events-auto flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-800 transition-all duration-300\`} title="Restore Polygon Area">`;
const newRest = `<button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setIsPolygonAreaCardVisible(true); }} className={\`absolute \${mapConfig.active ? 'bottom-6' : 'bottom-[4.5rem] md:bottom-[4.5rem]'} left-4 md:left-6 z-[120] bg-slate-900/90 p-2 md:p-3 rounded-lg md:rounded-xl shadow-2xl border border-slate-700 text-fuchsia-400 hover:text-fuchsia-300 pointer-events-auto flex items-center justify-center animate-in zoom-in-75 hover:bg-slate-800 transition-all duration-300\`} title="Restore Polygon Area">`;

c = c.replace(oldBox, newBox).replace(oldRest, newRest);

// --- 2. Map Toggle & Pencil Icon Repositioning (L-Shape) & 3. Icon Differentiation ---
const oldMobileControls = `<div className="absolute bottom-28 right-4 z-[120] flex md:hidden flex-col items-center gap-3 select-none touch-none"`;
const newMobileControls = `<div className="absolute bottom-6 right-3 z-[120] flex md:hidden flex-row items-center gap-3 select-none touch-none"`;

// For the Map toggle icon (on mobile AND desktop), replacing the SVG:
const oldSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
const newSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;

c = c.replace(oldMobileControls, newMobileControls).replaceAll(oldSvg, newSvg);

// Wait, desktop Map toggle still uses the oldSVG shape? Wait, the old SVG width was 22 on desktop.
const oldSvgDesktop = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>`;
const newSvgDesktop = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`;

c = c.replaceAll(oldSvgDesktop, newSvgDesktop);


fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
