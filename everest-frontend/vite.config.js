import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import url from 'url'

function localGisPlugin() {
  return {
    name: 'local-gis-api',
    configureServer(server) {
      const geojsonDir = path.join(process.cwd(), 'data', 'geojson');

      server.middlewares.use('/api/tngis/districts', (req, res) => {
        try {
          const dirs = fs.readdirSync(geojsonDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: dirs }));
        } catch (e) {
           res.end(JSON.stringify({ data: [] }));
        }
      });

      server.middlewares.use('/api/tngis/taluks', (req, res) => {
        const query = url.parse(req.url, true).query;
        try {
          const dirs = fs.readdirSync(path.join(geojsonDir, query.district || ''), { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: dirs }));
        } catch (e) {
           res.end(JSON.stringify({ data: [] }));
        }
      });

      server.middlewares.use('/api/tngis/villages', (req, res) => {
        const query = url.parse(req.url, true).query;
        try {
          const dirs = fs.readdirSync(path.join(geojsonDir, query.district || '', query.taluk || ''), { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: dirs }));
        } catch (e) {
           res.end(JSON.stringify({ data: [] }));
        }
      });

      server.middlewares.use('/api/tngis/survey', (req, res) => {
        const query = url.parse(req.url, true).query;
        try {
          const files = fs.readdirSync(path.join(geojsonDir, query.district || '', query.taluk || '', query.village || ''))
            .filter(file => file.endsWith('.geojson'))
            .map(file => file.replace('.geojson', ''));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: files }));
        } catch (e) {
           res.end(JSON.stringify({ data: [] }));
        }
      });

      server.middlewares.use('/api/tngis/subdivisions', (req, res) => {
        const query = url.parse(req.url, true).query;
        try {
          const filePath = path.join(geojsonDir, query.district || '', query.taluk || '', query.village || '', (query.survey || '') + '.geojson');
          const file = fs.readFileSync(filePath, 'utf8');
          const data = JSON.parse(file);
          let subdivs = [];
          if (data.features) {
             subdivs = data.features.map(f => f.properties && f.properties.SUBDIV_NO).filter(Boolean);
          }
          subdivs = [...new Set(subdivs)];
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ data: subdivs }));
        } catch (e) {
           res.end(JSON.stringify({ data: [] }));
        }
      });

      server.middlewares.use('/api/tngis/feature', (req, res) => {
        const query = url.parse(req.url, true).query;
        try {
          const filePath = path.join(geojsonDir, query.district || '', query.taluk || '', query.village || '', (query.survey || '') + '.geojson');
          const file = fs.readFileSync(filePath, 'utf8');
          let data = JSON.parse(file);
          if (query.subdiv && data.features) {
             data.features = data.features.filter(f => f.properties && f.properties.SUBDIV_NO === query.subdiv);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (e) {
           res.setHeader('Content-Type', 'application/json');
           res.end(JSON.stringify({ success: false, error: 'Not found' }));
        }
      });

      // Dummy endpoint for parcel boundary which is sometimes called
      server.middlewares.use('/api/tngis/boundary', (req, res) => {
        const query = url.parse(req.url, true).query;
        try {
          const filePath = path.join(geojsonDir, query.district || '', query.taluk || '', query.village || '', (query.survey || '') + '.geojson');
          const file = fs.readFileSync(filePath, 'utf8');
          let data = JSON.parse(file);
          if (query.subdiv && data.features) {
             data.features = data.features.filter(f => f.properties && f.properties.SUBDIV_NO === query.subdiv);
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (e) {
           res.setHeader('Content-Type', 'application/json');
           res.end(JSON.stringify({ success: false, error: 'Not found' }));
        }
      });

    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), localGisPlugin()],
})
