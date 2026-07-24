
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const district = "Dindigul";
const taluk = "Athoor";
const village = "Aiyampalayam";
const LGD_VILLAGE_CODE = "635433";

async function fetchSurveys() {
    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&propertyName=survey_number&cql_filter=lgd_village_code=\x27${LGD_VILLAGE_CODE}\x27`;
    const r = await fetch(url);
    const data = await r.json();
    if (data && data.features) {
        return [...new Set(data.features.map(f => f.properties.survey_number).filter(Boolean))].sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
    }
    return [];
}

async function fetchSurveyFeatures(survey) {
    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&cql_filter=lgd_village_code=\x27${LGD_VILLAGE_CODE}\x27%20AND%20survey_number=\x27${survey}\x27`;
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
}

async function main() {
    console.log(`[*] Fetching unique surveys for ${village} (${LGD_VILLAGE_CODE}) from WFS directly...`);
    const surveys = await fetchSurveys();
    console.log(`[*] Found ${surveys.length} surveys for ${village}.`);
    
    if (surveys.length === 0) return;

    const outDir = path.join(__dirname, "data", "geojson", district, taluk, village);
    fs.mkdirSync(outDir, { recursive: true });

    let successCount = 0;
    const CONCURRENCY = 15;
    
    for (let i = 0; i < surveys.length; i += CONCURRENCY) {
        const batch = surveys.slice(i, i + CONCURRENCY);
        console.log(`  -> Processing batch ${Math.floor(i/CONCURRENCY) + 1} / ${Math.ceil(surveys.length/CONCURRENCY)} (Surveys: ${batch.join(", ")})`);
        
        await Promise.all(batch.map(async (survey) => {
            try {
                const data = await fetchSurveyFeatures(survey);
                if (data && data.features && data.features.length > 0) {
                    const filePath = path.join(outDir, `${survey}.geojson`);
                    fs.writeFileSync(filePath, JSON.stringify(data));
                    successCount++;
                } else {
                    console.log(`     [!] Failed to get feature for ${survey}`);
                }
            } catch(e) {
                console.log(`     [!] Error for ${survey}: ${e.message}`);
            }
        }));
    }
    
    console.log(`\n[OK] Completed! Fetched and saved ${successCount}/${surveys.length} surveys to ${outDir}`);
}

main().catch(console.error);

