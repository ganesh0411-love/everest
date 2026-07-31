const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// The file currently has a syntax error because we added <> but not </> for desktop.
// Let's revert the desktop opening tag first to be safe, then apply correctly.

// Revert the broken one first if it exists
c = c.replace(
  `{isLayerMenuOpen && (
                          <>
                             <div className="fixed inset-0 z-[190]" onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(false); }}></div>
                             <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`,
  `{isLayerMenuOpen && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`
);

// Now apply correctly to Desktop (with full block replacement to ensure closure)
const desktopStart = c.indexOf(`{isLayerMenuOpen && (
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`);

if (desktopStart !== -1) {
  let desktopEnd = c.indexOf(`                          </div>
                      )}`, desktopStart);
  if (desktopEnd !== -1) {
    let block = c.substring(desktopStart, desktopEnd + `                          </div>\n                      )}`.length);
    let newBlock = block.replace(
      `<div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`,
      `<>
                             <div className="fixed inset-0 z-[190]" onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(false); }}></div>
                             <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-left-4 z-[200]" onClick={(e) => e.stopPropagation()}>`
    );
    newBlock = newBlock.replace(
      `                          </div>
                      )}`,
      `                          </div>
                          </>
                      )}`
    );
    c = c.substring(0, desktopStart) + newBlock + c.substring(desktopStart + block.length);
  }
}

// Apply correctly to Mobile
const mobileStart = c.indexOf(`{isLayerMenuOpen && (
                              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-right-4 z-[200]" onClick={(e) => e.stopPropagation()}>`);

if (mobileStart !== -1) {
  let mobileEnd = c.indexOf(`                              </div>
                          </div>
                      )}`, mobileStart);
  if (mobileEnd !== -1) {
    let block = c.substring(mobileStart, mobileEnd + `                              </div>\n                          </div>\n                      )}`.length);
    let newBlock = block.replace(
      `<div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-right-4 z-[200]" onClick={(e) => e.stopPropagation()}>`,
      `<>
                                 <div className="fixed inset-0 z-[190]" onClick={(e) => { e.stopPropagation(); setIsLayerMenuOpen(false); }}></div>
                                 <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 bg-slate-900/95 backdrop-blur-md border border-slate-600 rounded-xl shadow-2xl p-4 w-56 animate-in fade-in slide-in-from-right-4 z-[200]" onClick={(e) => e.stopPropagation()}>`
    );
    newBlock = newBlock.replace(
      `                              </div>
                          </div>
                      )}`,
      `                              </div>
                          </div>
                          </>
                      )}`
    );
    c = c.substring(0, mobileStart) + newBlock + c.substring(mobileStart + block.length);
  }
}

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Fixed Cadastral Overlays successfully.');
