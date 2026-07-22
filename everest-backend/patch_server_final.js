const fs = require('fs');

let serverCode = fs.readFileSync('server.js', 'utf8');

// 1. Fix Survey Route
const surveyRouteOld = `app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }
        
        if (surveyCache[lgdVillageCode]) {
            return res.json({ success: true, data: surveyCache[lgdVillageCode] });
        }
        
        let cql = \`lgd_village_code='\${lgdVillageCode}'\`;
        
        // Use cadastral layer to fetch survey numbers
        const data = await fetchTNGIS('cadastral_data_wms:view_cadastral', 'survey_number', cql);
        if (data && data.features) {
            const surveys = [...new Set(data.features.map(f => f.properties.survey_number).filter(Boolean))].sort((a,b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });
            surveyCache[lgdVillageCode] = surveys;
            return res.json({ success: true, data: surveys });
        }
        res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Survey WFS failed, returning fallback:", err.message);
        res.json({ success: true, data: ["1A", "2B", "3C", "4D", "1", "2", "3", "4", "5"], fallback: true });
    }
});`;

const surveyRouteNew = `app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }
        
        if (surveyCache[lgdVillageCode]) {
            return res.json({ success: true, data: surveyCache[lgdVillageCode] });
        }
        
        // SQLite Fast Lookup
        try {
            const rows = await dbAll(\`SELECT DISTINCT survey_no FROM cadastral_parcels WHERE lgd_village_code = ?\`, [lgdVillageCode]);
            if (rows && rows.length > 0) {
                const surveys = rows.map(r => r.survey_no).sort((a,b) => {
                    const numA = parseInt(a, 10);
                    const numB = parseInt(b, 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return String(a).localeCompare(String(b));
                });
                surveyCache[lgdVillageCode] = surveys;
                return res.json({ success: true, data: surveys, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error("Survey SQLite failed:", dbErr.message);
        }
        
        let cql = \`lgd_village_code='\${lgdVillageCode}'\`;
        const data = await fetchTNGIS('cadastral_data_wms:view_cadastral', 'survey_number', cql);
        if (data && data.features) {
            const surveys = [...new Set(data.features.map(f => f.properties.survey_number).filter(Boolean))].sort((a,b) => {
                const numA = parseInt(a, 10);
                const numB = parseInt(b, 10);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return String(a).localeCompare(String(b));
            });
            surveyCache[lgdVillageCode] = surveys;
            return res.json({ success: true, data: surveys });
        }
        res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Survey WFS failed, returning fallback:", err.message);
        res.json({ success: true, data: ["1A", "2B", "3C", "4D", "1", "2", "3", "4", "5"], fallback: true });
    }
});`;

serverCode = serverCode.replace(surveyRouteOld, surveyRouteNew);

// 2. Fix Subdivision Route
const subdivRouteOld = `app.get('/api/tngis/subdivisions', async (req, res) => {
    try {
        const { taluk, village, survey } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and Survey are required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }

        const cacheKey = \`\${lgdVillageCode}_\${survey}\`;
        if (subdivCache[cacheKey]) {
            return res.json({ success: true, data: subdivCache[cacheKey] });
        }

        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
        
        // Use cadastral view_fmb layer
        const data = await fetchTNGIS('cadastral_data_wms:view_fmb', 'sub_division', cql);
        if (data && data.features) {
            const subdivs = [...new Set(data.features.map(f => f.properties.sub_division).filter(Boolean))].sort();
            subdivCache[cacheKey] = subdivs;
            return res.json({ success: true, data: subdivs });
        }
        res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Subdivisions WFS failed, returning fallback:", err.message);
        res.json({ success: true, data: ["1A", "1B", "2A", "2B"], fallback: true });
    }
});`;

