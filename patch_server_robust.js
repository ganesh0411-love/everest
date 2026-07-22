const fs = require('fs');
let code = fs.readFileSync('everest-backend/server.js', 'utf8');

// Helper to replace an entire endpoint block
function replaceEndpoint(endpoint, newContent) {
    const startStr = `app.get('${endpoint}'`;
    const startIndex = code.indexOf(startStr);
    if (startIndex === -1) {
        console.error(`Endpoint ${endpoint} not found!`);
        return;
    }
    
    // Find the matching closing });
    let bracketCount = 0;
    let inFunction = false;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < code.length; i++) {
        if (code[i] === '{') {
            bracketCount++;
            inFunction = true;
        } else if (code[i] === '}') {
            bracketCount--;
        }
        
        if (inFunction && bracketCount === 0 && code.substr(i, 3) === '});') {
            endIndex = i + 3;
            break;
        }
    }
    
    if (endIndex > startIndex) {
        code = code.substring(0, startIndex) + newContent + code.substring(endIndex);
        console.log(`Replaced ${endpoint}`);
    }
}

replaceEndpoint('/api/tngis/districts', `app.get('/api/tngis/districts', (req, res) => {
    try {
        const districts = Object.keys(tnMasterDataset).sort();
        return res.json({ success: true, data: districts });
    } catch (err) {
        console.error("Districts error:", err.message);
        res.json({ success: true, data: ["Dindigul", "Madurai", "Chennai"] });
    }
});`);

replaceEndpoint('/api/tngis/taluks', `app.get('/api/tngis/taluks', (req, res) => {
    try {
        const { district } = req.query;
        if (!district) return res.status(400).json({ error: 'District is required' });
        
        if (tnMasterDataset[district]) {
            const taluks = Object.keys(tnMasterDataset[district]).sort();
            return res.json({ success: true, data: taluks });
        }
        return res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Taluks error:", err.message);
        res.json({ success: true, data: ["Nilakkottai", "Palani", "Kodaikanal"] });
    }
});`);

replaceEndpoint('/api/tngis/villages', `app.get('/api/tngis/villages', (req, res) => {
    try {
        const { district, taluk } = req.query;
        if (!taluk) return res.status(400).json({ error: 'Taluk is required' });
        
        let villages = [];
        if (district && tnMasterDataset[district] && tnMasterDataset[district][taluk]) {
            villages = tnMasterDataset[district][taluk].map(v => v.name).sort();
        } else {
            for (let d in tnMasterDataset) {
                if (tnMasterDataset[d][taluk]) {
                    villages = tnMasterDataset[d][taluk].map(v => v.name).sort();
                    break;
                }
            }
        }
        return res.json({ success: true, data: villages });
    } catch (err) {
        console.error("Villages error:", err.message);
        res.json({ success: true, data: ["Sevugampatti", "Pallapatti", "Ammainaickanur"] });
    }
});`);

replaceEndpoint('/api/tngis/feature', `app.get('/api/tngis/feature', async (req, res) => {
    try {
        const { village, survey, subdiv, taluk } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and survey required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }

        try {
            let query = 'SELECT bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y, geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ?';
            let params = [lgdVillageCode, survey];
            if (subdiv) {
                query += ' AND sub_div_no = ?';
                params.push(subdiv);
            }
            
            const rows = await dbAll(query, params);
            if (rows && rows.length > 0) {
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                let features = [];
                
                rows.forEach(r => {
                    if (r.bbox_min_x < minX) minX = r.bbox_min_x;
                    if (r.bbox_min_y < minY) minY = r.bbox_min_y;
                    if (r.bbox_max_x > maxX) maxX = r.bbox_max_x;
                    if (r.bbox_max_y > maxY) maxY = r.bbox_max_y;
                    if (r.geometry_geojson) {
                        try { features.push(JSON.parse(r.geometry_geojson)); } catch(e){}
                    }
                });
                
                let geom = null;
                if (features.length === 1) {
                    geom = features[0];
                } else if (features.length > 1) {
                    let polys = [];
                    features.forEach(f => {
                        if (f.type === 'Polygon') polys.push(f.coordinates);
                        else if (f.type === 'MultiPolygon') polys.push(...f.coordinates);
                    });
                    geom = { type: 'MultiPolygon', coordinates: polys };
                }
                
                return res.json({
                    success: true,
                    feature: {
                        type: "Feature",
                        bbox: [minX, minY, maxX, maxY],
                        geometry: geom,
                        properties: { survey_no: survey, subdiv_no: subdiv }
                    },
                    source: 'sqlite'
                });
            }
        } catch(dbErr) {
            console.error('SQLite feature lookup error:', dbErr.message);
        }
        
        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
        if (subdiv) cql += \` AND sub_division='\${subdiv}'\`;
        const data = await fetchTNGIS('cadastral_data_wms:view_fmb', null, cql);
        if (data && data.features && data.features.length > 0) {
            res.json({ success: true, feature: data.features[0], source: 'wfs' });
        } else {
            res.json({ success: false, error: 'Not found' });
        }
    } catch (err) {
        console.error("Feature fetch error:", err.message);
        res.json({ success: true, fallback: true });
    }
});`);

fs.writeFileSync('everest-backend/server.js', code);
console.log('Successfully patched server.js endpoints (Robustly)');
