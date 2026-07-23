import { length as turfLength } from '@turf/length';
const poly = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[0,0], [0,1], [1,1], [1,0], [0,0]]]
  }
};
console.log(turfLength(poly, {units: 'meters'}));
