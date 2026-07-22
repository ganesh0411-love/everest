const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT lgd_village_code, survey_no, sub_div_no FROM cadastral_parcels LIMIT 10", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
