const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bbox = require('@turf/bbox').default;

const DB_PATH = path.join(__dirname, '../data/spatial_cache.db');
const TNGIS_URL = 'https://tngis.tn.gov.in/app/wfs';

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS administrative_boundaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT,
        name TEXT,
        lgd_code TEXT,
        parent_code TEXT,
        bbox_min_x REAL,
        bbox_min_y REAL,
        bbox_max_x REAL,
        bbox_max_y REAL,
        geometry_geojson TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS cadastral_parcels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lgd_village_code TEXT,
        survey_no TEXT,
        sub_div_no TEXT,
        bbox_min_x REAL,
        bbox_min_y REAL,
        bbox_max_x REAL,
        bbox_max_y REAL,
        geometry_geojson TEXT
    )`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_admin_level_name ON administrative_boundaries(level, name)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_parcel_village ON cadastral_parcels(lgd_village_code)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_parcel_village_survey ON cadastral_parcels(lgd_village_code, survey_no)`);
});

const fetchWFS = async (typeName, cqlFilter) => {
    let url = `${TNGIS_URL}?service=WFS&version=1.0.0&request=GetFeature&typeName=${typeName}&outputFormat=application/json&srsName=EPSG:3857&count=100000`;
    if (cqlFilter) url += `&CQL_FILTER=${encodeURIComponent(cqlFilter)}`;
    
    console.log(`Fetching ${typeName} - ${cqlFilter || 'ALL'}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${typeName}: ${res.statusText}`);
    const data = await res.json();
    return data.features || [];
};

const ingest = async () => {
    console.log("Starting Spatial Ingestion for Test Region (Sevugampatti Parcels Only)...");

    const vcode = '932466'; // Sevugampatti from tn_master.json
    
    try {
        const parcels = await fetchWFS('cadastral_data_wms:view_fmb', `lgd_village_code='${vcode}' OR village_code='${vcode}' OR village_code='275685' OR lgd_village_code='275685'`);
        console.log(`Fetched ${parcels.length} parcels for Sevugampatti.`);
        
        let inserted = 0;
        let vMinX = Infinity, vMinY = Infinity, vMaxX = -Infinity, vMaxY = -Infinity;

        db.serialize(() => {
            // Delete existing to avoid duplicates if rerunning
            db.run(`DELETE FROM cadastral_parcels WHERE lgd_village_code = ?`, [vcode]);
            db.run(`DELETE FROM administrative_boundaries WHERE lgd_code = ?`, [vcode]);

            const stmt = db.prepare(`INSERT INTO cadastral_parcels (lgd_village_code, survey_no, sub_div_no, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y, geometry_geojson) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
            for (const p of parcels) {
                const survey = p.properties.survey_no || p.properties.survey_number;
                const subdiv = p.properties.sub_division || p.properties.sub_division_no || p.properties.subdiv_no || '';
                if (!survey) continue;
                const [minX, minY, maxX, maxY] = bbox(p);
                
                // Accumulate village bounds
                if (minX < vMinX) vMinX = minX;
                if (minY < vMinY) vMinY = minY;
                if (maxX > vMaxX) vMaxX = maxX;
                if (maxY > vMaxY) vMaxY = maxY;

                stmt.run(vcode, survey.toString(), subdiv.toString(), minX, minY, maxX, maxY, JSON.stringify(p.geometry));
                inserted++;
            }
            stmt.finalize();
            console.log(`Ingested ${inserted} cadastral parcels for Sevugampatti.`);

            // Insert a pseudo-village boundary using the bounding box
            if (inserted > 0) {
                const villagePoly = {
                    type: "Polygon",
                    coordinates: [[[vMinX, vMinY], [vMaxX, vMinY], [vMaxX, vMaxY], [vMinX, vMaxY], [vMinX, vMinY]]]
                };
                db.run(`INSERT INTO administrative_boundaries (level, name, lgd_code, parent_code, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y, geometry_geojson) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
                    ['village', 'Sevugampatti', vcode, 'Nilakkottai', vMinX, vMinY, vMaxX, vMaxY, JSON.stringify(villagePoly)]
                );
                console.log(`Ingested pseudo-village boundary for Sevugampatti.`);
            }
        });
    } catch (err) {
        console.error("Failed to fetch parcels", err);
    }

    setTimeout(() => {
        db.close();
        console.log("Spatial Ingestion Complete.");
    }, 10000); // give enough time for IO
};

ingest().catch(console.error);
