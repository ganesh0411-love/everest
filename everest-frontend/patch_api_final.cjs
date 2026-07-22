const fs = require('fs');
let c = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');
c = c.replace(/const API_BASE = 'https:\/\/everest-backend\.onrender\.com';/g, "const API_BASE = 'https://everest-backend-f9nt.onrender.com';");
fs.writeFileSync('src/components/AdminDashboard.jsx', c);
console.log('Fixed API_BASE to final Render URL');
