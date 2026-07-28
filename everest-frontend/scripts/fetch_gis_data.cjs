const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const API_BASE = 'https://everest-backend-f9nt.onrender.com';
const MAX_RETRIES = 3;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await sleep(1000 + Math.random() * 1500);
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.log(`  [!] Error fetching ${url}: ${e.message}. Retrying ${attempt + 1}/${retries}...`);
            await sleep(Math.pow(2, attempt) * 1000);
        }
    }
    console.log(`  [X] Failed to fetch ${url} after ${retries} attempts.`);
    return null;
}

function setupDb(dbPath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) reject(err);
        });
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS villages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                district TEXT,
                taluk TEXT,
                village TEXT,
                status TEXT DEFAULT 'PENDING',
                UNIQUE(district, taluk, village)
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS surveys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                village_id INTEGER,
                survey_no TEXT,
                geojson TEXT,
                UNIQUE(village_id, survey_no),
                FOREIGN KEY(village_id) REFERENCES villages(id)
            )`, () => resolve(db));
        });
    });
}

function runDb(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function getDb(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function main() {
    const dryRunDistrict = process.argv.includes('--dry-run-district') ? process.argv[process.argv.indexOf('--dry-run-district') + 1] : null;

    if (!fs.existsSync('data')) fs.mkdirSync('data');
    if (!fs.existsSync('data/geojson')) fs.mkdirSync('data/geojson');
    
    const db = await setupDb('data/completed_villages.db');
    
    console.log("[*] Fetching Districts...");
    let districtsData = await fetchJson(`${API_BASE}/api/tngis/districts`);
    if (!districtsData || !districtsData.data) return;
    
    let districts = districtsData.data;
    if (dryRunDistrict) {
        districts = districts.filter(d => d.toLowerCase() === dryRunDistrict.toLowerCase());
    }
    console.log(`[*] Found ${districts.length} district(s) to process.`);
    
    for (const district of districts) {
        console.log(`[*] Fetching Taluks for ${district}...`);
        const taluksData = await fetchJson(`${API_BASE}/api/tngis/taluks?district=${encodeURIComponent(district)}`);
        const taluks = taluksData ? (taluksData.data || []) : [];
        
        for (const taluk of taluks) {
            const villagesData = await fetchJson(`${API_BASE}/api/tngis/villages?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}`);
            const villages = villagesData ? (villagesData.data || []) : [];
            
            for (const village of villages) {
                await runDb(db, `INSERT OR IGNORE INTO villages (district, taluk, village, status) VALUES (?, ?, ?, 'PENDING')`, [district, taluk, village]);
            }
            // Just for dry run testing, let's limit to 1 taluk and 2 villages so it finishes fast.
            break;
        }
    }

    const pendingVillages = await getDb(db, `SELECT id, district, taluk, village FROM villages WHERE status = 'PENDING' LIMIT 2`);
    console.log(`[*] Found ${pendingVillages.length} pending villages to process.`);
    
    for (const { id: v_id, district, taluk, village } of pendingVillages) {
        console.log(`  -> Processing Village: ${village} (${taluk}, ${district})`);
        const surveysData = await fetchJson(`${API_BASE}/api/tngis/survey?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&village=${encodeURIComponent(village)}`);
        const surveys = surveysData ? (surveysData.data || []) : [];
        
        if (surveys.length === 0) {
            console.log(`     [!] No surveys found for ${village}. Marking as DONE.`);
            await runDb(db, `UPDATE villages SET status = 'DONE' WHERE id = ?`, [v_id]);
            continue;
        }
        
        let success = true;
        // Limit to 2 surveys for dry run test speed
        for (const survey of surveys.slice(0, 2)) {
            const existing = await getDb(db, `SELECT id FROM surveys WHERE village_id = ? AND survey_no = ?`, [v_id, survey]);
            if (existing.length > 0) continue;
            
            console.log(`     -> Fetching Survey ${survey}...`);
            const featureData = await fetchJson(`${API_BASE}/api/tngis/feature?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&village=${encodeURIComponent(village)}&survey=${encodeURIComponent(survey)}`);
            
            if (featureData) {
                await runDb(db, `INSERT INTO surveys (village_id, survey_no, geojson) VALUES (?, ?, ?)`, [v_id, survey, JSON.stringify(featureData)]);
                
                const dirPath = path.join('data', 'geojson', district, taluk, village);
                fs.mkdirSync(dirPath, { recursive: true });
                fs.writeFileSync(path.join(dirPath, `${survey}.geojson`), JSON.stringify(featureData));
            } else {
                success = false;
                break;
            }
        }
        
        if (success) {
            await runDb(db, `UPDATE villages SET status = 'DONE' WHERE id = ?`, [v_id]);
            console.log(`  [OK] Completed Village: ${village}`);
        } else {
            console.log(`  [!] Pausing on Village: ${village} due to errors. Can resume later.`);
            break;
        }
    }
    console.log("Dry run complete.");
    db.close();
}

main().catch(console.error);
