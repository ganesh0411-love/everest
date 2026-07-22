const fs = require('fs');
let code = fs.readFileSync('everest-frontend/src/components/AdminDashboard.jsx', 'utf8');

const oldExecuteFlyToAnim = `                  let startTime = null;
                  const animate = (time) => {
                      if (!startTime) startTime = time;
                      const elapsed = time - startTime;
                      const t = Math.min(elapsed / 1000, 1);
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
                          // Flash highlight polygon
                          setLsHighlightPoly(points);
                      }
                  };
                  requestAnimationFrame(animate);
                  setIsLandSearchModalOpen(false); // Close modal`;

const newExecuteFlyToAnim = `                  let startTime = null;
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
                  setIsLandSearchModalOpen(false); // Close modal`;

code = code.replace(oldExecuteFlyToAnim, newExecuteFlyToAnim);
fs.writeFileSync('everest-frontend/src/components/AdminDashboard.jsx', code);
console.log('Fixed executeFlyTo anim!');
