const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

// Find all conflict blocks
const conflictRegex = /<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> parent of 37fc000[^\n]*\n/g;

code = code.replace(conflictRegex, '$1');

fs.writeFileSync('src/components/AdminDashboard.jsx', code);
console.log('Conflicts resolved by taking the parent version for 37fc000.');
