const fs = require('fs');

let code = fs.readFileSync('scripts/ingest_spatial.js', 'utf8');

code = code.replace(
    /let url = \`\$\{TNGIS_URL\}\?service=WFS&version=1\.0\.0&request=GetFeature&typeName=\$\{typeName\}&outputFormat=application\/json&srsName=EPSG:3857\`;/,
    `let url = \`\$\{TNGIS_URL\}?service=WFS&version=1.0.0&request=GetFeature&typeName=\$\{typeName\}&outputFormat=application/json&srsName=EPSG:3857&count=100000\`;`
);

fs.writeFileSync('scripts/ingest_spatial.js', code);
console.log('Fixed ingest_spatial.js count limit!');
