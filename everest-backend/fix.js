
const fs = require("fs");
let code = fs.readFileSync("server.js", "utf8");

// Fix subdiv array
code = code.replace(/f\.properties\.SUBDIV_NO\)\.filter\(Boolean\)/g, "(f.properties.sub_division || f.properties.SUBDIV_NO)).filter(Boolean)");

// Fix both instances of feature assignment
const searchStr = `                    if (data.features) {
                        let feature;
                        if (subdiv) {
                            feature = data.features.find(f => f.properties && f.properties.SUBDIV_NO === subdiv);
                        } else {
                            feature = data.features[0];
                        }
                        if (feature) {
                            return res.json({ success: true, feature: feature, source: "local_json" });
                        }
                    }`;

const replaceStr = `                    if (data.features) {
                        let feature;
                        if (subdiv) {
                            feature = data.features.find(f => f.properties && (f.properties.sub_division === subdiv || f.properties.SUBDIV_NO === subdiv));
                            if (feature) return res.json({ success: true, feature: feature, source: "local_json" });
                        } else {
                            if (data.features.length === 1) {
                                feature = data.features[0];
                            } else if (data.features.length > 1) {
                                let geom = null;
                                try {
                                    const fc = turf.featureCollection(data.features.map(f => f.type === "Feature" ? f : turf.feature(f.geometry || f, f.properties)));
                                    const un = turf.union(fc);
                                    geom = un.geometry;
                                } catch (e) {
                                    let polys = [];
                                    data.features.forEach(f => {
                                        let g = f.geometry || f;
                                        if (g.type === "Polygon") polys.push(g.coordinates);
                                        else if (g.type === "MultiPolygon") polys.push(...g.coordinates);
                                    });
                                    geom = { type: "MultiPolygon", coordinates: polys };
                                }
                                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                                data.features.forEach(f => {
                                    try {
                                        const b = turf.bbox(f.type === "Feature" ? f : turf.feature(f.geometry || f));
                                        if (b[0] < minX) minX = b[0];
                                        if (b[1] < minY) minY = b[1];
                                        if (b[2] > maxX) maxX = b[2];
                                        if (b[3] > maxY) maxY = b[3];
                                    } catch(e) {}
                                });
                                feature = {
                                    type: "Feature",
                                    geometry: geom,
                                    bbox: [minX, minY, maxX, maxY],
                                    properties: { survey_no: survey }
                                };
                            }
                            if (feature) return res.json({ success: true, feature: feature, source: "local_json" });
                        }
                    }`;

code = code.split(searchStr.replace(/"/g, "\x27")).join(replaceStr.replace(/"/g, "\x27"));

fs.writeFileSync("server.js", code);

