const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

const sqliteImport = `
const { insertMap, getAllMaps, getMapById, renameMap, deleteMap, updateMap, cleanStaleDrafts, saveMapMetadata } = require('./db');
const sqlite3 = require('sqlite3').verbose();

// Initialize Spatial Cache DB
const spatialDbPath = path.join(__dirname, 'data', 'spatial_cache.db');
const spatialDb = new sqlite3.Database(spatialDbPath, (err) => {
    if (err) console.error("Failed to connect to spatial_cache.db:", err);
    else console.log("Connected to spatial_cache.db");
});

// Helper for DB queries
const dbAll = (query, params) => new Promise((resolve, reject) => {
    spatialDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});
const dbGet = (query, params) => new Promise((resolve, reject) => {
    spatialDb.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});
`;

code = code.replace(
    "const { insertMap, getAllMaps, getMapById, renameMap, deleteMap, updateMap, cleanStaleDrafts, saveMapMetadata } = require('./db');",
    sqliteImport.trim()
);

// Update /api/tngis/survey
code = code.replace(
    /if \(surveyCache\[lgdVillageCode\]\) \{[\s\S]*?let cql = `lgd_village_code='\$\{lgdVillageCode\}'`;/m,
    `if (surveyCache[lgdVillageCode]) {
            return res.json({ success: true, data: surveyCache[lgdVillageCode] });
        }
        
        // Try Local Spatial DB first for instant response
        try {
            const rows = await dbAll('SELECT DISTINCT survey_no FROM cadastral_parcels WHERE lgd_village_code = ?', [lgdVillageCode]);
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
            console.error("Local SQLite survey lookup failed:", dbErr.message);
        }

        let cql = \`lgd_village_code='\${lgdVillageCode}'\`;`
);


// Update /api/tngis/subdivisions
code = code.replace(
    /if \(subdivCache\[cacheKey\]\) \{[\s\S]*?let cql = `lgd_village_code='\$\{lgdVillageCode\}' AND survey_number='\$\{survey\}'`;/m,
    `if (subdivCache[cacheKey]) {
            return res.json({ success: true, data: subdivCache[cacheKey] });
        }
        
        // Try Local Spatial DB first for instant response
        try {
            const rows = await dbAll('SELECT DISTINCT sub_div_no FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ?', [lgdVillageCode, survey]);
            if (rows && rows.length > 0) {
                const subdivs = rows.map(r => r.sub_div_no).filter(Boolean).sort();
                subdivCache[cacheKey] = subdivs;
                return res.json({ success: true, data: subdivs, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error("Local SQLite subdiv lookup failed:", dbErr.message);
        }

        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;`
);


// Update /api/tngis/feature
code = code.replace(
    /let cql = `lgd_village_code='\$\{lgdVillageCode\}' AND survey_number='\$\{survey\}'`;[\s\S]*?if \(subdiv\) \{/m,
    `// Try Local Spatial DB first for instant map fly-to
        try {
            let row;
            if (subdiv) {
                row = await dbGet('SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? AND sub_div_no = ? LIMIT 1', [lgdVillageCode, survey, subdiv]);
            } else {
                row = await dbGet('SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? LIMIT 1', [lgdVillageCode, survey]);
            }
            if (row && row.geometry_geojson) {
                return res.json({ success: true, feature: { type: "Feature", geometry: JSON.parse(row.geometry_geojson), properties: { survey_number: survey, sub_division: subdiv } }, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error("Local SQLite feature lookup failed:", dbErr.message);
        }

        let cql = \`lgd_village_code='\${lgdVillageCode}' AND survey_number='\${survey}'\`;
        
        if (subdiv) {`
);

// Update /api/tngis/boundary
code = code.replace(
    /let typeName = '';\s*let cql = '';/m,
    `let typeName = '';
        let cql = '';
        let lgdVillageCode = village;
        
        if (level === 'parcel' || level === 'village') {
            if (taluk) {
                const mappedCode = villageLgdMap.get(\`\${taluk}|\${village}\`);
                if (mappedCode) lgdVillageCode = mappedCode;
            }
        }

        // Try Local Spatial DB first for boundaries
        try {
            let row;
            if (level === 'village') {
                row = await dbGet(\`SELECT geometry_geojson FROM administrative_boundaries WHERE level='village' AND lgd_code = ? LIMIT 1\`, [lgdVillageCode]);
            } else if (level === 'parcel') {
                if (subdiv) {
                    row = await dbGet(\`SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? AND sub_div_no = ? LIMIT 1\`, [lgdVillageCode, survey, subdiv]);
                } else {
                    row = await dbGet(\`SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? LIMIT 1\`, [lgdVillageCode, survey]);
                }
            }
            
            if (row && row.geometry_geojson) {
                return res.json({ success: true, feature: { type: "Feature", geometry: JSON.parse(row.geometry_geojson), properties: { name: village || survey } }, source: 'sqlite' });
            }
        } catch (dbErr) {
            console.error("Local SQLite boundary lookup failed:", dbErr.message);
        }`
);

fs.writeFileSync('server.js', code);
console.log('Patched server.js');
