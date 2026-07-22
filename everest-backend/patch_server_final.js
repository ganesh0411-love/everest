const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Replace districts
const distRegex = /app\.get\('\/api\/tngis\/districts', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, data: \["Dindigul", "Madurai", "Chennai"\] \}\);\s*\}\s*\}\);/;
const newDistBlock = `app.get('/api/tngis/districts', (req, res) => {
    try {
        const districts = Object.keys(tnMasterDataset).sort();
        return res.json({ success: true, data: districts });
    } catch (err) {
        console.error("Districts error:", err.message);
        res.json({ success: true, data: ["Dindigul", "Madurai", "Chennai"] });
    }
});`;
serverCode = serverCode.replace(distRegex, newDistBlock);

// 2. Replace taluks
const talukRegex = /app\.get\('\/api\/tngis\/taluks', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, data: \["Nilakkottai", "Palani", "Kodaikanal"\] \}\);\s*\}\s*\}\);/;
const newTalukBlock = `app.get('/api/tngis/taluks', (req, res) => {
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
});`;
serverCode = serverCode.replace(talukRegex, newTalukBlock);

// 3. Replace villages
const villRegex = /app\.get\('\/api\/tngis\/villages', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, data: \["Sevugampatti", "Pallapatti", "Ammainaickanur"\] \}\);\s*\}\s*\}\);/;
const newVillBlock = `app.get('/api/tngis/villages', (req, res) => {
    try {
        const { district, taluk } = req.query;
        if (!taluk) return res.status(400).json({ error: 'Taluk is required' });
        
        // district is optional if we search all, but let's assume valid structure
        let villages = [];
        if (district && tnMasterDataset[district] && tnMasterDataset[district][taluk]) {
            villages = tnMasterDataset[district][taluk].map(v => v.name).sort();
        } else {
            // Find across all districts if district not explicitly matched (fallback)
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
});`;
serverCode = serverCode.replace(villRegex, newVillBlock);

// 4. Replace feature boundary endpoint (to get bounding box and multipolygon)
const featureRegex = /app\.get\('\/api\/tngis\/feature', async \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, fallback: true \}\);\s*\}\s*\}\);/;
const newFeatureBlock = `app.get('/api/tngis/feature', async (req, res) => {
    try {
        const { village, survey, subdiv, taluk } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and survey required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }

        // Fast SQLite lookup
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
                        try {
                            features.push(JSON.parse(r.geometry_geojson));
                        } catch(e){}
                    }
                });
                
                // Construct a unified feature
                let geom = null;
                if (features.length === 1) {
                    geom = features[0];
                } else if (features.length > 1) {
                    // Collect all polygon rings into a MultiPolygon
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
        
        // Fallback to WFS
        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
        if (subdiv) cql += \` AND sub_division='\${subdiv}'\`;
        
        const data = await fetchTNGIS('cadastral_data_wms:view_fmb', null, cql);
        if (data && data.features && data.features.length > 0) {
            // WFS could return multiple features if subdiv is not specified. We'll just return the first one as fallback, or merge them.
            // For simplicity, just return the exact first feature (fallback path).
            res.json({ success: true, feature: data.features[0], source: 'wfs' });
        } else {
            res.json({ success: false, error: 'Not found' });
        }
    } catch (err) {
        console.error("Feature fetch error:", err.message);
        res.json({ success: true, fallback: true });
    }
});`;

serverCode = serverCode.replace(featureRegex, newFeatureBlock);

fs.writeFileSync('server.js', serverCode);
console.log('Successfully patched server.js endpoints');
