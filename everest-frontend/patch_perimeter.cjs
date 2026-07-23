const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

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

content = content.split(oldPerimeterLogic).join(newPerimeterLogic);
fs.writeFileSync(file, content);
console.log('Perimeter patched');
