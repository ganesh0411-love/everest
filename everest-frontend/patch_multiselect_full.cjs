const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\r\n/g, '\n'); // Normalize newlines!

// 1. Map Action Trigger
const mapActionStartStr = "  // Run highlight on mapActionTrigger\n  React.useEffect(() => {\n      if (mapActionTrigger > 0) {\n          if (selSurvey) {\n              fetchAndHighlight('parcel'";
const mapActionEndStr = "          }\n      }\n  }, [mapActionTrigger]);";

const mStart = content.indexOf(mapActionStartStr);
const mEnd = content.indexOf(mapActionEndStr, mStart) + mapActionEndStr.length;

if (mStart !== -1 && mEnd !== -1) {
    const newMapAction = `  // Run highlight on mapActionTrigger
  React.useEffect(() => {
      if (mapActionTrigger > 0) {
          if (selSurvey && selSurvey.length > 0) {
              fetchAndHighlight('parcel', { selDistrict, selTaluk, selVillage, selSurvey, selSubdiv });
          } else if (selVillage) {
              fetchAndHighlight('village', { selDistrict, selTaluk, selVillage, selSurvey: [], selSubdiv: [] });
          } else if (selTaluk) {
              fetchAndHighlight('taluk', { selDistrict, selTaluk, selVillage, selSurvey: [], selSubdiv: [] });
          } else if (selDistrict) {
              fetchAndHighlight('district', { selDistrict, selTaluk, selVillage, selSurvey: [], selSubdiv: [] });
          }
      }
  }, [mapActionTrigger]);`;
    content = content.substring(0, mStart) + newMapAction + content.substring(mEnd);
    console.log("Patched Map Action Trigger");
}

// 2. Fetch Subdivs
const subdivStartStr = "  // Fetch subdivs only when selSurvey changes\n  React.useEffect(() => {\n      if (selSurvey) {\n          setLsLoading('subdivs');";
const subdivEndStr = "      } else {\n          setLsSubdivs([]);\n      }\n  }, [selSurvey]);";
const sStart = content.indexOf(subdivStartStr);
const sEnd = content.indexOf(subdivEndStr, sStart) + subdivEndStr.length;

if (sStart !== -1 && sEnd !== -1) {
    const newSubdiv = `  // Fetch subdivs only when selSurvey changes
  React.useEffect(() => {
      if (selSurvey && selSurvey.length > 0) {
          setLsLoading('subdivs');
          setSelSubdiv([]);
          setLsSubdivs([]);
          Promise.all(selSurvey.map(survey => 
            fetch(\`\${API_BASE}/api/tngis/subdivisions?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(survey)}&taluk=\${encodeURIComponent(selTaluk)}\`)
              .then(res => res.json())
              .then(res => (res.data || []).map(subdiv => selSurvey.length > 1 ? \`\${subdiv} (\${survey})\` : subdiv))
              .catch(err => [])
          ))
          .then(results => {
              const combined = results.flat();
              setLsSubdivs([...new Set(combined)]);
          })
          .catch(err => {
              console.error("Error fetching subdivs:", err);
              setLsSubdivs([]);
          })
          .finally(() => setLsLoading(''));
      } else {
          setLsSubdivs([]);
      }
  }, [selSurvey]);`;
    content = content.substring(0, sStart) + newSubdiv + content.substring(sEnd);
    console.log("Patched Subdiv Fetch");
}

// 3. fetchAndHighlight
const fnhStartStr = "  const fetchAndHighlight = async (level, state) => {\n        setLsHighlightPoly(null);";
const fnhEndStr = "              if (coordinates && coordinates.length > 0) {\n                  let bMercX = mapConfig.baseMercX;";
const fStart = content.indexOf(fnhStartStr);
const fEnd = content.indexOf(fnhEndStr, fStart);

