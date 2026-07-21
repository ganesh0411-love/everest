const fs = require('fs');
const path = require('path');

function ingestCSV(csvPath) {
    if (!fs.existsSync(csvPath)) {
        console.error(`File not found: ${csvPath}`);
        process.exit(1);
    }
    
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const master = {};
    
    // Start parsing from line 5 (index 4) due to headers
    for (let i = 4; i < lines.length; i++) {
        const line = lines[i];
        if (!line.includes(',')) continue;
        
        // Handle CSV split correctly
        const parts = line.split(',');
        
        // Col indices: 
        // 2: District Name
        // 4: Sub-District Name (Taluk)
        // 5: Village Code (lgd_village_code)
        // 7: Village Name
        
        if (parts.length > 7) {
            const district = parts[2].trim().replace(/^"|"$/g, '');
            const taluk = parts[4].trim().replace(/^"|"$/g, '');
            const lgd_village_code = parts[5].trim().replace(/^"|"$/g, '');
            const village = parts[7].trim().replace(/^"|"$/g, '');
            
            // Skip rows that don't have valid data
            if (!district || !taluk || !village || !lgd_village_code) continue;
            
            if (!master[district]) master[district] = {};
            if (!master[district][taluk]) master[district][taluk] = [];
            
            // Check if village already exists
            const existing = master[district][taluk].find(v => v.name === village);
            if (!existing) {
                master[district][taluk].push({
                    name: village,
                    lgd_village_code: lgd_village_code
                });
            }
        }
    }
    
    // Sort everything alphabetically
    const sortedMaster = {};
    Object.keys(master).sort().forEach(dist => {
        sortedMaster[dist] = {};
        Object.keys(master[dist]).sort().forEach(tal => {
            sortedMaster[dist][tal] = master[dist][tal].sort((a, b) => a.name.localeCompare(b.name));
        });
    });
    
    const outPath = path.join(__dirname, 'data', 'tn_master.json');
    fs.writeFileSync(outPath, JSON.stringify(sortedMaster, null, 2));
    
    let villageCount = 0;
    Object.values(sortedMaster).forEach(dist => {
        Object.values(dist).forEach(taluk => {
            villageCount += taluk.length;
        });
    });
    
    console.log(`Successfully ingested ${Object.keys(sortedMaster).length} districts and ${villageCount} villages into ${outPath}`);
}

const args = process.argv.slice(2);
if (args.length === 0) {
    ingestCSV(path.join(__dirname, 'data', 'tn_lgd_master.csv'));
} else {
    ingestCSV(args[0]);
}
