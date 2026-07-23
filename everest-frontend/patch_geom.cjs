const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix the coordinate conversion before calling turfArea
const oldCalcStr = `              if (geom) {
                  try {
                      const computedSqM = turfArea(data.feature);
                      const totalHectares = computedSqM / 10000;
                      setMapSelectionArea({
                          sqMeters: computedSqM,
                          sqFt: computedSqM * 10.7639,
                          hectare: totalHectares,
                          are: totalHectares * 100,
                          acre: computedSqM / 4046.86,
                          cent: computedSqM / 40.4686
                      });
                  } catch (e) {
                      console.error("Area calculation error:", e);
                      setMapSelectionArea(null);
                  }
              }`;

const newCalcStr = `              if (geom) {
                  try {
                      const toWGS84Coords = (coords) => {
                          if (!Array.isArray(coords)) return coords;
                          if (typeof coords[0] === 'number') {
                              const lon = coords[0] * 180 / 20037508.34;
                              const lat = Math.atan(Math.exp(coords[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
                              return [lon, lat];
                          }
                          return coords.map(toWGS84Coords);
                      };
                      
                      const wgs84Feature = {
                          type: 'Feature',
                          geometry: {
                              type: geom.type,
                              coordinates: toWGS84Coords(geom.coordinates)
                          },
                          properties: {}
                      };
                      
                      const computedSqM = turfArea(wgs84Feature);
                      const totalHectares = computedSqM / 10000;
                      setMapSelectionArea({
                          sqMeters: computedSqM,
                          sqFt: computedSqM * 10.7639,
                          hectare: totalHectares,
                          are: totalHectares * 100,
                          acre: computedSqM / 4046.86,
                          cent: computedSqM / 40.4686
                      });
                  } catch (e) {
                      console.error("Area calculation error:", e);
                      setMapSelectionArea(null);
                  }
              }`;

content = content.replace(oldCalcStr, newCalcStr); // Replace first occurrence (in fetchAndHighlight)
content = content.replace(oldCalcStr, newCalcStr); // Replace second occurrence (in executeFlyTo)

// 2. Formatting UI display
const toLocaleStr = `.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`;

// Replace .toFixed(4) and .toFixed(2) calls for activeArea
content = content.replace(/activeArea\.acre\.toFixed\(4\)/g, `activeArea.acre${toLocaleStr}`);
content = content.replace(/activeArea\.cent\.toFixed\(2\)/g, `activeArea.cent${toLocaleStr}`);
content = content.replace(/activeArea\.hectare\.toFixed\(4\)/g, `activeArea.hectare${toLocaleStr}`);
content = content.replace(/activeArea\.are\.toFixed\(4\)/g, `activeArea.are${toLocaleStr}`);
content = content.replace(/activeArea\.sqFt\.toFixed\(2\)/g, `activeArea.sqFt${toLocaleStr}`);
content = content.replace(/activeArea\.sqMeters\.toFixed\(2\)/g, `activeArea.sqMeters${toLocaleStr}`);

// If any were left as string without parens in patch_area.js
content = content.replace(/activeArea\.hectare\.toFixed(?!\()/g, `activeArea.hectare${toLocaleStr}`);
content = content.replace(/activeArea\.are\.toFixed(?!\()/g, `activeArea.are${toLocaleStr}`);
content = content.replace(/activeArea\.acre\.toFixed(?!\()/g, `activeArea.acre${toLocaleStr}`);
content = content.replace(/activeArea\.cent\.toFixed(?!\()/g, `activeArea.cent${toLocaleStr}`);
content = content.replace(/activeArea\.sqFt\.toFixed(?!\()/g, `activeArea.sqFt${toLocaleStr}`);
content = content.replace(/activeArea\.sqMeters\.toFixed(?!\()/g, `activeArea.sqMeters${toLocaleStr}`);

fs.writeFileSync(file, content);
console.log('Patch geometry conversion applied successfully.');
