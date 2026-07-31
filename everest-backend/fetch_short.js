const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000';
const district = 'Dindigul';
const taluk = 'Athoor';
const village = 'Aiyampalayam';

async function fetchSurveys() {
    console.log(`[*] Fetching Surveys for ${village}...`);
    const url = `${API_BASE}/api/tngis/survey?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&village=${encodeURIComponent(village)}`;
    const r = await fetch(url);
    const data = await r.json();
    return data.data || [];
}

async function fetchFeature(survey) {
    const url = `${API_BASE}/api/tngis/feature?district=${encodeURIComponent(district)}&taluk=${encodeURIComponent(taluk)}&village=${encodeURIComponent(village)}&survey=${encodeURIComponent(survey)}`;
    const r = await fetch(url);
    const data = await r.json();
    return data || null;
}

async function main() {
    const surveys = await fetchSurveys();
    console.log(`[*] Found ${surveys.length} surveys for ${village}.`);
    
    if (surveys.length === 0) {
        console.log("No surveys found. Exiting.");
        return;
    }

    const outDir = path.join(__dirname, 'data', 'geojson', district, taluk, village);
    fs.mkdirSync(outDir, { recursive: true });

    let successCount = 0;
    let i=0; for (const survey of surveys) { if(i++>5) break;
        console.log(`  -> Fetching Feature for Survey ${survey}...`);
        const featureData = await fetchFeature(survey);
        
        if (featureData && featureData.feature) {
            const filePath = path.join(outDir, `${survey}.geojson`);
            fs.writeFileSync(filePath, JSON.stringify({ type: 'FeatureCollection', features: [featureData.feature] }));
            successCount++;
        } else {
            console.log(`     [!] Failed to get feature for ${survey}`);
        }
    }
    
    console.log(`\n[OK] Completed! Fetched and saved ${successCount}/${surveys.length} surveys to ${outDir}`);
}

main().catch(console.error);
