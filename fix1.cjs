const fs = require('fs');
let c = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// 1. Back Button Fix
const backLogic = `// 3. Parent Tool Views (Field Book, Simple Lands, Dark Draw Hub, Recreate FMB)
      if (activeLandSurveyView !== 'menu') {
        setActiveLandSurveyView('menu');
        return true;
      }

      if (showLandSurveyDashboard && activeLandSurveyView === 'menu') {
        setShowLandSurveyDashboard(false);
        return true;
      }`;
c = c.replace(/\/\/ 3\. Parent Tool Views.*?\/\/ 4\. Return false so App\.jsx handles it/s, backLogic + '\n\n      // 4. Return false so App.jsx handles it');

// 2. Add isMobile360Active state
if (!c.includes('isMobile360Active')) {
  c = c.replace('const [mapRotation, setMapRotation] = React.useState(0);', 'const [mapRotation, setMapRotation] = React.useState(0);\n  const [isMobile360Active, setIsMobile360Active] = React.useState(false);');
}

// 3. Manual Draw Navigation Fix
const oldManualClick = `onClick={() => {
                      setIsManualCanvasOpen(true);
                      setIsMyProjectsOpen(false);
                      setActiveLandSurveyView('dark_draw_manual');
                      resetCadWorkspace();
                      setMapConfig({ ...mapConfig, active: false });
                    }}`;
const newManualClick = `onClick={() => { setActiveLandSurveyView('dark_draw_submenu'); }}`;
c = c.replace(oldManualClick, newManualClick);

// 4. Update the Dashboard SVG icons for Cards 1 to 4
const icon1 = `<svg className="w-8 h-8 md:w-10 md:h-10 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                      </svg>`;
const icon1New = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10">
                        <path d="M4 7V17C4 19.2091 5.79086 21 8 21H16C18.2091 21 20 19.2091 20 17V7C20 4.79086 18.2091 3 16 3H8C5.79086 3 4 4.79086 4 7Z" stroke="#3b82f6" strokeWidth="2"/>
                        <path d="M4 11H20" stroke="#3b82f6" strokeWidth="2"/>
                        <path d="M9 3V21" stroke="#bfdbfe" strokeWidth="2" strokeDasharray="4 4"/>
                        <circle cx="14" cy="16" r="2" fill="#3b82f6"/>
                      </svg>`;

const icon2 = `<svg className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                      </svg>`;
const icon2New = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10">
                        <path d="M4 6V18C4 19.1046 4.89543 20 6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6Z" stroke="#10b981" strokeWidth="2"/>
                        <path d="M8 4V20" stroke="#10b981" strokeWidth="2"/>
                        <path d="M12 8H16" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M12 12H16" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M12 16H14" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
                      </svg>`;

const icon3 = `<svg className="w-8 h-8 md:w-10 md:h-10 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/><path d="M15 15l2 2-2 2"/>
                      </svg>`;
const icon3New = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10">
                        <path d="M3 9L12 4L21 9V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V9Z" stroke="#f97316" strokeWidth="2"/>
                        <path d="M9 21V12H15V21" stroke="#f97316" strokeWidth="2"/>
                        <path d="M12 4V12" stroke="#fdba74" strokeWidth="2" strokeDasharray="3 3"/>
                      </svg>`;

const icon4 = `<svg className="w-8 h-8 md:w-10 md:h-10 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2l4 10-4-3-4 3 4-10z"/><circle cx="12" cy="19" r="2"/>
                      </svg>`;
const icon4New = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 md:w-10 md:h-10">
                        <path d="M16 4L20 8L8 20H4V16L16 4Z" stroke="#9333ea" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 8L16 12" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M20 4L22 2" stroke="#9333ea" strokeWidth="2" strokeLinecap="round"/>
                      </svg>`;

c = c.replace(icon1, icon1New);
c = c.replace(icon2, icon2New);
c = c.replace(icon3, icon3New);
c = c.replace(icon4, icon4New);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', c);
