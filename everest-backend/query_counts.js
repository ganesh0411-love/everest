const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT level, count(*) as c FROM administrative_boundaries GROUP BY level", (err, rows) => {
    if(err) console.error(err);
    else console.log(rows);
});
