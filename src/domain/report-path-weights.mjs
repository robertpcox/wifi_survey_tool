// FEATURE:      Weighted report path sampling
// SURFACE:      weightedPathPoints(coordinates, z, weight, stepM)
// WHY TOGETHER: Spatial interpolation and proportional weight allocation form one grid input.
// STATE:        None
// RULES:        Preserve total weight and paint the whole path instead of one midpoint.
// PROVENANCE:   Consolidated freeze-path heat

import { haversine, lerp } from "./geometry.mjs";

export function weightedPathPoints(coordinates, z, weight, stepM = 2.5) {
  const points = (coordinates ?? []).map(coordinate => ({
    lng: Number(coordinate?.[0]), lat: Number(coordinate?.[1]), z: Number(z),
  })).filter(point => [point.lng, point.lat, point.z].every(Number.isFinite));
  const totalWeight = Number(weight);
  const spacing = Number(stepM);
  if (points.length < 2 || !(totalWeight > 0) || !(spacing > 0)) return [];
  const segments = points.slice(1).map((end, index) => ({
    start: points[index], end, lengthM: haversine(points[index], end),
  })).filter(segment => segment.lengthM > 0);
  const totalLengthM = segments.reduce((total, segment) => total + segment.lengthM, 0);
  if (!(totalLengthM > 0)) return [];
  return segments.flatMap(segment => {
    const count = Math.max(1, Math.ceil(segment.lengthM / spacing));
    const sampleWeight = totalWeight * segment.lengthM / totalLengthM / count;
    return Array.from({ length: count }, (_, index) => ({
      point: lerp(segment.start, segment.end, (index + 0.5) / count),
      weight: sampleWeight,
    }));
  });
}
