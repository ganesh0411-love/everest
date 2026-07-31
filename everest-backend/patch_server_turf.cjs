const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

if (!code.includes("const turf = require('@turf/turf');")) {
    code = "const turf = require('@turf/turf');\n" + code;
}

const target = `} else if (features.length > 1) {
                        let polys = [];
                        features.forEach(f => {
                            if (f.type === 'Polygon') polys.push(f.coordinates);
                            else if (f.type === 'MultiPolygon') polys.push(...f.coordinates);
                        });
                        geom = { type: 'MultiPolygon', coordinates: polys };
                    }`;

const target2 = `} else if (features.length > 1) {
                    let polys = [];
                    features.forEach(f => {
                        if (f.type === 'Polygon') polys.push(f.coordinates);
                        else if (f.type === 'MultiPolygon') polys.push(...f.coordinates);
                    });
                    geom = { type: 'MultiPolygon', coordinates: polys };
                }`;


const replacement = `} else if (features.length > 1) {
                        try {
                            const fc = turf.featureCollection(features.map(f => turf.feature(f)));
                            const un = turf.union(fc);
                            geom = un.geometry;
                        } catch(e) {
                            let polys = [];
                            features.forEach(f => {
                                if (f.type === 'Polygon') polys.push(f.coordinates);
                                else if (f.type === 'MultiPolygon') polys.push(...f.coordinates);
                            });
                            geom = { type: 'MultiPolygon', coordinates: polys };
                        }
                    }`;

const replacement2 = `} else if (features.length > 1) {
                    try {
                        const fc = turf.featureCollection(features.map(f => turf.feature(f)));
                        const un = turf.union(fc);
                        geom = un.geometry;
                    } catch(e) {
                        let polys = [];
                        features.forEach(f => {
                            if (f.type === 'Polygon') polys.push(f.coordinates);
                            else if (f.type === 'MultiPolygon') polys.push(...f.coordinates);
                        });
                        geom = { type: 'MultiPolygon', coordinates: polys };
                    }
                }`;

let newCode = code.replace(target, replacement);
newCode = newCode.replace(target2, replacement2);

fs.writeFileSync('server.js', newCode);
console.log("Patched server.js with turf.union");
