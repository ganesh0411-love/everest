const fs = require('fs');
let code = fs.readFileSync('everest-backend/server.js', 'utf8');

const oldBoundaryBlock = `            } else if (level === 'parcel' && survey) {
                if (subdiv) {
                    row = await dbGet(\`SELECT geometry_geojson, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? AND sub_div_no = ? LIMIT 1\`, [lgdVillageCode, survey, subdiv]);
                } else {
                    row = await dbGet(\`SELECT geometry_geojson, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ? LIMIT 1\`, [lgdVillageCode, survey]);
                }
            }
            
            if (row) {
                if (level === 'parcel' && row.geometry_geojson) {
                    // Send actual parcel polygon + bbox
                    return res.json({ success: true, feature: { type: 'Feature', geometry: JSON.parse(row.geometry_geojson), bbox: [row.bbox_min_x, row.bbox_min_y, row.bbox_max_x, row.bbox_max_y], properties: { name: survey } }, source: 'sqlite' });
                } else if (row.bbox_min_x) {
                    // Just send bbox for Admin levels so frontend doesn't draw an ugly square, but still zooms
                    return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [row.bbox_min_x, row.bbox_min_y, row.bbox_max_x, row.bbox_max_y] }, source: 'sqlite' });
                }
            }`;

const newBoundaryBlock = `            } else if (level === 'parcel' && survey) {
                let query = 'SELECT geometry_geojson, bbox_min_x, bbox_min_y, bbox_max_x, bbox_max_y FROM cadastral_parcels WHERE lgd_village_code = ? AND survey_no = ?';
                let params = [lgdVillageCode, survey];
                if (subdiv) {
                    query += ' AND sub_div_no = ?';
                    params.push(subdiv);
                }
                const rows = await dbAll(query, params);
                if (rows && rows.length > 0) {
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    let features = [];
                    
                    rows.forEach(r => {
                        if (r.bbox_min_x < minX) minX = r.bbox_min_x;
                        if (r.bbox_min_y < minY) minY = r.bbox_min_y;
                        if (r.bbox_max_x > maxX) maxX = r.bbox_max_x;
                        if (r.bbox_max_y > maxY) maxY = r.bbox_max_y;
                        if (r.geometry_geojson) {
                            try { features.push(JSON.parse(r.geometry_geojson)); } catch(e){}
                        }
                    });
                    
                    let geom = null;
                    if (features.length === 1) {
                        geom = features[0];
                    } else if (features.length > 1) {
                        let polys = [];
                        features.forEach(f => {
                            if (f.type === 'Polygon') polys.push(f.coordinates);
                            else if (f.type === 'MultiPolygon') polys.push(...f.coordinates);
                        });
                        geom = { type: 'MultiPolygon', coordinates: polys };
                    }
                    
                    return res.json({ success: true, feature: { type: 'Feature', geometry: geom, bbox: [minX, minY, maxX, maxY], properties: { name: survey } }, source: 'sqlite' });
                }
            }
            
            if (row) {
                if (row.bbox_min_x) {
                    // Just send bbox for Admin levels so frontend doesn't draw an ugly square, but still zooms
                    return res.json({ success: true, feature: { type: 'Feature', geometry: null, bbox: [row.bbox_min_x, row.bbox_min_y, row.bbox_max_x, row.bbox_max_y] }, source: 'sqlite' });
                }
            }`;

code = code.replace(oldBoundaryBlock, newBoundaryBlock);
fs.writeFileSync('everest-backend/server.js', code);
console.log('Successfully patched boundary endpoint');
