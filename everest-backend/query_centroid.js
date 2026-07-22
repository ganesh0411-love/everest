const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT sub_div_no, bbox_min_x, bbox_max_x FROM cadastral_parcels WHERE lgd_village_code = '932466' AND survey_no = '651' AND sub_div_no IN ('1B2', '1C')", (err, rows) => {
    if (err) console.error(err);
    else console.log(rows);
});
