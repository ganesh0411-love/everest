const fs = require('fs');
const path = require('path');
const tnMaster = require('./data/tn_master.json');

const district = "Theni";
const taluks = tnMaster[district] || {};

let report = "";
report += `### 📊 IMMEDIATE SYSTEM RECOVERY & STATUS REPORT\n\n`;

let totalDistrictVillages = 0;
let processedDistrictVillages = 0;
let totalDistrictSurveys = 0;

let talukRows = [];

for (const taluk in taluks) {
    const villages = taluks[taluk];
    totalDistrictVillages += villages.length;
    
    let processedTalukVillages = 0;
    let talukSurveys = 0;
    
    const talukDir = path.join(__dirname, "data", "geojson", district, taluk);
    if (fs.existsSync(talukDir)) {
        for (const v of villages) {
            const vDir = path.join(talukDir, v.name);
            if (fs.existsSync(vDir) && fs.statSync(vDir).isDirectory()) {
                const files = fs.readdirSync(vDir).filter(f => f.endsWith('.geojson'));
                const isRF = fs.existsSync(path.join(vDir, "0_surveys_RF.json"));
                if (files.length > 0 || isRF) {
                    processedTalukVillages++;
                    talukSurveys += files.length;
                }
            }
        }
    }
    
    processedDistrictVillages += processedTalukVillages;
    totalDistrictSurveys += talukSurveys;
    
    let status = processedTalukVillages === villages.length ? "✅ Completed" : (processedTalukVillages > 0 ? "🔄 In Progress" : "⏳ Pending");
    let remarks = processedTalukVillages > 0 ? (processedTalukVillages === villages.length ? "All villages fetched" : "Fetching...") : "Queued";
    
    // Check if the taluk is fully RF Excluded or mixed
    if (processedTalukVillages === villages.length && talukSurveys === 0 && villages.length > 0) {
        status = "✅ Completed (RF Excluded)";
    }
    
    talukRows.push(`| ${taluk} | ${villages.length} | ${processedTalukVillages} | ${talukSurveys} | ${status} | ${remarks} |`);
}

let syncStatus = {};
try {
    syncStatus = JSON.parse(fs.readFileSync(path.join(__dirname, "sync_status.json"), "utf8"));
} catch(e) {}

report += `#### 🌍 Global District Breakdown\n`;
report += `- **Target District:** ${district}\n`;
report += `- **Total Villages (${district}):** ${totalDistrictVillages}\n`;
report += `- **Processed Villages:** ${processedDistrictVillages} / ${totalDistrictVillages}\n`;
report += `- **Total Surveys Extracted:** ~${totalDistrictSurveys}\n\n`;

report += `#### 📍 Current Village Breakdown (Running Task)\n`;
if (syncStatus.taluk) {
    report += `**Current Village:** ${syncStatus.village} (${syncStatus.processedCount} / ${syncStatus.totalSurveys}) | **Currently Extracting:** Survey No. ${syncStatus.currentSurvey || 'N/A'}\n\n`;
    report += `- **Taluk:** ${syncStatus.taluk}\n`;
    report += `- **Progress:** ${syncStatus.percent}%\n`;
    report += `- **Success:** ${syncStatus.successCount} | **Failed:** ${syncStatus.failedCount}\n`;
    report += `- **ETA:** ${syncStatus.eta} | **Elapsed:** ${syncStatus.elapsed}\n\n`;
} else {
    report += `- *No current village data found in sync_status.json*\n\n`;
}

report += `#### 📋 Full Progress Table\n`;
report += `| Taluk | Total Villages | Processed Villages | Surveys Extracted | Status | Remarks |\n`;
report += `|-------|----------------|--------------------|-------------------|--------|---------|\n`;
report += talukRows.join("\n") + "\n\n";

const now = new Date();
const next = new Date(now.getTime() + 5 * 60000);
report += `#### ⏱️ Timing Details\n`;
report += `- **Report Generated:** ${now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)\n`;
report += `- **Next Expected Report:** ${next.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} (IST)\n`;

fs.writeFileSync('report_out.txt', report);
console.log("Report generated successfully!");
