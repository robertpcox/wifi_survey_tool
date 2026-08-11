// FEATURE:      Consolidated report camera fit
// SURFACE:      routeForMapAnalysis(analysis, fallback, options)
// WHY TOGETHER: Active highlight, floor filtering, and visible room geometry define one fit route.
// STATE:        None
// RULES:        Fit only visible overview evidence; never fall back to the hidden seed route.
// PROVENANCE:   Campus report bounding-box feedback

export function routeForMapAnalysis(analysis, fallback, {
  floor = null, heatKind = "sticky", overview = analysis?.overview === true,
} = {}) {
  if (!overview) return fallback;
  const points = analysis?.overview
    ? overviewFitPoints(analysis, heatKind).filter(point => (
      floor == null || Number(point.z) === Number(floor)
    ))
    : [];
  return { legs: points.length ? [{ geometry: points }] : [] };
}

function overviewFitPoints(analysis, heatKind) {
  const points = heatKind === "freeze"
    ? segmentPoints(analysis.stalePathSegments)
    : heatKind === "room"
      ? roomPoints(analysis.areaResolution)
      : heatPoints(analysis.heatmaps?.[heatKind]);
  const unique = new Map();
  points.filter(finitePoint).forEach(point => {
    unique.set(`${point.lng},${point.lat},${point.z}`, point);
  });
  return [...unique.values()];
}

function heatPoints(source) {
  if (source instanceof Map) return [...source.values()].flatMap(heatBucket);
  if (Array.isArray(source)) return source.flatMap(heatBucket);
  if (source && typeof source === "object") {
    return Object.values(source).flatMap(heatBucket);
  }
  return [];
}

function heatBucket(bucket) {
  return Array.isArray(bucket?.points) ? bucket.points
    : (Array.isArray(bucket) ? bucket : []);
}

function segmentPoints(segments = []) {
  return segments.flatMap(segment => (segment.coordinates ?? []).map(coordinate => ({
    lng: Number(coordinate?.[0]), lat: Number(coordinate?.[1]), z: Number(segment.z),
  })));
}

function roomPoints(summary) {
  if (!summary) return [];
  return [
    ...(summary.areaPolygons ?? []).filter(displayedArea)
      .flatMap(area => geometryPoints(area.geometry, area.z)),
    ...(summary.areaObservations ?? []).flatMap(observationPoints),
  ];
}

function displayedArea(area) {
  const inside = count(area?.insideSampleCount);
  const outside = count(area?.outsideSampleCount);
  if (inside != null && outside != null) return inside + outside > 0;
  return count(area?.scoredSampleCount) !== 0
    && number(area?.resolutionPercent) != null;
}

function count(value) {
  const result = number(value);
  return result != null && result >= 0 ? result : null;
}

function number(value) {
  if (value == null || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function observationPoints(observation) {
  const moment = displayedMoment(observation);
  if (!moment?.point || !["wrong-room", "unresolved", "wrong-floor"].includes(moment.status)) {
    return [];
  }
  return [observation.target, moment.point];
}

function displayedMoment(observation) {
  if (observation.observationKind === "dwell"
    && Object.hasOwn(observation, "windowExit")) return observation.windowExit;
  if (observation.primary?.point) return observation.primary;
  return [...(observation.moments ?? [])].reverse().find(item => item?.point);
}

function geometryPoints(geometry, z) {
  const points = [];
  visitCoordinates(geometry?.coordinates, coordinate => points.push({
    lng: Number(coordinate[0]), lat: Number(coordinate[1]), z: Number(z),
  }));
  return points;
}

function visitCoordinates(value, visit) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && Number.isFinite(Number(value[0]))
    && Number.isFinite(Number(value[1]))) return visit(value);
  value.forEach(item => visitCoordinates(item, visit));
}

function finitePoint(point) {
  return Number.isFinite(point?.lng) && Number.isFinite(point?.lat)
    && Number.isFinite(point?.z);
}
