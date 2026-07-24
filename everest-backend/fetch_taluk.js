
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const district = "Dindigul";
const taluk = "Athoor";

const tnMaster = require("./data/tn_master.json");
const villages = tnMaster[district][taluk].filter(v => v.name !== "Aiyampalayam");

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m} mins ${s} secs`;
}

function formatETA(ms) {
    if (ms < 0) return "~0 secs";
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    if (m === 0) return `~${s} secs`;
    return `~${m} min ${s} secs`;
}

async function fetchSurveys(lgdCode) {
    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&propertyName=survey_number&cql_filter=lgd_village_code=\x27${lgdCode}\x27`;
    const r = await fetch(url);
    const data = await r.json();
    if (data && data.features) {
        return [...new Set(data.features.map(f => f.properties.survey_number).filter(Boolean))].sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
    }
    return [];
}

async function fetchSurveyFeatures(lgdCode, survey, retries = 3) {
    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&cql_filter=lgd_village_code=\x27${lgdCode}\x27%20AND%20survey_number=\x27${survey}\x27`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const r = await fetch(url, { timeout: 120000 });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return await r.json();
        } catch (e) {
            if (attempt === retries) return null;
            await new Promise(res => setTimeout(res, 2000 * attempt));
        }
    }
    return null;
}

async function main() {
    let globalStartTime = Date.now();
    for (const v of villages) {
        const vName = v.name;
        const vLgd = v.lgd_village_code;
        
        console.log(`\n======================================================`);
        console.log(`[*] Starting village: ${vName} (${vLgd})`);
        
        const startTime = Date.now();
        const startTimeStr = new Date(startTime).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"});
        
        let surveys = [];
        try {
            surveys = await fetchSurveys(vLgd);
        } catch(e) {
            console.log(`[!] Failed to get survey list for ${vName}: ${e.message}`);
            continue;
        }
        
        const totalSurveys = surveys.length;
        if (totalSurveys === 0) {
            console.log(`[DONE] ${vName}: 0/0 (100%) - Completed in 0 secs.`);
            continue;
        }

        const outDir = path.join(__dirname, "data", "geojson", district, taluk, vName);
        fs.mkdirSync(outDir, { recursive: true });

        let successCount = 0;
        let skippedCount = 0;
        let failedCount = 0;
        let processedCount = 0;
        const CONCURRENCY = 15;
        let lastSuccessTime = Date.now();
        
        // Check existing
        for (const survey of surveys) {
            const filePath = path.join(outDir, `${survey}.geojson`);
            if (fs.existsSync(filePath)) {
                successCount++;
                skippedCount++;
                processedCount++;
            }
        }
        
        if (skippedCount > 0) {
            console.log(`[INFO] Auto-Resume triggered: Found ${skippedCount} existing survey files. Resuming...`);
        }

        let lastReportTime = Date.now();

        for (let i = 0; i < totalSurveys; i += CONCURRENCY) {
            const batch = surveys.slice(i, i + CONCURRENCY);
            
            await Promise.all(batch.map(async (survey) => {
                const filePath = path.join(outDir, `${survey}.geojson`);
                if (fs.existsSync(filePath)) {
                    return;
                }
                
                try {
                    const data = await fetchSurveyFeatures(vLgd, survey);
                    if (data && data.features && data.features.length > 0) {
                        fs.writeFileSync(filePath, JSON.stringify(data));
                        successCount++;
                        lastSuccessTime = Date.now();
                    } else {
                        failedCount++;
                        console.log(`[WARN] Survey ${survey} failed or empty after retries. Skipping.`);
                    }
                } catch(e) {
                    failedCount++;
                    console.log(`[ERROR] Survey ${survey} fetch error: ${e.message}. Skipping.`);
                }
                processedCount++;
            }));
            
            const now = Date.now();
            if (now - lastReportTime > 60000 || processedCount === totalSurveys) {
                lastReportTime = now;
                const elapsedMs = now - startTime;
                const percent = Math.floor((processedCount / totalSurveys) * 100);
                
                const processedThisSession = processedCount - skippedCount;
                let etaMs = -1;
                if (processedThisSession > 0) {
                    const msPerSurvey = elapsedMs / processedThisSession;
                    const remainingSurveys = totalSurveys - processedCount;
                    etaMs = msPerSurvey * remainingSurveys;
                }
                
                console.log(`\n?? CURRENT VILLAGE IN PROGRESS:`);
                console.log(`* Village Name: ${vName}`);
                console.log(`* Total Survey Count: ${totalSurveys} Surveys`);
                console.log(`* Processed Progress: ${processedCount}/${totalSurveys} (${percent}%) [Success: ${successCount}, Failed: ${failedCount}]`);
                console.log(`* Start Time & Duration Elapsed: Started ${startTimeStr} | Elapsed: ${formatTime(elapsedMs)}`);
                console.log(`* Estimated Time Remaining (ETA): ${formatETA(etaMs)}`);
                console.log(`* Status: IN PROGRESS\n`);
                
                fs.writeFileSync(path.join(__dirname, "sync_status.json"), JSON.stringify({
                    village: vName,
                    processedCount,
                    successCount,
                    failedCount,
                    totalSurveys,
                    percent,
                    elapsed: formatTime(elapsedMs),
                    eta: formatETA(etaMs),
                    startTimeStr,
                    lastSuccessTime
                }));
            }
        }
        
        const totalElapsed = Date.now() - startTime;
        console.log(`[DONE] ${vName}: Processed ${processedCount}/${totalSurveys} (Success: ${successCount}, Failed: ${failedCount}) - Completed in ${formatTime(totalElapsed)}.`);
        fs.writeFileSync(path.join(__dirname, "sync_status.json"), JSON.stringify({
            village: vName,
            processedCount,
            successCount,
            failedCount,
            totalSurveys,
            percent: 100,
            elapsed: formatTime(totalElapsed),
            eta: "0 secs",
            status: "DONE",
            lastSuccessTime
        }));
    }
}

main().catch(console.error);

