const fs = require('fs');

let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

const startMarker = "{activeLandSurveyView === 'menu' ? (";
const endMarker = ") : activeLandSurveyView === 'simple' ? (";

const startIndex = c.indexOf(startMarker);
const endIndex = c.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found!");
  process.exit(1);
}

const newMenuBlock = `{activeLandSurveyView === 'menu' ? (
            <div className="flex-1 overflow-y-auto flex flex-col relative" style={{background: 'linear-gradient(175deg, #e0f2fe 0%, #ffffff 40%, #ffffff 100%)'}}>
              
              {/* Background Topo Rings / Waves decoration (optional light touch) */}
              <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none overflow-hidden opacity-30">
                <svg viewBox="0 0 1000 300" className="w-full h-full object-cover text-blue-100/50" preserveAspectRatio="none">
                  <path d="M0,0 Q300,100 500,50 T1000,150 L1000,0 Z" fill="currentColor"/>
                  <path d="M0,0 Q400,150 600,80 T1000,250 L1000,0 Z" fill="currentColor" opacity="0.5"/>
                </svg>
              </div>

              {/* Hero Header */}
              <div className="flex items-start justify-between px-6 pt-8 pb-4 relative z-10 max-w-5xl mx-auto w-full">
                <div className="flex flex-col mt-2">
                  <div className="flex items-center gap-3 mb-1">
                    <button 
                      onClick={() => setShowLandSurveyDashboard(false)}
                      className="w-9 h-9 -ml-2 rounded-full bg-white/60 hover:bg-white shadow-sm flex items-center justify-center text-slate-800 transition-colors shrink-0 backdrop-blur-md"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <div className="relative">
                      <h1 className="text-[34px] font-black text-[#1e293b] tracking-tight leading-none" style={{fontFamily: "'Inter', sans-serif"}}>Survey Hub</h1>
                      {/* Map pin embedded over 'u' */}
                      <div className="absolute -top-4 left-[96px] pointer-events-none">
                        <svg className="w-6 h-6 text-blue-600 drop-shadow-md" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-[15px] text-slate-500 font-bold leading-snug pl-11">Smart Tools for<br/>Land Surveyors</p>
                </div>
                
                {/* 3D Illustration */}
                <div className="w-48 h-40 relative -mt-6 -mr-4 shrink-0">
                  <svg viewBox="0 0 160 140" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8"/>
                        <stop offset="100%" stopColor="#0369a1"/>
                      </linearGradient>
                      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24"/>
                        <stop offset="100%" stopColor="#d97706"/>
                      </linearGradient>
                      <linearGradient id="greyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8"/>
                        <stop offset="100%" stopColor="#475569"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Shadow */}
                    <ellipse cx="80" cy="115" rx="40" ry="12" fill="rgba(0,0,0,0.15)" filter="blur(2px)"/>
                    
                    {/* Isometric Ground Block */}
                    <path d="M30 90 L80 65 L130 90 L80 115 Z" fill="#4ade80" />
                    <path d="M30 90 L80 115 L80 125 L30 100 Z" fill="#22c55e" />
                    <path d="M80 115 L130 90 L130 100 L80 125 Z" fill="#16a34a" />
                    <path d="M30 100 L80 125 L130 100 L130 105 L80 130 L30 105 Z" fill="#94a3b8" />
                    
                    {/* River cutting through */}
                    <path d="M105 77 Q90 85 80 95 T55 102 L50 100 Q75 90 85 80 T100 75 Z" fill="#38bdf8" />
                    
                    {/* Mini Trees */}
                    <circle cx="45" cy="85" r="3" fill="#15803d"/>
                    <circle cx="55" cy="75" r="2.5" fill="#15803d"/>
                    <circle cx="115" cy="85" r="3.5" fill="#16a34a"/>
                    
                    {/* Big Red Location Pin */}
                    <path d="M70 50 C70 50 60 62 60 70 C60 76 65 80 70 80 C75 80 80 76 80 70 C80 62 70 50 70 50Z" fill="#ef4444"/>
                    <circle cx="70" cy="70" r="4" fill="white"/>
                    <ellipse cx="70" cy="83" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
                    
                    {/* Tripod Legs */}
                    <path d="M105 85 L90 105 M105 85 L120 105 M105 85 L105 108" stroke="url(#greyGrad)" strokeWidth="4" strokeLinecap="round"/>
                    
                    {/* Main Body Total Station */}
                    <rect x="98" y="55" width="14" height="20" rx="3" fill="url(#bodyGrad)"/>
                    <path d="M100 57 L112 57 L112 73 L100 73 Z" fill="#fcd34d" opacity="0.6"/>
                    <rect x="95" y="60" width="5" height="12" rx="1.5" fill="url(#greyGrad)"/>
                    <path d="M97 50 L113 50 L113 55 L97 55 Z" fill="url(#greyGrad)" rx="2"/>
                    <rect x="108" y="60" width="12" height="10" rx="2" fill="url(#greyGrad)"/>
                    <ellipse cx="120" cy="65" rx="3" ry="5" fill="#1e293b"/>
                    <ellipse cx="120" cy="65" rx="1.5" ry="3" fill="url(#lensGrad)"/>
                  </svg>
                </div>
              </div>

              {/* 2x2 Grid Cards Container */}
              <div className="flex-1 w-full max-w-5xl mx-auto px-6 pb-24 relative z-10 flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-5 md:gap-6">
                  
                  {/* Card 1 - Blue - Measurement Logic */}
                  <div
                    className="group relative rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex flex-col items-center cursor-pointer active:scale-95 transition-transform duration-200 shadow-[0_10px_30px_rgba(59,130,246,0.2)] overflow-hidden aspect-square md:aspect-auto md:min-h-[220px]"
                    style={{background: 'linear-gradient(150deg, #60a5fa 0%, #2563eb 100%)'}}
                    onClick={() => setActiveLandSurveyView('simple')}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 mt-1 shrink-0 z-10 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="7"/><path d="M16 16l4 4-4 4"/><path d="M8 8H4v4"/>
                      </svg>
                    </div>
                    <div className="z-10 flex flex-col items-center">
                      <h3 className="text-white font-bold text-[15px] md:text-[18px] text-center leading-tight mb-1">Measurement Logic</h3>
                      <p className="text-blue-100 text-[11px] md:text-[13px] text-center font-medium leading-snug px-1 opacity-90">Smart Measurement<br/>Calculations</p>
                    </div>
                    <div className="absolute bottom-4 right-4 w-7 h-7 md:w-9 md:h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-blue-600 transition-transform group-hover:translate-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>

                  {/* Card 2 - Green - Field Book */}
                  <div
                    className="group relative rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex flex-col items-center cursor-pointer active:scale-95 transition-transform duration-200 shadow-[0_10px_30px_rgba(34,197,94,0.2)] overflow-hidden aspect-square md:aspect-auto md:min-h-[220px]"
                    style={{background: 'linear-gradient(150deg, #86efac 0%, #16a34a 100%)'}}
                    onClick={() => setActiveLandSurveyView('fmb')}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 mt-1 shrink-0 z-10 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                        <circle cx="12" cy="11" r="3" fill="currentColor"/>
                      </svg>
                    </div>
                    <div className="z-10 flex flex-col items-center">
                      <h3 className="text-white font-bold text-[15px] md:text-[18px] text-center leading-tight mb-1">Field Book</h3>
                      <p className="text-green-50 text-[11px] md:text-[13px] text-center font-medium leading-snug px-1 opacity-90">Manage Field<br/>Records</p>
                    </div>
                    <div className="absolute bottom-4 right-4 w-7 h-7 md:w-9 md:h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-green-600 transition-transform group-hover:translate-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>

                  {/* Card 3 - Orange - Recreate Layout */}
                  <div
                    className="group relative rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex flex-col items-center cursor-pointer active:scale-95 transition-transform duration-200 shadow-[0_10px_30px_rgba(249,115,22,0.2)] overflow-hidden aspect-square md:aspect-auto md:min-h-[220px]"
                    style={{background: 'linear-gradient(150deg, #fbbf24 0%, #ea580c 100%)'}}
                    onClick={() => {
                      setCurrentProjectId(null);
                      setExtractedVectors(null);
                      setPdfScale('');
                      setWorkspaceSurveyNumber('');
                      setWorkspaceSubDivision('');
                      setWorkspaceArea(null);
                      setCurrentProjectId(null);
                      setShowWorkspaceCalculation(false);
                      setCalculatedLandArea({ hectareAres: '0 Hect, 0 Ares', acre: '0', cent: '0' });
                      setFmbWorkflowState('extract');
                      setActiveLandSurveyView('recreate_fmb');
                    }}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 mt-1 shrink-0 z-10 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><path d="M15 15l2 2-2 2"/>
                      </svg>
                    </div>
                    <div className="z-10 flex flex-col items-center">
                      <h3 className="text-white font-bold text-[15px] md:text-[18px] text-center leading-tight mb-1">Recreate Layout</h3>
                      <p className="text-orange-50 text-[11px] md:text-[13px] text-center font-medium leading-snug px-1 opacity-90">Create New Survey<br/>Layouts</p>
                    </div>
                    <div className="absolute bottom-4 right-4 w-7 h-7 md:w-9 md:h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-orange-600 transition-transform group-hover:translate-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>

                  {/* Card 4 - Purple - Manual Draw */}
                  <div
                    className="group relative rounded-[28px] md:rounded-[32px] p-5 md:p-6 flex flex-col items-center cursor-pointer active:scale-95 transition-transform duration-200 shadow-[0_10px_30px_rgba(147,51,234,0.2)] overflow-hidden aspect-square md:aspect-auto md:min-h-[220px]"
                    style={{background: 'linear-gradient(150deg, #c084fc 0%, #7e22ce 100%)'}}
                    onClick={() => {
                      setIsManualCanvasOpen(true);
                      setIsMyProjectsOpen(false);
                      setActiveLandSurveyView('dark_draw_manual');
                      resetCadWorkspace();
                      setMapConfig({ ...mapConfig, active: false });
                    }}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 mt-1 shrink-0 z-10 group-hover:scale-110 transition-transform duration-300">
                      <svg className="w-8 h-8 md:w-10 md:h-10 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l4 10-4-3-4 3 4-10z"/><circle cx="12" cy="19" r="2"/>
                      </svg>
                    </div>
                    <div className="z-10 flex flex-col items-center">
                      <h3 className="text-white font-bold text-[15px] md:text-[18px] text-center leading-tight mb-1">Manual Draw</h3>
                      <p className="text-purple-100 text-[11px] md:text-[13px] text-center font-medium leading-snug px-1 opacity-90">Advanced Drawing<br/>Mode</p>
                    </div>
                    <div className="absolute bottom-4 right-4 w-7 h-7 md:w-9 md:h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-purple-600 transition-transform group-hover:translate-x-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          `;

c = c.substring(0, startIndex) + newMenuBlock + c.substring(endIndex);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('UI Replace Success');
