const fs = require('fs');

let c = fs.readFileSync('../everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// Patch fetchAndHighlight
const fnhOld = `          if (data.success && data.feature) {
              const geom = data.feature.geometry;
              let coordinates = [];
              if (geom.type === 'Polygon') coordinates = geom.coordinates[0];
              else if (geom.type === 'MultiPolygon') coordinates = geom.coordinates[0][0]; // Outer ring of first polygon
              
              if (coordinates && coordinates.length > 0) {`;

const fnhNew = `          if (data.success && data.feature) {
              const geom = data.feature.geometry;
              let coordinates = [];
              if (geom && geom.type === 'Polygon') coordinates = geom.coordinates[0];
              else if (geom && geom.type === 'MultiPolygon') coordinates = geom.coordinates[0][0]; // Outer ring of first polygon
              else if (!geom && data.feature.bbox) {
                  // Construct a dummy square to compute minX, etc. for zooming, but don't draw it!
                  const b = data.feature.bbox;
                  coordinates = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]];
              }
              
              if (coordinates && coordinates.length > 0) {`;
c = c.replace(fnhOld, fnhNew);

// In fetchAndHighlight where it animates
const setLshOld = `                      if (t < 1) {
                          requestAnimationFrame(animate);
                      } else {
                          setLsHighlightPoly(points);
                      }`;
const setLshNew = `                      if (t < 1) {
                          requestAnimationFrame(animate);
                      } else {
                          if (geom) setLsHighlightPoly(points);
                          else setLsHighlightPoly(null);
                      }`;
c = c.replace(setLshOld, setLshNew);

// Patch executeFlyTo
const flyOld = `          if (data.success && data.feature && data.feature.geometry) {
              const geom = data.feature.geometry;
              let coordinates = [];
              if (geom.type === 'Polygon') coordinates = geom.coordinates[0];
              else if (geom.type === 'MultiPolygon') coordinates = geom.coordinates[0][0]; // Outer ring of first polygon`;
const flyNew = `          if (data.success && data.feature) {
              const geom = data.feature.geometry;
              let coordinates = [];
              if (geom && geom.type === 'Polygon') coordinates = geom.coordinates[0];
              else if (geom && geom.type === 'MultiPolygon') coordinates = geom.coordinates[0][0];
              else if (!geom && data.feature.bbox) {
                  const b = data.feature.bbox;
                  coordinates = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]];
              }`;
c = c.replace(flyOld, flyNew);

fs.writeFileSync('../everest-frontend/src/components/AdminDashboard.jsx', c);
console.log('AdminDashboard patched for bbox zoom');
