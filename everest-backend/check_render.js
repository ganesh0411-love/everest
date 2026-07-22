const https = require('https');
const url = 'https://everest-backend-f9nt.onrender.com/api/tngis/boundary?level=village&village=Sevugampatti';
https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(data));
}).on('error', err => console.log(err));
