// FEATURE:      MazeMap GeoJSON feature construction
// SURFACE:      emptyFC(), appendPathFeatures(), recentSourceFixes()
// WHY TOGETHER: Exact floor-aware paths and bounded provider-fix selection feed map sources.
// STATE:        Caller-owned feature arrays only
// RULES:        Preserve every [lng, lat] segment and identify its authored z-level transition.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic-truth contract

export function emptyFC() {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

export function appendPathFeatures(features, points, properties) {
  if (points.length < 2) return;
  let z = points[0].z;
  let coordinates = [[points[0].lng, points[0].lat]];
  for (let index = 1; index < points.length; index++) {
    const point = points[index];
    if (point.z !== z) {
      appendLine(features, coordinates, properties, z);
      appendLine(features, [
        coordinates.at(-1),
        [point.lng, point.lat],
      ], { ...properties, toZ: point.z }, z);
      z = point.z;
      coordinates = [[point.lng, point.lat]];
    } else {
      coordinates.push([point.lng, point.lat]);
    }
  }
  appendLine(features, coordinates, properties, z);
}

function appendLine(features, coordinates, properties, z) {
  if (coordinates.length < 2) return;
  features.push({
    type: "Feature",
    properties: {
      ...properties,
      z,
    },
    geometry: {
      type: "LineString",
      coordinates,
    },
  });
}

export function recentSourceFixes(sourceSamples, source, limit) {
  const fixes = [];
  for (
    let index = sourceSamples.length - 1;
    index >= 0 && fixes.length < limit;
    index--
  ) {
    const sample = sourceSamples[index];
    if (sample.source === source && sample.ok && sample.data) {
      fixes.push(sample);
    }
  }
  return fixes.reverse();
}
