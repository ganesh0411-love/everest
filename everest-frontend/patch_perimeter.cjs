const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import for turfLength
if (!content.includes("@turf/length")) {
    content = content.replace(
        "import { area as turfArea } from '@turf/area';",
        "import { area as turfArea } from '@turf/area';\nimport { length as turfLength } from '@turf/length';"
    );
}

// 2. Add perimeter calculation to the wgs84 feature block
const oldCalcStr = `const computedSqM = turfArea(wgs84Feature);
                      const totalHectares = computedSqM / 10000;
                      setMapSelectionArea({
                          sqMeters: computedSqM,
                          sqFt: computedSqM * 10.7639,
                          hectare: totalHectares,
                          are: totalHectares * 100,
                          acre: computedSqM / 4046.86,
                          cent: computedSqM / 40.4686
                      });`;

const newCalcStr = `const computedSqM = turfArea(wgs84Feature);
                      const computedPerimeter = turfLength(wgs84Feature, { units: 'meters' });
                      const totalHectares = computedSqM / 10000;
                      setMapSelectionArea({
                          sqMeters: computedSqM,
                          sqFt: computedSqM * 10.7639,
                          hectare: totalHectares,
                          are: totalHectares * 100,
                          acre: computedSqM / 4046.86,
                          cent: computedSqM / 40.4686,
                          perimeterMeters: computedPerimeter
                      });`;

content = content.replace(oldCalcStr, newCalcStr); // First occurrence
content = content.replace(oldCalcStr, newCalcStr); // Second occurrence

// 3. Update the 'Tot Ft' rendering logic
const oldPerimeterLogic = `let totalMeters = cadLines.reduce((acc, l) => acc + (l.fixedLength ? parseFloat(l.fixedLength) : (cadScale ? Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale : 0)), 0);
                          if (selectedPerimeterUnit === 'Ft') {
                              return (totalMeters * 3.28084).toFixed(2);
                          } else {
                              return totalMeters.toFixed(2);
                          }`;

const newPerimeterLogic = `let totalMeters = (activeArea && activeArea.perimeterMeters)
                              ? activeArea.perimeterMeters
                              : cadLines.reduce((acc, l) => acc + (l.fixedLength ? parseFloat(l.fixedLength) : (cadScale ? Math.hypot(l.p1.x - l.p2.x, l.p1.y - l.p2.y) * cadScale : 0)), 0);
                          if (selectedPerimeterUnit === 'Ft') {
                              return (totalMeters * 3.28084).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          } else {
                              return totalMeters.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                          }`;

content = content.replace(oldPerimeterLogic, newPerimeterLogic);

fs.writeFileSync(file, content);
console.log('Patch perimeter applied successfully.');
