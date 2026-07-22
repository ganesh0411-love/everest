const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT sub_div_no FROM cadastral_parcels WHERE lgd_village_code = '932466' AND survey_no = '651'", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows.map(r => r.sub_div_no));
});
