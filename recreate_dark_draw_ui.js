const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

const startIdx = c.indexOf(`          ) : activeLandSurveyView === 'dark_draw_submenu' ? (`);
const endIdx = c.indexOf(`          ) : activeLandSurveyView === 'dark_draw_projects' ? (`);

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find the block.');
  process.exit(1);
}

const newBlock = `          ) : activeLandSurveyView === 'dark_draw_submenu' ? (
            <div className="flex-1 overflow-y-auto p-6 flex flex-col bg-gradient-to-br from-[#eff6ff] via-white to-[#f0fdf4] animate-in slide-in-from-right-8 duration-300">
              <div className="w-full max-w-md mx-auto pt-4 flex flex-col h-full">
                {/* Header Area */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex flex-col">
                    <button 
                      onClick={() => { setActiveLandSurveyView('menu'); resetCadState(); }} 
                      className="w-11 h-11 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors mb-4"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <h2 className="text-[20px] font-black text-[#1e293b] tracking-tight">DARK DRAW SETUP</h2>
                    <div className="w-8 h-1 bg-[#2563eb] rounded-full mt-1.5 mb-3"></div>
                    <p className="text-slate-500 text-sm max-w-[200px] leading-relaxed">Create and manage your manual drawings and projects</p>
                  </div>
                  
                  {/* High-fidelity SVG Illustration */}
                  <div className="relative w-28 h-28 flex-shrink-0 mt-2">
                    <div className="absolute top-2 -left-2 w-8 h-8 bg-blue-100 rounded-full blur-md opacity-70"></div>
                    <div className="absolute bottom-2 -right-1 w-10 h-10 bg-green-100 rounded-full blur-md opacity-70"></div>
                    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-xl" xmlns="http://www.w3.org/2000/svg">
                      <rect x="25" y="15" width="60" height="85" rx="6" fill="#e0f2fe" />
                      <rect x="25" y="15" width="60" height="85" rx="6" fill="#ffffff" stroke="#3b82f6" strokeWidth="4" />
                      <rect x="40" y="8" width="30" height="14" rx="4" fill="#60a5fa" />
                      <circle cx="55" cy="15" r="3" fill="#ffffff" />
                      <path d="M35 40 Q 55 25 75 40 T 75 70 Q 55 85 35 70 Z" fill="none" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="4 2" />
                      <circle cx="55" cy="55" r="2" fill="#3b82f6" />
                      <circle cx="45" cy="45" r="2" fill="#3b82f6" />
                      <circle cx="65" cy="65" r="2" fill="#3b82f6" />
                      <path d="M45 45 L55 55 L65 65" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
                      <g transform="translate(60, 45) rotate(35)">
                        <path d="M0,0 L10,-35 L16,-35 L26,0 Z" fill="#fbbf24" />
                        <path d="M10,-35 L16,-35 L13,-45 Z" fill="#fcd34d" />
                        <path d="M12,-42 L14,-42 L13,-45 Z" fill="#475569" />
                        <path d="M0,0 L26,0 L24,10 L2,10 Z" fill="#f87171" />
                        <path d="M0,0 L26,0" stroke="#cbd5e1" strokeWidth="2" />
                      </g>
                      <path d="M15 60 Q 5 50 15 40 Q 25 50 15 60 Z" fill="#86efac" />
                      <path d="M15 70 Q 0 60 10 50 Q 20 60 15 70 Z" fill="#bbf7d0" />
                    </svg>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="flex flex-col gap-5">
                  {/* Card 1: Manual Drawing Canvas */}
                  <button 
                    onClick={() => { resetCadState(); setActiveLandSurveyView('dark_draw_manual'); }} 
                    className="group bg-white p-5 rounded-3xl shadow-sm hover:shadow-md border border-slate-50 flex items-center justify-between transition-all duration-300 w-full"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#3b82f6] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h4 className="text-slate-800 font-bold text-[15px] mb-0.5">Manual Drawing Canvas</h4>
                        <p className="text-slate-500 text-[13px] leading-snug">Create new drawings manually with advanced tools</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors ml-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </div>
                  </button>

                  {/* Card 2: My Projects */}
                  <button 
                    onClick={() => setActiveLandSurveyView('dark_draw_projects')} 
                    className="group bg-white p-5 rounded-3xl shadow-sm hover:shadow-md border border-slate-50 flex items-center justify-between transition-all duration-300 w-full"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-[#10b981] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 11h4m-4 4h4" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h4 className="text-slate-800 font-bold text-[15px] mb-0.5">My Projects</h4>
                        <p className="text-slate-500 text-[13px] leading-snug">View, manage and continue your saved projects</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full border border-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-50 transition-colors ml-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    </div>
                  </button>
                </div>
              </div>
            </div>
`;

c = c.substring(0, startIdx) + newBlock + c.substring(endIdx);
fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('Updated DarkDrawSetup successfully.');
