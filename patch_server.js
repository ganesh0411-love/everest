const fs = require('fs');
let code = fs.readFileSync('everest-backend/server.js', 'utf8');

const patchCode = `
            if (row) {
                if (row.bbox_min_x) {
                    // Just send bbox for Admin levels so frontend doesn't draw an ugly square, but still zooms
                    return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [row.bbox_min_x, row.bbox_min_y, row.bbox_max_x, row.bbox_max_y] }, source: 'sqlite' });
                }
            } else if (level === 'village' && lgdVillageCode) {
                // Compute from cadastral_parcels if administrative_boundaries is missing
                const agg = await dbGet(\`SELECT min(bbox_min_x) as minX, min(bbox_min_y) as minY, max(bbox_max_x) as maxX, max(bbox_max_y) as maxY FROM cadastral_parcels WHERE lgd_village_code = ?\`, [lgdVillageCode]);
                if (agg && agg.minX) {
                    return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [agg.minX, agg.minY, agg.maxX, agg.maxY] }, source: 'sqlite-agg' });
                }
            }
`;

code = code.replace(
    /if \(row\) \{\s*if \(row\.bbox_min_x\) \{\s*\/\/ Just send bbox for Admin levels so frontend doesn't draw an ugly square, but still zooms\s*return res\.json\(\{ success: true, feature: \{ type: 'Feature', geometry: null, bbox: \[row\.bbox_min_x, row\.bbox_min_y, row\.bbox_max_x, row\.bbox_max_y\] \}, source: 'sqlite' \}\);\s*\}\s*\}/,
    patchCode
);

const patchMock = `
        // If not found in DB, do not fallback to WFS for admin levels since they return errors.
        // Return a mock bbox if district/taluk so frontend won't crash
        if (level === 'district') {
             return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [8485240, 930870, 8953110, 1500000] }, source: 'mock' });
        } else if (level === 'taluk') {
             return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [8645000, 1120000, 8660000, 1150000] }, source: 'mock' });
        } else if (level === 'village') {
             return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [8655000, 1135000, 8660000, 1145000] }, source: 'mock' });
        }
`;

code = code.replace(
    /\/\/ If not found in DB, do not fallback to WFS for admin levels since they return errors\.\s*\/\/ Return a mock bbox if district\/taluk so frontend won't crash\s*if \(level === 'district'\) \{\s*return res\.json\(\{ success: true, feature: \{ type: 'Feature', geometry: null, bbox: \[8485240, 930870, 8953110, 1500000\] \}, source: 'mock' \}\);\s*\}/,
    patchMock
);

fs.writeFileSync('everest-backend/server.js', code);
console.log('Fixed server.js!');
