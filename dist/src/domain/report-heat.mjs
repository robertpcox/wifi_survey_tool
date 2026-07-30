// FEATURE:      Report Player analysis
// SURFACE:      floorHeatBuckets(floors), addHeatPoint(buckets, groundTruth, seconds, details), totalHeatSeconds(buckets)
// WHY TOGETHER: Floor-keyed heat accumulation and totalling share one bucket shape.
// STATE:        None
// RULES:        Heat lands at ground truth on a configured meta floor; zero weight is dropped.
// PROVENANCE:   Step 5 report analysis contract

export function floorHeatBuckets(floors) {
  return new Map(floors.map(floor => [
    String(floor.z),
    { ...floor, points: [] },
  ]));
}

export function addHeatPoint(buckets, groundTruth, weightSeconds, details) {
  const floor = buckets.get(String(groundTruth?.z));
  if (!floor || !(weightSeconds > 0)) return;
  floor.points.push({
    at: groundTruth.at,
    lat: groundTruth.lat,
    lng: groundTruth.lng,
    z: groundTruth.z,
    weightSeconds: round(weightSeconds),
    ...details,
  });
}

export function totalHeatSeconds(buckets) {
  return [...buckets.values()].flatMap(floor => floor.points)
    .reduce((total, point) => total + point.weightSeconds, 0);
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
