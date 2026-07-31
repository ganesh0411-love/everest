const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(
    /\} else if \(level === 'parcel' && survey\) \{/g,
    `} else if ((level === 'parcel' || level === 'survey') && survey) {`
);

fs.writeFileSync('server.js', code);
console.log('Patched server.js survey boundary logic!');
