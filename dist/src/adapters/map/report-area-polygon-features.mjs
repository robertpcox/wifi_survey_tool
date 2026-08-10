// FEATURE:      Consolidated MazeMap area polygon features
// SURFACE:      areaPolygonFeatures(areas)
// WHY TOGETHER: Polygon geometry and aggregate severity properties form one fill contract.
// STATE:        None
// RULES:        Strict majority controls fill; ties stay amber and no scores stay grey.
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
    properties: {
      ...Object.fromEntries(PROPERTIES.map(key => [key, area[key]])),
      severity: presentationSeverity(area),
    },
    geometry: area.geometry,
  }));
}

export function presentationSeverity(area) {
  const inside = Number(area?.insideSampleCount);
  const outside = Number(area?.outsideSampleCount);
  if (Number.isFinite(inside) && Number.isFinite(outside)) {
    if (inside + outside === 0) return "unscored";
    if (inside > outside) return "good";
    if (outside > inside) return "bad";
    return "mixed";
  }
  return ["good", "mixed", "bad", "unscored"].includes(area?.severity)
    ? area.severity : "unscored";
}
