const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(
    /let url = \`\$\{TNGIS_URL\}\?service=WFS&version=1\.0\.0&request=GetFeature&typeName=\$\{typeName\}&outputFormat=application\/json\`;/,
    `let url = \`\$\{TNGIS_URL\}?service=WFS&version=1.0.0&request=GetFeature&typeName=\$\{typeName\}&outputFormat=application/json&srsName=EPSG:3857\`;`
);

fs.writeFileSync('server.js', code);
console.log('Fixed fetchTNGIS srsName!');
