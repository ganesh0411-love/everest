const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Patch villages fallback map
code = code.replace(
  'const fallbackData = villages.sort((a, b) => a.localeCompare(b));',
  'const fallbackData = villages.map(v => typeof v === "string" ? v : v.name).sort((a, b) => a.localeCompare(b));'
);

// Patch /api/tngis/survey
const oldSurvey = `app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });
        
        let cql = \`vname='\${village}'\`;
        if (taluk) cql = \`tname='\${taluk}' AND \${cql}\`;`;

const newSurvey = `app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });
        
        let lgdVillageCode = village;
        // Search across tnMasterDataset
        for (let d in tnMasterDataset) {
            for (let t in tnMasterDataset[d]) {
                if (!taluk || t === taluk) {
                    if (tnMasterDataset[d][t] && Array.isArray(tnMasterDataset[d][t])) {
                        const v = tnMasterDataset[d][t].find(x => typeof x === 'object' && x.name === village);
                        if (v && v.lgd_village_code) lgdVillageCode = v.lgd_village_code;
                    }
                }
            }
        }
        
        let cql = \`lgd_village_code='\${lgdVillageCode}'\`;`;

code = code.replace(oldSurvey, newSurvey);

// Patch /api/tngis/subdivision
const oldSubdiv = `        let typeName = 'cadastral_data_wms:view_cadastral';
        let cql = \`vname='\${village}' AND survey_number='\${survey}'\`;
        if (taluk) cql = \`tname='\${taluk}' AND \${cql}\`;`;

const newSubdiv = `        let typeName = 'cadastral_data_wms:view_cadastral';
        let lgdVillageCode = village;
        for (let d in tnMasterDataset) {
            for (let t in tnMasterDataset[d]) {
                if (!taluk || t === taluk) {
                    if (tnMasterDataset[d][t] && Array.isArray(tnMasterDataset[d][t])) {
                        const v = tnMasterDataset[d][t].find(x => typeof x === 'object' && x.name === village);
                        if (v && v.lgd_village_code) lgdVillageCode = v.lgd_village_code;
                    }
                }
            }
        }
        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;`;

code = code.replace(oldSubdiv, newSubdiv);

fs.writeFileSync('server.js', code);
console.log('Patched server.js');
