const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

const surveyBlockRegex = /app\.get\('\/api\/tngis\/survey', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, data: \["1A", "2B", "3C", "4D", "1", "2", "3", "4", "5"\], fallback: true \}\);\s*\}\s*\}\);/;

const newSurveyBlock = `app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }

        try {
            const rows = await dbAll('SELECT DISTINCT survey_no FROM cadastral_parcels WHERE lgd_village_code = ? ORDER BY survey_no ASC', [lgdVillageCode]);
            if (rows && rows.length > 0) {
                let surveys = rows.map(r => r.survey_no).filter(Boolean).sort((a,b) => {
                    const numA = parseInt(a, 10);
                    const numB = parseInt(b, 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return String(a).localeCompare(String(b));
                });
                return res.json({ success: true, data: surveys, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error('SQLite survey error:', dbErr.message);
        }
        
        let cql = \`lgd_village_code='\${lgdVillageCode}'\`;
        const data = await fetchTNGIS('cadastral_data_wms:view_fmb', 'survey_number', cql);
        if (data && data.features) {
            const surveys = [...new Set(data.features.map(f => f.properties.survey_number).filter(Boolean))].sort((a,b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });
            return res.json({ success: true, data: surveys, source: 'wfs' });
        }
        res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Survey WFS failed, returning fallback:", err.message);
        res.json({ success: true, data: ["1A", "2B", "3C", "4D", "1", "2", "3", "4", "5"], fallback: true });
    }
});`;

serverCode = serverCode.replace(surveyBlockRegex, newSurveyBlock);


const subdivBlockRegex = /app\.get\('\/api\/tngis\/subdivisions', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, data: \["1A", "2B", "3C", "4D", "1", "2", "3", "4", "5"\], fallback: true \}\);\s*\}\s*\}\);/;

const newSubdivBlock = `app.get('/api/tngis/subdivisions', async (req, res) => {
    try {
        const { taluk, village, survey } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and Survey are required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }

        try {
            const rows = await dbAll('SELECT DISTINCT sub_div_no FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? ORDER BY sub_div_no ASC', [lgdVillageCode, survey]);
            if (rows && rows.length > 0) {
                const subdivs = rows.map(r => r.sub_div_no).filter(Boolean).sort();
                return res.json({ success: true, data: subdivs, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error('SQLite subdiv error:', dbErr.message);
        }
        
        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
        
        const data = await fetchTNGIS('cadastral_data_wms:view_fmb', 'sub_division', cql);
        if (data && data.features) {
            const subdivs = [...new Set(data.features.map(f => f.properties.sub_division).filter(Boolean))].sort();
            return res.json({ success: true, data: subdivs, source: 'wfs' });
        }
        res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Subdivisions WFS failed, returning fallback:", err.message);
        res.json({ success: true, data: ["1A", "2B", "3C", "4D", "1", "2", "3", "4", "5"], fallback: true });
    }
});`;

serverCode = serverCode.replace(subdivBlockRegex, newSubdivBlock);

fs.writeFileSync('server.js', serverCode);
console.log('Fixed server.js for fast SQLite lookups!');
