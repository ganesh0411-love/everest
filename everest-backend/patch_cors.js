const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace(/app\.use\(cors\(\)\);/g, "app.use(cors({ origin: '*' }));");
fs.writeFileSync('server.js', c);
console.log('Fixed CORS in server.js');
