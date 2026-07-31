const turf = require('@turf/turf');

const p1 = turf.polygon([[[0,0], [10,0], [10,10], [0,10], [0,0]]]);
const p2 = turf.polygon([[[10,0], [20,0], [20,10], [10,10], [10,0]]]);

const fc = turf.featureCollection([p1, p2]);
try {
    const un = turf.union(fc);
    console.log("Union successful: ", un.geometry.type);
} catch (e) {
    console.log("Error:", e.message);
}
