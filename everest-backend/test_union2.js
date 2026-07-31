const turf = require('@turf/turf');

const p1 = { type: 'Polygon', coordinates: [[[0,0], [10,0], [10,10], [0,10], [0,0]]] };
const p2 = { type: 'Polygon', coordinates: [[[10,0], [20,0], [20,10], [10,10], [10,0]]] };

try {
    const fc = turf.featureCollection([turf.feature(p1), turf.feature(p2)]);
    const un = turf.union(fc);
    console.log("Union successful: ", un.geometry.type);
} catch (e) {
    console.log("Error:", e.message);
}
