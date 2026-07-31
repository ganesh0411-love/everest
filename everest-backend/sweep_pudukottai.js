const fs = require("fs");
const path = require("path");

const lgdCode = "635248";
const villageName = "Pudukottai (R)";
const district = "Dindigul";
const taluk = "Gujiliamparai";
const CONCURRENCY = 10;

async function fetchSurveyFeatures(lgdCode, survey, retries = 3) {
    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&cql_filter=lgd_village_code=\x27${lgdCode}\x27%20AND%20survey_number=\x27${survey}\x27`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const r = await fetch(url, { timeout: 120000 });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return await r.json();
        } catch (e) {
            if (attempt === retries) return null;
            await new Promise(res => setTimeout(res, 300 * attempt));
        }
    }
    return null;
}

async function main() {
    console.log(`[*] Starting sweep for ${villageName} (${lgdCode}) in Taluk: ${taluk}...`);
    const cacheFile = path.join(__dirname, "data", `surveys_${lgdCode}.json`);
    if (!fs.existsSync(cacheFile)) {
        console.error(`[ERROR] Cache file ${cacheFile} not found!`);
        return;
    }
    const surveys = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    const totalSurveys = surveys.length;
    console.log(`[*] Total surveys in ${villageName}: ${totalSurveys}`);

    const outDir = path.join(__dirname, "data", "geojson", district, taluk, villageName);
    fs.mkdirSync(outDir, { recursive: true });

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let processedCount = 0;

    for (const survey of surveys) {
        const filePath = path.join(outDir, `${survey}.geojson`);
        if (fs.existsSync(filePath)) {
            successCount++;
            skippedCount++;
            processedCount++;
        }
    }

    console.log(`[*] Found ${skippedCount} existing files. Extracting remaining ${totalSurveys - skippedCount} surveys...`);
    const startTime = Date.now();
    let lastReportTime = Date.now();
    let surveyIndex = 0;

    const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (surveyIndex < totalSurveys) {
            const currentIndex = surveyIndex++;
            const survey = surveys[currentIndex];
            const filePath = path.join(outDir, `${survey}.geojson`);
            
            if (fs.existsSync(filePath)) {
                continue;
            }
            
            try {
                const data = await fetchSurveyFeatures(lgdCode, survey);
                if (data && data.features && data.features.length > 0) {
                    fs.writeFileSync(filePath, JSON.stringify(data));
                    successCount++;
                } else {
                    failedCount++;
                    console.log(`[WARN] Survey ${survey} failed or empty.`);
                }
            } catch(e) {
                failedCount++;
                console.log(`[ERROR] Survey ${survey} error: ${e.message}`);
            }
            processedCount++;
            
            const now = Date.now();
            if (now - lastReportTime > 5000 || processedCount === totalSurveys) {
                lastReportTime = now;
                const elapsedSecs = Math.floor((now - startTime) / 1000);
                const percent = Math.floor((processedCount / totalSurveys) * 100);
                console.log(`[SWEEP PROGRESS] ${villageName}: ${processedCount}/${totalSurveys} (${percent}%) | Elapsed: ${elapsedSecs}s | Success: ${successCount}, Failed: ${failedCount}`);
            }
        }
    });

    await Promise.all(workers);
    console.log(`\n[DONE] ${villageName} Sweep Completed! Final: ${successCount}/${totalSurveys} (Success: ${successCount}, Failed: ${failedCount})`);
}

main().catch(e => console.error(e));