if (fStart !== -1 && fEnd !== -1) {
    const newFNH = `  const fetchAndHighlight = async (level, state) => {
        setLsHighlightPoly(null);
        setLsHighlightType(null);
        setCadSelectedPolygon(null);
        setMapSelectionArea(null);
        try {
          let fetches = [];
          if (level === 'parcel') {
              if (state.selSubdiv && state.selSubdiv.length > 0) {
                  state.selSubdiv.forEach(subItem => {
                      let sub = subItem;
                      let sur = (state.selSurvey && state.selSurvey.length === 1) ? state.selSurvey[0] : '';
                      const match = subItem.match(/(.+?)\\s+\\((.+?)\\)$/);
                      if (match) {
                          sub = match[1];
                          sur = match[2];
                      }
                      fetches.push(\`\${API_BASE}/api/tngis/boundary?level=parcel&district=\${encodeURIComponent(state.selDistrict)}&taluk=\${encodeURIComponent(state.selTaluk)}&village=\${encodeURIComponent(state.selVillage)}&survey=\${encodeURIComponent(sur)}&subdiv=\${encodeURIComponent(sub)}\`);
                  });
              } else if (state.selSurvey && state.selSurvey.length > 0) {
                  state.selSurvey.forEach(sur => {
                      fetches.push(\`\${API_BASE}/api/tngis/boundary?level=parcel&district=\${encodeURIComponent(state.selDistrict)}&taluk=\${encodeURIComponent(state.selTaluk)}&village=\${encodeURIComponent(state.selVillage)}&survey=\${encodeURIComponent(sur)}\`);
                  });
              }
          } else {
              let url = \`\${API_BASE}/api/tngis/boundary?level=\${level}\`;
              if (state.selDistrict) url += \`&district=\${encodeURIComponent(state.selDistrict)}\`;
              if (state.selTaluk) url += \`&taluk=\${encodeURIComponent(state.selTaluk)}\`;
              if (state.selVillage) url += \`&village=\${encodeURIComponent(state.selVillage)}\`;
              fetches.push(url);
          }
          
          const responses = await Promise.all(fetches.map(url => fetch(url).then(r => r.json())));
          
          let combinedRings = [];
          let combinedAreaSqM = 0;
          let combinedPerimeterMeters = 0;
          let validDataFound = false;
          let firstFeatureGeomType = null;
          let data = { feature: { geometry: null, bbox: null } }; // mocked top-level data for the rest of function

          const toWGS84Coords = (coords) => {
              if (!Array.isArray(coords)) return coords;
              if (typeof coords[0] === 'number') {
                  const lon = coords[0] * 180 / 20037508.34;
                  const lat = Math.atan(Math.exp(coords[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
                  return [lon, lat];
              }
              return coords.map(toWGS84Coords);
          };

          for (const resData of responses) {
              if (resData.success && resData.feature) {
                  validDataFound = true;
                  const geom = resData.feature.geometry;
                  if (!firstFeatureGeomType) firstFeatureGeomType = geom ? geom.type : null;
                  if (!data.feature.bbox && resData.feature.bbox) data.feature.bbox = resData.feature.bbox;

                  if (geom) {
                      try {
                          const wgs84Feature = {
                              type: 'Feature',
                              geometry: { type: geom.type, coordinates: toWGS84Coords(geom.coordinates) },
                              properties: {}
                          };
                          
                          combinedAreaSqM += turfArea(wgs84Feature);
                          combinedPerimeterMeters += turfLength(wgs84Feature, { units: 'meters' });
                      } catch (e) {}

                      if (geom.type === 'Polygon') {
                          combinedRings.push(geom.coordinates[0]);
                      } else if (geom.type === 'MultiPolygon') {
                          geom.coordinates.forEach(poly => combinedRings.push(poly[0]));
                      }
                  } else if (resData.feature.bbox) {
                      const b = resData.feature.bbox;
                      combinedRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
                  }
              }
          }

          if (validDataFound) {
              if (combinedAreaSqM > 0) {
                  const totalHectares = combinedAreaSqM / 10000;
                  setMapSelectionArea({
                      sqMeters: combinedAreaSqM,
                      sqFt: combinedAreaSqM * 10.7639,
                      hectare: totalHectares,
                      are: totalHectares * 100,
                      acre: combinedAreaSqM / 4046.86,
                      cent: combinedAreaSqM / 40.4686,
                      perimeterMeters: combinedPerimeterMeters
                  });
              }

              let coordinates = [];
              let allRings = combinedRings;
              coordinates = allRings.flat();
              
              if (combinedRings.length > 0) {
                  data.feature.geometry = { type: 'MultiPolygon', coordinates: combinedRings.map(r => [r]) };
              }
              const geom = data.feature.geometry;

`;
    content = content.substring(0, fStart) + newFNH + content.substring(fEnd);
    console.log("Patched fetchAndHighlight");
} else {
    console.log("Could not find fetchAndHighlight");
}

