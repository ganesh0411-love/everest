const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.all("SELECT bbox_min_x, bbox_max_x, geometry_geojson FROM administrative_boundaries WHERE level='village' AND lgd_code = '932466'", (err, rows) => {
    if(err) console.error(err);
    else console.log(rows.length > 0 ? 'Found' : 'Not Found');
});
