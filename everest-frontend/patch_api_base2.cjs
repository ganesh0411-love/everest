const fs = require('fs');
let c = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');
c = c.replace(/const API_BASE = import\.meta\.env\.VITE_API_BASE \|\| 'http:\/\/localhost:5000';/g, "const API_BASE = 'https://everest-backend.onrender.com';");
fs.writeFileSync('src/components/AdminDashboard.jsx', c);
console.log('Fixed API_BASE');
