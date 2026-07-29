// FEATURE:      Report Player shared map surface
// SURFACE:      createMapFrame(result, options)
// WHY TOGETHER: Stable route-bounded fallback projection composes floor-aware evidence.
// STATE:        None
// RULES:        Overlays never change bounds; real MazeMap layers retain exact coordinates.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function createMapFrame(result, {
  floor = result.meta.zLevels[0],
  analysis = null,
  frame = null,
  heatKind = "sticky",
} = {}) {
  const routeLines = result.route.legs
    .flatMap(leg => floorSegments(leg.geometry ?? [], floor))
    .filter(points => points.length > 1);
  const heat = heatForFloor(
    analysis?.[heatKind]?.heatByZ ?? analysis?.heatmaps?.[heatKind],
    floor,
  );
  const pollTrail = (frame?.pollTrail ?? [])
    .map(item => item.normalized ?? item)
    .filter(point => point?.z === floor);
  const project = createProjector(routeLines.flat());
  return Object.freeze({
    floor,
    floorName: result.meta.zLevelNames[String(floor)],
    routeLines: routeLines.map(line => line.map(project)),
    stops: result.route.stops.filter(item => item.z === floor).map(project),
    checkpoints: result.route.checkpoints.filter(item => item.z === floor).map(project),
    notes: (frame?.notes ?? result.notes ?? [])
      .filter(note => note.groundTruth.z === floor)
      .map(note => project({ ...note.groundTruth, ...note })),
    heat: heat.map(item => ({ ...project(item), weightSeconds: item.weightSeconds ?? item.weight })),
    pollTrail: pollTrail.map(project),
    walker: frame?.walker?.z === floor ? project(frame.walker) : null,
  });
}

function floorSegments(points, floor) {
  const segments = [];
  let active = [];
  for (const point of points) {
    if (point.z === floor) active.push(point);
    else if (active.length) {
      segments.push(active);
      active = [];
    }
  }
  if (active.length) segments.push(active);
  return segments;
}

function heatForFloor(heatByZ, floor) {
  if (!heatByZ) return [];
  if (heatByZ instanceof Map) return heatByZ.get(floor) ?? heatByZ.get(String(floor)) ?? [];
  if (Array.isArray(heatByZ)) {
    return heatByZ.find(item => item.z === floor)?.points ?? [];
  }
  return heatByZ[String(floor)] ?? [];
}

function createProjector(points) {
  const finite = points.filter(point => (
    Number.isFinite(point?.lng) && Number.isFinite(point?.lat)
  ));
  const meanLat = finite.length
    ? finite.reduce((total, point) => total + point.lat, 0) / finite.length
    : 0;
  const lngScale = Math.cos(meanLat * Math.PI / 180);
  const lngs = finite.map(point => point.lng * lngScale);
  const lats = finite.map(point => point.lat);
  const minLng = lngs.length ? Math.min(...lngs) : 0;
  const maxLng = lngs.length ? Math.max(...lngs) : 1;
  const minLat = lats.length ? Math.min(...lats) : 0;
  const maxLat = lats.length ? Math.max(...lats) : 1;
  const span = Math.max(maxLng - minLng, maxLat - minLat) || 1;
  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;
  return point => ({
    ...point,
    x: 0.5 + ((point.lng * lngScale - centerLng) / span) * 0.84,
    y: 0.5 - ((point.lat - centerLat) / span) * 0.84,
  });
}
