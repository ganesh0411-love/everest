const express = require('express');
const cors = require('cors');
const sharp = require('sharp');
const potrace = require('potrace');

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
        const { imageBase64 } = req.body;
        if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

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

        console.log(`Extraction complete. SVG length: ${unifiedSvg.length} characters.`);
        res.json({ svg: unifiedSvg });
        
    } catch (err) {
        console.error('Extraction pipeline error:', err);
        res.status(500).json({ error: 'Server error during extraction' });
    }
});

app.listen(PORT, () => {
    console.log(`Everest Backend Server running on http://localhost:${PORT}`);
});
