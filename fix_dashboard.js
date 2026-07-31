const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// 1. Remove Top White Header
c = c.replace(
  "{activeLandSurveyView !== 'dark_draw_manual' && activeLandSurveyView !== 'dark_draw_submenu' && activeLandSurveyView !== 'dark_draw_projects' && (",
  "{activeLandSurveyView !== 'menu' && activeLandSurveyView !== 'dark_draw_manual' && activeLandSurveyView !== 'dark_draw_submenu' && activeLandSurveyView !== 'dark_draw_projects' && ("
);

// 2. Fix Hero Header
const heroOld = `              {/* Hero Header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-[28px] font-black text-slate-800 leading-tight">Survey <span className="text-blue-500">Hub</span></h1>
                    <svg className="w-7 h-7 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  </div>
                  <p className="text-[13px] text-slate-500 font-semibold leading-snug">Smart Tools for<br/>Land Surveyors</p>
                </div>
                {/* 3D Illustration */}
                <div className="w-32 h-28 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-2xl bg-white/30 backdrop-blur-sm" />
                  <svg viewBox="0 0 120 100" className="w-full h-full drop-shadow-lg" xmlns="http://www.w3.org/2000/svg">
                    {/* Ground / Terrain */}
                    <ellipse cx="55" cy="72" rx="48" ry="18" fill="#86efac" opacity="0.7"/>
                    <ellipse cx="55" cy="72" rx="38" ry="12" fill="#4ade80" opacity="0.5"/>
                    {/* Path */}
                    <path d="M30 72 Q55 60 80 72" fill="none" stroke="white" strokeWidth="2.5" strokeDasharray="4 3" opacity="0.9"/>
                    {/* Trees */}
                    <circle cx="25" cy="62" r="7" fill="#16a34a"/>
                    <rect x="23" y="68" width="4" height="5" fill="#92400e"/>
                    <circle cx="85" cy="60" r="9" fill="#15803d"/>
                    <rect x="83" y="67" width="4" height="6" fill="#92400e"/>
                    <circle cx="38" cy="58" r="6" fill="#22c55e"/>
                    {/* Location pin red */}
                    <path d="M58 20 C58 20 48 32 48 40 C48 46 53 50 58 50 C63 50 68 46 68 40 C68 32 58 20 58 20Z" fill="#ef4444"/>
                    <circle cx="58" cy="40" r="5" fill="white"/>
                    {/* Total Station tripod */}
                    <line x1="90" y1="55" x2="78" y2="72" stroke="#374151" strokeWidth="2"/>
                    <line x1="90" y1="55" x2="102" y2="72" stroke="#374151" strokeWidth="2"/>
                    <line x1="90" y1="55" x2="90" y2="72" stroke="#374151" strokeWidth="2"/>
                    {/* Total Station body */}
                    <rect x="83" y="42" width="14" height="13" rx="3" fill="#d97706"/>
                    <rect x="85" y="40" width="10" height="4" rx="2" fill="#fbbf24"/>
                    <rect x="86" y="44" width="8" height="2" rx="1" fill="#92400e"/>
                    <circle cx="90" cy="49" r="4" fill="#1e293b"/>
                    <circle cx="90" cy="49" r="2.5" fill="#0ea5e9"/>
                  </svg>
                </div>
              </div>`;

const heroNew = `              {/* Hero Header */}
              <div className="flex items-start justify-between px-5 pt-5 pb-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowLandSurveyDashboard(false)}
                      className="w-10 h-10 -ml-2 rounded-full hover:bg-white/50 flex items-center justify-center text-slate-700 transition-colors shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                    <h1 className="text-[28px] font-black text-slate-800 leading-tight">Survey <span className="text-blue-500">Hub</span></h1>
                  </div>
                  <p className="text-[13px] text-slate-500 font-semibold leading-snug pl-11">Smart Tools for<br/>Land Surveyors</p>
                </div>
                {/* 3D Illustration */}
                <div className="w-40 h-36 flex items-center justify-center relative -mt-4 -mr-2">
                  <svg viewBox="0 0 160 140" className="w-full h-full drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8"/>
                        <stop offset="100%" stopColor="#0369a1"/>
                      </linearGradient>
                      <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b"/>
                        <stop offset="100%" stopColor="#b45309"/>
                      </linearGradient>
                      <linearGradient id="greyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8"/>
                        <stop offset="100%" stopColor="#475569"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Shadow */}
                    <ellipse cx="80" cy="115" rx="40" ry="12" fill="rgba(0,0,0,0.15)" filter="blur(2px)"/>
                    
                    {/* Tripod Legs */}
                    <path d="M80 85 L50 115 M80 85 L110 115 M80 85 L80 115" stroke="url(#greyGrad)" strokeWidth="6" strokeLinecap="round"/>
                    <path d="M80 85 L50 115 M80 85 L110 115 M80 85 L80 115" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round"/>
                    
                    {/* Base Plate */}
                    <path d="M60 82 Q80 88 100 82 L95 76 Q80 80 65 76 Z" fill="url(#greyGrad)"/>
                    
                    {/* Main Body */}
                    <rect x="70" y="50" width="20" height="28" rx="4" fill="url(#bodyGrad)"/>
                    <path d="M72 52 L88 52 L88 76 L72 76 Z" fill="#fbbf24" opacity="0.6"/>
                    
                    {/* Side Handle/Screen */}
                    <rect x="64" y="55" width="8" height="18" rx="2" fill="url(#greyGrad)"/>
                    <rect x="65" y="57" width="5" height="14" rx="1" fill="#1e293b"/>
                    
                    {/* Top Handle */}
                    <path d="M68 45 L92 45 L92 50 L68 50 Z" fill="url(#greyGrad)" rx="2"/>
                    <rect x="74" y="42" width="12" height="4" rx="1" fill="url(#bodyGrad)"/>
                    
                    {/* Lens Cylinder */}
                    <rect x="85" y="54" width="16" height="14" rx="3" fill="url(#greyGrad)"/>
                    <ellipse cx="101" cy="61" rx="4" ry="7" fill="#1e293b"/>
                    <ellipse cx="101" cy="61" rx="2" ry="4" fill="url(#lensGrad)"/>
                    
                    {/* Laser Beam effect */}
                    <path d="M102 61 L140 45 L150 50 Z" fill="#38bdf8" opacity="0.4" style={{mixBlendMode: 'screen'}}/>
                    <path d="M102 61 L145 47 L147 48 Z" fill="#bae6fd" opacity="0.8"/>
                    
                    {/* Sparkles */}
                    <circle cx="130" cy="35" r="2" fill="#fff" opacity="0.8"/>
                    <circle cx="145" cy="65" r="1.5" fill="#fff" opacity="0.6"/>
                    <circle cx="115" cy="80" r="1" fill="#fff" opacity="0.7"/>
                  </svg>
                </div>
              </div>`;

c = c.replace(heroOld, heroNew);

// 3. Grid container
c = c.replace(
  'className="grid grid-cols-2 gap-4 px-4 pb-6 pt-2 flex-1"',
  'className="grid grid-cols-2 gap-4 px-4 pb-24 pt-2"'
);

// 4. Cards shape
c = c.replace(
  /className="rounded-3xl p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-all duration-150 shadow-lg"/g,
  'className="rounded-3xl p-4 flex flex-col justify-between cursor-pointer active:scale-95 transition-all duration-150 shadow-lg aspect-square md:aspect-auto"'
);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('UI Overhaul successful');
