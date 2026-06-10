require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const potrace = require('potrace');
const Tesseract = require('tesseract.js');
const fs = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { insertMap, getAllMaps, getMapById, renameMap, deleteMap, updateMap, cleanStaleDrafts } = require('./db');

const os = require('os');
let pdfPoppler = null;
if (os.platform() === 'win32') {
    try { pdfPoppler = require('pdf-poppler'); } catch(e) {}
}

// ─── Helper: call pdftoppm directly (Linux) or pdf-poppler (Windows) ────────
const pdfToImage = async (pdfPath, outPrefix, scale = 2048) => {
    if (os.platform() === 'win32' && pdfPoppler) {
        let opts = {
            format: 'png',
            out_dir: path.dirname(outPrefix),
            out_prefix: path.basename(outPrefix),
            page: 1,
            scale: scale
        };
        await pdfPoppler.convert(pdfPath, opts);
        return;
    }
    
    return new Promise((resolve, reject) => {
        // -png: output PNG, -f/-l 1: first page only, -scale-to: max dimension in pixels
        const args = ['-png', '-f', '1', '-l', '1', '-scale-to', String(scale), pdfPath, outPrefix];
        execFile('pdftoppm', args, { timeout: 60000 }, (err, stdout, stderr) => {
            if (err) reject(new Error(`pdftoppm failed: ${err.message}\n${stderr}`));
            else resolve();
        });
    });
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));
app.use(cors());

// ─── Health Check (required for Render) ───────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Helper: Potrace SVG tracing ──────────────────────────────────────────────
const traceVector = (buffer, options) => {
    return new Promise((resolve, reject) => {
        potrace.trace(buffer, options, (err, svg) => {
            if (err) reject(err);
            else resolve(svg);
        });
    });
};

