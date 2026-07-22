const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace('app.listen(PORT, () => {', "app.listen(PORT, '0.0.0.0', () => {");
fs.writeFileSync('server.js', c);
console.log('Fixed app.listen host');
