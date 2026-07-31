const fs = require('fs');
const path = require('path');

let serverFile = fs.readFileSync('server.js', 'utf8');

const surveyPatch = `app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { district, taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });

        // --- LOCAL GEOJSON LOOKUP ---
        if (district && taluk && village) {
            const localDir = require('path').join(__dirname, 'data', 'geojson', district, taluk, village);
            if (require('fs').existsSync(localDir)) {
                try {
                    const files = require('fs').readdirSync(localDir)
                        .filter(file => file.endsWith('.geojson'))
                        .map(file => file.replace('.geojson', ''));
                    if (files.length > 0) {
                        return res.json({ success: true, data: files, source: 'local_json' });
                    }
                } catch(e) { console.error('Local JSON survey error:', e); }
            }
        }
        // --- END LOCAL LOOKUP ---`;

serverFile = serverFile.replace(`app.get('/api/tngis/survey', async (req, res) => {
    try {
        const { taluk, village } = req.query;
        if (!village) return res.status(400).json({ error: 'Village is required' });`, surveyPatch);


const subdivPatch = `app.get('/api/tngis/subdivisions', async (req, res) => {
    try {
        const { district, taluk, village, survey } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and Survey are required' });

        // --- LOCAL GEOJSON LOOKUP ---
        if (district && taluk && village && survey) {
            const filePath = require('path').join(__dirname, 'data', 'geojson', district, taluk, village, survey + '.geojson');
            if (require('fs').existsSync(filePath)) {
                try {
                    const fileContent = require('fs').readFileSync(filePath, 'utf8');
                    const data = JSON.parse(fileContent);
                    if (data.features) {
                        let subdivs = data.features.map(f => f.properties && f.properties.SUBDIV_NO).filter(Boolean);
                        subdivs = [...new Set(subdivs)].sort();
                        return res.json({ success: true, data: subdivs, source: 'local_json' });
                    }
                } catch(e) { console.error('Local JSON subdiv error:', e); }
            }
        }
        // --- END LOCAL LOOKUP ---`;

serverFile = serverFile.replace(`app.get('/api/tngis/subdivisions', async (req, res) => {
    try {
        const { taluk, village, survey } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and Survey are required' });`, subdivPatch);

const featurePatch = `app.get('/api/tngis/feature', async (req, res) => {
    try {
        const { district, taluk, village, survey, subdiv } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and survey required' });

        // --- LOCAL GEOJSON LOOKUP ---
        if (district && taluk && village && survey) {
            const filePath = require('path').join(__dirname, 'data', 'geojson', district, taluk, village, survey + '.geojson');
            if (require('fs').existsSync(filePath)) {
                try {
                    const fileContent = require('fs').readFileSync(filePath, 'utf8');
                    const data = JSON.parse(fileContent);
                    if (data.features) {
                        let feature;
                        if (subdiv) {
                            feature = data.features.find(f => f.properties && f.properties.SUBDIV_NO === subdiv);
                        } else {
                            feature = data.features[0];
                        }
                        if (feature) {
                            return res.json({ success: true, feature: feature, source: 'local_json' });
                        }
                    }
                } catch(e) { console.error('Local JSON feature error:', e); }
            }
        }
        // --- END LOCAL LOOKUP ---`;

serverFile = serverFile.replace(`app.get('/api/tngis/feature', async (req, res) => {
    try {
        const { village, survey, subdiv, taluk } = req.query;
        if (!village || !survey) return res.status(400).json({ error: 'Village and survey required' });`, featurePatch);

// Boundary might be accessed for 'parcel' level which needs features for geometry
const boundaryPatch = `app.get('/api/tngis/boundary', async (req, res) => {
    try {
        const { level, district, taluk, village, survey, subdiv } = req.query;
        if (!level) return res.status(400).json({ error: 'Level is required' });

        // --- LOCAL GEOJSON LOOKUP ---
        if (level === 'parcel' && district && taluk && village && survey) {
            const filePath = require('path').join(__dirname, 'data', 'geojson', district, taluk, village, survey + '.geojson');
            if (require('fs').existsSync(filePath)) {
                try {
                    const fileContent = require('fs').readFileSync(filePath, 'utf8');
                    const data = JSON.parse(fileContent);
                    if (data.features) {
                        let feature;
                        if (subdiv) {
                            feature = data.features.find(f => f.properties && f.properties.SUBDIV_NO === subdiv);
                        } else {
                            feature = data.features[0];
                        }
                        if (feature) {
                            return res.json({ success: true, feature: feature, source: 'local_json' });
                        }
                    }
                } catch(e) { console.error('Local JSON boundary error:', e); }
            }
        }
        // --- END LOCAL LOOKUP ---`;

serverFile = serverFile.replace(`app.get('/api/tngis/boundary', async (req, res) => {
    try {
        const { level, district, taluk, village, survey, subdiv } = req.query;
        if (!level) return res.status(400).json({ error: 'Level is required' });`, boundaryPatch);

fs.writeFileSync('server.js', serverFile);
console.log('Successfully patched server.js with hybrid local GeoJSON lookups');
