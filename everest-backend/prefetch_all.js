const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const http = require("http");
const https = require("https");

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const tnMaster = require("./data/tn_master.json").Dindigul;

async function fetchSurveys(lgdCode, retries = 3) {
    const cacheFile = path.join(__dirname, "data", `surveys_${lgdCode}.json`);
    if (fs.existsSync(cacheFile)) return true;

    const url = `https://tngis.tn.gov.in/app/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=cadastral_data_wms:view_fmb&outputFormat=application/json&srsName=EPSG:3857&propertyName=survey_number&cql_filter=lgd_village_code=\x27${lgdCode}\x27`;
    
    for (let i = 1; i <= retries; i++) {
        try {
            const r = await fetch(url, { timeout: 120000, agent: url.startsWith("https") ? httpsAgent : httpAgent });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            if (data && data.features) {
                const list = [...new Set(data.features.map(f => f.properties.survey_number).filter(Boolean))].sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
                fs.writeFileSync(cacheFile, JSON.stringify(list));
                return true;
            }
        } catch(e) {
            if (i === retries) {
                console.log(`[FAIL] Could not fetch survey list for ${lgdCode}: ${e.message}`);
                return false;
            }
            await new Promise(res => setTimeout(res, 500 * i));
        }
    }
    return false;
}

async function main() {
    let tasks = [];
    Object.keys(tnMaster).forEach(taluk => {
        const vills = tnMaster[taluk] || [];
        vills.forEach(v => {
            const cacheFile = path.join(__dirname, "data", `surveys_${v.lgd_village_code}.json`);
            if (!fs.existsSync(cacheFile)) {
                tasks.push({ taluk, name: v.name, code: v.lgd_village_code });
            }
        });
    });

    console.log(`[PREFETCH] Found ${tasks.length} villages missing survey cache files. Fetching in parallel (20 workers)...`);

    let index = 0;
    let completed = 0;
    const CONCURRENCY = 20;

    const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (index < tasks.length) {
            const item = tasks[index++];
            const ok = await fetchSurveys(item.code);
            completed++;
            if (completed % 20 === 0 || completed === tasks.length) {
                console.log(`[PREFETCH PROGRESS] ${completed}/${tasks.length} survey lists cached (${Math.floor((completed/tasks.length)*100)}%)`);
            }
        }
    });

    await Promise.all(workers);
    console.log(`[PREFETCH DONE] All possible survey lists have been cached to disk!`);
}

main().catch(console.error);
