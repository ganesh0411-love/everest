const fs = require('fs');
let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

code = code.replace(
    /let startTime = null;\s*const animate = \(time\) => \{\s*if \(!startTime\) startTime = time;\s*const elapsed = time - startTime;\s*const t = Math\.min\(elapsed \/ 1000, 1\);\s*const ease = t < 0\.5 \? 4 \* t \* t \* t : 1 - Math\.pow\(-2 \* t \+ 2, 3\) \/ 2;\s*setCadViewport\(\{[\s\S]*?height: startH \+ \(tH - startH\) \* ease\s*\}\);\s*if \(t < 1\) \{\s*requestAnimationFrame\(animate\);\s*\} else \{\s*\/\/ Flash highlight polygon\s*setLsHighlightPoly\(points\);\s*\}\s*\};\s*requestAnimationFrame\(animate\);\s*setIsLandSearchModalOpen\(false\);/,
    `let startTime = null;
                  const animate = (time) => {
                      if (!startTime) startTime = time;
                      const elapsed = time - startTime;
                      const t = Math.min(elapsed / 1000, 1);
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
                          // Flash highlight polygon
                          setLsHighlightPoly(pointsList || points);
                      }
                  };
                  requestAnimationFrame(animate);
                  setIsLandSearchModalOpen(false);`
);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('executeFlyTo Regex patch applied!');
