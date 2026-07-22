const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// 1. Add mapActionTrigger state
const stateMarker = `const [selSurvey, setSelSurvey] = React.useState('');`;
if (!code.includes('const [mapActionTrigger, setMapActionTrigger] = React.useState(0);')) {
    code = code.replace(stateMarker, stateMarker + '\n  const [mapActionTrigger, setMapActionTrigger] = React.useState(0);');
}

// 2. Update selSurvey onChange to also trigger mapActionTrigger
code = code.replace(/setSelSurvey\(e\.target\.value\)/g, `(() => { setSelSurvey(e.target.value); setMapActionTrigger(Date.now()); })()`);
code = code.replace(/setSelSubdiv\(e\.target\.value\)/g, `(() => { setSelSubdiv(e.target.value); setMapActionTrigger(Date.now()); })()`);
code = code.replace(/setSelVillage\(e\.target\.value\)/g, `(() => { setSelVillage(e.target.value); setSelSurvey(''); setSelSubdiv(''); setMapActionTrigger(Date.now()); })()`);


// 3. Update useEffect dependency array to include mapActionTrigger
const u1 = `}, [selSurvey]);`;
code = code.replace(u1, `}, [selSurvey, mapActionTrigger]);`);
const u2 = `}, [selSubdiv]);`;
code = code.replace(u2, `}, [selSubdiv, mapActionTrigger]);`);

// 4. Fix animate loop closure in executeFlyTo & fetchAndHighlight
// We need to replace the setCadViewport logic in executeFlyTo to use a callback
const animateFlyToRegex = /let startTime = null;\s*const animate = \(time\) => \{[\s\S]*?requestAnimationFrame\(animate\);\s*\}/;
const newAnimateFlyTo = `let startTime = null;
                  const animate = (time) => {
                      if (!startTime) startTime = time;
                      const elapsed = time - startTime;
                      const t = Math.min(elapsed / 800, 1);
                      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                      
                      setCadViewport(prev => {
                          // Capture initial start pos correctly on first frame
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
                  requestAnimationFrame(animate);`;

code = code.replace(animateFlyToRegex, newAnimateFlyTo);


const animateFetchRegex = /let startTime = null;\s*const animate = \(time\) => \{[\s\S]*?requestAnimationFrame\(animate\);\s*\}\s*\};\s*requestAnimationFrame\(animate\);/;
const newAnimateFetch = `let startTime = null;
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
                  requestAnimationFrame(animate);`;

// Wait, I need to parse the MultiPolygon properly in fetchAndHighlight first!
// Let's replace the coordinate parsing block in fetchAndHighlight and executeFlyTo.
const fetchAndHighlightParser = /if \(geom\.type === 'Polygon'\) coordinates = geom\.coordinates\[0\];\s*else if \(geom\.type === 'MultiPolygon'\) coordinates = geom\.coordinates\[0\]\[0\];/;
const newFetchAndHighlightParser = `let allRings = [];
              if (geom.type === 'Polygon') allRings.push(geom.coordinates[0]);
              else if (geom.type === 'MultiPolygon') {
                  geom.coordinates.forEach(poly => allRings.push(poly[0]));
              }
              // Flatten for bounds calculation
              coordinates = allRings.flat();`;
code = code.replace(fetchAndHighlightParser, newFetchAndHighlightParser);

// Replace the points mapping to handle multiple rings
const pointsMapperRegex = /const points = coordinates\.map\(coord => \{[\s\S]*?return \{ x: svgX, y: svgY \};\s*\}\);/;
const newPointsMapper = `const pointsList = allRings.map(ring => {
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
                  const points = pointsList.flat();`;
code = code.replace(pointsMapperRegex, newPointsMapper);


// Same for executeFlyTo
const executeFlyToParser = /if \(geom && geom\.type === 'Polygon'\) coordinates = geom\.coordinates\[0\];\s*else if \(geom && geom\.type === 'MultiPolygon'\) coordinates = geom\.coordinates\[0\]\[0\];\s*else if \(!geom && data\.feature\.bbox\) \{[\s\S]*?\}/;
const newExecuteFlyToParser = `let allRings = [];
              if (geom && geom.type === 'Polygon') allRings.push(geom.coordinates[0]);
              else if (geom && geom.type === 'MultiPolygon') {
                  geom.coordinates.forEach(poly => allRings.push(poly[0]));
              } else if (!geom && data.feature.bbox) {
                  const b = data.feature.bbox;
                  allRings.push([[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]], [b[0], b[1]]]);
              }
              coordinates = allRings.flat();`;
code = code.replace(executeFlyToParser, newExecuteFlyToParser);

code = code.replace(/const points = coordinates\.map\(coord => \{[\s\S]*?return \{ x: svgX, y: svgY \};\s*\}\);/g, newPointsMapper);
code = code.replace(animateFetchRegex, newAnimateFetch);

// Finally, fix the SVG renderer to accept an array of arrays (MultiPolygon)
const svgPolygonRegex = /\{lsHighlightPoly && \([\s\S]*?<polygon[\s\S]*?points=\{lsHighlightPoly\.map[\s\S]*?\/\>[\s\S]*?\)\}/;
const newSvgPolygon = `{lsHighlightPoly && (
                 Array.isArray(lsHighlightPoly[0]) ? (
                     lsHighlightPoly.map((ring, idx) => (
                         <polygon
                             key={\`hp_\${idx}\`}
                             points={ring.map(p => \`\${p.x},\${p.y}\`).join(' ')}
                             fill="rgba(255, 255, 0, 0.3)"
                             stroke="#FFD700"
                             strokeWidth={cadViewport.width / 400}
                             style={{ pointerEvents: 'none' }}
                         />
                     ))
                 ) : (
                     <polygon 
                         points={lsHighlightPoly.map(p => \`\${p.x},\${p.y}\`).join(' ')}
                         fill="rgba(255, 255, 0, 0.3)"
                         stroke="#FFD700"
                         strokeWidth={cadViewport.width / 400}
                         style={{ pointerEvents: 'none' }}
                     />
                 )
             )}`;
code = code.replace(svgPolygonRegex, newSvgPolygon);


fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Successfully patched AdminDashboard.jsx!');
