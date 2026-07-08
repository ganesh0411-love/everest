const fs = require('fs');
const file = 'src/components/AdminDashboard.jsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/\\n/g, '\n');

fs.writeFileSync(file, c);
console.log('Fixed newlines.');

