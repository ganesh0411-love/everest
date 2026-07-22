const fs = require('fs');
let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

code = code.replace(
    /<select\s*value=\{selDistrict\}\s*onChange=\{e => setSelDistrict\(e.target.value\)\}/,
    `<select 
              value={selDistrict} onChange={e => { setSelDistrict(e.target.value); setSelTaluk(''); setSelVillage(''); setSelSurvey(''); setSelSubdiv(''); setMapActionTrigger(Date.now()); }}`
);

code = code.replace(
    /<select\s*value=\{selTaluk\}\s*onChange=\{e => setSelTaluk\(e.target.value\)\}/,
    `<select 
              value={selTaluk} onChange={e => { setSelTaluk(e.target.value); setSelVillage(''); setSelSurvey(''); setSelSubdiv(''); setMapActionTrigger(Date.now()); }}`
);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Fixed dropdowns!');
