const fs = require('fs');
const path = require('path');

/**
 * Usage: node ingest_master.js path/to/tamilnadu_villages.csv
 * Expects a CSV with columns: District, Taluk, Village
 */
function ingestCSV(csvPath) {
    if (!fs.existsSync(csvPath)) {
        console.error(`File not found: ${csvPath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const master = {};
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 3) {
            const district = parts[0].trim().replace(/^"|"$/g, '');
            const taluk = parts[1].trim().replace(/^"|"$/g, '');
            const village = parts[2].trim().replace(/^"|"$/g, '');
            
            if (!master[district]) master[district] = {};
            if (!master[district][taluk]) master[district][taluk] = [];
            
            if (!master[district][taluk].includes(village)) {
                master[district][taluk].push(village);
            }
        }
    }
    
    const outPath = path.join(__dirname, 'data', 'tn_master.json');
    fs.writeFileSync(outPath, JSON.stringify(master, null, 2));
    console.log(`Successfully ingested dataset into ${outPath}`);
    console.log(`Please restart the Node.js backend to apply the changes.`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log("Please provide the path to the CSV file.");
    console.log("Example: node ingest_master.js tn_villages_kaggle.csv");
} else {
    ingestCSV(args[0]);
}
