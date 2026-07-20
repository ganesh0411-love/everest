const fs = require('fs');
let code = fs.readFileSync('src/components/AdminDashboard.jsx', 'utf8');

const regex = /const WMSTileImage = React\.memo\(\(\{ x, y, width, height, tileX, tileY, tileZ \}\) => \{[\s\S]*?const CadastralWMSLayer = \(\{ viewport, baseMercX, baseMercY \}\) => \{[\s\S]*?            const next = \{ \.\.\.prev \};\n            Object\.keys\(next\)\.forEach\(k => \{\n                if \(Math\.abs\(next\[k\]\.z - z\) > 1\) \{\n                    delete next\[k\];\n                \}\n            \}\);\n            tiles\.forEach\(t => \{\n                const k = \`\$\{t\.z\}-\$\{t\.x\}-\$\{t\.y\}\`;\n                if \(\!next\[k\]\) next\[k\] = t;\n            \}\);\n            return next;\n        \}\);\n    \}, \[txMin, txMax, tyMin, tyMax, z\]\);\n\n    const renderTiles = Object\.values\(cachedTiles\)\.sort\(\(a, b\) => a\.z - b\.z\);\n\n    return \(\n        <g id="cadastral-wms-layer" pointerEvents="none">\n            \{renderTiles\.map\(tile => \{\n                const mercX = \(tile\.x \/ Math\.pow\(2, tile\.z\)\) \* 40075016 - maxMerc;\n                const mercY = maxMerc - \(tile\.y \/ Math\.pow\(2, tile\.z\)\) \* 40075016;\n                const svgX = mercX - baseMercX;\n                const svgY = baseMercY - mercY;\n                const tileM = 40075016 \/ Math\.pow\(2, tile\.z\);\n                return \(\n                    <WMSTileImage\n                        key=\{\`\$\{tile\.z\}-\$\{tile\.x\}-\$\{tile\.y\}\`\}\n                        x=\{svgX\}\n                        y=\{svgY\}\n                        width=\{tileM \+ 0\.5\}\n                        height=\{tileM \+ 0\.5\}\n                        tileX=\{tile\.x\}\n                        tileY=\{tile\.y\}\n                        tileZ=\{tile\.z\}\n                    \/>\n                \);\n            \}\)\}\n        <\/g>\n    \);\n\};\n/g;

const replacement = `const WMSDynamicImage = React.memo(({ x, y, w, h, url, loaded, onLoad }) => {
    return (
        <image 
            x={x} y={y} width={w} height={h} href={url} 
            preserveAspectRatio="none" 
            onLoad={onLoad} 
            opacity={loaded ? 1 : 0.5} 
            style={{ transition: 'opacity 0.3s ease' }}
        />
    );
});

const CadastralWMSLayer = ({ viewport, baseMercX, baseMercY }) => {
    if (!baseMercX) return null;
    const [wmsViewports, setWmsViewports] = React.useState([]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            // Expand bbox by 20% on all sides so small pans are smooth
            const padX = viewport.width * 0.2;
            const padY = viewport.height * 0.2;
            const vX = viewport.x - padX;
            const vY = viewport.y - padY;
            const vW = viewport.width + padX * 2;
            const vH = viewport.height + padY * 2;

            const mercMinX = baseMercX + vX;
            const mercMaxX = mercMinX + vW;
            const mercMaxY = baseMercY - vY;
            const mercMinY = baseMercY - (vY + vH);
            
            const bbox = \\\`\${mercMinX},\${mercMinY},\${mercMaxX},\${mercMaxY}\\\`;
            const pxW = Math.min(2048, Math.round(window.innerWidth * 1.5));
            const pxH = Math.min(2048, Math.round(window.innerHeight * 1.5));
            
            // Single bounding box request guarantees label deduplication at polygon centroid
            const url = \\\`https://tngis.tn.gov.in/app/wms?service=WMS&version=1.1.1&request=GetMap&layers=cadastral_data_wms:view_cadastral&styles=&bbox=\${bbox}&width=\${pxW}&height=\${pxH}&srs=EPSG:3857&format=image/png&transparent=true\\\`;
            
            const id = Date.now();
            setWmsViewports(prev => {
                const lastLoaded = prev.filter(p => p.loaded).slice(-1);
                return [...lastLoaded, { id, x: vX, y: vY, w: vW, h: vH, url, loaded: false }];
            });
        }, 400); // 400ms debounce
        
        return () => clearTimeout(timer);
    }, [viewport.x, viewport.y, viewport.width, viewport.height, baseMercX, baseMercY]);

    return (
        <g id="cadastral-wms-layer" pointerEvents="none">
            {wmsViewports.map(v => (
                <WMSDynamicImage 
                    key={v.id} 
                    {...v} 
                    onLoad={() => {
                        setWmsViewports(prev => prev.map(p => p.id === v.id ? {...p, loaded: true} : p));
                    }} 
                />
            ))}
        </g>
    );
};
`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/AdminDashboard.jsx', code);
    console.log("Success");
} else {
    console.log("Regex failed to match");
}
