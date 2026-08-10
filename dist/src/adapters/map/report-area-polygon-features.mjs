// FEATURE:      Consolidated MazeMap area polygon features
// SURFACE:      areaPolygonFeatures(areas)
// WHY TOGETHER: Polygon geometry and aggregate severity properties form one fill contract.
// STATE:        None
// RULES:        Preserve Polygon/MultiPolygon coordinates and reported floor exactly.
// PROVENANCE:   Campus area-resolution map

const PROPERTIES = [
  "areaKey", "poiId", "areaName", "z", "severity", "observationCount",
  "scoredSampleCount", "insideSampleCount", "outsideSampleCount",
  "resolutionPercent", "runCount",
];

export function areaPolygonFeatures(areas = []) {
  return areas.filter(area => ["Polygon", "MultiPolygon"]
    .includes(area?.geometry?.type)).map(area => ({
    type: "Feature",
    properties: Object.fromEntries(PROPERTIES.map(key => [key, area[key]])),
    geometry: area.geometry,
  }));
}
