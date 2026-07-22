const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT geometry_geojson FROM cadastral_parcels WHERE lgd_village_code = '932466' AND survey_no = '651' AND sub_div_no = '1B2'", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows.length);
});
