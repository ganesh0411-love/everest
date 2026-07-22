const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT level, count(1) as count FROM administrative_boundaries GROUP BY level", (err, rows) => console.log(rows));
