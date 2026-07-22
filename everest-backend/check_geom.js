const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/spatial_cache.db');
db.get("SELECT geometry_geojson FROM cadastral_parcels LIMIT 1", (err, row) => console.log('Parcel:', row));
db.get("SELECT geometry_geojson FROM administrative_boundaries LIMIT 1", (err, row) => console.log('Admin:', row));
