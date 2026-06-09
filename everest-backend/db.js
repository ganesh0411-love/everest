const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

let dbPromise;

const initDb = async () => {
    if (!dbPromise) {
        dbPromise = open({
            filename: path.join(__dirname, 'fmb_library.db'),
            driver: sqlite3.Database
        }).then(async (db) => {
            await db.exec(`
                CREATE TABLE IF NOT EXISTS fmb_maps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT,
                    survey_number TEXT,
                    scale TEXT,
                    svg_data TEXT,
                    source_image_base64 TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('Database initialized.');
            return db;
        }).catch(err => {
            console.error('Database connection failed', err);
            dbPromise = null;
        });
    }
    return dbPromise;
};

module.exports = { initDb };
