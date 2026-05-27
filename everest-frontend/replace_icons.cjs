const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\DELL\\Desktop\\Everest\\logo.jpeg';
const resDir = 'C:\\Users\\DELL\\Desktop\\Everest\\everest-frontend\\android\\app\\src\\main\\res';

const dirs = fs.readdirSync(resDir);
for (const dir of dirs) {
  if (dir.startsWith('mipmap-')) {
    const p1 = path.join(resDir, dir, 'ic_launcher.png');
    const p2 = path.join(resDir, dir, 'ic_launcher_round.png');
    // Also remove the ic_launcher_foreground and background xml/png files as they clash with our static icon.
    // We will just overwrite the PNGs and AAPT2 might accept them.
    if (fs.existsSync(p1)) fs.copyFileSync(src, p1);
    if (fs.existsSync(p2)) fs.copyFileSync(src, p2);
  }
}
console.log('Icons replaced.');