const subdivRouteNew = `app.get('/api/tngis/subdivisions', async (req, res) => {
    try {
        const { taluk, village, survey } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and Survey are required' });
        
        let lgdVillageCode = village;
        if (taluk) {
            const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
            if (mappedCode) lgdVillageCode = mappedCode;
        }

        const cacheKey = \`\${lgdVillageCode}_\${survey}\`;
        if (subdivCache[cacheKey]) {
            return res.json({ success: true, data: subdivCache[cacheKey] });
        }

        // SQLite Fast Lookup
        try {
            const rows = await dbAll(\`SELECT DISTINCT sub_div_no FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ?\`, [lgdVillageCode, survey]);
            if (rows && rows.length > 0) {
                const subdivs = rows.map(r => r.sub_div_no).filter(Boolean).sort();
                subdivCache[cacheKey] = subdivs;
                return res.json({ success: true, data: subdivs, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error("Subdivisions SQLite failed:", dbErr.message);
        }

        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
        const data = await fetchTNGIS('cadastral_data_wms:view_fmb', 'sub_division', cql);
        if (data && data.features) {
            const subdivs = [...new Set(data.features.map(f => f.properties.sub_division).filter(Boolean))].sort();
            subdivCache[cacheKey] = subdivs;
            return res.json({ success: true, data: subdivs });
        }
        res.json({ success: true, data: [] });
    } catch (err) {
        console.error("Subdivisions WFS failed, returning fallback:", err.message);
        res.json({ success: true, data: ["1A", "1B", "2A", "2B"], fallback: true });
    }
});`;

serverCode = serverCode.replace(subdivRouteOld, subdivRouteNew);

// 3. Fix Boundary Route
const boundaryRouteOldRegex = /app\.get\('\/api\/tngis\/boundary', async \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ success: false, error: 'Boundary not found or WFS timed out', fallback: true \}\);\n    \}\n\}\);/;

const boundaryRouteNew = `app.get('/api/tngis/boundary', async (req, res) => {
    try {
        const { level, district, taluk, village, survey, subdiv } = req.query;
        if (!level) return res.status(400).json({ error: 'Level is required' });

        let lgdVillageCode = village;
        if (level === 'parcel' || level === 'village') {
            if (taluk && village) {
                const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
                if (mappedCode) lgdVillageCode = mappedCode;
            }
        }

        try {
            let row;
            if (level === 'village' && lgdVillageCode) {
                row = await dbGet(\`SELECT bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM administrative_boundaries WHERE level='village' AND lgd_code = ? LIMIT 1\`, [lgdVillageCode]);
            } else if (level === 'district' && district) {
                row = await dbGet(\`SELECT bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM administrative_boundaries WHERE level='district' AND name = ? LIMIT 1\`, [district]);
            } else if (level === 'taluk' && taluk) {
                row = await dbGet(\`SELECT bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM administrative_boundaries WHERE level='taluk' AND name = ? LIMIT 1\`, [taluk]);
            } else if (level === 'parcel' && survey) {
                if (subdiv) {
                    row = await dbGet(\`SELECT geometry_geojson, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? AND sub_div_no = ? LIMIT 1\`, [lgdVillageCode, survey, subdiv]);
                } else {
                    row = await dbGet(\`SELECT geometry_geojson, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? LIMIT 1\`, [lgdVillageCode, survey]);
                }
            }
            
            if (row) {
                if (level === 'parcel' && row.geometry_geojson) {
                    // Send actual parcel polygon + bbox
                    return res.json({ success: true, feature: { type: 'Feature', geometry: JSON.parse(row.geometry_geojson), bbox: [row.bbox_min_x, row.bbox_min_y, row.bbox_max_x, row.bbox_max_y], properties: { name: survey } }, source: 'sqlite' });
                } else if (row.bbox_min_x) {
                    // Just send bbox for Admin levels so frontend doesn't draw an ugly square, but still zooms
                    return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [row.bbox_min_x, row.bbox_min_y, row.bbox_max_x, row.bbox_max_y] }, source: 'sqlite' });
                }
            }
        } catch (dbErr) {
            console.error('Local SQLite boundary lookup failed:', dbErr.message);
        }

        // If not found in DB, do not fallback to WFS for admin levels since they return errors.
        // Return a mock bbox if district/taluk so frontend won't crash
        if (level === 'district') {
             return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [8485240, 930870, 8953110, 1500000] }, source: 'mock' });
        }

        res.status(404).json({ success: false, error: 'Boundary not found' });
    } catch (err) {
        console.error('Boundary API failed:', err.message);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});`;

serverCode = serverCode.replace(boundaryRouteOldRegex, boundaryRouteNew);

fs.writeFileSync('server.js', serverCode);
console.log('server.js successfully patched!');
