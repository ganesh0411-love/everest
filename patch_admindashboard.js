const fs = require('fs');

let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

code = code.replace(
    "setLsHighlightPoly(typeof pointsList !== 'undefined' ? pointsList.flat() : points)",
    "setLsHighlightPoly(pointsList || points)"
);

const oldBlock = `                      setCadViewport({
                          x: startX + (tX - startX) * ease,
                          y: startY + (tY - startY) * ease,
                          width: startW + (tW - startW) * ease,
                          height: startH + (tH - startH) * ease
                      });
                      
                      if (t < 1) {
                          requestAnimationFrame(animate);
                      } else {
                          // Flash highlight polygon
                          setLsHighlightPoly(points);
                      }`;

const newBlock = `                      setCadViewport(prev => {
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
                      }`;

code = code.replace(oldBlock, newBlock);

fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Patched AdminDashboard.jsx successfully');
