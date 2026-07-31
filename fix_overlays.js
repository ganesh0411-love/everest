const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// 1. Fix Area Unit Top Bar z-index and backdrop
c = c.replace(
  'className="bg-slate-800/90 backdrop-blur border-b border-r border-slate-700 w-[calc(100%-60px)] flex items-center shrink-0 shadow-sm z-[150] relative rounded-br-2xl"',
  'className="bg-slate-800/90 backdrop-blur border-b border-r border-slate-700 w-[calc(100%-60px)] flex items-center shrink-0 shadow-sm z-[9999] relative rounded-br-2xl"'
);

// Fix the backdrop for area dropdowns to stop propagation and have proper pointer events
c = c.replace(
  '<div className="fixed inset-0 z-40" onClick={() => setIsAreaDropdownOpen(false)}></div>',
  '<div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); setIsAreaDropdownOpen(false); }}></div>'
);

// Fix the dropdown itself to stop propagation
c = c.replace(
  '<div className="absolute top-full left-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 min-w-[120px] flex flex-col">',
  '<div className="absolute top-full left-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-[9999] min-w-[120px] flex flex-col" onClick={(e) => e.stopPropagation()}>'
);

// 2. Fix Cadastral / Sub-division Layer Menu backdrop
const oldCadastralMenu = `{isLayerMenuOpen && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`;

const newCadastralMenu = `{isLayerMenuOpen && (
                          <>
                             <div className="fixed inset-0 z-[190]" onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(false); }}></div>
                             <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`;

if (!c.includes(oldCadastralMenu)) {
  console.log("Could not find the Cadastral Menu block.");
} else {
  c = c.replace(oldCadastralMenu, newCadastralMenu);
}

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Fixed overlay z-index and backdrops successfully.');
