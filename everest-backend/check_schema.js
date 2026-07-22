const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.each("SELECT sql FROM sqlite_master WHERE type='table'", (err, row) => console.log(row.sql));
