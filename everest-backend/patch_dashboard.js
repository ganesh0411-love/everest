const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'components', 'AdminDashboard.jsx');
let content = fs.readFileSync(file, 'utf8');

const fetchAndHighlightCode = `
  const fetchAndHighlight = async (level) => {
      try {
          let url = \`\${API_BASE}/api/tngis/boundary?level=\${level}\`;
          if (selDistrict) url += \`&district=\${encodeURIComponent(selDistrict)}\`;
          if (selTaluk) url += \`&taluk=\${encodeURIComponent(selTaluk)}\`;
          if (selVillage) url += \`&village=\${encodeURIComponent(selVillage)}\`;
          if (selSurvey) url += \`&survey=\${encodeURIComponent(selSurvey)}\`;
          if (selSubdiv) url += \`&subdiv=\${encodeURIComponent(selSubdiv)}\`;
          
          const res = await fetch(url);
          const data = await res.json();
          if (data.success && data.feature && data.feature.geometry) {
              const geom = data.feature.geometry;
              let coordinates = [];
              if (geom.type === 'Polygon') coordinates = geom.coordinates[0];
              else if (geom.type === 'MultiPolygon') coordinates = geom.coordinates[0][0]; 
              
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
                  const points = coordinates.map(coord => {
                      const svgX = coord[0] - bMercX;
                      const svgY = bMercY - coord[1];
                      if (svgX < minX) minX = svgX;
                      if (svgX > maxX) maxX = svgX;
                      if (svgY < minY) minY = svgY;
                      if (svgY > maxY) maxY = svgY;
                      return { x: svgX, y: svgY };
                  });
                  
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
                      
                      setCadViewport({
                          x: startX + (tX - startX) * ease,
                          y: startY + (tY - startY) * ease,
                          width: startW + (tW - startW) * ease,
                          height: startH + (tH - startH) * ease
                      });
                      
                      if (t < 1) {
                          requestAnimationFrame(animate);
                      } else {
                          setLsHighlightPoly(points);
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

content = content.replace("const executeFlyTo = async () => {", fetchAndHighlightCode + "\n  const executeFlyTo = async () => {");

content = content.replace(
  "setSelTaluk('');",
  "fetchAndHighlight('district');\n          setSelTaluk('');"
);
content = content.replace(
  "setSelVillage('');",
  "fetchAndHighlight('taluk');\n          setSelVillage('');"
);
content = content.replace(
  "setSelSurvey('');",
  "fetchAndHighlight('village');\n          setSelSurvey('');"
);
content = content.replace(
  "setSelSubdiv('');",
  "fetchAndHighlight('parcel');\n          setSelSubdiv('');"
);

content = content.replace(/disabled=\{lsLoading === 'districts'\}/g, "");
content = content.replace(/disabled=\{!selDistrict \|\| lsLoading === 'taluks'\}/g, "disabled={!selDistrict}");
content = content.replace(/disabled=\{!selTaluk \|\| lsLoading === 'villages'\}/g, "disabled={!selTaluk}");
content = content.replace(/disabled=\{!selVillage \|\| lsLoading === 'surveys'\}/g, "disabled={!selVillage}");
content = content.replace(/disabled=\{!selSurvey \|\| lsLoading === 'subdivs'\}/g, "disabled={!selSurvey}");

const newPolyRender = `
                            {/* Progressive Yellow Highlight Polygon */}
                            {lsHighlightPoly && (
                              <polygon 
                                points={lsHighlightPoly.map(pt => \`\${pt.x},\${pt.y}\`).join(' ')} 
                                fill="rgba(255, 255, 0, 0.2)" 
                                stroke="#FFFF00" 
                                strokeWidth="3" 
                                vectorEffect="non-scaling-stroke"
                                strokeLinejoin="round"
                              />
                            )}
`;

content = content.replace(
  "{/* Closed Path Geometry */}",
  "{/* Closed Path Geometry */}\n" + newPolyRender
);

fs.writeFileSync(file, content);
console.log("Patched AdminDashboard.jsx");
