const fs = require('fs');
let code = fs.readFileSync('server.js','utf8');
code = code.replace('// ─── Start Server', 
`app.get('/api/tngis/boundary', async (req, res) => {
    try {
        const { level, district, taluk, village, survey, subdiv } = req.query;
        if (!level) return res.status(400).json({ error: 'Level is required' });

        let typeName = '';
        let cql = '';
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
                row = await dbGet(\`SELECT geometry_geojson FROM administrative_boundaries WHERE level='village' AND lgd_code = ? LIMIT 1\`, [lgdVillageCode]);
            } else if (level === 'parcel' && survey) {
                if (subdiv) {
                    row = await dbGet(\`SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? AND sub_div_no = ? LIMIT 1\`, [lgdVillageCode, survey, subdiv]);
                } else {
                    row = await dbGet(\`SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? LIMIT 1\`, [lgdVillageCode, survey]);
                }
            }
            
            if (row && row.geometry_geojson) {
                return res.json({ success: true, feature: { type: 'Feature', geometry: JSON.parse(row.geometry_geojson), properties: { name: village || survey } }, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error('Local SQLite boundary lookup failed:', dbErr.message);
        }

        if (level === 'district') {
            typeName = 'tngis:district_boundary';
            cql = \`dname='\${district}'\`;
        } else if (level === 'taluk') {
            typeName = 'tngis:taluk_boundary';
            cql = \`tname='\${taluk}'\`;
        } else if (level === 'village') {
            typeName = 'tngis:village_boundary';
            cql = \`lgd_vcode='\${lgdVillageCode}'\`;
        } else if (level === 'parcel') {
            typeName = 'cadastral_data_wms:view_cadastral';
            cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
            if (subdiv) {
                typeName = 'cadastral_data_wms:view_fmb';
                cql += \` AND sub_division='\${subdiv}'\`;
            }
        } else {
            return res.status(400).json({ error: 'Invalid level' });
        }

        const data = await fetchTNGIS(typeName, null, cql);
        if (data && data.features && data.features.length > 0) {
            return res.json({ success: true, feature: data.features[0] });
        }
        res.status(404).json({ success: false, error: 'Boundary not found' });
    } catch (err) {
        console.error('Boundary WFS failed:', err.message);
        res.status(404).json({ success: false, error: 'Boundary not found or WFS timed out', fallback: true });
    }
});

// ─── Start Server`);
fs.writeFileSync('server.js', code);
