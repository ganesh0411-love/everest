const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  import { Geolocation } from '@capacitor/geolocation';,
  import { Geolocation } from '@capacitor/geolocation';\nimport { area as turfArea } from '@turf/area';
);

content = content.replace(
  const [lsHighlightPoly, setLsHighlightPoly] = React.useState(null);,
  const [lsHighlightPoly, setLsHighlightPoly] = React.useState(null);\n const [mapSelectionArea, setMapSelectionArea] = React.useState(null);
);

content = content.replace(
  const cadOpenNodes = React.useMemo(() => {,
  const activeArea = mapSelectionArea || cadComputedArea;\n\n const cadOpenNodes = React.useMemo(() => {
);

content = content.replace(
  /setCadSelectedPolygon\(null\);\s+try \{/g,
  setCadSelectedPolygon(null);\n setMapSelectionArea(null);\n try {
);

const calculateAreaStr = 
              if (geom) {
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
                      console.error( Area calculation error:, e);
                      setMapSelectionArea(null);
                  }
              }
;

content = content.replace(
  /const geom = data\.feature\.geometry;/g,
  const geom = data.feature.geometry;
);

content = content.replace(
  /\{cadComputedArea \? cadComputedArea\.acre\.toFixed\(4\) : calculatedLandArea\.acre\}/g,
  {activeArea ? activeArea.acre.toFixed(4) : calculatedLandArea.acre}
);
content = content.replace(
  /\{cadComputedArea \? cadComputedArea\.cent\.toFixed\(2\) : calculatedLandArea\.cent\}/g,
  {activeArea ? activeArea.cent.toFixed(2) : calculatedLandArea.cent}
);

content = content.replace(
  /<span>\{cadComputedArea \? \(/g,
  <span>{activeArea ? (
);

content = content.replace(/cadComputedArea\.hectare\.toFixed/g, activeArea.hectare.toFixed);
content = content.replace(/cadComputedArea\.are\.toFixed/g, activeArea.are.toFixed);
content = content.replace(/cadComputedArea\.acre\.toFixed/g, activeArea.acre.toFixed);
content = content.replace(/cadComputedArea\.cent\.toFixed/g, activeArea.cent.toFixed);
content = content.replace(/cadComputedArea\.sqFt\.toFixed/g, activeArea.sqFt.toFixed);
content = content.replace(/cadComputedArea\.sqMeters\.toFixed/g, activeArea.sqMeters.toFixed);

content = content.replace(
  /\{cadComputedArea \? \(/g,
  {activeArea ? (
);

// One missed thing: cadComputedArea uses 'are' but cadComputedArea ? !cadComputedArea is used elsewhere?
content = content.replace(/!cadComputedArea/g, !activeArea);

fs.writeFileSync(file, content);
console.log('Patch applied successfully.');
