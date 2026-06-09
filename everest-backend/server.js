const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const potrace = require('potrace');
const Tesseract = require('tesseract.js');
const fs = require('fs/promises');
const path = require('path');
const pdfPoppler = require('pdf-poppler');
const { initDb } = require('./db');

const app = express();
const PORT = 5000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

const traceVector = (buffer, options) => {
    return new Promise((resolve, reject) => {
        potrace.trace(buffer, options, (err, svg) => {
            if (err) reject(err);
            else resolve(svg);
        });
    });
};

app.post('/api/extract-vectors', async (req, res) => {
    try {
        const { imageBase64, pdfBase64, fullImageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

        let detectedScale = null;

        if (pdfBase64) {
            console.log("Processing high-res PDF OCR extraction...");
            const tempPdfPath = path.join(__dirname, `temp_${Date.now()}.pdf`);
            const outDir = __dirname;
            const outPrefix = `temp_img_${Date.now()}`;
            
            try {
                const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
                await fs.writeFile(tempPdfPath, pdfBuffer);

                const opts = {
                    format: 'png',
                    out_dir: outDir,
                    out_prefix: outPrefix,
                    page: 1,
                    scale: 2048
                };
                
                await pdfPoppler.convert(tempPdfPath, opts);
                const outputImagePath = path.join(outDir, `${outPrefix}-1.png`);
                
                const fullPdfImageBuffer = await fs.readFile(outputImagePath);
                const originalMetadata = await sharp(fullPdfImageBuffer).metadata();
                
                const headerBuffer = await sharp(fullPdfImageBuffer)
                    .extract({ left: 0, top: 0, width: originalMetadata.width, height: Math.min(350, originalMetadata.height) })
                    .toBuffer();

                const ocrResult = await Tesseract.recognize(headerBuffer, 'eng').catch(() => ({ data: { text: '' } }));
                if (ocrResult && ocrResult.data && ocrResult.data.text) {
                    const scaleMatch = ocrResult.data.text.match(/(?:Scale|1:)\s*([0-9,.]+)/i);
                    if (scaleMatch) {
                        detectedScale = scaleMatch[1].replace(/,/g, '');
                        console.log(`✅ Native PDF OCR Detected Scale: ${detectedScale}`);
                    } else {
                        console.log(`❌ Native PDF OCR scale not found in text: ${ocrResult.data.text}`);
                    }
                }
                
                await fs.unlink(tempPdfPath).catch(()=>{});
                await fs.unlink(outputImagePath).catch(()=>{});
            } catch (err) {
                console.error("PDF-Poppler Native OCR Failed", err);
            }
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const inputBuffer = Buffer.from(base64Data, 'base64');

        // Extract raw pixel data
        const { data, info } = await sharp(inputBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;
        const numPixels = width * height;

        // Create empty buffers for masks (1 byte per pixel, grayscale)
        const blackBuffer = Buffer.alloc(numPixels, 255);
        const blueBuffer = Buffer.alloc(numPixels, 255);
        const redBuffer = Buffer.alloc(numPixels, 255);

        for (let i = 0; i < numPixels; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 50) continue; // skip transparent

            // Color Heuristics - relaxed for scanned images
            const isBlue = (b > r + 20 && b > g + 20 && b > 60);
            const isRed = (r > b + 20 && r > g + 20 && r > 60);
            const isDark = (r < 180 && g < 180 && b < 180);

            if (isBlue) {
                blueBuffer[i] = 0; 
            } else if (isRed) {
                redBuffer[i] = 0;
            } else if (isDark) {
                blackBuffer[i] = 0;
            }
        }

        const toPng = (buf) => sharp(buf, { raw: { width, height, channels: 1 } }).png().toBuffer();

        const [blackPng, bluePng, redPng] = await Promise.all([
            toPng(blackBuffer),
            toPng(blueBuffer),
            toPng(redBuffer)
        ]);

        const traceOpts = { 
            turnPolicy: potrace.Potrace.TURNPOLICY_MINORITY,
            turdSize: 2,
            optCurve: true,
            optTolerance: 0.2
        };

        const [blackSvg, blueSvg, redSvg] = await Promise.all([
            traceVector(blackPng, traceOpts),
            traceVector(bluePng, traceOpts),
            traceVector(redPng, traceOpts)
        ]);

        const extractPaths = (svgStr, color) => {
            const contentMatch = svgStr.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
            if (!contentMatch) return '';
            return contentMatch[1].replace(/fill="black"/g, `fill="${color}"`);
        };

        const blackPaths = extractPaths(blackSvg, '#cbd5e1'); // Slate
        const bluePaths = extractPaths(blueSvg, '#0ea5e9'); // Cyan
        const redPaths = extractPaths(redSvg, '#ef4444'); // Red

        const viewBoxMatch = blackSvg.match(/viewBox="([^"]*)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${width} ${height}`;

        const unifiedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
  <g class="layer-black">${blackPaths}</g>
  <g class="layer-blue">${bluePaths}</g>
  <g class="layer-red">${redPaths}</g>
</svg>
        `.trim();

        // Auto-Save to Database
        const db = await initDb();
        const mapName = `FMB Map ${new Date().toLocaleString()}`;
        let insertedId = null;
        if (db) {
            const result = await db.run(
                `INSERT INTO fmb_maps (name, survey_number, scale, svg_data, source_image_base64) VALUES (?, ?, ?, ?, ?)`,
                [mapName, '', detectedScale || '', unifiedSvg, fullImageBase64 || '']
            );
            insertedId = result.lastID;
        }

        console.log(`Extraction complete. SVG length: ${unifiedSvg.length} characters. Scale: ${detectedScale}`);
        res.json({ svg: unifiedSvg, detectedScale, id: insertedId });
        
    } catch (err) {
        console.error('Extraction pipeline error:', err);
        res.status(500).json({ error: 'Server error during extraction' });
    }
});

// Library Endpoints
app.get('/api/fmb-maps', async (req, res) => {
    try {
        const db = await initDb();
        if (!db) return res.status(500).json({ error: 'Database unavailable' });
        const maps = await db.all(`SELECT id, name, survey_number, scale, source_image_base64, created_at FROM fmb_maps ORDER BY created_at DESC`);
        res.json(maps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

app.get('/api/fmb-maps/:id', async (req, res) => {
    try {
        const db = await initDb();
        const map = await db.get(`SELECT * FROM fmb_maps WHERE id = ?`, [req.params.id]);
        if (!map) return res.status(404).json({ error: 'Map not found' });
        res.json(map);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch map' });
    }
});

app.put('/api/fmb-maps/:id/rename', async (req, res) => {
    try {
        const db = await initDb();
        const { name } = req.body;
        await db.run(`UPDATE fmb_maps SET name = ? WHERE id = ?`, [name, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to rename map' });
    }
});

app.delete('/api/fmb-maps/:id', async (req, res) => {
    try {
        const db = await initDb();
        await db.run(`DELETE FROM fmb_maps WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete map' });
    }
});

app.listen(PORT, () => {
    console.log(`Everest Backend Server running on http://localhost:${PORT}`);
});
