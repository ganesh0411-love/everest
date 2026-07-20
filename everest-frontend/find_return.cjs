const fs = require('fs');
const lines = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8').split('\n');
const idx = lines.findIndex(l => l.includes('return (') && l.includes('<div className="w-full h-full relative"'));
if (idx === -1) {
    const backupIdx = lines.findIndex(l => l.includes('return ('));
    console.log('Found first return at ' + backupIdx);
} else {
    console.log('Found main return at ' + idx);
    for(let i=Math.max(0, idx-5); i<Math.min(lines.length, idx+150); i++) console.log(i + ': ' + lines[i]);
}
