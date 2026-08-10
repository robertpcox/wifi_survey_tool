// FEATURE:      Consolidated MazeMap area polygon features
// SURFACE:      areaPolygonFeatures(areas)
// WHY TOGETHER: Polygon geometry and normalized resolution percentage form one fill contract.
// STATE:        None
// RULES:        Scored fills retain the full 0–100% scale; no scores stay grey.
// PROVENANCE:   Campus area-resolution map

const PROPERTIES = [
  "areaKey", "poiId", "areaName", "z", "severity", "observationCount",
  "scoredSampleCount", "insideSampleCount", "outsideSampleCount",
  "resolutionPercent", "runCount",
];

export function areaPolygonFeatures(areas = []) {
  return areas.filter(area => ["Polygon", "MultiPolygon"]
    .includes(area?.geometry?.type)).map(area => {
    const resolutionPercent = presentationResolutionPercent(area);
    return {
      type: "Feature",
      properties: {
        ...Object.fromEntries(PROPERTIES.map(key => [key, area[key]])),
        resolutionPercent,
        scored: resolutionPercent != null,
      },
      geometry: area.geometry,
    };
  });
}

export function presentationResolutionPercent(area) {
  const inside = count(area?.insideSampleCount);
  const outside = count(area?.outsideSampleCount);
  if (inside != null && outside != null) {
    const total = inside + outside;
    return total ? roundPercent(inside / total * 100) : null;
  }
  const scored = count(area?.scoredSampleCount);
  if (scored === 0) return null;
  const supplied = number(area?.resolutionPercent);
  return supplied == null ? null : roundPercent(Math.min(100, Math.max(0, supplied)));
}

function count(value) {
  const result = number(value);
  return result == null || result < 0 ? null : result;
}

function number(value) {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function roundPercent(value) {
  return Math.round(value * 10) / 10;
}
