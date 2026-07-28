// FEATURE:      Report Player shared map surface
// SURFACE:      createMapFrame(result, options)
// WHY TOGETHER: Route, heat, trail, and walker projection share one floor-aware map model.
// STATE:        None
// RULES:        Use meta floors and embedded evidence; never infer or alter the route.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

export function createMapFrame(result, {
  floor = result.meta.zLevels[0],
  analysis = null,
  frame = null,
  heatKind = "sticky",
} = {}) {
  const routeLines = result.route.legs
    .map(leg => (leg.geometry ?? []).filter(point => point.z === floor))
    .filter(points => points.length > 1);
  const heat = heatForFloor(
    analysis?.[heatKind]?.heatByZ ?? analysis?.heatmaps?.[heatKind],
    floor,
  );
  const pollTrail = (frame?.pollTrail ?? [])
    .map(item => item.normalized ?? item)
    .filter(point => point?.z === floor);
  const points = [
    ...routeLines.flat(),
    ...heat,
    ...pollTrail,
    ...(frame?.walker?.z === floor ? [frame.walker] : []),
  ];
  const project = createProjector(points);
  return Object.freeze({
    floor,
    floorName: result.meta.zLevelNames[String(floor)],
    routeLines: routeLines.map(line => line.map(project)),
    stops: result.route.stops.filter(item => item.z === floor).map(project),
    checkpoints: result.route.checkpoints.filter(item => item.z === floor).map(project),
    heat: heat.map(item => ({ ...project(item), weightSeconds: item.weightSeconds ?? item.weight })),
    pollTrail: pollTrail.map(project),
    walker: frame?.walker?.z === floor ? project(frame.walker) : null,
  });
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
  const lngs = finite.map(point => point.lng);
  const lats = finite.map(point => point.lat);
  const minLng = lngs.length ? Math.min(...lngs) : 0;
  const maxLng = lngs.length ? Math.max(...lngs) : 1;
  const minLat = lats.length ? Math.min(...lats) : 0;
  const maxLat = lats.length ? Math.max(...lats) : 1;
  const lngSpan = maxLng - minLng || 1;
  const latSpan = maxLat - minLat || 1;
  return point => ({
    ...point,
    x: 0.08 + ((point.lng - minLng) / lngSpan) * 0.84,
    y: 0.92 - ((point.lat - minLat) / latSpan) * 0.84,
  });
}