// ─── POST /api/extract-vectors ────────────────────────────────────────────────
app.post('/api/extract-vectors', async (req, res) => {
    try {
        const { imageBase64, pdfBase64, fullImageBase64, projectId } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

        let detectedScale = null;
        let detectedSurveyNumber = null;
        let detectedSubDivision = null;

        // PDF OCR: extract scale from header using pdf-poppler + sharp + Tesseract
        if (pdfBase64) {
            console.log('Processing high-res PDF OCR extraction...');
            const outDir = os.tmpdir();
            const tempPdfPath = path.join(outDir, `temp_${Date.now()}.pdf`);
            const outPrefix = `temp_img_${Date.now()}`;

            try {
                const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
                await fs.writeFile(tempPdfPath, pdfBuffer);

                // Call pdftoppm directly — outputs /tmp/outPrefix-1.png or outPrefix-01.png
                const outPrefixFull = path.join(outDir, outPrefix);
                await pdfToImage(tempPdfPath, outPrefixFull, 2048);
                
                // Find the generated file dynamically to bypass pdftoppm zero-padding logic
                const files = await fs.readdir(outDir);
                const generatedFile = files.find(f => f.startsWith(outPrefix) && f.endsWith('.png'));
                if (!generatedFile) throw new Error('pdftoppm did not generate a PNG file');
                const outputImagePath = path.join(outDir, generatedFile);

                const fullPdfImageBuffer = await fs.readFile(outputImagePath);
                const originalMetadata = await sharp(fullPdfImageBuffer).metadata();

                const headerBuffer = await sharp(fullPdfImageBuffer)
                    .extract({ left: 0, top: 0, width: originalMetadata.width, height: Math.min(350, originalMetadata.height) })
                    .toBuffer();

                const ocrResult = await Tesseract.recognize(headerBuffer, 'eng').catch(() => ({ data: { text: '' } }));

                if (ocrResult && ocrResult.data && ocrResult.data.text) {
                    const ocrText = ocrResult.data.text;
                    console.log(`\n--- OCR RAW TEXT START ---\n${ocrText}\n--- OCR RAW TEXT END ---\n`);
                    const scaleMatch = ocrText.match(/(?:Scale|1:)\s*([0-9,.]+)/i);
                    if (scaleMatch) {
                        detectedScale = scaleMatch[1].replace(/,/g, '');
                        console.log(`✅ PDF OCR Detected Scale: ${detectedScale}`);
                    } else {
                        console.log(`❌ Scale not found in OCR text`);
                    }

                    // Survey Number & Sub Division Extraction
                    const surveyMatch = ocrText.match(/(?:S\.?F\.?No\.?|S\.?No\.?|Survey\s*No|Survey\s*Number|புல\s*எண்)[\s.:-]*([0-9A-Za-z]+)(?:\s*[/|\\\-]\s*([a-zA-Z0-9]+))?/i);
                    if (surveyMatch) {
                        detectedSurveyNumber = surveyMatch[1];
                        if (surveyMatch[2]) detectedSubDivision = surveyMatch[2];
                        console.log(`✅ PDF OCR Detected Survey No: ${detectedSurveyNumber}, Sub Div: ${detectedSubDivision}`);
                    } else {
                        // Fallback fraction match e.g. 145/2A or 145 / 2A
                        const fractionMatch = ocrText.match(/\b([0-9]+)\s*[/|\\\-]\s*([a-zA-Z0-9]+)\b/);
                        if (fractionMatch) {
                            detectedSurveyNumber = fractionMatch[1];
                            detectedSubDivision = fractionMatch[2];
                            console.log(`✅ PDF OCR Detected Survey No (from fraction): ${detectedSurveyNumber}, Sub Div: ${detectedSubDivision}`);
                        }
                    }
                }

                await fs.unlink(tempPdfPath).catch(() => {});
                await fs.unlink(outputImagePath).catch(() => {});
            } catch (err) {
                console.error('PDF-Poppler OCR Failed:', err);
            }
        }

        // ─── 3-Colour Vector Extraction ───────────────────────────────────────
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const inputBuffer = Buffer.from(base64Data, 'base64');

        const { data, info } = await sharp(inputBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;
        const numPixels = width * height;

        const blackBuffer = Buffer.alloc(numPixels, 255);
        const blueBuffer  = Buffer.alloc(numPixels, 255);
        const redBuffer   = Buffer.alloc(numPixels, 255);

        for (let i = 0; i < numPixels; i++) {
            const idx = i * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 50) continue;

            const isBlue = (b > r + 20 && b > g + 20 && b > 60);
            const isRed  = (r > b + 20 && r > g + 20 && r > 60);
            const isDark = (r < 180 && g < 180 && b < 180);

            if (isBlue)       blueBuffer[i]  = 0;
            else if (isRed)   redBuffer[i]   = 0;
            else if (isDark)  blackBuffer[i] = 0;
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

        const blackPaths = extractPaths(blackSvg, '#cbd5e1');
        const bluePaths  = extractPaths(blueSvg,  '#0ea5e9');
        const redPaths   = extractPaths(redSvg,   '#ef4444');

        const viewBoxMatch = blackSvg.match(/viewBox="([^"]*)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : `0 0 ${width} ${height}`;

        const unifiedSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">
  <g class="layer-black">${blackPaths}</g>
  <g class="layer-blue">${bluePaths}</g>
  <g class="layer-red">${redPaths}</g>
</svg>`.trim();

        // ─── Auto-Save to Supabase ─────────────────────────────────────────────
        let finalId = projectId;
        if (projectId) {
            await updateMap(projectId, detectedScale || '', unifiedSvg, fullImageBase64 || '');
        } else {
            let mapName = 'Unnamed Project';
            if (detectedSurveyNumber && detectedSubDivision) {
                mapName = `${detectedSurveyNumber}/${detectedSubDivision}`;
            } else if (detectedSurveyNumber) {
                mapName = `${detectedSurveyNumber}`;
            }
            finalId = await insertMap(mapName, '', detectedScale || '', unifiedSvg, fullImageBase64 || '');
        }

        // Clean up any stale unnamed drafts EXCEPT the one we just processed
        // await cleanStaleDrafts(finalId); // Disabled per user request to retain history

        console.log(`Extraction complete. SVG length: ${unifiedSvg.length} chars. Scale: ${detectedScale}. DB ID: ${finalId}`);
        res.json({ svg: unifiedSvg, detectedScale, detectedSurveyNumber, detectedSubDivision, id: finalId });

    } catch (err) {
        console.error('Extraction pipeline error:', err);
        res.status(500).json({ error: 'Server error during extraction', message: err.message, stack: err.stack });
    }
});

// ─── GET /api/fmb-maps ────────────────────────────────────────────────────────
app.get('/api/fmb-maps', async (req, res) => {
    try {
        const maps = await getAllMaps();
        res.json(maps);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maps' });
    }
});

// ─── GET /api/fmb-maps/:id ───────────────────────────────────────────────────
app.get('/api/fmb-maps/:id', async (req, res) => {
    try {
        const map = await getMapById(req.params.id);
        if (!map) return res.status(404).json({ error: 'Map not found' });
        res.json(map);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch map' });
    }
});

// ─── PUT /api/fmb-maps/:id/rename ────────────────────────────────────────────
app.put('/api/fmb-maps/:id/rename', async (req, res) => {
    try {
        const { name } = req.body;
        const ok = await renameMap(req.params.id, name);
        if (!ok) return res.status(500).json({ error: 'Rename failed' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to rename map' });
    }
});

// ─── DELETE /api/fmb-maps/:id ────────────────────────────────────────────────
app.delete('/api/fmb-maps/:id', async (req, res) => {
    try {
        const ok = await deleteMap(req.params.id);
        if (!ok) return res.status(500).json({ error: 'Delete failed' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete map' });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`✅ Everest Backend running on port ${PORT}`);
});
