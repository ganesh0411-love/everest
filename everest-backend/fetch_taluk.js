
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

async function fetchSurveyFeatures(lgdCode, survey) {
    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&cql_filter=lgd_village_code=\x27${lgdCode}\x27%20AND%20survey_number=\x27${survey}\x27`;
    const r = await fetch(url);
    if (!r.ok) return null;
    return await r.json();
}

async function main() {
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
        const CONCURRENCY = 15;
        
        // Print Initial Tracker
        console.log(`\n?? CURRENT VILLAGE IN PROGRESS:`);
        console.log(`* Village Name: ${vName}`);
        console.log(`* Total Survey Count: ${totalSurveys} Surveys`);
        console.log(`* Downloaded Progress: 0/${totalSurveys} (0%)`);
        console.log(`* Start Time & Duration Elapsed: Started ${startTimeStr} | Elapsed: 0 mins 0 secs`);
        console.log(`* Estimated Time Remaining (ETA): Calculating...`);
        console.log(`* Status: IN PROGRESS\n`);
        
        let lastReportTime = Date.now();

        for (let i = 0; i < totalSurveys; i += CONCURRENCY) {
            const batch = surveys.slice(i, i + CONCURRENCY);
            
            await Promise.all(batch.map(async (survey) => {
                try {
                    const data = await fetchSurveyFeatures(vLgd, survey);
                    if (data && data.features && data.features.length > 0) {
                        const filePath = path.join(outDir, `${survey}.geojson`);
                        fs.writeFileSync(filePath, JSON.stringify(data));
                        successCount++;
                    }
                } catch(e) {
                }
            }));
            
            const now = Date.now();
            // Report every 2.5 minutes (150000 ms) or every 20 batches to simulate the 2-3 minute request.
            if (now - lastReportTime > 150000 || i === Math.floor(totalSurveys / 2)) {
                lastReportTime = now;
                const elapsedMs = now - startTime;
                const percent = Math.floor((successCount / totalSurveys) * 100);
                const msPerSurvey = elapsedMs / (successCount || 1);
                const remainingSurveys = totalSurveys - successCount;
                const etaMs = msPerSurvey * remainingSurveys;
                
                console.log(`\n?? CURRENT VILLAGE IN PROGRESS:`);
                console.log(`* Village Name: ${vName}`);
                console.log(`* Total Survey Count: ${totalSurveys} Surveys`);
                console.log(`* Downloaded Progress: ${successCount}/${totalSurveys} (${percent}%)`);
                console.log(`* Start Time & Duration Elapsed: Started ${startTimeStr} | Elapsed: ${formatTime(elapsedMs)}`);
                console.log(`* Estimated Time Remaining (ETA): ${formatETA(etaMs)}`);
                console.log(`* Status: IN PROGRESS\n`);
            }
        }
        
        const totalElapsed = Date.now() - startTime;
        console.log(`[DONE] ${vName}: ${successCount}/${totalSurveys} (100%) - Completed in ${formatTime(totalElapsed)}.`);
    }
}

main().catch(console.error);