// 4. executeFlyTo
const flyStartStr = "  const executeFlyTo = async () => {\n        if (!selVillage || !selSurvey) return;";
const flyEndStr = "              coordinates = allRings.flat();\n              \n              if (coordinates && coordinates.length > 0) {";
const flyStart = content.indexOf(flyStartStr);
const flyEnd = content.indexOf(flyEndStr, flyStart);

if (flyStart !== -1 && flyEnd !== -1) {
    const newFlyTo = `  const executeFlyTo = async () => {
        if (!selVillage || !selSurvey || selSurvey.length === 0) return;
        setLsLoading('flyTo');
        setLsHighlightPoly(null);
        setLsHighlightType(null);
        setCadSelectedPolygon(null);
        setMapSelectionArea(null);
        try {
          let fetches = [];
          if (selSubdiv && selSubdiv.length > 0) {
              selSubdiv.forEach(subItem => {
                  let sub = subItem;
                  let sur = (selSurvey && selSurvey.length === 1) ? selSurvey[0] : '';
                  const match = subItem.match(/(.+?)\\s+\\((.+?)\\)$/);
                  if (match) {
                      sub = match[1];
                      sur = match[2];
                  }
                  fetches.push(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(sur)}&taluk=\${encodeURIComponent(selTaluk)}&subdiv=\${encodeURIComponent(sub)}\`);
              });
          } else if (selSurvey && selSurvey.length > 0) {
              selSurvey.forEach(sur => {
                  fetches.push(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(sur)}&taluk=\${encodeURIComponent(selTaluk)}\`);
              });
          }

          const responses = await Promise.all(fetches.map(url => fetch(url).then(r => r.json())));
          
          let combinedRings = [];
          let combinedAreaSqM = 0;
          let combinedPerimeterMeters = 0;
          let validDataFound = false;
          let data = { feature: { geometry: null, bbox: null } }; // mocked top-level data for the rest of function

          const toWGS84Coords = (coords) => {
              if (!Array.isArray(coords)) return coords;
              if (typeof coords[0] === 'number') {
                  const lon = coords[0] * 180 / 20037508.34;
                  const lat = Math.atan(Math.exp(coords[1] * Math.PI / 20037508.34)) * 360 / Math.PI - 90;
                  return [lon, lat];
              }
              return coords.map(toWGS84Coords);
          };

          for (const resData of responses) {
              if (resData.success && resData.feature) {
                  validDataFound = true;
                  const geom = resData.feature.geometry;
                  if (!data.feature.bbox && resData.feature.bbox) data.feature.bbox = resData.feature.bbox;

                  if (geom) {
                      try {
                          const wgs84Feature = {
                              type: 'Feature',
                              geometry: { type: geom.type, coordinates: toWGS84Coords(geom.coordinates) },
                              properties: {}
                          };
                          combinedAreaSqM += turfArea(wgs84Feature);
                          combinedPerimeterMeters += turfLength(wgs84Feature, { units: 'meters' });
                      } catch (e) {}

                      if (geom.type === 'Polygon') {
                          combinedRings.push(geom.coordinates[0]);
                      } else if (geom.type === 'MultiPolygon') {
                          geom.coordinates.forEach(poly => combinedRings.push(poly[0]));
                      }
                  } else if (resData.feature.bbox) {
                      const b = resData.feature.bbox;
                      combinedRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
                  }
              }
          }

          if (validDataFound) {
              if (combinedAreaSqM > 0) {
                  const totalHectares = combinedAreaSqM / 10000;
                  setMapSelectionArea({
                      sqMeters: combinedAreaSqM,
                      sqFt: combinedAreaSqM * 10.7639,
                      hectare: totalHectares,
                      are: totalHectares * 100,
                      acre: combinedAreaSqM / 4046.86,
                      cent: combinedAreaSqM / 40.4686,
                      perimeterMeters: combinedPerimeterMeters
                  });
              }
              let coordinates = [];
              let allRings = combinedRings;
              coordinates = allRings.flat();
              
              if (combinedRings.length > 0) {
                  data.feature.geometry = { type: 'MultiPolygon', coordinates: combinedRings.map(r => [r]) };
              }
              const geom = data.feature.geometry;

`;
    content = content.substring(0, flyStart) + newFlyTo + content.substring(flyEnd);
    console.log("Patched executeFlyTo");
} else {
    console.log("Could not find executeFlyTo");
}

fs.writeFileSync(file, content);
