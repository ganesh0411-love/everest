const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// 1. Remove the md:hidden block injected in STATE 2
const startMarker = '{/* MOBILE LAYOUT (Stacked Controls) */}';
const endMarker = '             </>';

const idx1 = c.indexOf(startMarker);
if (idx1 !== -1) {
    const idx2 = c.indexOf(endMarker, idx1);
    if (idx2 !== -1) {
        c = c.substring(0, idx1) + c.substring(idx2);
        console.log('Removed duplicate mobile controls from STATE 2');
    }
}

// 2. Replace the 360 icon in STATE 1
const old360 = `<div className="flex flex-col items-center bg-slate-800/90 text-white rounded-full shadow-lg border border-slate-600 pointer-events-auto overflow-hidden">`;
const old360End = `{mapRotation !== 0 ? <span className="text-fuchsia-400">{mapRotation}°</span> : <span>360°</span>}
                          </button>
                      </div>`;

const old360Idx = c.indexOf(old360);
if (old360Idx !== -1) {
    const old360EndIdx = c.indexOf(old360End, old360Idx) + old360End.length;
    
    const new360 = `<button 
                        onClick={(e) => { e.stopPropagation(); setIsMobile360Active(p => !p); }} 
                        className={\`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border transition-all \${isMobile360Active ? 'bg-amber-500 border-amber-300 text-white shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-800/90 border-slate-600 text-white active:bg-slate-700'}\`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>`;
                      
    c = c.substring(0, old360Idx) + new360 + c.substring(old360EndIdx);
    console.log('Replaced 360 icon in STATE 1');
}

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
