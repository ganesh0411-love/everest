const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

const regex1 = /const targetWidth = Math\.max\(maxX - minX, 100\);[\s\S]*?const tH = targetHeight \+ marginY \* 2;/g;

const replacement = `const parcelWidth = maxX - minX;
                  const parcelHeight = maxY - minY;
                  
                  let viewW = Math.max(parcelWidth * 2.5, 400);
                  let viewH = Math.max(parcelHeight * 2.5, 400);
                  
                  const screenRatio = window.innerWidth / window.innerHeight;
                  const viewRatio = viewW / viewH;
                  
                  if (screenRatio > viewRatio) {
                      viewW = viewH * screenRatio;
                  } else {
                      viewH = viewW / screenRatio;
                  }
                  
                  const centerX = minX + parcelWidth / 2;
                  const centerY = minY + parcelHeight / 2;
                  
                  const tX = centerX - viewW / 2;
                  const tY = centerY - viewH / 2;
                  const tW = viewW;
                  const tH = viewH;`;

const newCode = code.replace(regex1, replacement);

if (newCode === code) {
    console.log("No replacements made!");
} else {
    fs.writeFileSync('src/components/AdminDashboard.jsx', newCode);
    console.log("Replaced zoom padding logic successfully.");
}
