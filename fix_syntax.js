const fs = require('fs');

let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

// The block to replace spans from `const fetchAndHighlight = async (level, state) => {`
// to the end of `executeFlyTo` function.
// I will just find them by index and replace the whole thing.

const startF = code.indexOf('const fetchAndHighlight = async');
let endF = code.indexOf('const submitCadPrompt = (e) => {', startF);
if (endF === -1) {
    console.error("Could not find submitCadPrompt");
    process.exit(1);
}

const newBlock = `const fetchAndHighlight = async (level, state) => {
      try {
          let url = \`\${API_BASE}/api/tngis/boundary?level=\${level}\`;
          if (state.selDistrict) url += \`&district=\${encodeURIComponent(state.selDistrict)}\`;
          if (state.selTaluk) url += \`&taluk=\${encodeURIComponent(state.selTaluk)}\`;
          if (state.selVillage) url += \`&village=\${encodeURIComponent(state.selVillage)}\`;
          if (state.selSurvey) url += \`&survey=\${encodeURIComponent(state.selSurvey)}\`;
          if (state.selSubdiv) url += \`&subdiv=\${encodeURIComponent(state.selSubdiv)}\`;
          
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.feature && data.feature.geometry) {
              const geom = data.feature.geometry;
              let coordinates = [];
              let allRings = [];
              if (geom.type === 'Polygon') allRings.push(geom.coordinates[0]);
              else if (geom.type === 'MultiPolygon') {
                  geom.coordinates.forEach(poly => allRings.push(poly[0]));
              }
              coordinates = allRings.flat(); 
              
              if (coordinates && coordinates.length > 0) {
                  let bMercX = mapConfig.baseMercX;
                  let bMercY = mapConfig.baseMercY;
                  
                  if (bMercX === 0 && bMercY === 0) {
                      let minM = Infinity, minMy = Infinity, maxM = -Infinity, maxMy = -Infinity;
                      coordinates.forEach(c => {
                          if (c[0] < minM) minM = c[0];
                          if (c[0] > maxM) maxM = c[0];
                          if (c[1] < minMy) minMy = c[1];
                          if (c[1] > maxMy) maxMy = c[1];
                      });
                      bMercX = minM + (maxM - minM)/2;
                      bMercY = minMy + (maxMy - minMy)/2;
                      setMapConfig(prev => ({ ...prev, active: true, baseMercX: bMercX, baseMercY: bMercY }));
                      setIsCadastralEnabled(true);
                  }
                  
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  const pointsList = allRings.map(ring => {
                      return ring.map(coord => {
                          const svgX = coord[0] - bMercX;
                          const svgY = bMercY - coord[1];
                          if (svgX < minX) minX = svgX;
                          if (svgX > maxX) maxX = svgX;
                          if (svgY < minY) minY = svgY;
                          if (svgY > maxY) maxY = svgY;
                          return { x: svgX, y: svgY };
                      });
                  });
                  const points = pointsList.flat();
                  
                  const targetWidth = Math.max(maxX - minX, 100);
                  const targetHeight = Math.max(maxY - minY, 100);
                  const marginX = targetWidth * 0.2;
                  const marginY = targetHeight * 0.2;
                  
                  const tX = minX - marginX;
                  const tY = minY - marginY;
                  const tW = targetWidth + marginX * 2;
                  const tH = targetHeight + marginY * 2;
                  
                  const startX = (mapConfig.baseMercX === 0) ? tX : cadViewport.x;
                  const startY = (mapConfig.baseMercX === 0) ? tY : cadViewport.y;
                  const startW = (mapConfig.baseMercX === 0) ? tW : cadViewport.width;
                  const startH = (mapConfig.baseMercX === 0) ? tH : cadViewport.height;
                  
                  let startTime = null;
                  const animate = (time) => {
                      if (!startTime) startTime = time;
                      const elapsed = time - startTime;
                      const t = Math.min(elapsed / 800, 1);
                      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                      
                      setCadViewport(prev => {
                          const sX = prev.startX !== undefined ? prev.startX : startX;
                          const sY = prev.startY !== undefined ? prev.startY : startY;
                          const sW = prev.startW !== undefined ? prev.startW : startW;
                          const sH = prev.startH !== undefined ? prev.startH : startH;
                          
                          return {
                              x: sX + (tX - sX) * ease,
                              y: sY + (tY - sY) * ease,
                              width: sW + (tW - sW) * ease,
                              height: sH + (tH - sH) * ease,
                              startX: sX, startY: sY, startW: sW, startH: sH
                          };
                      });
                      
                      if (t < 1) {
                          requestAnimationFrame(animate);
                      } else {
                          if (geom) setLsHighlightPoly(pointsList || points);
                          else setLsHighlightPoly(null);
                      }
                  };
                  requestAnimationFrame(animate);
              }
          }
      } catch (err) {
          console.error("fetchAndHighlight failed:", err);
      }
  };

  const executeFlyTo = async () => {
      if (!selVillage || !selSurvey) return;
      setLsLoading('flyTo');
      try {
          const res = await fetch(\`\${API_BASE}/api/tngis/feature?village=\${encodeURIComponent(selVillage)}&survey=\${encodeURIComponent(selSurvey)}&taluk=\${encodeURIComponent(selTaluk)}\` + (selSubdiv ? \`&subdiv=\${encodeURIComponent(selSubdiv)}\` : ''));
          const data = await res.json();
          if (data.success && data.feature) {
              const geom = data.feature.geometry;
              let coordinates = [];
              let allRings = [];
              if (geom && geom.type === 'Polygon') allRings.push(geom.coordinates[0]);
              else if (geom && geom.type === 'MultiPolygon') {
                  geom.coordinates.forEach(poly => allRings.push(poly[0]));
              } else if (!geom && data.feature.bbox) {
                  const b = data.feature.bbox;
                  allRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
              }
              coordinates = allRings.flat();
              
              if (coordinates && coordinates.length > 0) {
                  let bMercX = mapConfig.baseMercX;
                  let bMercY = mapConfig.baseMercY;
                  
                  if (bMercX === 0 && bMercY === 0) {
                      let minM = Infinity, minMy = Infinity, maxM = -Infinity, maxMy = -Infinity;
                      coordinates.forEach(c => {
                          if (c[0] < minM) minM = c[0];
                          if (c[0] > maxM) maxM = c[0];
                          if (c[1] < minMy) minMy = c[1];
                          if (c[1] > maxMy) maxMy = c[1];
                      });
                      bMercX = minM + (maxM - minM)/2;
                      bMercY = minMy + (maxMy - minMy)/2;
                      setMapConfig(prev => ({ ...prev, active: true, baseMercX: bMercX, baseMercY: bMercY }));
                      
                      setIsCadastralEnabled(true);
                  }
                  
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  
                  const pointsList = allRings.map(ring => {
                      return ring.map(coord => {
                          const svgX = coord[0] - bMercX;
                          const svgY = bMercY - coord[1];
                          if (svgX < minX) minX = svgX;
                          if (svgX > maxX) maxX = svgX;
                          if (svgY < minY) minY = svgY;
                          if (svgY > maxY) maxY = svgY;
                          return { x: svgX, y: svgY };
                      });
                  });
                  const points = pointsList.flat();
                  
                  const targetWidth = Math.max(maxX - minX, 100);
                  const targetHeight = Math.max(maxY - minY, 100);
                  const marginX = targetWidth * 0.2;
                  const marginY = targetHeight * 0.2;
                  
                  const tX = minX - marginX;
                  const tY = minY - marginY;
                  const tW = targetWidth + marginX * 2;
                  const tH = targetHeight + marginY * 2;
                  
                  const startX = (mapConfig.baseMercX === 0) ? tX : cadViewport.x;
                  const startY = (mapConfig.baseMercX === 0) ? tY : cadViewport.y;
                  const startW = (mapConfig.baseMercX === 0) ? tW : cadViewport.width;
                  const startH = (mapConfig.baseMercX === 0) ? tH : cadViewport.height;
                  
                  let startTime = null;
                  const animate = (time) => {
                      if (!startTime) startTime = time;
                      const elapsed = time - startTime;
                      const t = Math.min(elapsed / 800, 1);
                      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                      
                      setCadViewport(prev => {
                          const sX = (mapConfig.baseMercX === 0 || !startTime) ? startX : prev.startX || startX;
                          const sY = (mapConfig.baseMercX === 0 || !startTime) ? startY : prev.startY || startY;
                          const sW = (mapConfig.baseMercX === 0 || !startTime) ? startW : prev.startW || startW;
                          const sH = (mapConfig.baseMercX === 0 || !startTime) ? startH : prev.startH || startH;
                          
                          return {
                              x: sX + (tX - sX) * ease,
                              y: sY + (tY - sY) * ease,
                              width: sW + (tW - sW) * ease,
                              height: sH + (tH - sH) * ease,
                              startX: sX, startY: sY, startW: sW, startH: sH
                          };
                      });
                      
                      if (t < 1) {
                          requestAnimationFrame(animate);
                      } else {
                          setLsLoading(false);
                      }
                  };
                  requestAnimationFrame(animate);
              }
          }
      } catch (err) {
          console.error("fetchAndHighlight failed:", err);
      }
  };

  `;

code = code.substring(0, startF) + newBlock + code.substring(endF);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Fixed syntax error in AdminDashboard.jsx!');
